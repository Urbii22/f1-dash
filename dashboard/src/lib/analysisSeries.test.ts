import { describe, expect, it } from "vitest";
import { lapsToPaceSeries, lapsToPositionSeries } from "@/lib/analysisSeries";
import type { LapRecord } from "@/lib/lapHistory";

const lap = (number: number, time: number | null, position: number | null = number): LapRecord => ({
	lap: number,
	lapTimeMs: time,
	sectorsMs: [null, null, null],
	position,
	gapToLeaderMs: null,
	compound: null,
	tyreAge: null,
	pitted: false,
	utc: "2026-06-11T12:00:00Z",
});

const drivers = { "1": { Tla: "VER", TeamColour: "3671C6" } };

describe("analysis series", () => {
	it("clips pace outliers and omits drivers without timed laps", () => {
		const result = lapsToPaceSeries(
			{ "1": [lap(1, 80_000), lap(2, 80_100), lap(3, 100_000)], "2": [] },
			["1", "2"],
			drivers,
		);
		expect(result).toHaveLength(1);
		expect(result[0].points[2]).toMatchObject({ y: 85_100, clipped: true });
	});

	it("builds position series and skips missing positions", () => {
		const result = lapsToPositionSeries({ "1": [lap(1, 80_000, 2), lap(2, 80_000, null)] }, ["1"], drivers);
		expect(result[0].points).toEqual([{ x: 1, y: 2 }]);
	});

	it("returns empty series for empty data", () => {
		expect(lapsToPaceSeries({}, ["1"], drivers)).toEqual([]);
	});
});
