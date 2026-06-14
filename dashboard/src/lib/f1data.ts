// Shapes mirror the normalised payloads from the Rust `api` /api/f1/* proxy
// (which itself wraps Jolpica/Ergast). The dashboard only ever sees these.

export type DriverRef = {
	driverId: string | null;
	code: string | null;
	permanentNumber: string | null;
	givenName: string | null;
	familyName: string | null;
	nationality: string | null;
};

export type DriverStandingRow = {
	position: number | null;
	points: number | null;
	wins: number | null;
	driver: DriverRef;
	constructorId: string | null;
	constructor: string | null;
};

export type ConstructorStandingRow = {
	position: number | null;
	points: number | null;
	wins: number | null;
	constructorId: string | null;
	name: string | null;
	nationality: string | null;
};

export type StandingsResponse<T> = {
	season: string | null;
	round: string | null;
	standings: T[];
};

export type SeasonRound = {
	season: string | null;
	round: number | null;
	raceName: string | null;
	date: string | null;
	time: string | null;
	circuitName: string | null;
	country: string | null;
	locality: string | null;
};

export type ResultRow = {
	position: number | null;
	points: number | null;
	grid: number | null;
	laps: number | null;
	status: string | null;
	time: string | null;
	driver: DriverRef;
	constructor: string | null;
	fastestLapRank: string | null;
	fastestLapTime: string | null;
};

export type RaceResult = SeasonRound & { results: ResultRow[] };

export type QualiRow = {
	position: number | null;
	driver: DriverRef;
	constructor: string | null;
	q1: string | null;
	q2: string | null;
	q3: string | null;
};

export type QualiResult = SeasonRound & { results: QualiRow[] };

export type DriverSeasonRound = {
	round: number | null;
	raceName: string | null;
	position: number | null;
	points: number | null;
	grid: number | null;
	status: string | null;
};

// --- server-side fetchers (degrade to null/empty so pages render gracefully) --

async function getJson<T>(path: string): Promise<T | null> {
	try {
		// server-side only; the Rust proxy already disk-caches the upstream Jolpica call
		const res = await fetch(`${process.env.API_URL ?? ""}${path}`, { next: { revalidate: 300 } });
		if (!res.ok) return null;
		return (await res.json()) as T;
	} catch {
		return null;
	}
}

function seasonParam(season?: number): string {
	return season ? `?season=${season}` : "";
}

export function getDriverStandings(season?: number) {
	return getJson<StandingsResponse<DriverStandingRow>>(`/api/f1/standings/drivers${seasonParam(season)}`);
}

export function getConstructorStandings(season?: number) {
	return getJson<StandingsResponse<ConstructorStandingRow>>(`/api/f1/standings/constructors${seasonParam(season)}`);
}

export function getSeason(season?: number) {
	return getJson<{ rounds: SeasonRound[] }>(`/api/f1/season${seasonParam(season)}`);
}

export function getResults(round: number, season?: number) {
	const q = season ? `?season=${season}&round=${round}` : `?round=${round}`;
	return getJson<RaceResult | null>(`/api/f1/results${q}`);
}

export function getQualifying(round: number, season?: number) {
	const q = season ? `?season=${season}&round=${round}` : `?round=${round}`;
	return getJson<QualiResult | null>(`/api/f1/qualifying${q}`);
}

export function getDriverSeason(driverId: string, season?: number) {
	return getJson<{ rounds: DriverSeasonRound[] }>(`/api/f1/driver/${driverId}${seasonParam(season)}`);
}

export async function getRoundResults(rounds: SeasonRound[], season: number, now = new Date()) {
	const loaded: Array<{ round: SeasonRound; result: RaceResult | null }> = [];
	for (const round of rounds) {
		if (
			round.round == null ||
			!round.date ||
			Date.parse(`${round.date}T${round.time ?? "00:00:00Z"}`) > now.getTime()
		) {
			loaded.push({ round, result: null });
			continue;
		}
		loaded.push({ round, result: await getResults(round.round, season) });
	}
	return loaded;
}

// --- pure helpers (unit-tested) ----------------------------------------------

export function driverFullName(driver: DriverRef): string {
	const name = [driver.givenName, driver.familyName].filter(Boolean).join(" ");
	return name || driver.code || driver.driverId || "—";
}

/** Points behind the leader (row 0). 0 for the leader; null if points missing. */
export function gapToLeader(points: number | null, leaderPoints: number | null): number | null {
	if (points == null || leaderPoints == null) return null;
	return leaderPoints - points;
}

export function podium<T extends { position: number | null }>(rows: T[]): T[] {
	return [...rows].sort((a, b) => (a.position ?? 999) - (b.position ?? 999)).slice(0, 3);
}
