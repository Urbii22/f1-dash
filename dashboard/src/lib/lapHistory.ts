import type { State, Stint, TimingDataDriver } from "@/types/state.type";

export type LapRecord = {
	lap: number;
	lapTimeMs: number | null;
	sectorsMs: [number | null, number | null, number | null];
	position: number | null;
	gapToLeaderMs: number | null;
	compound: string | null;
	tyreAge: number | null;
	pitted: boolean;
	utc: string;
};

export type StintRecord = {
	stint: number;
	compound: string | null;
	startLap: number;
	endLap: number;
	lapCount: number;
	bestMs: number | null;
	avgMs: number | null;
	// linear regression slope over clean laps, in ms per lap (positive = losing time)
	degMsPerLap: number | null;
};

export type CompletedLap = {
	racingNumber: string;
	record: LapRecord;
};

export function parseLapTimeMs(value: string | undefined | null): number | null {
	if (!value) return null;

	const normalized = value.trim().replace(/^\+/, "");

	const withMinutes = /^(\d+):(\d{1,2})(?:\.(\d{1,3}))?$/.exec(normalized);
	if (withMinutes) {
		const minutes = Number(withMinutes[1]);
		const seconds = Number(withMinutes[2]);
		const millis = Number((withMinutes[3] ?? "0").padEnd(3, "0"));
		return minutes * 60_000 + seconds * 1000 + millis;
	}

	const secondsOnly = /^(\d+)(?:\.(\d{1,3}))?$/.exec(normalized);
	if (secondsOnly) {
		const seconds = Number(secondsOnly[1]);
		const millis = Number((secondsOnly[2] ?? "0").padEnd(3, "0"));
		return seconds * 1000 + millis;
	}

	return null;
}

export function formatLapTimeMs(ms: number | null | undefined): string {
	if (ms == null || !Number.isFinite(ms)) return "--";
	const minutes = Math.floor(ms / 60_000);
	const seconds = Math.floor((ms % 60_000) / 1000);
	const millis = Math.round(ms % 1000);
	if (minutes > 0) {
		return `${minutes}:${String(seconds).padStart(2, "0")}.${String(millis).padStart(3, "0")}`;
	}
	return `${seconds}.${String(millis).padStart(3, "0")}`;
}

function gapToLeaderMs(timing: TimingDataDriver): number | null {
	if (Number(timing.Position) === 1) return 0;
	const value = timing.GapToLeader;
	if (!value || value.toUpperCase().includes("L")) return null;
	const parsed = parseLapTimeMs(value);
	return parsed;
}

function currentStint(stints: Stint[] | undefined): Stint | null {
	if (!stints) return null;
	if (Array.isArray(stints)) return stints[stints.length - 1] ?? null;
	// the feed sometimes delivers records instead of arrays
	const entries = Object.entries(stints as Record<string, Stint>).sort(([a], [b]) => Number(a) - Number(b));
	return entries[entries.length - 1]?.[1] ?? null;
}

function sectorMs(timing: TimingDataDriver, index: number): number | null {
	const sectors = timing.Sectors;
	const sector = Array.isArray(sectors) ? sectors[index] : (sectors as Record<string, unknown>)?.[String(index)];
	if (!sector || typeof sector !== "object") return null;
	const value = (sector as { Value?: string }).Value;
	return parseLapTimeMs(value);
}

export function detectCompletedLaps(prev: State | null, next: State, pitFlags: Record<string, boolean>): CompletedLap[] {
	const nextLines = next.TimingData?.Lines;
	const prevLines = prev?.TimingData?.Lines;
	if (!nextLines || !prevLines) return [];

	const completed: CompletedLap[] = [];
	const utc = next.Heartbeat?.Utc ?? new Date().toISOString();

	for (const [racingNumber, line] of Object.entries(nextLines)) {
		const prevLine = prevLines[racingNumber];
		if (!prevLine) continue;

		const prevLaps = prevLine.NumberOfLaps;
		const nextLaps = line.NumberOfLaps;
		if (typeof prevLaps !== "number" || typeof nextLaps !== "number") continue;
		if (nextLaps <= prevLaps) continue;
		if (line.Retired || line.Stopped) continue;

		// only trust LastLapTime if it changed with the lap flank; a frozen value
		// (red flag, missed update) would otherwise be attributed to the wrong lap
		const lapTimeChanged = line.LastLapTime?.Value !== prevLine.LastLapTime?.Value;
		const lapTimeMs = lapTimeChanged ? parseLapTimeMs(line.LastLapTime?.Value) : null;

		const stint = currentStint(next.TimingAppData?.Lines?.[racingNumber]?.Stints);

		completed.push({
			racingNumber,
			record: {
				lap: nextLaps,
				lapTimeMs,
				sectorsMs: [sectorMs(line, 0), sectorMs(line, 1), sectorMs(line, 2)],
				position: line.Position ? Number(line.Position) : null,
				gapToLeaderMs: gapToLeaderMs(line),
				compound: stint?.Compound ?? null,
				tyreAge: stint?.TotalLaps ?? null,
				pitted: pitFlags[racingNumber] ?? false,
				utc,
			},
		});
	}

	return completed;
}

/**
 * Stateful wrapper around `detectCompletedLaps`: tracks pit visits between lap
 * flanks and session changes. Lives outside React so the 200ms data engine
 * tick can feed it without re-renders; consumers reset it via `reset()`.
 */
export class LapHistoryTracker {
	private prev: State | null = null;
	private pitFlags: Record<string, boolean> = {};
	private sessionPath: string | null = null;

	ingest(next: State): { completed: CompletedLap[]; sessionChanged: boolean } {
		const path = next.SessionInfo?.Path ?? null;
		let sessionChanged = false;

		if (path && this.sessionPath && path !== this.sessionPath) {
			sessionChanged = true;
			this.prev = null;
			this.pitFlags = {};
		}
		if (path) this.sessionPath = path;

		const lines = next.TimingData?.Lines;
		if (lines) {
			for (const [racingNumber, line] of Object.entries(lines)) {
				if (line.InPit || line.PitOut) this.pitFlags[racingNumber] = true;
			}
		}

		const completed = detectCompletedLaps(this.prev, next, this.pitFlags);

		for (const lap of completed) {
			// the flag covers the lap that just closed; re-arm for the out lap
			this.pitFlags[lap.racingNumber] = lines?.[lap.racingNumber]?.InPit || lines?.[lap.racingNumber]?.PitOut || false;
		}

		this.prev = next;
		return { completed, sessionChanged };
	}

	reset() {
		this.prev = null;
		this.pitFlags = {};
		this.sessionPath = null;
	}
}

export const lapHistoryTracker = new LapHistoryTracker();

function median(values: number[]): number | null {
	if (values.length === 0) return null;
	const sorted = [...values].sort((a, b) => a - b);
	const mid = Math.floor(sorted.length / 2);
	return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

export function cleanLaps(laps: LapRecord[]): LapRecord[] {
	const timed = laps.filter((lap) => lap.lapTimeMs !== null && !lap.pitted);
	const med = median(timed.map((lap) => lap.lapTimeMs as number));
	if (med === null) return [];
	return timed.filter((lap) => (lap.lapTimeMs as number) < med + 5000);
}

export function linearRegressionSlope(points: Array<[number, number]>): number | null {
	if (points.length < 3) return null;
	const n = points.length;
	const sumX = points.reduce((acc, [x]) => acc + x, 0);
	const sumY = points.reduce((acc, [, y]) => acc + y, 0);
	const sumXY = points.reduce((acc, [x, y]) => acc + x * y, 0);
	const sumXX = points.reduce((acc, [x]) => acc + x * x, 0);
	const denominator = n * sumXX - sumX * sumX;
	if (denominator === 0) return null;
	return (n * sumXY - sumX * sumY) / denominator;
}

export function buildStints(laps: LapRecord[]): StintRecord[] {
	if (laps.length === 0) return [];

	const groups: LapRecord[][] = [];
	let current: LapRecord[] = [];

	for (const lap of laps) {
		const last = current[current.length - 1];
		const tyreReset =
			last && lap.tyreAge !== null && last.tyreAge !== null && lap.tyreAge < last.tyreAge;
		const compoundChanged = last && lap.compound !== null && last.compound !== null && lap.compound !== last.compound;

		if (last && (tyreReset || compoundChanged)) {
			groups.push(current);
			current = [];
		}
		current.push(lap);
	}
	if (current.length > 0) groups.push(current);

	return groups.map((group, index) => {
		const clean = cleanLaps(group);
		const times = clean.map((lap) => lap.lapTimeMs as number);
		const slopePoints: Array<[number, number]> = clean.map((lap) => [lap.lap, lap.lapTimeMs as number]);

		return {
			stint: index + 1,
			compound: group.find((lap) => lap.compound !== null)?.compound ?? null,
			startLap: group[0].lap,
			endLap: group[group.length - 1].lap,
			lapCount: group.length,
			bestMs: times.length > 0 ? Math.min(...times) : null,
			avgMs: times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : null,
			degMsPerLap: linearRegressionSlope(slopePoints),
		};
	});
}
