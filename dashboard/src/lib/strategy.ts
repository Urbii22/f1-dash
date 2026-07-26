import { cleanLaps, linearRegressionSlope, type LapRecord, type StintRecord } from "@/lib/lapHistory";

export type PaceModel = {
	racingNumber: string;
	// median of the last clean laps, in ms
	baselineMs: number;
	// regression slope of the current stint, ms per lap (>= 0 means losing time)
	degMsPerLap: number;
	compound: string | null;
	tyreAge: number;
	sampleSize: number;
};

export type UndercutProjection = {
	// lap offset (1-based) at which the pitting driver gets ahead; null if never within horizon
	crossoverLap: number | null;
	// projected gap after the stop cycle completes, ms (positive = pitting driver ahead)
	gapAfterStop: number;
	works: boolean;
	horizonLaps: number;
};

export type PitWindow = {
	fromLap: number;
	toLap: number;
};

export const FALLBACK_PIT_LOSS_MS = 22_000;
const MIN_PIT_LOSS_MS = 15_000;
const MAX_PIT_LOSS_MS = 35_000;
const BASELINE_LAPS = 5;
// conservative pace offset of a fresh tyre vs the current one, per compound
const FRESH_TYRE_GAIN_MS = 600;

function median(values: number[]): number | null {
	if (values.length === 0) return null;
	const sorted = [...values].sort((a, b) => a - b);
	const mid = Math.floor(sorted.length / 2);
	return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

export function buildPaceModel(racingNumber: string, laps: LapRecord[], stints: StintRecord[]): PaceModel | null {
	const clean = cleanLaps(laps);
	if (clean.length < 3) return null;

	const recent = clean.slice(-BASELINE_LAPS);
	const baselineMs = median(recent.map((lap) => lap.lapTimeMs as number));
	if (baselineMs === null) return null;

	const currentStint = stints[stints.length - 1];
	const stintLaps = currentStint
		? clean.filter((lap) => lap.lap >= currentStint.startLap && lap.lap <= currentStint.endLap)
		: [];
	const slope = linearRegressionSlope(stintLaps.map((lap) => [lap.lap, lap.lapTimeMs as number]));

	const lastLap = laps[laps.length - 1];

	return {
		racingNumber,
		baselineMs,
		degMsPerLap: slope ?? 0,
		compound: lastLap?.compound ?? null,
		tyreAge: lastLap?.tyreAge ?? laps.length,
		sampleSize: clean.length,
	};
}

/**
 * Estimates pit lane time loss from pit cycles already seen this session:
 * the combined over-baseline time of each in-lap/out-lap pair. Falls back to a
 * generic constant when no stops have happened yet.
 */
export function estimatePitLoss(lapsByDriver: Record<string, LapRecord[]>): number {
	const losses: number[] = [];

	for (const laps of Object.values(lapsByDriver)) {
		const clean = cleanLaps(laps);
		const baseline = median(clean.map((lap) => lap.lapTimeMs as number));
		if (baseline === null) continue;

		// group maximal runs of consecutive pitted laps (a pit window: the in-lap,
		// the out-lap, and any extra slow laps). Summing each run's excess over the
		// clean baseline is robust to the feed marking only one of the pair pitted.
		let i = 0;
		while (i < laps.length) {
			if (!laps[i].pitted) {
				i++;
				continue;
			}

			let excess = 0;
			let valid = true;
			let runLength = 0;
			while (i < laps.length && laps[i].pitted) {
				const lapTime = laps[i].lapTimeMs;
				if (lapTime === null) valid = false;
				else excess += lapTime - baseline;
				runLength++;
				i++;
			}

			// a single missing lap time invalidates the window's total
			if (valid && runLength > 0 && excess > 5000 && excess < 90_000) losses.push(excess);
		}
	}

	const estimated = median(losses);
	if (estimated === null) return FALLBACK_PIT_LOSS_MS;
	return Math.min(MAX_PIT_LOSS_MS, Math.max(MIN_PIT_LOSS_MS, estimated));
}

/**
 * Projects an undercut: driver A pits now (fresh tyre, pit loss), driver B
 * stays out. Positive gap means A is ahead. `gapMs` is the current gap from
 * A to B (positive = A ahead).
 */
export function projectUndercut(
	a: PaceModel,
	b: PaceModel,
	gapMs: number,
	pitLossMs: number,
	horizonLaps = 15,
): UndercutProjection {
	// A resets degradation and gains fresh-tyre pace; B keeps degrading
	const freshGain = Math.max(0, a.degMsPerLap) * a.tyreAge + FRESH_TYRE_GAIN_MS;
	const paceA = a.baselineMs - freshGain;
	let gap = gapMs - pitLossMs;
	let crossoverLap: number | null = gap > 0 ? 0 : null;

	for (let lap = 1; lap <= horizonLaps; lap++) {
		const lapA = paceA + Math.max(0, a.degMsPerLap) * lap;
		const lapB = b.baselineMs + Math.max(0, b.degMsPerLap) * lap;
		gap += lapB - lapA;
		if (crossoverLap === null && gap > 0) crossoverLap = lap;
	}

	return {
		crossoverLap,
		gapAfterStop: Math.round(gap),
		works: crossoverLap !== null,
		horizonLaps,
	};
}

/**
 * Estimates the lap window where pitting beats staying out: cumulative
 * degradation versus a fresh tyre exceeds the pit loss around lap
 * k = sqrt(2 * pitLoss / deg) of remaining tyre life.
 */
export function estimatePitWindow(
	model: PaceModel,
	pitLossMs: number,
	currentLap: number,
	totalLaps: number | null,
): PitWindow | null {
	if (model.degMsPerLap < 50) return null; // flat or improving pace: no forced window

	const lapsToBreakEven = Math.sqrt((2 * pitLossMs) / model.degMsPerLap);
	const center = currentLap + Math.round(lapsToBreakEven - model.tyreAge / 2);

	let fromLap = Math.max(currentLap, center - 3);
	let toLap = center + 3;

	if (totalLaps !== null) {
		if (fromLap >= totalLaps) return null;
		toLap = Math.min(toLap, totalLaps - 1);
		fromLap = Math.min(fromLap, toLap);
	}

	return { fromLap, toLap };
}

export function formatStrategyGap(ms: number): string {
	const sign = ms >= 0 ? "+" : "-";
	return `${sign}${(Math.abs(ms) / 1000).toFixed(1)}s`;
}
