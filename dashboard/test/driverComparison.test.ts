import assert from "node:assert/strict";
import test from "node:test";

import {
	buildDriverComparison,
	calculateDriverGap,
	getCurrentStint,
	normalizeSectors,
	parseTimingSeconds,
} from "../src/lib/driverComparison.ts";
import { useDriverSelectionStore } from "../src/stores/useDriverSelectionStore.ts";

test("comparison state replaces the oldest driver when a third is selected", () => {
	useDriverSelectionStore.getState().clearComparedDrivers();
	useDriverSelectionStore.getState().toggleComparedDriver("1");
	useDriverSelectionStore.getState().toggleComparedDriver("3");
	useDriverSelectionStore.getState().toggleComparedDriver("16");

	assert.deepEqual(useDriverSelectionStore.getState().comparedDrivers, ["3", "16"]);
});

test("parseTimingSeconds handles lap and sector formats", () => {
	assert.equal(parseTimingSeconds("+4.238"), 4.238);
	assert.equal(parseTimingSeconds("1:19.271"), 79.271);
	assert.equal(parseTimingSeconds("LAP 32"), null);
});

test("direct interval is preferred when compared drivers are adjacent", () => {
	const leading = timingLine({ RacingNumber: "1", Position: "3", GapToLeader: "+18.402" });
	const trailing = timingLine({
		RacingNumber: "3",
		Position: "4",
		GapToLeader: "+22.900",
		IntervalToPositionAhead: { Value: "+4.238", Catching: true },
	});

	assert.deepEqual(calculateDriverGap(leading, trailing), {
		value: "+4.238",
		leaderNumber: "1",
		trailingNumber: "3",
		catching: true,
	});
});

test("same-lap gap is derived from both gaps to leader", () => {
	const first = timingLine({ RacingNumber: "1", Position: "3", GapToLeader: "+18.402" });
	const second = timingLine({ RacingNumber: "3", Position: "5", GapToLeader: "+22.640" });

	assert.equal(calculateDriverGap(first, second).value, "+4.238");
});

test("different lap counts produce a lap difference rather than seconds", () => {
	const first = timingLine({ RacingNumber: "1", Position: "3", NumberOfLaps: 32 });
	const second = timingLine({ RacingNumber: "3", Position: "5", NumberOfLaps: 31 });

	assert.equal(calculateDriverGap(first, second).value, "1 LAP");
});

test("invalid timing values remain unavailable", () => {
	const first = timingLine({ RacingNumber: "1", Position: "3", GapToLeader: "LAP 32" });
	const second = timingLine({ RacingNumber: "3", Position: "5", GapToLeader: "--" });

	assert.equal(calculateDriverGap(first, second).value, "--");
});

test("current stint exposes compound, age, and completed stops", () => {
	assert.deepEqual(
		getCurrentStint([
			{ Compound: "SOFT", TotalLaps: 12, New: "true" },
			{ Compound: "MEDIUM", TotalLaps: 4, New: "false" },
		]),
		{ compound: "MEDIUM", age: 4, stops: 1, isNew: false },
	);
});

test("sector normalization aligns array and keyed update shapes", () => {
	const sectors = normalizeSectors({
		0: sector("25.442", [2049, 2049]),
		2: sector("24.900", [2051]),
	});

	assert.equal(sectors.length, 3);
	assert.equal(sectors[0]?.value, "25.442");
	assert.equal(sectors[1]?.value, "--");
	assert.deepEqual(sectors[2]?.segments, [2051]);
});

test("comparison model combines live timing, strategy, and telemetry", () => {
	const model = buildDriverComparison("1", {
		driver: { RacingNumber: "1", Tla: "NOR", FullName: "Lando NORRIS", TeamColour: "F47600" } as never,
		timing: timingLine({ RacingNumber: "1", Position: "3", NumberOfLaps: 32 }),
		stats: { PersonalBestLapTime: { Value: "1:19.440", Position: 2 } } as never,
		app: { Stints: [{ Compound: "MEDIUM", TotalLaps: 14, New: "false" }] } as never,
		car: { "0": 11200, "2": 287, "3": 7, "4": 81, "5": 0, "45": 0 },
	});

	assert.equal(model?.tla, "NOR");
	assert.equal(model?.stint.age, 14);
	assert.equal(model?.telemetry.speed, 287);
	assert.equal(model?.bestLap, "1:19.440");
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
