import { describe, expect, it } from "vitest";

import { buildSeasonH2H, summarizeDriverSeason } from "@/lib/seasonH2H";
import type { DriverRef, QualiResult, RaceResult, ResultRow } from "@/lib/f1data";

const driver = (driverId: string): DriverRef => ({
	driverId,
	code: driverId.toUpperCase(),
	permanentNumber: null,
	givenName: driverId,
	familyName: "Driver",
	nationality: null,
});
const row = (driverId: string, position: number, points: number, grid = position): ResultRow => ({
	position,
	points,
	grid,
	laps: 60,
	status: "Finished",
	time: null,
	driver: driver(driverId),
	constructor: "Team",
	fastestLapRank: null,
	fastestLapTime: null,
});
const race = (round: number, rows: ResultRow[]): RaceResult => ({
	season: "2026",
	round,
	raceName: `Race ${round}`,
	date: null,
	time: null,
	circuitName: null,
	country: null,
	locality: null,
	results: rows,
});
const quali = (round: number, a: number, b: number): QualiResult => ({
	season: "2026",
	round,
	raceName: `Race ${round}`,
	date: null,
	time: null,
	circuitName: null,
	country: null,
	locality: null,
	results: [
		{ position: a, driver: driver("a"), constructor: "Team", q1: null, q2: null, q3: null },
		{ position: b, driver: driver("b"), constructor: "Team", q1: null, q2: null, q3: null },
	],
});

describe("summarizeDriverSeason", () => {
	it("calculates points, podiums and best/worst results", () => {
		const summary = summarizeDriverSeason([row("a", 1, 25), row("a", 4, 12), row("a", 2, 18)]);
		expect(summary).toEqual({ points: 55, wins: 1, podiums: 2, best: 1, worst: 4, starts: 3 });
	});
});

describe("buildSeasonH2H", () => {
	it("compares race and qualifying head-to-head only where both drivers have results", () => {
		const races = [race(1, [row("a", 1, 25), row("b", 2, 18)]), race(2, [row("a", 5, 10), row("b", 3, 15)])];
		const result = buildSeasonH2H("a", "b", races, [quali(1, 2, 1), quali(2, 1, 3)]);
		expect(result.race).toEqual({ a: 1, b: 1, ties: 0 });
		expect(result.qualifying).toEqual({ a: 1, b: 1, ties: 0 });
		expect(result.a.points).toBe(35);
		expect(result.b.points).toBe(33);
	});

	it("returns zeroed comparisons for missing drivers", () => {
		const result = buildSeasonH2H("a", "missing", [race(1, [row("a", 1, 25)])], []);
		expect(result.race).toEqual({ a: 0, b: 0, ties: 0 });
		expect(result.b.starts).toBe(0);
	});
});
