import { expect, test } from "vitest";

import { buildCompactTimingRows } from "@/lib/view-models/liveTiming";
import type { DriverList, TimingAppData, TimingDataDriver } from "@/types/state.type";

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
