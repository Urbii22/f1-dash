import { describe, expect, it } from "vitest";

import type { State, TimingDataDriver } from "@/types/state.type";

import { AlertEngine } from "@/lib/alerts/engine";
import {
	createClosingInRule,
	createFastestLapRule,
	createOvertakeRule,
	createPenaltyRule,
	createPitRule,
	createRetirementRule,
	createTrackLimitsRule,
	createTrackStatusRule,
	createWeatherRule,
} from "@/lib/alerts/rules";

function timingLine(overrides: Record<string, unknown> = {}): TimingDataDriver {
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
		NumberOfLaps: 10,
		...overrides,
	} as unknown as TimingDataDriver;
}

function buildState(overrides: Partial<State> = {}): State {
	return {
		Heartbeat: { Utc: "2026-06-11T14:00:00Z" },
		DriverList: {
			"1": { Tla: "VER", RacingNumber: "1" },
			"44": { Tla: "HAM", RacingNumber: "44" },
		} as unknown as State["DriverList"],
		...overrides,
	} as State;
}

describe("flag-change rule", () => {
	it("emits exactly one critical alert per safety car deployment", () => {
		const rule = createTrackStatusRule();

		const clear = buildState({ TrackStatus: { Status: "1", Message: "AllClear" } });
		const sc = buildState({ TrackStatus: { Status: "4", Message: "SCDeployed" } });

		expect(rule.evaluate({ prev: clear, next: sc })).toHaveLength(1);
		expect(rule.evaluate({ prev: clear, next: sc })[0].severity).toBe("critical");
		// same status on the next tick: no re-emission
		expect(rule.evaluate({ prev: sc, next: sc })).toHaveLength(0);
	});

	it("ignores the very first status frame", () => {
		const rule = createTrackStatusRule();
		const sc = buildState({ TrackStatus: { Status: "4", Message: "SCDeployed" } });
		expect(rule.evaluate({ prev: null, next: sc })).toHaveLength(0);
	});
});

describe("pit rule", () => {
	it("detects pit entry and exit edges", () => {
		const rule = createPitRule();

		const out = buildState({ TimingData: { Lines: { "1": timingLine() }, Withheld: false } });
		const inPit = buildState({ TimingData: { Lines: { "1": timingLine({ InPit: true }) }, Withheld: false } });

		const entry = rule.evaluate({ prev: out, next: inPit });
		expect(entry).toHaveLength(1);
		expect(entry[0].title).toContain("VER");

		const exit = rule.evaluate({ prev: inPit, next: out });
		expect(exit).toHaveLength(1);

		// steady state: nothing
		expect(rule.evaluate({ prev: inPit, next: inPit })).toHaveLength(0);
	});
});

describe("overtake rule", () => {
	it("emits when a driver gains a position on track", () => {
		const rule = createOvertakeRule();

		const before = buildState({
			TimingData: {
				Lines: {
					"1": timingLine({ Position: "2", RacingNumber: "1" }),
					"44": timingLine({ Position: "1", RacingNumber: "44" }),
				},
				Withheld: false,
			},
		});
		const after = buildState({
			TimingData: {
				Lines: {
					"1": timingLine({ Position: "1", RacingNumber: "1" }),
					"44": timingLine({ Position: "2", RacingNumber: "44" }),
				},
				Withheld: false,
			},
		});

		const events = rule.evaluate({ prev: before, next: after });
		expect(events).toHaveLength(1);
		expect(events[0].driverNumber).toBe("1");
		expect(events[0].body).toContain("HAM");
	});

	it("suppresses position swaps caused by pit stops", () => {
		const rule = createOvertakeRule();

		const before = buildState({
			TimingData: {
				Lines: {
					"1": timingLine({ Position: "2", RacingNumber: "1" }),
					"44": timingLine({ Position: "1", RacingNumber: "44" }),
				},
				Withheld: false,
			},
		});
		const after = buildState({
			TimingData: {
				Lines: {
					"1": timingLine({ Position: "1", RacingNumber: "1" }),
					"44": timingLine({ Position: "2", RacingNumber: "44", InPit: true }),
				},
				Withheld: false,
			},
		});

		expect(rule.evaluate({ prev: before, next: after })).toHaveLength(0);
	});
});

describe("fastest-lap rule", () => {
	it("emits when the fastest lap changes hands", () => {
		const rule = createFastestLapRule();

		const before = buildState({
			TimingStats: {
				Lines: {
					"44": { PersonalBestLapTime: { Value: "1:21.000", Position: 1 } },
					"1": { PersonalBestLapTime: { Value: "1:21.500", Position: 2 } },
				},
			} as unknown as State["TimingStats"],
		});
		const after = buildState({
			TimingStats: {
				Lines: {
					"44": { PersonalBestLapTime: { Value: "1:21.000", Position: 2 } },
					"1": { PersonalBestLapTime: { Value: "1:20.900", Position: 1 } },
				},
			} as unknown as State["TimingStats"],
		});

		const events = rule.evaluate({ prev: before, next: after });
		expect(events).toHaveLength(1);
		expect(events[0].title).toContain("VER");
		expect(events[0].body).toContain("1:20.900");

		expect(rule.evaluate({ prev: after, next: after })).toHaveLength(0);
	});
});

describe("race control rules", () => {
	const before = buildState({
		RaceControlMessages: { Messages: [{ Utc: "t0", Lap: 1, Message: "GREEN LIGHT", Category: "Flag" }] },
	});

	it("classifies penalties as critical", () => {
		const rule = createPenaltyRule();
		const after = buildState({
			RaceControlMessages: {
				Messages: [
					{ Utc: "t0", Lap: 1, Message: "GREEN LIGHT", Category: "Flag" },
					{ Utc: "t1", Lap: 12, Message: "CAR 1 5 SECOND TIME PENALTY", Category: "Other" },
				],
			},
		});

		const events = rule.evaluate({ prev: before, next: after });
		expect(events).toHaveLength(1);
		expect(events[0].severity).toBe("critical");
	});

	it("does not re-emit for already-seen messages", () => {
		const rule = createPenaltyRule();
		const after = buildState({
			RaceControlMessages: {
				Messages: [
					{ Utc: "t0", Lap: 1, Message: "GREEN LIGHT", Category: "Flag" },
					{ Utc: "t1", Lap: 12, Message: "CAR 1 5 SECOND TIME PENALTY", Category: "Other" },
				],
			},
		});

		rule.evaluate({ prev: before, next: after });
		expect(rule.evaluate({ prev: after, next: after })).toHaveLength(0);
	});

	it("emits track limits warnings but leaves penalties to the penalty rule", () => {
		const rule = createTrackLimitsRule();
		const after = buildState({
			RaceControlMessages: {
				Messages: [
					{ Utc: "t0", Lap: 1, Message: "GREEN LIGHT", Category: "Flag" },
					{ Utc: "t1", Lap: 12, Message: "CAR 44 LAP DELETED - TRACK LIMITS AT TURN 4", Category: "Other" },
					{ Utc: "t2", Lap: 12, Message: "CAR 44 5 SECOND PENALTY - TRACK LIMITS", Category: "Other" },
				],
			},
		});

		const events = rule.evaluate({ prev: before, next: after });
		expect(events).toHaveLength(1);
		expect(events[0].body).toContain("LAP DELETED");
	});
});

describe("weather rule", () => {
	it("alerts when rain starts", () => {
		const rule = createWeatherRule();

		const dry = buildState({ WeatherData: { Rainfall: "0", TrackTemp: "40" } as State["WeatherData"] });
		const wet = buildState({ WeatherData: { Rainfall: "1", TrackTemp: "40" } as State["WeatherData"] });

		rule.evaluate({ prev: null, next: dry });
		const events = rule.evaluate({ prev: dry, next: wet });
		expect(events.some((event) => event.title === "Rain detected")).toBe(true);
	});

	it("alerts on large track temperature drifts only once per baseline", () => {
		const rule = createWeatherRule();

		const base = buildState({ WeatherData: { Rainfall: "0", TrackTemp: "40" } as State["WeatherData"] });
		const hot = buildState({ WeatherData: { Rainfall: "0", TrackTemp: "46" } as State["WeatherData"] });

		rule.evaluate({ prev: null, next: base });
		expect(rule.evaluate({ prev: base, next: hot })).toHaveLength(1);
		// baseline moved to 46: no re-emission for the same temp
		expect(rule.evaluate({ prev: hot, next: hot })).toHaveLength(0);
	});
});

describe("closing-in rule", () => {
	function withInterval(value: string) {
		return buildState({
			TimingData: {
				Lines: {
					"1": timingLine({ IntervalToPositionAhead: { Value: value, Catching: true }, Position: "2" }),
				},
				Withheld: false,
			},
		});
	}

	it("requires three consecutive decreasing intervals under a second", () => {
		const rule = createClosingInRule();

		rule.evaluate({ prev: null, next: withInterval("+1.200") });
		expect(rule.evaluate({ prev: null, next: withInterval("+0.950") })).toHaveLength(0);
		expect(rule.evaluate({ prev: null, next: withInterval("+0.900") })).toHaveLength(0);
		const events = rule.evaluate({ prev: null, next: withInterval("+0.850") });
		expect(events).toHaveLength(1);

		// hysteresis: no new alert until the gap re-opens beyond 1.5s
		rule.evaluate({ prev: null, next: withInterval("+0.800") });
		rule.evaluate({ prev: null, next: withInterval("+0.750") });
		expect(rule.evaluate({ prev: null, next: withInterval("+0.700") })).toHaveLength(0);

		rule.evaluate({ prev: null, next: withInterval("+1.600") });
		rule.evaluate({ prev: null, next: withInterval("+0.990") });
		rule.evaluate({ prev: null, next: withInterval("+0.950") });
		expect(rule.evaluate({ prev: null, next: withInterval("+0.900") })).toHaveLength(1);
	});
});

describe("retirement rule", () => {
	it("emits on the retired edge", () => {
		const rule = createRetirementRule();

		const running = buildState({ TimingData: { Lines: { "1": timingLine() }, Withheld: false } });
		const retired = buildState({ TimingData: { Lines: { "1": timingLine({ Retired: true }) }, Withheld: false } });

		expect(rule.evaluate({ prev: running, next: retired })).toHaveLength(1);
		expect(rule.evaluate({ prev: retired, next: retired })).toHaveLength(0);
	});
});

describe("AlertEngine", () => {
	it("survives malformed frames and aggregates rule output", () => {
		const engine = new AlertEngine();

		const malformed = { TimingData: { Lines: null } } as unknown as State;
		expect(() => engine.evaluate(null, malformed)).not.toThrow();

		const clear = buildState({ TrackStatus: { Status: "1", Message: "AllClear" } });
		const red = buildState({ TrackStatus: { Status: "5", Message: "Red" } });
		const events = engine.evaluate(clear, red);
		expect(events.some((event) => event.rule === "flag-change" && event.severity === "critical")).toBe(true);
	});
});
