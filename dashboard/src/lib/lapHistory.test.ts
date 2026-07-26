import { describe, expect, it } from "vitest";

import type { State } from "@/types/state.type";

import {
	LapHistoryTracker,
	buildStints,
	cleanLaps,
	detectCompletedLaps,
	formatLapTimeMs,
	getBestLap,
	linearRegressionSlope,
	parseLapTimeMs,
	type LapRecord,
} from "@/lib/lapHistory";

function timingLine(overrides: Record<string, unknown> = {}) {
	return {
		Line: 1,
		Position: "1",
		ShowPosition: true,
		RacingNumber: "1",
		Retired: false,
		InPit: false,
		PitOut: false,
		Stopped: false,
		Status: 0,
		GapToLeader: "",
		Sectors: [],
		Speeds: {},
		BestLapTime: { Value: "" },
		LastLapTime: { Value: "" },
		NumberOfLaps: 0,
		...overrides,
	};
}

function buildState(lines: Record<string, ReturnType<typeof timingLine>>, extra: Partial<State> = {}): State {
	return {
		Heartbeat: { Utc: "2026-06-11T14:00:00Z" },
		TimingData: { Lines: lines, Withheld: false },
		...extra,
	} as State;
}

describe("parseLapTimeMs", () => {
	it("parses M:SS.mmm lap times", () => {
		expect(parseLapTimeMs("1:23.456")).toBe(83456);
	});

	it("parses sector times in seconds", () => {
		expect(parseLapTimeMs("23.456")).toBe(23456);
		expect(parseLapTimeMs("+1.2")).toBe(1200);
	});

	it("rejects empty and malformed values", () => {
		expect(parseLapTimeMs("")).toBeNull();
		expect(parseLapTimeMs(undefined)).toBeNull();
		expect(parseLapTimeMs("1L")).toBeNull();
		expect(parseLapTimeMs("--")).toBeNull();
	});
});

describe("formatLapTimeMs", () => {
	it("formats with minutes", () => {
		expect(formatLapTimeMs(83456)).toBe("1:23.456");
	});

	it("formats seconds only", () => {
		expect(formatLapTimeMs(23456)).toBe("23.456");
	});

	it("handles null", () => {
		expect(formatLapTimeMs(null)).toBe("--");
	});
});

describe("detectCompletedLaps", () => {
	it("records a lap when NumberOfLaps increases and the lap time changed", () => {
		const prev = buildState({ "1": timingLine({ NumberOfLaps: 4, LastLapTime: { Value: "1:24.000" } }) });
		const next = buildState({
			"1": timingLine({ NumberOfLaps: 5, LastLapTime: { Value: "1:23.456" }, GapToLeader: "+2.000", Position: "3" }),
		});

		const completed = detectCompletedLaps(prev, next, {});
		expect(completed).toHaveLength(1);
		expect(completed[0].racingNumber).toBe("1");
		expect(completed[0].record.lap).toBe(5);
		expect(completed[0].record.lapTimeMs).toBe(83456);
		expect(completed[0].record.position).toBe(3);
		expect(completed[0].record.gapToLeaderMs).toBe(2000);
	});

	it("does not record anything without a lap flank", () => {
		const prev = buildState({ "1": timingLine({ NumberOfLaps: 5 }) });
		const next = buildState({ "1": timingLine({ NumberOfLaps: 5, LastLapTime: { Value: "1:23.456" } }) });

		expect(detectCompletedLaps(prev, next, {})).toHaveLength(0);
	});

	it("nulls the lap time when LastLapTime did not change with the flank", () => {
		const prev = buildState({ "1": timingLine({ NumberOfLaps: 4, LastLapTime: { Value: "1:24.000" } }) });
		const next = buildState({ "1": timingLine({ NumberOfLaps: 5, LastLapTime: { Value: "1:24.000" } }) });

		const completed = detectCompletedLaps(prev, next, {});
		expect(completed[0].record.lapTimeMs).toBeNull();
	});

	it("skips retired and stopped drivers", () => {
		const prev = buildState({ "1": timingLine({ NumberOfLaps: 4 }) });
		const next = buildState({ "1": timingLine({ NumberOfLaps: 5, Retired: true }) });

		expect(detectCompletedLaps(prev, next, {})).toHaveLength(0);
	});

	it("treats lapped drivers' gap as null", () => {
		const prev = buildState({ "1": timingLine({ NumberOfLaps: 4 }) });
		const next = buildState({
			"1": timingLine({ NumberOfLaps: 5, LastLapTime: { Value: "1:30.0" }, GapToLeader: "1L", Position: "18" }),
		});

		const completed = detectCompletedLaps(prev, next, {});
		expect(completed[0].record.gapToLeaderMs).toBeNull();
	});

	it("reads compound and tyre age from TimingAppData", () => {
		const prev = buildState({ "1": timingLine({ NumberOfLaps: 4 }) });
		const next = buildState(
			{ "1": timingLine({ NumberOfLaps: 5, LastLapTime: { Value: "1:30.0" } }) },
			{
				TimingAppData: {
					Lines: {
						"1": {
							RacingNumber: "1",
							Line: 1,
							GridPos: "1",
							Stints: [
								{ Compound: "SOFT", TotalLaps: 12 },
								{ Compound: "MEDIUM", TotalLaps: 3 },
							],
						},
					},
				},
			},
		);

		const completed = detectCompletedLaps(prev, next, {});
		expect(completed[0].record.compound).toBe("MEDIUM");
		expect(completed[0].record.tyreAge).toBe(3);
	});
});

describe("LapHistoryTracker", () => {
	it("marks laps as pitted when the driver visited the pit lane during the lap", () => {
		const tracker = new LapHistoryTracker();

		tracker.ingest(buildState({ "1": timingLine({ NumberOfLaps: 4 }) }));
		tracker.ingest(buildState({ "1": timingLine({ NumberOfLaps: 4, InPit: true }) }));

		const { completed } = tracker.ingest(
			buildState({ "1": timingLine({ NumberOfLaps: 5, LastLapTime: { Value: "1:40.0" } }) }),
		);

		expect(completed).toHaveLength(1);
		expect(completed[0].record.pitted).toBe(true);

		// next lap with no pit visit is clean again
		const next = tracker.ingest(buildState({ "1": timingLine({ NumberOfLaps: 6, LastLapTime: { Value: "1:24.0" } }) }));
		expect(next.completed[0].record.pitted).toBe(false);
	});

	it("flags a session change and starts from scratch", () => {
		const tracker = new LapHistoryTracker();

		const sessionA = buildState(
			{ "1": timingLine({ NumberOfLaps: 4 }) },
			{ SessionInfo: { Path: "2026/race-a/" } as State["SessionInfo"] },
		);
		const sessionB = buildState(
			{ "1": timingLine({ NumberOfLaps: 1 }) },
			{ SessionInfo: { Path: "2026/race-b/" } as State["SessionInfo"] },
		);

		tracker.ingest(sessionA);
		const result = tracker.ingest(sessionB);

		expect(result.sessionChanged).toBe(true);
		expect(result.completed).toHaveLength(0);
	});

	it("never emits on the first observation", () => {
		const tracker = new LapHistoryTracker();
		const { completed } = tracker.ingest(buildState({ "1": timingLine({ NumberOfLaps: 10 }) }));
		expect(completed).toHaveLength(0);
	});
});

function lap(lapNumber: number, lapTimeMs: number | null, overrides: Partial<LapRecord> = {}): LapRecord {
	return {
		lap: lapNumber,
		lapTimeMs,
		sectorsMs: [null, null, null],
		position: 1,
		gapToLeaderMs: 0,
		compound: "SOFT",
		tyreAge: lapNumber,
		pitted: false,
		utc: "2026-06-11T14:00:00Z",
		...overrides,
	};
}

describe("cleanLaps", () => {
	it("filters pit laps, missing times and outliers", () => {
		const laps = [
			lap(1, 84000),
			lap(2, 84100),
			lap(3, null),
			lap(4, 110000), // outlier (> median + 5s)
			lap(5, 84200, { pitted: true }),
			lap(6, 84300),
		];

		const clean = cleanLaps(laps);
		expect(clean.map((l) => l.lap)).toEqual([1, 2, 6]);
	});
});

describe("getBestLap", () => {
	it("returns the fastest timed lap with its recorded sectors", () => {
		const laps = [
			lap(4, 84000, { sectorsMs: [24000, 30000, 30000] }),
			lap(5, 82500, { sectorsMs: [23500, 29500, 29500], compound: "SOFT", tyreAge: 3 }),
			lap(6, 83000, { sectorsMs: [23800, 29600, 29600] }),
		];

		expect(getBestLap(laps)).toMatchObject({
			lap: 5,
			lapTimeMs: 82500,
			sectorsMs: [23500, 29500, 29500],
			compound: "SOFT",
			tyreAge: 3,
		});
	});

	it("ignores pit laps and laps without a time", () => {
		const laps = [lap(2, 81000, { pitted: true }), lap(3, null), lap(4, 83000)];

		expect(getBestLap(laps)?.lap).toBe(4);
	});

	it("returns null without a valid lap", () => {
		expect(getBestLap([lap(1, null), lap(2, 82000, { pitted: true })])).toBeNull();
	});
});

describe("linearRegressionSlope", () => {
	it("computes the slope of a perfect line", () => {
		const slope = linearRegressionSlope([
			[1, 100],
			[2, 200],
			[3, 300],
		]);
		expect(slope).toBeCloseTo(100);
	});

	it("returns null with fewer than 3 points", () => {
		expect(
			linearRegressionSlope([
				[1, 100],
				[2, 200],
			]),
		).toBeNull();
	});
});

describe("buildStints", () => {
	it("splits stints on compound change and tyre age reset", () => {
		const laps = [
			lap(1, 84000, { compound: "SOFT", tyreAge: 1 }),
			lap(2, 84200, { compound: "SOFT", tyreAge: 2 }),
			lap(3, 84400, { compound: "SOFT", tyreAge: 3, pitted: true }),
			lap(4, 86000, { compound: "MEDIUM", tyreAge: 1, pitted: true }),
			lap(5, 84800, { compound: "MEDIUM", tyreAge: 2 }),
			lap(6, 84900, { compound: "MEDIUM", tyreAge: 3 }),
		];

		const stints = buildStints(laps);
		expect(stints).toHaveLength(2);
		expect(stints[0]).toMatchObject({ compound: "SOFT", startLap: 1, endLap: 3, lapCount: 3 });
		expect(stints[1]).toMatchObject({ compound: "MEDIUM", startLap: 4, endLap: 6, lapCount: 3 });
	});

	it("computes degradation from clean laps", () => {
		const laps = [
			lap(1, 84000, { tyreAge: 1 }),
			lap(2, 84100, { tyreAge: 2 }),
			lap(3, 84200, { tyreAge: 3 }),
			lap(4, 84300, { tyreAge: 4 }),
		];

		const stints = buildStints(laps);
		expect(stints[0].degMsPerLap).toBeCloseTo(100);
	});

	it("handles empty input", () => {
		expect(buildStints([])).toEqual([]);
	});
});
