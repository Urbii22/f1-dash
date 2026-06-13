import { describe, expect, it } from "vitest";

import type { PersonalBestLapTime, SessionInfo, TimingDataDriver } from "@/types/state.type";

import {
	deltaToCutoff,
	formatLapTime,
	getCutoffPosition,
	inEliminationZone,
	isOnFlyingLap,
	isQualifyingSession,
	parseLapTime,
	theoreticalBest,
} from "./quali";

const makeDriver = (overrides: Partial<TimingDataDriver> = {}): TimingDataDriver => ({
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
		{
			Stopped: false,
			Value: "25.000",
			Status: 0,
			OverallFastest: false,
			PersonalFastest: true,
			Segments: [{ Status: 0 }],
		},
	],
	Speeds: {
		I1: { Value: "", Status: 0, OverallFastest: false, PersonalFastest: false },
		I2: { Value: "", Status: 0, OverallFastest: false, PersonalFastest: false },
		Fl: { Value: "", Status: 0, OverallFastest: false, PersonalFastest: false },
		St: { Value: "", Status: 0, OverallFastest: false, PersonalFastest: false },
	},
	BestLapTime: { Value: "", Position: 0 },
	LastLapTime: { Value: "", Status: 0, OverallFastest: false, PersonalFastest: false },
	NumberOfLaps: 0,
	...overrides,
});

const sessionInfo = (Type: string, Name: string): SessionInfo => ({ Type, Name }) as SessionInfo;

describe("getCutoffPosition", () => {
	it("returns the Q1 and Q2 cutoff positions", () => {
		expect(getCutoffPosition(1)).toBe(16);
		expect(getCutoffPosition(2)).toBe(10);
	});

	it.each([undefined, 0, 3, 4, Number.NaN])("returns undefined when there is no cutoff", (part) => {
		expect(getCutoffPosition(part)).toBeUndefined();
	});
});

describe("parseLapTime", () => {
	it("parses minute and second lap times", () => {
		expect(parseLapTime("1:23.456")).toBe(83_456);
		expect(parseLapTime("12:03.004")).toBe(723_004);
	});

	it("parses sub-minute lap times", () => {
		expect(parseLapTime("58.123")).toBe(58_123);
		expect(parseLapTime("0.001")).toBe(1);
	});

	it.each([undefined, "", " ", "1:", "1:23", "1:60.000", "58", ".123", "abc", "-1.000"])(
		"returns undefined for invalid or partial input %s",
		(time) => {
			expect(parseLapTime(time)).toBeUndefined();
		},
	);
});

describe("formatLapTime", () => {
	it("formats milliseconds using the feed lap-time format", () => {
		expect(formatLapTime(83_456)).toBe("1:23.456");
		expect(formatLapTime(58_123)).toBe("0:58.123");
		expect(formatLapTime(1)).toBe("0:00.001");
	});

	it.each([-1, Number.NaN, Number.POSITIVE_INFINITY])("returns an empty string for invalid milliseconds", (ms) => {
		expect(formatLapTime(ms)).toBe("");
	});
});

describe("deltaToCutoff", () => {
	it("returns a positive delta when the driver is outside the cutoff", () => {
		expect(deltaToCutoff("1:23.700", "1:23.456")).toBe(244);
	});

	it("returns zero or a negative delta when the driver is at or inside the cutoff", () => {
		expect(deltaToCutoff("58.123", "58.123")).toBe(0);
		expect(deltaToCutoff("57.900", "58.123")).toBe(-223);
	});

	it.each([
		["", "1:23.456"],
		["1:23.456", ""],
		["invalid", "1:23.456"],
	])("returns undefined when either time is invalid", (driverBest, cutoffBest) => {
		expect(deltaToCutoff(driverBest, cutoffBest)).toBeUndefined();
	});
});

describe("isOnFlyingLap", () => {
	it("identifies an active driver with a personal-fastest sector", () => {
		expect(isOnFlyingLap(makeDriver())).toBe(true);
	});

	it.each([{ PitOut: true }, { InPit: true }, { KnockedOut: true }, { Stopped: true }])(
		"rejects an unavailable driver: %o",
		(override) => {
			expect(isOnFlyingLap(makeDriver(override))).toBe(false);
		},
	);

	it("rejects in-laps and out-laps marked by segment status 2064", () => {
		const driver = makeDriver({
			Sectors: [
				{
					Stopped: false,
					Value: "25.000",
					Status: 0,
					OverallFastest: false,
					PersonalFastest: true,
					Segments: [{ Status: 2064 }],
				},
			],
		});

		expect(isOnFlyingLap(driver)).toBe(false);
	});

	it("rejects drivers without a personal-fastest sector", () => {
		const driver = makeDriver({
			Sectors: makeDriver().Sectors.map((sector) => ({ ...sector, PersonalFastest: false })),
		});

		expect(isOnFlyingLap(driver)).toBe(false);
	});

	it("handles missing sector data without throwing", () => {
		const driver = makeDriver({ Sectors: undefined } as unknown as Partial<TimingDataDriver>);

		expect(isOnFlyingLap(driver)).toBe(false);
	});
});

describe("inEliminationZone", () => {
	it("marks positions below the cutoff in Q1 and Q2", () => {
		expect(inEliminationZone(17, 1)).toBe(true);
		expect(inEliminationZone(11, 2)).toBe(true);
	});

	it("does not mark the cutoff itself or sessions without a cutoff", () => {
		expect(inEliminationZone(16, 1)).toBe(false);
		expect(inEliminationZone(10, 2)).toBe(false);
		expect(inEliminationZone(20, 3)).toBe(false);
		expect(inEliminationZone(20, undefined)).toBe(false);
	});

	it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])("rejects invalid positions", (position) => {
		expect(inEliminationZone(position, 1)).toBe(false);
	});
});

describe("theoreticalBest", () => {
	it("sums three complete best sectors", () => {
		const sectors: PersonalBestLapTime[] = [
			{ Value: "25.100", Position: 1 },
			{ Value: "31.250", Position: 2 },
			{ Value: "27.006", Position: 3 },
		];

		expect(theoreticalBest(sectors)).toBe(83_356);
	});

	it.each([
		undefined,
		[],
		[{ Value: "25.100", Position: 1 }],
		[
			{ Value: "25.100", Position: 1 },
			{ Value: "", Position: 2 },
			{ Value: "27.006", Position: 3 },
		],
	])("returns undefined for missing or incomplete sectors", (sectors) => {
		expect(theoreticalBest(sectors)).toBeUndefined();
	});
});

describe("isQualifyingSession", () => {
	it("recognizes regular qualifying by Type", () => {
		expect(isQualifyingSession(sessionInfo("Qualifying", "Qualifying"))).toBe(true);
	});

	it("recognizes sprint qualifying by Type or Name", () => {
		expect(isQualifyingSession(sessionInfo("Sprint Qualifying", "Sprint Qualifying"))).toBe(true);
		expect(isQualifyingSession(sessionInfo("Practice", "Sprint Qualifying"))).toBe(true);
	});

	it("rejects missing and non-qualifying sessions", () => {
		expect(isQualifyingSession(undefined)).toBe(false);
		expect(isQualifyingSession(sessionInfo("Race", "Race"))).toBe(false);
		expect(isQualifyingSession(sessionInfo("Practice", "Sprint"))).toBe(false);
	});
});
