import { expect, test } from "vitest";

import { buildCompactTimingRows, buildTechnicalTimingRows } from "@/lib/view-models/liveTiming";
import type { CarsData, DriverList, TimingAppData, TimingDataDriver } from "@/types/state.type";

const driverList: DriverList = {
	"1": {
		RacingNumber: "1",
		BroadcastName: "M VERSTAPPEN",
		FullName: "Max VERSTAPPEN",
		Tla: "VER",
		Line: 1,
		TeamName: "Red Bull Racing",
		TeamColour: "3671C6",
		FirstName: "Max",
		LastName: "Verstappen",
		Reference: "MAXVER01",
		HeadshotUrl: "",
		CountryCode: "NED",
	},
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
	"81": {
		RacingNumber: "81",
		BroadcastName: "O PIASTRI",
		FullName: "Oscar PIASTRI",
		Tla: "PIA",
		Line: 3,
		TeamName: "McLaren",
		TeamColour: "",
		FirstName: "Oscar",
		LastName: "Piastri",
		Reference: "OSCPIA01",
		HeadshotUrl: "",
		CountryCode: "AUS",
	},
};

function timingLine(overrides: Partial<TimingDataDriver> = {}): TimingDataDriver {
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
		Sectors: [],
		Speeds: {} as never,
		BestLapTime: { Value: "", Position: 0 },
		LastLapTime: { Value: "", Status: 0, OverallFastest: false, PersonalFastest: false },
		NumberOfLaps: 0,
		...overrides,
	};
}

function build(
	lines: Record<string, TimingDataDriver>,
	app?: TimingAppData,
	previousPositions?: Record<string, number>,
) {
	return buildCompactTimingRows({
		drivers: driverList,
		timing: { Lines: lines, Withheld: false },
		appTiming: app,
		previousPositions,
	});
}

test("leader shows Leader as primary gap and no secondary gap", () => {
	const rows = build({
		"1": timingLine({ RacingNumber: "1", Position: "1", GapToLeader: "" }),
	});
	expect(rows[0].primaryGap).toBe("Leader");
	expect(rows[0].secondaryGap).toBeNull();
	expect(rows[0].position).toBe(1);
});

test("normal driver shows gap to leader and interval to car ahead", () => {
	const rows = build({
		"1": timingLine({ RacingNumber: "1", Position: "1" }),
		"4": timingLine({
			RacingNumber: "4",
			Position: "2",
			GapToLeader: "+5.231",
			IntervalToPositionAhead: { Value: "+5.231", Catching: false },
		}),
	});
	const nor = rows.find((row) => row.driverNumber === "4")!;
	expect(nor.primaryGap).toBe("+5.231");
	expect(nor.secondaryGap).toBe("+5.231");
	expect(nor.trend).toBe("stable");
});

test("catching interval reports a closing trend", () => {
	const rows = build({
		"1": timingLine({ RacingNumber: "1", Position: "1" }),
		"4": timingLine({
			RacingNumber: "4",
			Position: "2",
			GapToLeader: "+1.100",
			IntervalToPositionAhead: { Value: "+1.100", Catching: true },
		}),
	});
	const nor = rows.find((row) => row.driverNumber === "4")!;
	expect(nor.trend).toBe("closing");
});

test("missing gap renders a dash, never a synthesized zero", () => {
	const rows = build({
		"1": timingLine({ RacingNumber: "1", Position: "1" }),
		"4": timingLine({ RacingNumber: "4", Position: "2", GapToLeader: "" }),
	});
	const nor = rows.find((row) => row.driverNumber === "4")!;
	expect(nor.primaryGap).toBe("-");
	expect(nor.secondaryGap).toBeNull();
});

test("pit, pit-out, retired and stopped map to explicit statuses", () => {
	const rows = build({
		"1": timingLine({ RacingNumber: "1", Position: "1", InPit: true }),
		"4": timingLine({ RacingNumber: "4", Position: "2", PitOut: true }),
		"81": timingLine({ RacingNumber: "81", Position: "3", Retired: true }),
	});
	expect(rows.find((r) => r.driverNumber === "1")!.status).toBe("pit");
	expect(rows.find((r) => r.driverNumber === "4")!.status).toBe("pit-out");
	expect(rows.find((r) => r.driverNumber === "81")!.status).toBe("retired");

	const stopped = build({
		"1": timingLine({ RacingNumber: "1", Position: "1", Stopped: true }),
	});
	expect(stopped[0].status).toBe("stopped");
});

test("running driver has running status", () => {
	const rows = build({ "1": timingLine({ RacingNumber: "1", Position: "1" }) });
	expect(rows[0].status).toBe("running");
});

test("position change is computed from previous positions", () => {
	const rows = build(
		{
			"1": timingLine({ RacingNumber: "1", Position: "1" }),
			"4": timingLine({ RacingNumber: "4", Position: "2" }),
		},
		undefined,
		{ "1": 2, "4": 1 },
	);
	// 1 gained a place (2 -> 1), 4 lost a place (1 -> 2)
	expect(rows.find((r) => r.driverNumber === "1")!.positionChange).toBe(1);
	expect(rows.find((r) => r.driverNumber === "4")!.positionChange).toBe(-1);
});

test("position change is null without a previous position", () => {
	const rows = build({ "1": timingLine({ RacingNumber: "1", Position: "1" }) });
	expect(rows[0].positionChange).toBeNull();
});

test("tyre compound and age come from the final stint", () => {
	const app: TimingAppData = {
		Lines: {
			"1": {
				RacingNumber: "1",
				Line: 1,
				GridPos: "1",
				Stints: [
					{ Compound: "MEDIUM", TotalLaps: 10 },
					{ Compound: "SOFT", TotalLaps: 4 },
				],
			},
		},
	};
	const rows = build({ "1": timingLine({ RacingNumber: "1", Position: "1" }) }, app);
	expect(rows[0].compound).toBe("SOFT");
	expect(rows[0].tyreAge).toBe(4);
});

test("missing stint leaves compound and age unavailable", () => {
	const rows = build({ "1": timingLine({ RacingNumber: "1", Position: "1" }) });
	expect(rows[0].compound).toBeNull();
	expect(rows[0].tyreAge).toBeNull();
});

test("explicit zero tyre age is preserved rather than coerced away", () => {
	const app: TimingAppData = {
		Lines: {
			"1": { RacingNumber: "1", Line: 1, GridPos: "1", Stints: [{ Compound: "SOFT", TotalLaps: 0 }] },
		},
	};
	const rows = build({ "1": timingLine({ RacingNumber: "1", Position: "1" }) }, app);
	expect(rows[0].tyreAge).toBe(0);
});

test("rows are sorted by position", () => {
	const rows = build({
		"81": timingLine({ RacingNumber: "81", Position: "3" }),
		"1": timingLine({ RacingNumber: "1", Position: "1" }),
		"4": timingLine({ RacingNumber: "4", Position: "2" }),
	});
	expect(rows.map((r) => r.driverNumber)).toEqual(["1", "4", "81"]);
});

test("team color falls back to neutral when the feed omits it", () => {
	const rows = build({ "81": timingLine({ RacingNumber: "81", Position: "1" }) });
	expect(rows[0].teamColor).toBe("#6d7680");
});

test("team color is prefixed with a hash from the feed value", () => {
	const rows = build({ "1": timingLine({ RacingNumber: "1", Position: "1" }) });
	expect(rows[0].teamColor).toBe("#3671C6");
});

test("last and best lap are surfaced when present and dash when missing", () => {
	const rows = build({
		"1": timingLine({
			RacingNumber: "1",
			Position: "1",
			LastLapTime: { Value: "1:20.500", Status: 0, OverallFastest: false, PersonalFastest: false },
			BestLapTime: { Value: "1:20.100", Position: 1 },
		}),
		"4": timingLine({ RacingNumber: "4", Position: "2" }),
	});
	const ver = rows.find((r) => r.driverNumber === "1")!;
	expect(ver.lastLap).toBe("1:20.500");
	expect(ver.bestLap).toBe("1:20.100");
	const nor = rows.find((r) => r.driverNumber === "4")!;
	expect(nor.lastLap).toBeNull();
	expect(nor.bestLap).toBeNull();
});

test("returns an empty array without timing data", () => {
	expect(
		buildCompactTimingRows({ drivers: driverList, timing: undefined, appTiming: undefined }),
	).toEqual([]);
});

function buildTech(
	lines: Record<string, TimingDataDriver>,
	options: { app?: TimingAppData; cars?: CarsData; previousPositions?: Record<string, number> } = {},
) {
	return buildTechnicalTimingRows({
		drivers: driverList,
		timing: { Lines: lines, Withheld: false },
		appTiming: options.app,
		carsData: options.cars,
		previousPositions: options.previousPositions,
	});
}

test("technical rows expose the full timing column set", () => {
	const rows = buildTech({
		"1": timingLine({
			RacingNumber: "1",
			Position: "1",
			LastLapTime: { Value: "1:20.500", Status: 0, OverallFastest: false, PersonalFastest: false },
			BestLapTime: { Value: "1:20.100", Position: 1 },
			Sectors: [
				{ Stopped: false, Value: "25.100", Status: 0, OverallFastest: false, PersonalFastest: false, Segments: [] },
				{ Stopped: false, Value: "30.200", Status: 0, OverallFastest: false, PersonalFastest: false, Segments: [] },
				{ Stopped: false, Value: "24.800", Status: 0, OverallFastest: false, PersonalFastest: false, Segments: [] },
			],
			Speeds: {
				I1: { Value: "300", Status: 0, OverallFastest: false, PersonalFastest: false },
				I2: { Value: "280", Status: 0, OverallFastest: false, PersonalFastest: false },
				FL: { Value: "310", Status: 0, OverallFastest: false, PersonalFastest: false },
				ST: { Value: "330", Status: 0, OverallFastest: false, PersonalFastest: false },
			},
		}),
	});
	const row = rows[0];
	expect(row.position).toBe(1);
	expect(row.lastLap).toBe("1:20.500");
	expect(row.bestLap).toBe("1:20.100");
	expect(row.sectors).toEqual(["25.100", "30.200", "24.800"]);
	expect(row.speedTrap).toBe("330");
});

test("technical sectors and speed trap fall back to dash when absent", () => {
	const rows = buildTech({ "1": timingLine({ RacingNumber: "1", Position: "1" }) });
	const row = rows[0];
	expect(row.sectors).toEqual(["-", "-", "-"]);
	expect(row.speedTrap).toBe("-");
});

test("technical telemetry is present only when car data exists for the driver", () => {
	const cars: CarsData = {
		"1": { Channels: { "0": 11000, "2": 305, "3": 7, "4": 100, "5": 0, "45": 0 } },
	};
	const rows = buildTech(
		{
			"1": timingLine({ RacingNumber: "1", Position: "1" }),
			"4": timingLine({ RacingNumber: "4", Position: "2" }),
		},
		{ cars },
	);
	const ver = rows.find((r) => r.driverNumber === "1")!;
	const nor = rows.find((r) => r.driverNumber === "4")!;
	expect(ver.telemetry).not.toBeNull();
	expect(ver.telemetry?.speed).toBe(305);
	expect(ver.telemetry?.gear).toBe(7);
	expect(nor.telemetry).toBeNull();
});

test("technical rows carry stops and interval alongside leader gap", () => {
	const app: TimingAppData = {
		Lines: {
			"4": {
				RacingNumber: "4",
				Line: 2,
				GridPos: "2",
				Stints: [
					{ Compound: "MEDIUM", TotalLaps: 12 },
					{ Compound: "SOFT", TotalLaps: 5 },
				],
			},
		},
	};
	const rows = buildTech(
		{
			"1": timingLine({ RacingNumber: "1", Position: "1" }),
			"4": timingLine({
				RacingNumber: "4",
				Position: "2",
				GapToLeader: "+5.231",
				IntervalToPositionAhead: { Value: "+1.100", Catching: true },
			}),
		},
		{ app },
	);
	const nor = rows.find((r) => r.driverNumber === "4")!;
	expect(nor.primaryGap).toBe("+5.231");
	expect(nor.interval).toBe("+1.100");
	expect(nor.stops).toBe(1);
	expect(nor.compound).toBe("SOFT");
	expect(nor.tyreAge).toBe(5);
});

test("technical rows are sorted by position", () => {
	const rows = buildTech({
		"81": timingLine({ RacingNumber: "81", Position: "3" }),
		"1": timingLine({ RacingNumber: "1", Position: "1" }),
		"4": timingLine({ RacingNumber: "4", Position: "2" }),
	});
	expect(rows.map((r) => r.driverNumber)).toEqual(["1", "4", "81"]);
});
