import { describe, expect, it } from "vitest";
import { buildQualiRanking } from "@/components/archive/QualiReport";
import type { LapRecord } from "@/lib/lapHistory";
const lap = (lap: number, time: number, sectors: [number, number, number]): LapRecord => ({
	lap,
	lapTimeMs: time,
	sectorsMs: sectors,
	position: null,
	gapToLeaderMs: null,
	compound: null,
	tyreAge: null,
	pitted: false,
	utc: "x",
});
describe("buildQualiRanking", () => {
	it("ranks fastest laps and calculates theoretical best", () => {
		const rows = buildQualiRanking(
			{
				"1": [lap(1, 80000, [26000, 30000, 24000]), lap(2, 80500, [25500, 31000, 24000])],
				"2": [lap(1, 81000, [27000, 30000, 24000])],
			},
			{},
		);
		expect(rows.map((r) => r.nr)).toEqual(["1", "2"]);
		expect(rows[0]).toMatchObject({ bestMs: 80000, theoreticalMs: 79500, deltaMs: 0 });
		expect(rows[1].deltaMs).toBe(1000);
	});
});
