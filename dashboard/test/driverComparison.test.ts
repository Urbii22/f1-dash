import { expect, test } from "vitest";

import {
	buildDriverComparison,
	buildFeedBestLap,
	calculateDriverGap,
	compareMilliseconds,
	compareTimingValues,
	getCurrentStint,
	normalizeSectors,
	parseTimingSeconds,
} from "../src/lib/driverComparison";
import { useDriverSelectionStore } from "../src/stores/useDriverSelectionStore";

test("comparison state replaces the oldest driver when a third is selected", () => {
	useDriverSelectionStore.getState().clearComparedDrivers();
	useDriverSelectionStore.getState().toggleComparedDriver("1");
	useDriverSelectionStore.getState().toggleComparedDriver("3");
	useDriverSelectionStore.getState().toggleComparedDriver("16");

	expect(useDriverSelectionStore.getState().comparedDrivers).toEqual(["3", "16"]);
});

test("parseTimingSeconds handles lap and sector formats", () => {
	expect(parseTimingSeconds("+4.238")).toBe(4.238);
	expect(parseTimingSeconds("1:19.271")).toBe(79.271);
	expect(parseTimingSeconds("LAP 32")).toBeNull();
});

test("timing comparison identifies the faster value and handles ties or missing data", () => {
	expect(compareTimingValues("1:16.258", "1:16.500")).toBe("first");
	expect(compareTimingValues("22.473", "22.226")).toBe("second");
	expect(compareTimingValues("30.711", "30.711")).toBe("tie");
	expect(compareTimingValues("--", "30.711")).toBe("unavailable");
	expect(compareMilliseconds(76258, 76500)).toBe("first");
	expect(compareMilliseconds(null, 76500)).toBe("unavailable");
});

test("direct interval is preferred when compared drivers are adjacent", () => {
	const leading = timingLine({ RacingNumber: "1", Position: "3", GapToLeader: "+18.402" });
	const trailing = timingLine({
		RacingNumber: "3",
		Position: "4",
		GapToLeader: "+22.900",
		IntervalToPositionAhead: { Value: "+4.238", Catching: true },
	});

	expect(calculateDriverGap(leading, trailing)).toEqual({
		value: "+4.238",
		leaderNumber: "1",
		trailingNumber: "3",
		catching: true,
	});
});

test("same-lap gap is derived from both gaps to leader", () => {
	const first = timingLine({ RacingNumber: "1", Position: "3", GapToLeader: "+18.402" });
	const second = timingLine({ RacingNumber: "3", Position: "5", GapToLeader: "+22.640" });

	expect(calculateDriverGap(first, second).value).toBe("+4.238");
});

test("different lap counts produce a lap difference rather than seconds", () => {
	const first = timingLine({ RacingNumber: "1", Position: "3", NumberOfLaps: 32 });
	const second = timingLine({ RacingNumber: "3", Position: "5", NumberOfLaps: 31 });

	expect(calculateDriverGap(first, second).value).toBe("1 LAP");
});

test("invalid timing values remain unavailable", () => {
	const first = timingLine({ RacingNumber: "1", Position: "3", GapToLeader: "LAP 32" });
	const second = timingLine({ RacingNumber: "3", Position: "5", GapToLeader: "--" });

	expect(calculateDriverGap(first, second).value).toBe("--");
});

test("current stint exposes compound, age, and completed stops", () => {
	expect(
		getCurrentStint([
			{ Compound: "SOFT", TotalLaps: 12, New: "true" },
			{ Compound: "MEDIUM", TotalLaps: 4, New: "false" },
		]),
	).toEqual({ compound: "MEDIUM", age: 4, stops: 1, isNew: false });
});

test("sector normalization aligns array and keyed update shapes", () => {
	const sectors = normalizeSectors({
		0: sector("25.442", [2049, 2049]),
		2: sector("24.900", [2051]),
	});

	expect(sectors.length).toBe(3);
	expect(sectors[0]?.value).toBe("25.442");
	expect(sectors[1]?.value).toBe("--");
	expect(sectors[2]?.segments).toEqual([2051]);
});

test("comparison model exposes timing and strategy without car telemetry or speed traps", () => {
	const model = buildDriverComparison("1", {
		driver: { RacingNumber: "1", Tla: "NOR", FullName: "Lando NORRIS", TeamColour: "F47600" } as never,
		timing: timingLine({ RacingNumber: "1", Position: "3", NumberOfLaps: 32 }),
		stats: { PersonalBestLapTime: { Value: "1:19.440", Position: 2 } } as never,
		app: { Stints: [{ Compound: "MEDIUM", TotalLaps: 14, New: "false" }] } as never,
	});

	expect(model?.tla).toBe("NOR");
	expect(model?.stint.age).toBe(14);
	expect(model?.bestLap).toBe("1:19.440");
	expect("telemetry" in model!).toBe(false);
	expect("speedTraps" in model!).toBe(false);
});

test("feed best lap remains available when local lap history is empty", () => {
	const best = buildFeedBestLap({
		PersonalBestLapTime: { Value: "1:15.435", Position: 1 },
		BestSectors: [
			{ Value: "22.100", Position: 2 },
			{ Value: "30.200", Position: 1 },
			{ Value: "23.135", Position: 3 },
		],
	} as never);

	expect(best).toEqual({
		lapTimeMs: 75435,
		sectorsMs: [22100, 30200, 23135],
	});
});

test("feed best lap tolerates missing sector values", () => {
	const best = buildFeedBestLap({
		PersonalBestLapTime: { Value: "1:15.435", Position: 1 },
		BestSectors: [{ Value: "22.100" }, { Value: "" }, { Value: "23.135" }],
	} as never);

	expect(best?.sectorsMs).toEqual([22100, null, 23135]);
});

test("missing tyre strategy remains unavailable instead of being synthesized", () => {
	const model = buildDriverComparison("1", {
		driver: { RacingNumber: "1", Tla: "NOR", FullName: "Lando NORRIS", TeamColour: "F47600" } as never,
		timing: timingLine({ RacingNumber: "1" }),
	});

	expect(model?.stint).toEqual({ compound: "--", age: "--", stops: 0, isNew: false });
});

test("pit and retirement states use concise explicit labels", () => {
	const driver = { RacingNumber: "1", Tla: "NOR", FullName: "Lando NORRIS", TeamColour: "F47600" } as never;

	expect(buildDriverComparison("1", { driver, timing: timingLine({ InPit: true }) })?.status).toBe("PIT");
	expect(buildDriverComparison("1", { driver, timing: timingLine({ PitOut: true }) })?.status).toBe("PIT OUT");
	expect(buildDriverComparison("1", { driver, timing: timingLine({ Stopped: true }) })?.status).toBe("STOPPED");
	expect(buildDriverComparison("1", { driver, timing: timingLine({ Retired: true }) })?.status).toBe("RETIRED");
});

function timingLine(overrides: Record<string, unknown> = {}) {
	return {
		RacingNumber: "1",
		Position: "1",
		NumberOfLaps: 32,
		GapToLeader: "",
		IntervalToPositionAhead: { Value: "", Catching: false },
		LastLapTime: { Value: "1:20.000" },
		BestLapTime: { Value: "1:19.500", Position: 1 },
		Sectors: [],
		Speeds: {},
		InPit: false,
		PitOut: false,
		Retired: false,
		Stopped: false,
		...overrides,
	} as never;
}

function sector(value: string, statuses: number[]) {
	return {
		Value: value,
		PreviousValue: "",
		Segments: statuses.map((Status) => ({ Status })),
		Stopped: false,
		Status: 0,
		OverallFastest: false,
		PersonalFastest: false,
	};
}
