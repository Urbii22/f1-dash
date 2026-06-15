import { describe, expect, test } from "vitest";

import { buildQualifyingSummary } from "@/lib/view-models/qualifying";
import type { Driver, State, TimingDataDriver } from "@/types/state.type";

function timingDriver(overrides: Partial<TimingDataDriver> = {}): TimingDataDriver {
	return {
		GapToLeader: "",
		Line: 1,
		Position: "1",
		ShowPosition: true,
		RacingNumber: "1",
		Retired: false,
		InPit: false,
		PitOut: false,
		Stopped: false,
		Status: 0,
		Sectors: [
			{ Stopped: false, Value: "25.000", Status: 0, OverallFastest: false, PersonalFastest: false, Segments: [] },
			{ Stopped: false, Value: "30.000", Status: 0, OverallFastest: false, PersonalFastest: false, Segments: [] },
			{ Stopped: false, Value: "24.000", Status: 0, OverallFastest: false, PersonalFastest: false, Segments: [] },
		],
		Speeds: {
			I1: { Value: "", Status: 0, OverallFastest: false, PersonalFastest: false },
			I2: { Value: "", Status: 0, OverallFastest: false, PersonalFastest: false },
			FL: { Value: "", Status: 0, OverallFastest: false, PersonalFastest: false },
			ST: { Value: "", Status: 0, OverallFastest: false, PersonalFastest: false },
		},
		BestLapTime: { Value: "1:20.000", Position: 1 },
		LastLapTime: { Value: "1:20.000", Status: 0, OverallFastest: false, PersonalFastest: false },
		NumberOfLaps: 4,
		...overrides,
	};
}

function state(part: number, name = "Qualifying"): State {
	const cutoff = part === 1 ? 16 : 10;
	return {
		SessionInfo: { Name: name, Type: name } as State["SessionInfo"],
		DriverList: {
			"4": { Tla: "NOR" } as Driver,
			"16": { Tla: "LEC" } as Driver,
		},
		TimingData: {
			Withheld: false,
			SessionPart: part,
			Lines: {
				"4": timingDriver({
					RacingNumber: "4",
					Position: String(cutoff),
					BestLapTime: { Value: "1:20.000", Position: cutoff },
					Sectors: timingDriver().Sectors.map((sector, index) => ({ ...sector, PersonalFastest: index === 1 })),
				}),
				"16": timingDriver({
					RacingNumber: "16",
					Position: String(cutoff + 1),
					BestLapTime: { Value: "1:20.250", Position: cutoff + 1 },
				}),
				"99": timingDriver({
					RacingNumber: "99",
					Position: String(cutoff + 2),
					BestLapTime: { Value: "", Position: cutoff + 2 },
				}),
			},
		},
		RaceControlMessages: {
			Messages: [
				{ Utc: "2026-06-15T12:02:00Z", Lap: 5, Category: "Other", Message: "CAR 16 LAP TIME DELETED - TRACK LIMITS" },
				{ Utc: "2026-06-15T12:01:00Z", Lap: 5, Category: "Drs", Message: "DRS ENABLED" },
			],
		},
	};
}

describe("buildQualifyingSummary", () => {
	test.each([
		[1, "Q1", 16],
		[2, "Q2", 10],
	] as const)("builds cutoff context for phase %s", (part, label, cutoff) => {
		const model = buildQualifyingSummary(state(part));
		expect(model).toMatchObject({ phaseLabel: label, cutoffPosition: cutoff, cutoffTime: "1:20.000" });
		expect(model?.atRisk).toEqual([
			{ driverNumber: "4", code: "NOR", delta: "+0.000", state: "FLYING" },
			{ driverNumber: "16", code: "LEC", delta: "+0.250", state: "TRACK" },
			{ driverNumber: "99", code: "99", delta: "--.---", state: "NO TIME" },
		]);
	});

	test("uses sprint phase labels and identifies hot sectors and deleted laps", () => {
		const model = buildQualifyingSummary(state(2, "Sprint Qualifying"));
		expect(model?.phaseLabel).toBe("SQ2");
		expect(model?.hotLaps).toEqual([{ driverNumber: "4", code: "NOR", sector: 2 }]);
		expect(model?.deletedLaps).toEqual([
			{ driverNumber: "16", message: "CAR 16 LAP TIME DELETED - TRACK LIMITS", timestamp: "2026-06-15T12:02:00Z" },
		]);
	});

	test("Q3 has no cutoff and still exposes ordered readable insights", () => {
		const model = buildQualifyingSummary(state(3));
		expect(model?.phaseLabel).toBe("Q3");
		expect(model?.cutoffPosition).toBeNull();
		expect(model?.cutoffTime).toBeNull();
		expect(model?.atRisk).toEqual([]);
		expect(model?.insights.map((insight) => insight.label)).toEqual(["Phase", "Hot laps", "Deleted laps"]);
	});

	test("returns null without qualifying timing context", () => {
		expect(buildQualifyingSummary(null)).toBeNull();
		expect(buildQualifyingSummary({ SessionInfo: { Name: "Race", Type: "Race" } as State["SessionInfo"] })).toBeNull();
	});
});
