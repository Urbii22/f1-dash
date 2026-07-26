import type { QualiResult, RaceResult, ResultRow } from "@/lib/f1data";

export type DriverSeasonSummary = {
	points: number;
	wins: number;
	podiums: number;
	best: number | null;
	worst: number | null;
	starts: number;
};

type Score = { a: number; b: number; ties: number };

export type SeasonH2H = {
	a: DriverSeasonSummary;
	b: DriverSeasonSummary;
	race: Score;
	qualifying: Score;
};

export function summarizeDriverSeason(rows: Array<Pick<ResultRow, "position" | "points">>): DriverSeasonSummary {
	const positions = rows.map((row) => row.position).filter((position): position is number => position != null);
	return {
		points: rows.reduce((total, row) => total + (row.points ?? 0), 0),
		wins: positions.filter((position) => position === 1).length,
		podiums: positions.filter((position) => position <= 3).length,
		best: positions.length ? Math.min(...positions) : null,
		worst: positions.length ? Math.max(...positions) : null,
		starts: rows.length,
	};
}

export function buildSeasonH2H(
	driverA: string,
	driverB: string,
	races: RaceResult[],
	qualifying: QualiResult[],
): SeasonH2H {
	const rowsA = races.flatMap((race) => race.results.filter((row) => row.driver.driverId === driverA));
	const rowsB = races.flatMap((race) => race.results.filter((row) => row.driver.driverId === driverB));
	const race = compareRounds(
		races.map((item) => [
			item.results.find((row) => row.driver.driverId === driverA)?.position ?? null,
			item.results.find((row) => row.driver.driverId === driverB)?.position ?? null,
		]),
	);
	const qualifyingScore = compareRounds(
		qualifying.map((item) => [
			item.results.find((row) => row.driver.driverId === driverA)?.position ?? null,
			item.results.find((row) => row.driver.driverId === driverB)?.position ?? null,
		]),
	);
	return {
		a: summarizeDriverSeason(rowsA),
		b: summarizeDriverSeason(rowsB),
		race,
		qualifying: qualifyingScore,
	};
}

function compareRounds(pairs: Array<[number | null, number | null]>): Score {
	return pairs.reduce<Score>(
		(score, [a, b]) => {
			if (a == null || b == null) return score;
			if (a < b) score.a += 1;
			else if (b < a) score.b += 1;
			else score.ties += 1;
			return score;
		},
		{ a: 0, b: 0, ties: 0 },
	);
}
