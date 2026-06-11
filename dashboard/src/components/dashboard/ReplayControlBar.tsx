"use client";

import clsx from "clsx";
import { Pause, Play, RotateCcw, StepBack, StepForward } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { buildReplayMarkers } from "@/lib/replayMarkers";
import { useDataStore } from "@/stores/useDataStore";
import { useLapHistoryStore } from "@/stores/useLapHistoryStore";
import { useReplayControlStore } from "@/stores/useReplayControlStore";
import { useSettingsStore } from "@/stores/useSettingsStore";

const speeds = [0.5, 1, 2, 5] as const;

export default function ReplayControlBar() {
	const { isPaused, speed, setPaused, setSpeed, jumpBy, resetReplayControls } = useReplayControlStore();
	const delay = useSettingsStore((state) => state.delay);

	// keyboard shortcuts: space = pause, arrows = ±10s
	useEffect(() => {
		const handleKey = (event: KeyboardEvent) => {
			const target = event.target as HTMLElement | null;
			if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;

			if (event.code === "Space") {
				event.preventDefault();
				setPaused(!useReplayControlStore.getState().isPaused);
			} else if (event.code === "ArrowLeft") {
				jumpBy(-10_000);
			} else if (event.code === "ArrowRight") {
				jumpBy(10_000);
			}
		};

		window.addEventListener("keydown", handleKey);
		return () => window.removeEventListener("keydown", handleKey);
	}, [setPaused, jumpBy]);

	const replayMode = delay > 0;

	return (
		<div className="telemetry-panel flex items-center gap-3 rounded-lg p-2">
			<div className="flex shrink-0 items-center gap-2">
				<button
					className="data-chip rounded-md p-2 text-cyan-200"
					onClick={() => setPaused(!isPaused)}
					title={isPaused ? "Play (space)" : "Pause (space)"}
				>
					{isPaused ? <Play size={16} /> : <Pause size={16} />}
				</button>
				{replayMode && (
					<>
						<button
							className="data-chip rounded-md p-2 text-cyan-200"
							onClick={() => jumpBy(-10_000)}
							title="Back 10 seconds (←)"
						>
							<StepBack size={16} />
						</button>
						<button
							className="data-chip rounded-md p-2 text-cyan-200"
							onClick={() => jumpBy(10_000)}
							title="Forward 10 seconds (→)"
						>
							<StepForward size={16} />
						</button>
						<button
							className="data-chip rounded-md p-2 text-cyan-200"
							onClick={resetReplayControls}
							title="Reset replay controls"
						>
							<RotateCcw size={16} />
						</button>
					</>
				)}
			</div>

			{replayMode ? (
				<ReplayTimeline />
			) : (
				<div className="flex flex-1 items-center justify-center gap-2">
					<span className="h-2 w-2 animate-pulse rounded-full bg-rose-500" />
					<span className="font-mono text-xs font-bold tracking-widest text-rose-400">LIVE</span>
					<span className="hidden font-mono text-[0.65rem] text-zinc-500 sm:block">
						add delay to unlock the replay timeline
					</span>
				</div>
			)}

			<div className="flex shrink-0 items-center gap-1">
				{speeds.map((item) => (
					<button
						key={item}
						className={`rounded-md px-2 py-1 font-mono text-xs ${speed === item ? "bg-cyan-300 text-black" : "data-chip text-cyan-200"}`}
						onClick={() => setSpeed(item)}
					>
						{item}x
					</button>
				))}
			</div>
		</div>
	);
}

function formatClock(ms: number): string {
	const date = new Date(ms);
	return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function ReplayTimeline() {
	const windowStartMs = useReplayControlStore((state) => state.windowStartMs);
	const windowEndMs = useReplayControlStore((state) => state.windowEndMs);
	const cursorMs = useReplayControlStore((state) => state.cursorMs);
	const seekTo = useReplayControlStore((state) => state.seekTo);

	const state = useDataStore((store) => store.state);
	const laps = useLapHistoryStore((store) => store.laps);

	const trackRef = useRef<HTMLDivElement | null>(null);
	const [scrubbing, setScrubbing] = useState(false);
	const [hoverFraction, setHoverFraction] = useState<number | null>(null);

	const markers = useMemo(() => buildReplayMarkers(state, laps), [state, laps]);

	if (windowStartMs === null || windowEndMs === null || windowEndMs - windowStartMs < 1000) {
		return (
			<div className="flex flex-1 items-center justify-center">
				<span className="font-mono text-[0.65rem] text-zinc-500">Buffering replay window…</span>
			</div>
		);
	}

	const span = windowEndMs - windowStartMs;
	const fractionOf = (tsMs: number) => Math.min(1, Math.max(0, (tsMs - windowStartMs) / span));
	const cursorFraction = cursorMs !== null ? fractionOf(cursorMs) : 1;

	const fractionFromEvent = (event: React.PointerEvent) => {
		const rect = trackRef.current?.getBoundingClientRect();
		if (!rect || rect.width === 0) return null;
		return Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
	};

	const seekToFraction = (fraction: number) => seekTo(windowStartMs + fraction * span);

	return (
		<div className="flex min-w-0 flex-1 flex-col gap-1">
			<div
				ref={trackRef}
				className="group relative h-6 w-full cursor-pointer touch-none"
				onPointerDown={(event) => {
					event.currentTarget.setPointerCapture(event.pointerId);
					setScrubbing(true);
					const fraction = fractionFromEvent(event);
					if (fraction !== null) seekToFraction(fraction);
				}}
				onPointerMove={(event) => {
					const fraction = fractionFromEvent(event);
					setHoverFraction(fraction);
					if (scrubbing && fraction !== null) seekToFraction(fraction);
				}}
				onPointerUp={() => setScrubbing(false)}
				onPointerLeave={() => {
					setHoverFraction(null);
					setScrubbing(false);
				}}
			>
				{/* track */}
				<div className="absolute top-1/2 right-0 left-0 h-1.5 -translate-y-1/2 rounded-full bg-black/50">
					<div
						className="h-full rounded-full bg-cyan-300/40"
						style={{ width: `${cursorFraction * 100}%` }}
					/>
				</div>

				{/* event markers */}
				{markers
					.filter((marker) => marker.tsMs >= windowStartMs && marker.tsMs <= windowEndMs)
					.map((marker, index) => (
						<button
							key={`${marker.type}.${marker.tsMs}.${index}`}
							className={clsx(
								"absolute top-1/2 h-3 -translate-x-1/2 -translate-y-1/2 rounded-sm",
								marker.type === "pit" ? "w-0.5 opacity-60" : "w-1",
							)}
							style={{ left: `${fractionOf(marker.tsMs) * 100}%`, backgroundColor: marker.color }}
							title={`${formatClock(marker.tsMs)} · ${marker.label}`}
							onClick={(event) => {
								event.stopPropagation();
								seekTo(marker.tsMs);
							}}
						/>
					))}

				{/* cursor */}
				<div
					className="absolute top-1/2 h-4 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-sm bg-cyan-300 shadow-[0_0_8px_rgba(0,229,255,0.8)]"
					style={{ left: `${cursorFraction * 100}%` }}
				/>

				{/* hover time preview */}
				{hoverFraction !== null && (
					<div
						className="pointer-events-none absolute -top-5 -translate-x-1/2 rounded border border-cyan-300/20 bg-black/90 px-1.5 py-0.5 font-mono text-[0.6rem] text-cyan-200"
						style={{ left: `${hoverFraction * 100}%` }}
					>
						{formatClock(windowStartMs + hoverFraction * span)}
					</div>
				)}
			</div>

			<div className="flex items-center justify-between font-mono text-[0.6rem] text-zinc-500">
				<span>{formatClock(windowStartMs)}</span>
				<span className="text-cyan-300/80">{cursorMs !== null ? formatClock(cursorMs) : "--"}</span>
				<span>{formatClock(windowEndMs)}</span>
			</div>
		</div>
	);
}
