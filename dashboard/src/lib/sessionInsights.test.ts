import { describe, expect, it } from "vitest";

import type { LapRecord, StintRecord } from "@/lib/lapHistory";
import {
	buildBestLapEvolution,
	buildBestSectors,
	buildBestSectorsFromLaps,
	buildLongStints,
	buildPotentialLaps,
	buildPotentialLapsFromLaps,
	buildSpeedVsLapTime,
	buildTopSpeeds,
	buildTopSpeedsFromLaps,
	type StintsByDriver,
} from "@/lib/sessionInsights";
import type { TimingStats } from "@/types/state.type";

const pb = (value: string, position = 0) => ({ Value: value, Position: position });

function statsLine(nr: string, best: string, sectors: [string, string, string], stKph: string) {
	return {
		Line: Number(nr),
		RacingNumber: nr,
		PersonalBestLapTime: pb(best),
		BestSectors: sectors.map((s, i) => pb(s, i + 1)),
		BestSpeeds: { I1: pb(""), I2: pb(""), FL: pb(""), ST: pb(stKph) },
	};
}

const stats: TimingStats["Lines"] = {
	"1": statsLine("1", "1:20.000", ["26.000", "30.000", "24.000"], "320"),
	"2": statsLine("2", "1:21.000", ["27.000", "30.000", "24.000"], "318"),
};

const lap = (n: number, time: number | null, sectors: [number, number, number], speedTrapKph: number | null): LapRecord => ({
	lap: n,
	lapTimeMs: time,
	sectorsMs: sectors,
	position: null,
	gapToLeaderMs: null,
	compound: null,
	tyreAge: null,
	pitted: false,
	speedTrapKph,
	utc: "x",
});

describe("buildPotentialLaps (live stats)", () => {
	it("computes theoretical ≤ real and gap to pole", () => {
		const rows = buildPotentialLaps(stats);
		expect(rows.map((r) => r.nr)).toEqual(["1", "2"]);
		expect(rows[0]).toMatchObject({ bestMs: 80_000, theoreticalMs: 80_000, deltaMs: 0, gapMs: 0 });
		expect(rows[1].gapMs).toBe(1_000);
		// every theoretical lap is at least as fast as the real one
		for (const r of rows) {
			if (r.theoreticalMs !== null) expect(r.theoreticalMs).toBeLessThanOrEqual(r.bestMs);
		}
	});

	it("returns null theoretical when a best sector is missing", () => {
		const partial: TimingStats["Lines"] = {
			"1": { ...stats["1"], BestSectors: [pb("26.000"), pb(""), pb("24.000")] },
		};
		expect(buildPotentialLaps(partial)[0].theoreticalMs).toBeNull();
	});
});

describe("buildPotentialLapsFromLaps (history)", () => {
	it("uses the best sector observed across laps", () => {
		const rows = buildPotentialLapsFromLaps({
			"1": [lap(1, 80_000, [26_000, 30_000, 24_000], null), lap(2, 80_500, [25_500, 31_000, 24_000], null)],
			"2": [lap(1, 81_000, [27_000, 30_000, 24_000], null)],
		});
		expect(rows[0]).toMatchObject({ nr: "1", bestMs: 80_000, theoreticalMs: 79_500, gapMs: 0 });
		expect(rows[1].gapMs).toBe(1_000);
	});
});

describe("buildTopSpeeds", () => {
	it("ranks fastest first with a relative bar fraction", () => {
		const rows = buildTopSpeeds(stats);
		expect(rows.map((r) => r.kph)).toEqual([320, 318]);
		expect(rows[0].fraction).toBe(1);
		expect(rows[1].fraction).toBeCloseTo(318 / 320);
	});
});

describe("buildBestSectors", () => {
	it("ranks each sector with the gap to the sector best", () => {
		const groups = buildBestSectors(stats);
		expect(groups.map((g) => g.sector)).toEqual([0, 1, 2]);
		// S1: driver 1 (26.0) beats driver 2 (27.0) by 1s
		expect(groups[0].rows[0]).toMatchObject({ nr: "1", valueMs: 26_000, deltaMs: 0 });
		expect(groups[0].rows[1]).toMatchObject({ nr: "2", deltaMs: 1_000 });
	});
});

describe("buildLongStints", () => {
	const stint = (lapCount: number, avgMs: number): StintRecord => ({
		stint: 1,
		compound: "MEDIUM",
		startLap: 1,
		endLap: lapCount,
		lapCount,
		bestMs: avgMs - 200,
		avgMs,
		degMsPerLap: 50,
	});
	const stints: StintsByDriver = {
		"1": [stint(8, 84_000)],
		"2": [stint(4, 83_000)], // below threshold, excluded
		"3": [stint(10, 83_500)],
	};

	it("keeps only stints at or above the lap threshold, best pace first", () => {
		const rows = buildLongStints(stints, undefined, 6);
		expect(rows.map((r) => r.nr)).toEqual(["3", "1"]);
		expect(rows.every((r) => r.laps >= 6)).toBe(true);
	});
});

describe("lap-based variants (archive)", () => {
	const laps = {
		"1": [lap(1, 80_000, [26_000, 30_000, 24_000], 320), lap(2, 80_500, [25_500, 31_000, 24_000], 315)],
		"2": [lap(1, 81_000, [27_000, 30_000, 24_000], 318)],
	};

	it("buildTopSpeedsFromLaps ranks max per-lap trap", () => {
		expect(buildTopSpeedsFromLaps(laps).map((r) => [r.nr, r.kph])).toEqual([
			["1", 320],
			["2", 318],
		]);
	});

	it("buildBestSectorsFromLaps takes the min sector observed", () => {
		const s1 = buildBestSectorsFromLaps(laps)[0];
		expect(s1.rows[0]).toMatchObject({ nr: "1", valueMs: 25_500, deltaMs: 0 });
		expect(s1.rows[1]).toMatchObject({ nr: "2", valueMs: 27_000, deltaMs: 1_500 });
	});
});

describe("buildBestLapEvolution", () => {
	it("plots a monotonically non-increasing running best", () => {
		const series = buildBestLapEvolution(
			{ "1": [lap(1, 81_000, [0, 0, 0], null), lap(2, 80_000, [0, 0, 0], null), lap(3, 80_500, [0, 0, 0], null)] },
			["1"],
		);
		expect(series[0].points.map((p) => p.y)).toEqual([81_000, 80_000, 80_000]);
	});
});

describe("buildSpeedVsLapTime", () => {
	it("drops laps without a speed trap or lap time", () => {
		const series = buildSpeedVsLapTime(
			{
				"1": [lap(1, 80_000, [0, 0, 0], 320), lap(2, 80_500, [0, 0, 0], null), lap(3, null, [0, 0, 0], 318)],
			},
			["1"],
		);
		expect(series).toHaveLength(1);
		expect(series[0].points).toEqual([{ x: 80_000, y: 320 }]);
	});
});
