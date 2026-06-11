"use client";

import { useEffect, useRef, useState } from "react";

import type { CarData, CarsData, Position, Positions, State } from "@/types/state.type";
import type { MessageInitial, MessageUpdate } from "@/types/message.type";

import { advancePlayhead } from "@/lib/replayClock";
import { inflate } from "@/lib/inflate";
import { utcToLocalMs } from "@/lib/utcToLocalMs";

import { useSettingsStore } from "@/stores/useSettingsStore";
import { useReplayControlStore } from "@/stores/useReplayControlStore";

import { useBuffer } from "@/hooks/useBuffer";
import { useStatefulBuffer } from "@/hooks/useStatefulBuffer";

const UPDATE_MS = 200;

// live without delay only needs a short tail; replay/delay mode keeps a long
// window so the timeline can scrub backwards
const LIVE_KEEP_SECS = 5 * 60;
const REPLAY_KEEP_SECS = 15 * 60;

type Props = {
	updateState: (state: State) => void;
	updatePosition: (pos: Positions) => void;
	updateCarData: (car: CarsData) => void;
};

export const useDataEngine = ({ updateState, updatePosition, updateCarData }: Props) => {
	const buffers = {
		Heartbeat: useStatefulBuffer(),
		ExtrapolatedClock: useStatefulBuffer(),
		TopThree: useStatefulBuffer(),
		TimingStats: useStatefulBuffer(),
		TimingAppData: useStatefulBuffer(),
		WeatherData: useStatefulBuffer(),
		TrackStatus: useStatefulBuffer(),
		SessionStatus: useStatefulBuffer(),
		DriverList: useStatefulBuffer(),
		RaceControlMessages: useStatefulBuffer(),
		SessionInfo: useStatefulBuffer(),
		SessionData: useStatefulBuffer(),
		LapCount: useStatefulBuffer(),
		TimingData: useStatefulBuffer(),
		TeamRadio: useStatefulBuffer(),
		ChampionshipPrediction: useStatefulBuffer(),
	};

	const carBuffer = useBuffer<CarsData>();
	const posBuffer = useBuffer<Positions>();

	const [maxDelay, setMaxDelay] = useState<number>(0);

	const delayRef = useRef<number>(0);
	const replayPausedRef = useRef(false);
	const replaySpeedRef = useRef(1);
	const delay = useSettingsStore((state) => state.delay);
	const replayPaused = useReplayControlStore((state) => state.isPaused);
	const replaySpeed = useReplayControlStore((state) => state.speed);

	// playback clock: the playhead advances by real-elapsed-time × speed each
	// tick, decoupled from the absolute wall clock so variable speeds work.
	const playheadRef = useRef<number>(0);
	const lastTickRef = useRef<number>(0);
	const prevDelayRef = useRef<number>(0);

	const intervalRef = useRef<NodeJS.Timeout | null>(null);

	useEffect(() => {
		delayRef.current = delay;
	}, [delay]);

	useEffect(() => {
		replayPausedRef.current = replayPaused;
		replaySpeedRef.current = replaySpeed;
	}, [replayPaused, replaySpeed]);

	const handleInitial = ({ CarDataZ: carZ, PositionZ: posZ, ...initial }: MessageInitial) => {
		updateState(initial);

		Object.keys(buffers).forEach((key) => {
			const data = initial[key as keyof typeof initial];
			const buffer = buffers[key as keyof typeof buffers];
			if (data) buffer.push(data);
		});

		if (carZ) {
			const carData = inflate<CarData>(carZ);
			updateCarData(carData.Entries[0].Cars);

			for (const entry of carData.Entries) {
				carBuffer.pushTimed(entry.Cars, utcToLocalMs(entry.Utc));
			}
		}

		if (posZ) {
			const position = inflate<Position>(posZ);
			updatePosition(position.Position[0].Entries);

			for (const entry of position.Position) {
				posBuffer.pushTimed(entry.Entries, utcToLocalMs(entry.Timestamp));
			}
		}
	};

	const handleUpdate = ({ CarDataZ: carZ, PositionZ: posZ, ...update }: MessageUpdate) => {
		Object.keys(buffers).forEach((key) => {
			const data = update[key as keyof typeof update];
			const buffer = buffers[key as keyof typeof buffers];
			if (data) buffer.push(data);
		});

		if (carZ) {
			const carData = inflate<CarData>(carZ);
			for (const entry of carData.Entries) {
				carBuffer.pushTimed(entry.Cars, utcToLocalMs(entry.Utc));
			}
		}

		if (posZ) {
			const position = inflate<Position>(posZ);
			for (const entry of position.Position) {
				posBuffer.pushTimed(entry.Entries, utcToLocalMs(entry.Timestamp));
			}
		}
	};

	const publishWindow = (cursorMs: number | null) => {
		const windowStart = buffers.TimingData.oldestTimestamp() ?? carBuffer.oldestTimestamp();
		const windowEnd = buffers.TimingData.latestTimestamp() ?? carBuffer.latestTimestamp();
		useReplayControlStore.getState().setWindow(windowStart, windowEnd, cursorMs ?? windowEnd);
	};

	const handleCurrentState = () => {
		const now = Date.now();
		// real time elapsed since the previous tick; 0 on the first tick
		const realElapsed = lastTickRef.current === 0 ? 0 : now - lastTickRef.current;
		lastTickRef.current = now;

		const delay = delayRef.current;

		// Live pause freezes publication entirely. Replay pause still needs to
		// process explicit scrub/jump requests below.
		if (replayPausedRef.current && delay === 0) {
			prevDelayRef.current = 0;
			return;
		}

		if (delay === 0) {
			// live edge: keep the playhead anchored so adding a delay starts cleanly
			playheadRef.current = now;
			prevDelayRef.current = 0;

			const newStateFrame: Record<string, State[keyof State]> = {};

			Object.keys(buffers).forEach((key) => {
				const buffer = buffers[key as keyof typeof buffers];
				const latest = buffer.latest() as State[keyof State];
				if (latest) newStateFrame[key] = latest;

				setTimeout(() => buffer.cleanup(now, LIVE_KEEP_SECS), 0);
			});

			updateState(newStateFrame);

			const carFrame = carBuffer.latest();
			if (carFrame) updateCarData(carFrame);

			const posFrame = posBuffer.latest();
			if (posFrame) updatePosition(posFrame);

			setTimeout(() => {
				carBuffer.cleanup(now, LIVE_KEEP_SECS);
				posBuffer.cleanup(now, LIVE_KEEP_SECS);
			}, 0);

			publishWindow(null);
		} else {
			const oldest = buffers.TimingData.oldestTimestamp() ?? carBuffer.oldestTimestamp();
			const latest = buffers.TimingData.latestTimestamp() ?? carBuffer.latestTimestamp();
			const pendingSeek = useReplayControlStore.getState().pendingSeekMs;

			// Keep lastTick fresh while paused, but avoid republishing the same frame
			// unless the user explicitly requested a different position.
			if (replayPausedRef.current && pendingSeek === null) {
				prevDelayRef.current = delay;
				return;
			}

			// (re)anchor the playhead when entering replay mode from live or on the
			// very first replay tick: start `delay` seconds behind the live edge
			if (prevDelayRef.current === 0 || playheadRef.current === 0) {
				playheadRef.current = now - delay * 1000;
			}
			prevDelayRef.current = delay;

			// an explicit scrub/jump overrides organic advancement for this tick
			playheadRef.current = advancePlayhead({
				current: playheadRef.current,
				realElapsedMs: realElapsed,
				speed: replaySpeedRef.current,
				pendingSeekMs: pendingSeek,
				oldest,
				latest,
				paused: replayPausedRef.current,
			});
			if (pendingSeek !== null) useReplayControlStore.getState().clearPendingSeek();

			const delayedTimestamp = playheadRef.current;
			const newStateFrame: Record<string, State[keyof State]> = {};

			Object.keys(buffers).forEach((key) => {
				const buffer = buffers[key as keyof typeof buffers];
				const delayed = buffer.delayed(delayedTimestamp) as State[keyof State];

				if (delayed) newStateFrame[key] = delayed;

				setTimeout(() => buffer.cleanup(delayedTimestamp, REPLAY_KEEP_SECS), 0);
			});

			updateState(newStateFrame);

			const carFrame = carBuffer.delayed(delayedTimestamp);
			if (carFrame) {
				updateCarData(carFrame);
				setTimeout(() => carBuffer.cleanup(delayedTimestamp, REPLAY_KEEP_SECS), 0);
			}

			const posFrame = posBuffer.delayed(delayedTimestamp);
			if (posFrame) {
				updatePosition(posFrame);
				setTimeout(() => posBuffer.cleanup(delayedTimestamp, REPLAY_KEEP_SECS), 0);
			}

			publishWindow(delayedTimestamp);
		}

		const maxDelay = Math.min(
			...Object.values(buffers)
				.map((buffer) => buffer.maxDelay())
				.filter((delay) => delay > 0),
			// carBuffer.maxDelay(),
			// posBuffer.maxDelay(),
		);

		setMaxDelay(maxDelay);
	};

	useEffect(() => {
		intervalRef.current = setInterval(handleCurrentState, UPDATE_MS);
		return () => (intervalRef.current ? clearInterval(intervalRef.current) : void 0);
		// TODO investigate if this might have performance issues
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	return {
		handleUpdate,
		handleInitial,
		maxDelay,
	};
};
