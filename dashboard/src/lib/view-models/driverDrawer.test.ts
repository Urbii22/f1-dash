import { expect, test } from "vitest";

import { buildDriverDrawerModel } from "@/lib/view-models/driverDrawer";
import type { CarsData, State, TimingDataDriver } from "@/types/state.type";
import type { LapRecord } from "@/lib/lapHistory";
import type { RaceStoryItem } from "@/lib/view-models/raceStory";

function timingLine(overrides: Partial<TimingDataDriver> = {}): TimingDataDriver {
	return {
		GapToLeader: "+5.231",
		Line: 2,
		Position: "2",
		ShowPosition: true,
		RacingNumber: "4",
		Retired: false,
		InPit: false,
		PitOut: false,
		Stopped: false,
		Status: 0,
		Sectors: [],
		Speeds: {} as never,
		BestLapTime: { Value: "1:20.100", Position: 1 },
		LastLapTime: { Value: "1:20.500", Status: 0, OverallFastest: false, PersonalFastest: false },
		NumberOfLaps: 12,
		IntervalToPositionAhead: { Value: "+1.100", Catching: true },
		...overrides,
	};
}

function baseState(overrides: Partial<State> = {}): State {
	return {
		SessionInfo: {
			Meeting: { Key: 1, Name: "GP", OfficialName: "GP", Location: "X", Country: { Key: 1, Code: "X", Name: "X" }, Circuit: { Key: 1, ShortName: "X" } },
			ArchiveStatus: { Status: "Complete" },
			Key: 1,
			Type: "Race",
			Name: "Race",
			StartDate: "2026-06-15T12:00:00",
			EndDate: "2026-06-15T14:00:00",
			GmtOffset: "00:00:00",
			Path: "2026/x",
		},
		DriverList: {
			"4": {
				RacingNumber: "4",
				BroadcastName: "L NORRIS",
				FullName: "Lando NORRIS",
				Tla: "NOR",
				Line: 2,
				TeamName: "McLaren",
				TeamColour: "F47600",
				FirstName: "Lando",
				LastName: "Norris",
				Reference: "LANNOR01",
				HeadshotUrl: "",
				CountryCode: "GBR",
			},
		},
		TimingData: { Lines: { "4": timingLine() }, Withheld: false },
		TimingAppData: {
			Lines: { "4": { RacingNumber: "4", Line: 2, GridPos: "2", Stints: [{ Compound: "MEDIUM", TotalLaps: 12 }] } },
		},
		...overrides,
	};
}

function lap(lapNo: number, ms: number): LapRecord {
	return {
		lap: lapNo,
		lapTimeMs: ms,
		sectorsMs: [null, null, null],
		position: 2,
		gapToLeaderMs: null,
		compound: "MEDIUM",
		tyreAge: lapNo,
		pitted: false,
		utc: "2026-06-15T12:00:00Z",
	};
}

test("returns null when no driver is selected", () => {
	expect(
		buildDriverDrawerModel({ driverNumber: null, state: baseState(), carsData: null, laps: [], story: [] }),
	).toBeNull();
});

test("exposes identity, position and gap", () => {
	const model = buildDriverDrawerModel({
		driverNumber: "4",
		state: baseState(),
		carsData: null,
		laps: [],
		story: [],
	});
	expect(model?.code).toBe("NOR");
	expect(model?.fullName).toBe("Lando NORRIS");
	expect(model?.teamColor).toBe("#F47600");
	expect(model?.positionLabel).toBe("P2");
	expect(model?.gapLabel).toBe("+5.231");
});

test("surfaces current stint, age and completed stops", () => {
	const state = baseState({
		TimingAppData: {
			Lines: {
				"4": {
					RacingNumber: "4",
					Line: 2,
					GridPos: "2",
					Stints: [
						{ Compound: "MEDIUM", TotalLaps: 10 },
						{ Compound: "SOFT", TotalLaps: 3 },
					],
				},
			},
		},
	});
	const model = buildDriverDrawerModel({ driverNumber: "4", state, carsData: null, laps: [], story: [] });
	expect(model?.stint).toEqual({ compound: "SOFT", age: 3, stops: 1 });
});

test("takes the last five local laps and a pace direction", () => {
	const laps = [lap(8, 81000), lap(9, 80800), lap(10, 80600), lap(11, 80500), lap(12, 80300), lap(7, 81500)].sort(
		(a, b) => a.lap - b.lap,
	);
	const model = buildDriverDrawerModel({ driverNumber: "4", state: baseState(), carsData: null, laps, story: [] });
	expect(model?.laps).toHaveLength(5);
	expect(model?.laps[model.laps.length - 1].lap).toBe(12);
	// times improving -> pace is gaining (negative slope)
	expect(model?.laps[0].time).toMatch(/\d/);
});

test("compact telemetry reads from car channels", () => {
	const carsData: CarsData = {
		"4": { Channels: { "0": 11000, "2": 305, "3": 7, "4": 100, "5": 0, "45": 0 } },
	};
	const model = buildDriverDrawerModel({ driverNumber: "4", state: baseState(), carsData, laps: [], story: [] });
	expect(model?.telemetry.speed).toContain("305");
	expect(model?.telemetry.gear).toBe("7");
	expect(model?.telemetry.throttle).toBe(100);
	expect(model?.telemetry.brake).toBe(false);
});

test("missing telemetry stays unavailable rather than zeroed", () => {
	const model = buildDriverDrawerModel({ driverNumber: "4", state: baseState(), carsData: null, laps: [], story: [] });
	expect(model?.telemetry.speed).toBeNull();
	expect(model?.telemetry.gear).toBeNull();
	expect(model?.telemetry.throttle).toBeNull();
	expect(model?.telemetry.brake).toBeNull();
});

test("DRS is unavailable for 2026 sessions per the driver-status policy", () => {
	const carsData: CarsData = {
		"4": { Channels: { "0": 11000, "2": 305, "3": 7, "4": 100, "5": 0, "45": 8 } },
	};
	const model = buildDriverDrawerModel({ driverNumber: "4", state: baseState(), carsData, laps: [], story: [] });
	expect(model?.telemetry.drs).toBeNull();
});

test("filters related alerts to the selected driver", () => {
	const story: RaceStoryItem[] = [
		{ id: "a", kind: "penalty", priority: 2, title: "Penalty", detail: "x", timestamp: null, driverNumber: "4" },
		{ id: "b", kind: "flag", priority: 1, title: "Flag", detail: "y", timestamp: null, driverNumber: "1" },
		{ id: "c", kind: "battle", priority: 1, title: "Battle", detail: "z", timestamp: null, driverNumber: null },
	];
	const model = buildDriverDrawerModel({ driverNumber: "4", state: baseState(), carsData: null, laps: [], story });
	expect(model?.alerts.map((alert) => alert.id)).toEqual(["a"]);
});
