import { describe, expect, test } from "vitest";

import { buildStandingsStory, sortStandingsRows } from "@/lib/view-models/standings";
import type { DriverStandingRow } from "@/lib/f1data";
import type { ChampionshipPrediction } from "@/types/state.type";

function row(position: number, points: number, code: string, number: string): DriverStandingRow {
	return {
		position,
		points,
		wins: 0,
		driver: { driverId: code.toLowerCase(), code, permanentNumber: number, givenName: code, familyName: "Driver", nationality: null },
		constructorId: "team",
		constructor: "Team",
	};
}

const drivers = [row(1, 100, "VER", "1"), row(2, 90, "NOR", "4"), row(3, 89, "LEC", "16"), row(4, 60, "PIA", "81")];
const prediction = {
	Drivers: {
		"1": { RacingNumber: "1", CurrentPosition: 1, PredictedPosition: 2, CurrentPoints: 100, PredictedPoints: 108 },
		"4": { RacingNumber: "4", CurrentPosition: 2, PredictedPosition: 1, CurrentPoints: 90, PredictedPoints: 110 },
		"16": { RacingNumber: "16", CurrentPosition: 3, PredictedPosition: 5, CurrentPoints: 89, PredictedPoints: 89 },
	},
	Teams: {},
} satisfies ChampionshipPrediction;

describe("buildStandingsStory", () => {
	test("derives podium, leader margin, closest battle, and largest prediction move", () => {
		const model = buildStandingsStory(drivers, prediction);
		expect(model.topThree.map((item) => item.code)).toEqual(["VER", "NOR", "LEC"]);
		expect(model.leaderMargin).toBe(10);
		expect(model.closestBattle).toMatchObject({ driverCodes: ["NOR", "LEC"], points: 1 });
		expect(model.biggestPredictedChange).toMatchObject({ code: "LEC", positions: -2 });
	});

	test("keeps missing live prediction unavailable", () => {
		const model = buildStandingsStory(drivers, undefined);
		expect(model.biggestPredictedChange).toBeNull();
		expect(model.rows.every((item) => item.predictedPosition === null)).toBe(true);
	});
});

describe("sortStandingsRows", () => {
	test("sorts by current position, points, and predicted position", () => {
		const rows = buildStandingsStory(drivers, prediction).rows;
		expect(sortStandingsRows(rows, "position").map((item) => item.code)).toEqual(["VER", "NOR", "LEC", "PIA"]);
		expect(sortStandingsRows(rows, "points").map((item) => item.code)).toEqual(["VER", "NOR", "LEC", "PIA"]);
		expect(sortStandingsRows(rows, "predictedPosition").map((item) => item.code)).toEqual(["NOR", "VER", "LEC", "PIA"]);
	});
});
