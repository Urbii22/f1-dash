import type { ChartSeries } from "@/components/analysis/LineChart";
import { driverIdentity, type AnalysisDrivers, type LapsByDriver } from "@/lib/analysisSeries";
import { parseLapTimeMs, type StintRecord } from "@/lib/lapHistory";
import type { TimingStats } from "@/types/state.type";

type StatsLines = TimingStats["Lines"];
export type StintsByDriver = Record<string, StintRecord[]>;

/**
 * One row of the "potential lap" view: a driver's real best lap against the
 * theoretical lap formed by summing their best sectors. `deltaMs` is the time
 * left on the table (real − theoretical, ≥ 0); `gapMs` is the gap to the
 * fastest real lap of the field (0 for the leader).
 */
export type PotentialLapRow = {
	nr: string;
	label: string;
	bestMs: number;
	theoreticalMs: number | null;
	deltaMs: number | null;
	gapMs: number;
};

export type TopSpeedRow = {
	nr: string;
	label: string;
	kph: number;
	// 0..1 relative to the fastest trap, for rendering a horizontal bar
	fraction: number;
};

export type SectorRow = {
	nr: string;
	label: string;
	valueMs: number;
	deltaMs: number;
	position: number | null;
};

export type BestSectorsGroup = {
	sector: 0 | 1 | 2;
	rows: SectorRow[];
};

export type LongStintRow = {
	nr: string;
	label: string;
	compound: string | null;
	laps: number;
	avgMs: number | null;
	bestMs: number | null;
	degMsPerLap: number | null;
};

function statValue(value: string | undefined | null): number | null {
	return parseLapTimeMs(value);
}

function toPotentialRows(
	entries: Array<{ nr: string; bestMs: number | null; theoreticalMs: number | null }>,
	drivers?: AnalysisDrivers,
): PotentialLapRow[] {
	const rows = entries
		.filter((e): e is { nr: string; bestMs: number; theoreticalMs: number | null } => e.bestMs !== null)
		.map((e) => ({ ...e, label: driverIdentity(e.nr, drivers).label }))
		.sort((a, b) => a.bestMs - b.bestMs);

	const fieldBest = rows[0]?.bestMs ?? 0;
	return rows.map((r) => ({
		nr: r.nr,
		label: r.label,
		bestMs: r.bestMs,
		theoreticalMs: r.theoreticalMs,
		// theoretical is never slower than the real lap, so the delta stays ≥ 0
		deltaMs: r.theoreticalMs === null ? null : Math.max(0, r.bestMs - r.theoreticalMs),
		gapMs: r.bestMs - fieldBest,
	}));
}

/** Potential laps from the live TimingStats feed (best lap + best sectors per driver). */
export function buildPotentialLaps(stats: StatsLines | undefined, drivers?: AnalysisDrivers): PotentialLapRow[] {
	if (!stats) return [];
	const entries = Object.entries(stats).map(([nr, line]) => {
		const bestMs = statValue(line.PersonalBestLapTime?.Value);
		const sectors = [0, 1, 2].map((i) => statValue(line.BestSectors?.[i]?.Value));
		const theoreticalMs = sectors.every((s): s is number => s !== null)
			? sectors.reduce((a, b) => a + (b as number), 0)
			: null;
		return { nr, bestMs, theoreticalMs };
	});
	return toPotentialRows(entries, drivers);
}

/** Potential laps from recorded lap history (best lap + best sector observed across the laps). */
export function buildPotentialLapsFromLaps(laps: LapsByDriver, drivers?: AnalysisDrivers): PotentialLapRow[] {
	const entries = Object.entries(laps).map(([nr, items]) => {
		const timed = items.filter((l) => l.lapTimeMs !== null);
		const bestMs = timed.length > 0 ? Math.min(...timed.map((l) => l.lapTimeMs as number)) : null;
		const sectorBests = [0, 1, 2].map((i) => {
			const values = items.map((l) => l.sectorsMs[i]).filter((v): v is number => v !== null);
			return values.length > 0 ? Math.min(...values) : null;
		});
		const theoreticalMs = sectorBests.every((s): s is number => s !== null)
			? sectorBests.reduce((a, b) => a + (b as number), 0)
			: null;
		return { nr, bestMs, theoreticalMs };
	});
	return toPotentialRows(entries, drivers);
}

function toTopSpeedRows(
	entries: Array<{ nr: string; kph: number }>,
	drivers?: AnalysisDrivers,
): TopSpeedRow[] {
	const rows = entries
		.filter((r) => Number.isFinite(r.kph) && r.kph > 0)
		.map((r) => ({ nr: r.nr, label: driverIdentity(r.nr, drivers).label, kph: r.kph }))
		.sort((a, b) => b.kph - a.kph);
	const max = rows[0]?.kph ?? 0;
	return rows.map((r) => ({ ...r, fraction: max > 0 ? r.kph / max : 0 }));
}

function toBestSectorGroups(
	bestPerDriver: (sector: 0 | 1 | 2) => Array<{ nr: string; valueMs: number; position: number | null }>,
	drivers?: AnalysisDrivers,
): BestSectorsGroup[] {
	return ([0, 1, 2] as const).map((sector) => {
		const rows = bestPerDriver(sector)
			.map((r) => ({ ...r, label: driverIdentity(r.nr, drivers).label }))
			.sort((a, b) => a.valueMs - b.valueMs);
		const best = rows[0]?.valueMs ?? 0;
		return { sector, rows: rows.map((r) => ({ ...r, deltaMs: r.valueMs - best })) };
	});
}

/** Speed-trap ranking (km/h) from the live TimingStats feed. */
export function buildTopSpeeds(stats: StatsLines | undefined, drivers?: AnalysisDrivers): TopSpeedRow[] {
	if (!stats) return [];
	return toTopSpeedRows(
		Object.entries(stats).map(([nr, line]) => {
			const raw = line.BestSpeeds?.ST?.Value;
			return { nr, kph: raw ? parseInt(raw, 10) : NaN };
		}),
		drivers,
	);
}

/** Speed-trap ranking (km/h) from recorded laps (max per-lap trap per driver). */
export function buildTopSpeedsFromLaps(laps: LapsByDriver, drivers?: AnalysisDrivers): TopSpeedRow[] {
	return toTopSpeedRows(
		Object.entries(laps).map(([nr, items]) => {
			const traps = items.map((l) => l.speedTrapKph).filter((v): v is number => v != null && v > 0);
			return { nr, kph: traps.length > 0 ? Math.max(...traps) : NaN };
		}),
		drivers,
	);
}

/** Per-sector best times (S1/S2/S3) from the live TimingStats feed. */
export function buildBestSectors(stats: StatsLines | undefined, drivers?: AnalysisDrivers): BestSectorsGroup[] {
	if (!stats) return [];
	return toBestSectorGroups(
		(sector) =>
			Object.entries(stats).flatMap(([nr, line]) => {
				const best = line.BestSectors?.[sector];
				const valueMs = statValue(best?.Value);
				return valueMs === null ? [] : [{ nr, valueMs, position: (best?.Position ?? null) as number | null }];
			}),
		drivers,
	);
}

/** Per-sector best times (S1/S2/S3) from recorded laps (min per-sector per driver). */
export function buildBestSectorsFromLaps(laps: LapsByDriver, drivers?: AnalysisDrivers): BestSectorsGroup[] {
	return toBestSectorGroups(
		(sector) =>
			Object.entries(laps).flatMap(([nr, items]) => {
				const values = items.map((l) => l.sectorsMs[sector]).filter((v): v is number => v !== null);
				return values.length === 0
					? []
					: [{ nr, valueMs: Math.min(...values), position: null as number | null }];
			}),
		drivers,
	);
}

/** Running best lap up to each lap N per driver — shows track/car evolution over a session. */
export function buildBestLapEvolution(
	laps: LapsByDriver,
	selected: string[],
	drivers?: AnalysisDrivers,
): ChartSeries[] {
	return selected
		.map((nr) => {
			let running = Infinity;
			const points = (laps[nr] ?? [])
				.filter((l) => l.lapTimeMs !== null && !l.pitted)
				.map((l) => {
					running = Math.min(running, l.lapTimeMs as number);
					return { x: l.lap, y: running };
				});
			return { id: nr, ...driverIdentity(nr, drivers), points };
		})
		.filter((series) => series.points.length > 0);
}

/** Long stints (≥ minLaps) flattened across drivers, best average pace first. */
export function buildLongStints(
	stints: StintsByDriver | undefined,
	drivers?: AnalysisDrivers,
	minLaps = 6,
): LongStintRow[] {
	if (!stints) return [];
	return Object.entries(stints)
		.flatMap(([nr, list]) =>
			(list ?? [])
				.filter((s) => s.lapCount >= minLaps)
				.map((s) => ({
					nr,
					label: driverIdentity(nr, drivers).label,
					compound: s.compound,
					laps: s.lapCount,
					avgMs: s.avgMs,
					bestMs: s.bestMs,
					degMsPerLap: s.degMsPerLap,
				})),
		)
		.sort((a, b) => (a.avgMs ?? Infinity) - (b.avgMs ?? Infinity));
}

/** Scatter of speed trap (y, km/h) vs lap time (x, ms) per selected driver. */
export function buildSpeedVsLapTime(
	laps: LapsByDriver,
	selected: string[],
	drivers?: AnalysisDrivers,
): ChartSeries[] {
	return selected
		.map((nr) => ({
			id: nr,
			...driverIdentity(nr, drivers),
			points: (laps[nr] ?? [])
				.filter((l) => l.lapTimeMs !== null && l.speedTrapKph != null && !l.pitted)
				.map((l) => ({ x: l.lapTimeMs as number, y: l.speedTrapKph as number })),
		}))
		.filter((series) => series.points.length > 0);
}
