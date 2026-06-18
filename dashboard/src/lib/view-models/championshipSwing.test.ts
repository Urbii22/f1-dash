import { describe, expect, it } from "vitest";

import { buildChampionshipSwing } from "@/lib/view-models/championshipSwing";
import type { ChampionshipPrediction, DriverList } from "@/types/state.type";

const prediction = (drivers: ChampionshipPrediction["Drivers"]): ChampionshipPrediction =>
	({ Drivers: drivers, Teams: {} }) as ChampionshipPrediction;

const driverList = (map: Record<string, string>): DriverList =>
	Object.fromEntries(Object.entries(map).map(([nr, Tla]) => [nr, { Tla }])) as unknown as DriverList;

describe("buildChampionshipSwing", () => {
	it("computes position and points deltas, sorted by predicted position", () => {
		const model = buildChampionshipSwing(
			prediction({
				"1": { RacingNumber: "1", CurrentPosition: 1, PredictedPosition: 2, CurrentPoints: 200, PredictedPoints: 210 },
				"4": { RacingNumber: "4", CurrentPosition: 3, PredictedPosition: 1, CurrentPoints: 180, PredictedPoints: 205 },
			}),
			driverList({ "1": "VER", "4": "NOR" }),
		);
		expect(model.rows.map((r) => r.tla)).toEqual(["NOR", "VER"]); // predicted P1 first
		const nor = model.rows.find((r) => r.tla === "NOR");
		expect(nor).toMatchObject({ positionDelta: 2, pointsDelta: 25 }); // P3 → P1 = +2
		const ver = model.rows.find((r) => r.tla === "VER");
		expect(ver?.positionDelta).toBe(-1); // P1 → P2 = -1
		expect(model.biggestMover?.tla).toBe("NOR");
	});

	it("returns empty without a prediction", () => {
		expect(buildChampionshipSwing(undefined, undefined)).toEqual({ rows: [], biggestMover: null });
	});
});
