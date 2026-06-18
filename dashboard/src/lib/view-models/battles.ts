import type { State, TimingDataDriver } from "@/types/state.type";

// Snapshot of the on-track fights right now: any car within `threshold` seconds of
// the car ahead, not in a pit cycle. Distinct from the race-story feed (a log of
// past events) — this is the current state of play, ordered by closeness. Pure.

export type Battle = {
	id: string;
	/** Chasing car (behind). */
	attackerNr: string;
	attackerTla: string;
	/** Car being chased (ahead). */
	defenderNr: string;
	defenderTla: string;
	/** Position being contested (the defender's place). */
	position: number;
	gapSeconds: number;
	/** Feed flag: the gap is shrinking. */
	catching: boolean;
};

export const BATTLE_THRESHOLD_S = 1.0;

function parseSeconds(value: string | undefined): number | null {
	if (!value) return null;
	const normalized = value.trim().replace(/^\+/, "");
	if (!/^\d+(?:\.\d+)?$/.test(normalized)) return null;
	const parsed = Number(normalized);
	return Number.isFinite(parsed) ? parsed : null;
}

function inPitCycle(line: TimingDataDriver | undefined): boolean {
	return !!line && (line.InPit || line.PitOut || line.Retired || line.Stopped);
}

export function buildBattles(state: State | null, threshold = BATTLE_THRESHOLD_S): Battle[] {
	const lines = state?.TimingData?.Lines;
	if (!lines) return [];
	const drivers = state?.DriverList;

	// position → racing number, to find the car directly ahead.
	const byPosition = new Map<number, string>();
	for (const [nr, line] of Object.entries(lines)) {
		const position = Number(line.Position);
		if (position) byPosition.set(position, nr);
	}

	const tla = (nr: string) => drivers?.[nr]?.Tla ?? `#${nr}`;
	const battles: Battle[] = [];

	for (const [nr, line] of Object.entries(lines)) {
		const gap = parseSeconds(line.IntervalToPositionAhead?.Value);
		if (gap === null || gap > threshold) continue;
		if (inPitCycle(line)) continue;

		const position = Number(line.Position);
		if (!position || position < 2) continue; // leader has no car ahead

		const aheadNr = byPosition.get(position - 1);
		if (!aheadNr || inPitCycle(lines[aheadNr])) continue;

		battles.push({
			id: `battle.${aheadNr}.${nr}`,
			attackerNr: nr,
			attackerTla: tla(nr),
			defenderNr: aheadNr,
			defenderTla: tla(aheadNr),
			position: position - 1,
			gapSeconds: gap,
			catching: Boolean(line.IntervalToPositionAhead?.Catching),
		});
	}

	return battles.sort((a, b) => a.gapSeconds - b.gapSeconds);
}
