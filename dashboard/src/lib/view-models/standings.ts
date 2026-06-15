import { driverFullName, podium, type DriverStandingRow } from "@/lib/f1data";
import type { ChampionshipPrediction } from "@/types/state.type";

export type StandingsStoryRow = {
	position: number | null;
	predictedPosition: number | null;
	points: number | null;
	predictedPoints: number | null;
	wins: number | null;
	code: string;
	name: string;
	driverId: string | null;
	constructor: string | null;
};

export type StandingsStoryModel = {
	topThree: StandingsStoryRow[];
	leaderMargin: number | null;
	closestBattle: { driverCodes: [string, string]; points: number } | null;
	biggestPredictedChange: { code: string; positions: number } | null;
	rows: StandingsStoryRow[];
};

export type StandingsSortKey = "position" | "points" | "predictedPosition";

export function sortStandingsRows(rows: StandingsStoryRow[], key: StandingsSortKey): StandingsStoryRow[] {
	return [...rows].sort((a, b) => {
		if (key === "points") return (b.points ?? Number.NEGATIVE_INFINITY) - (a.points ?? Number.NEGATIVE_INFINITY);
		return (a[key] ?? Number.POSITIVE_INFINITY) - (b[key] ?? Number.POSITIVE_INFINITY);
	});
}

export function buildStandingsStory(drivers: DriverStandingRow[], prediction?: ChampionshipPrediction): StandingsStoryModel {
	const rows = drivers.map((standing) => {
		const predicted = standing.driver.permanentNumber ? prediction?.Drivers?.[standing.driver.permanentNumber] : undefined;
		return {
			position: standing.position,
			predictedPosition: predicted?.PredictedPosition ?? null,
			points: standing.points,
			predictedPoints: predicted?.PredictedPoints ?? null,
			wins: standing.wins,
			code: standing.driver.code ?? standing.driver.permanentNumber ?? "-",
			name: driverFullName(standing.driver),
			driverId: standing.driver.driverId,
			constructor: standing.constructor,
		};
	});
	const ordered = sortStandingsRows(rows, "position");
	const leaderMargin = ordered[0]?.points != null && ordered[1]?.points != null ? ordered[0].points - ordered[1].points : null;

	const closestBattle = ordered.slice(0, -1).flatMap((row, index) => {
		const next = ordered[index + 1];
		if (row.points == null || next?.points == null) return [];
		return [{ driverCodes: [row.code, next.code] as [string, string], points: Math.abs(row.points - next.points) }];
	}).sort((a, b) => a.points - b.points)[0] ?? null;

	const biggestPredictedChange = ordered.flatMap((row) => {
		if (row.position == null || row.predictedPosition == null) return [];
		return [{ code: row.code, positions: row.position - row.predictedPosition }];
	}).sort((a, b) => Math.abs(b.positions) - Math.abs(a.positions))[0] ?? null;

	return { topThree: podium(ordered), leaderMargin, closestBattle, biggestPredictedChange, rows: ordered };
}
