import type { ChartSeries } from "@/components/analysis/LineChart";
import type { LapRecord } from "@/lib/lapHistory";

export type AnalysisDriver = { Tla?: string; TeamColour?: string };
export type AnalysisDrivers = Record<string, AnalysisDriver>;
export type LapsByDriver = Record<string, LapRecord[]>;

export function driverIdentity(nr: string, drivers?: AnalysisDrivers) {
	const driver = drivers?.[nr];
	return { label: driver?.Tla ?? `#${nr}`, color: driver?.TeamColour ? `#${driver.TeamColour}` : "#22d3ee" };
}

function identity(nr: string, drivers?: AnalysisDrivers) {
	return driverIdentity(nr, drivers);
}

export function lapsToPaceSeries(laps: LapsByDriver, selected: string[], drivers?: AnalysisDrivers): ChartSeries[] {
	const timed = selected.flatMap((nr) => (laps[nr] ?? []).filter((lap) => lap.lapTimeMs !== null));
	if (timed.length === 0) return [];
	const sorted = timed.map((lap) => lap.lapTimeMs as number).sort((a, b) => a - b);
	const clipMax = sorted[Math.floor(sorted.length / 2)] + 5000;
	return selected
		.map((nr) => ({
			id: nr,
			...identity(nr, drivers),
			points: (laps[nr] ?? [])
				.filter((lap) => lap.lapTimeMs !== null)
				.map((lap) => ({
					x: lap.lap,
					y: Math.min(lap.lapTimeMs as number, clipMax),
					clipped: (lap.lapTimeMs as number) > clipMax || lap.pitted,
				})),
		}))
		.filter((series) => series.points.length > 0);
}

export function lapsToPositionSeries(laps: LapsByDriver, selected: string[], drivers?: AnalysisDrivers): ChartSeries[] {
	return selected
		.map((nr) => ({
			id: nr,
			...identity(nr, drivers),
			points: (laps[nr] ?? [])
				.filter((lap) => lap.position !== null)
				.map((lap) => ({ x: lap.lap, y: lap.position as number })),
		}))
		.filter((series) => series.points.length > 0);
}
