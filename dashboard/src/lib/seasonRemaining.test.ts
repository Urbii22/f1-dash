import { describe, expect, it } from "vitest";

import { remainingEvents, remainingRaceCount, remainingSprintCount } from "@/lib/seasonRemaining";
import type { SeasonRound } from "@/lib/f1data";
import type { Round } from "@/types/schedule.type";

const now = new Date("2026-06-18T00:00:00Z");

const round = (partial: Partial<SeasonRound>): SeasonRound => ({
	season: "2026",
	round: 1,
	raceName: "GP",
	date: null,
	time: null,
	circuitName: null,
	country: null,
	locality: null,
	...partial,
});

describe("remainingRaceCount", () => {
	it("counts only rounds whose race is in the future", () => {
		const rounds = [
			round({ date: "2026-05-01", time: "13:00:00Z" }), // past
			round({ date: "2026-07-01", time: "13:00:00Z" }), // future
			round({ date: "2026-08-01", time: null }), // future, no time
			round({ date: null }), // unknown → not counted
		];
		expect(remainingRaceCount(rounds, now)).toBe(2);
	});
});

const scheduleRound = (over: boolean, sessions: Round["sessions"]): Round => ({
	name: "GP",
	countryName: "X",
	countryKey: null,
	start: "2026-07-01T10:00:00Z",
	end: "2026-07-03T16:00:00Z",
	over,
	sessions,
});

describe("remainingSprintCount", () => {
	it("counts future Sprint races but not Sprint Qualifying or past sessions", () => {
		const schedule = [
			scheduleRound(false, [
				{ kind: "Sprint Qualifying", start: "2026-07-01T14:00:00Z", end: "2026-07-01T14:45:00Z" },
				{ kind: "Sprint", start: "2026-07-02T10:00:00Z", end: "2026-07-02T11:00:00Z" },
				{ kind: "Race", start: "2026-07-03T13:00:00Z", end: "2026-07-03T15:00:00Z" },
			]),
			scheduleRound(true, [
				{ kind: "Sprint", start: "2026-05-02T10:00:00Z", end: "2026-05-02T11:00:00Z" }, // past round
			]),
		];
		expect(remainingSprintCount(schedule, now)).toBe(1);
	});
});

describe("remainingEvents", () => {
	it("combines race and sprint counts", () => {
		const rounds = [round({ date: "2026-07-01", time: "13:00:00Z" })];
		const schedule = [
			scheduleRound(false, [{ kind: "Sprint", start: "2026-07-02T10:00:00Z", end: "2026-07-02T11:00:00Z" }]),
		];
		expect(remainingEvents(rounds, schedule, now)).toEqual({ races: 1, sprints: 1 });
	});
});
