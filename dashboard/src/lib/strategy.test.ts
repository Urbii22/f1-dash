import { describe, expect, it } from "vitest";

import { buildStints, type LapRecord } from "@/lib/lapHistory";
import {
	FALLBACK_PIT_LOSS_MS,
	buildPaceModel,
	estimatePitLoss,
	estimatePitWindow,
	formatStrategyGap,
	projectUndercut,
	type PaceModel,
} from "@/lib/strategy";

function lap(lapNumber: number, lapTimeMs: number | null, overrides: Partial<LapRecord> = {}): LapRecord {
	return {
		lap: lapNumber,
		lapTimeMs,
		sectorsMs: [null, null, null],
		position: 1,
		gapToLeaderMs: 0,
		compound: "MEDIUM",
		tyreAge: lapNumber,
		pitted: false,
		utc: "2026-06-11T14:00:00Z",
		...overrides,
	};
}

function steadyLaps(count: number, baseMs: number, degMsPerLap: number): LapRecord[] {
	return Array.from({ length: count }, (_, i) => lap(i + 1, baseMs + degMsPerLap * (i + 1), { tyreAge: i + 1 }));
}

describe("buildPaceModel", () => {
	it("derives baseline and degradation from clean laps", () => {
		const laps = steadyLaps(10, 84000, 100);
		const model = buildPaceModel("1", laps, buildStints(laps));

		expect(model).not.toBeNull();
		expect(model!.degMsPerLap).toBeCloseTo(100, 0);
		// baseline is the median of the last 5 laps: laps 6..10 -> lap 8
		expect(model!.baselineMs).toBeCloseTo(84000 + 100 * 8, 0);
		expect(model!.tyreAge).toBe(10);
	});

	it("returns null with insufficient data", () => {
		const laps = steadyLaps(2, 84000, 100);
		expect(buildPaceModel("1", laps, buildStints(laps))).toBeNull();
	});
});

describe("estimatePitLoss", () => {
	it("falls back to the generic constant without pit cycles", () => {
		expect(estimatePitLoss({ "1": steadyLaps(10, 84000, 50) })).toBe(FALLBACK_PIT_LOSS_MS);
	});

	it("estimates loss from in/out lap pairs against the baseline", () => {
		const laps = [
			...steadyLaps(8, 84000, 0),
			lap(9, 84000 + 11_000, { pitted: true }), // in-lap
			lap(10, 84000 + 13_000, { pitted: true, tyreAge: 1, compound: "HARD" }), // out-lap
			lap(11, 84000, { tyreAge: 2, compound: "HARD" }),
			lap(12, 84000, { tyreAge: 3, compound: "HARD" }),
		];

		const loss = estimatePitLoss({ "1": laps });
		// 11s + 13s over baseline = 24s, within the clamp range
		expect(loss).toBeGreaterThan(20_000);
		expect(loss).toBeLessThan(30_000);
	});
});

function model(overrides: Partial<PaceModel>): PaceModel {
	return {
		racingNumber: "1",
		baselineMs: 84000,
		degMsPerLap: 100,
		compound: "MEDIUM",
		tyreAge: 15,
		sampleSize: 15,
		...overrides,
	};
}

describe("projectUndercut", () => {
	it("works when the rival degrades heavily and the gap is small", () => {
		const attacker = model({ tyreAge: 18, degMsPerLap: 120 });
		const defender = model({ racingNumber: "44", tyreAge: 18, degMsPerLap: 150, baselineMs: 84200 });

		// attacker 2s behind (negative gap), pits now
		const projection = projectUndercut(attacker, defender, -2000, 21_000);
		expect(projection.works).toBe(true);
		expect(projection.crossoverLap).not.toBeNull();
		expect(projection.gapAfterStop).toBeGreaterThan(0);
	});

	it("fails when the gap is much larger than what fresh tyres can recover", () => {
		const attacker = model({ tyreAge: 5, degMsPerLap: 40 });
		const defender = model({ racingNumber: "44", tyreAge: 5, degMsPerLap: 40 });

		const projection = projectUndercut(attacker, defender, -40_000, 22_000);
		expect(projection.works).toBe(false);
		expect(projection.crossoverLap).toBeNull();
	});
});

describe("estimatePitWindow", () => {
	it("returns a bounded window for a degrading tyre", () => {
		const window = estimatePitWindow(model({ degMsPerLap: 150, tyreAge: 10 }), 22_000, 20, 57);
		expect(window).not.toBeNull();
		expect(window!.fromLap).toBeGreaterThanOrEqual(20);
		expect(window!.toLap).toBeLessThan(57);
		expect(window!.toLap).toBeGreaterThanOrEqual(window!.fromLap);
	});

	it("returns null when pace is flat", () => {
		expect(estimatePitWindow(model({ degMsPerLap: 0 }), 22_000, 20, 57)).toBeNull();
	});

	it("returns null when the race is almost over", () => {
		expect(estimatePitWindow(model({ degMsPerLap: 200 }), 22_000, 56, 57)).toBeNull();
	});
});

describe("formatStrategyGap", () => {
	it("formats signed seconds", () => {
		expect(formatStrategyGap(2400)).toBe("+2.4s");
		expect(formatStrategyGap(-800)).toBe("-0.8s");
	});
});
