import { describe, expect, it } from "vitest";

import { matchMeetingToRound, selectHubMeeting } from "@/lib/weekendHub";
import type { SeasonRound } from "@/lib/f1data";
import type { Round } from "@/types/schedule.type";

const meeting = (partial: Partial<Round> = {}): Round => ({
	name: "FORMULA 1 CANADIAN GRAND PRIX 2026",
	countryName: "Canada",
	countryKey: null,
	start: "2026-06-12T16:00:00Z",
	end: "2026-06-14T21:00:00Z",
	sessions: [],
	over: false,
	...partial,
});

const seasonRound = (partial: Partial<SeasonRound> = {}): SeasonRound => ({
	season: "2026",
	round: 10,
	raceName: "Canadian Grand Prix",
	date: "2026-06-14",
	time: "18:00:00Z",
	circuitName: "Circuit Gilles Villeneuve",
	country: "Canada",
	locality: "Montreal",
	...partial,
});

describe("selectHubMeeting", () => {
	it("selects an active weekend before a future weekend", () => {
		const future = meeting({ name: "Austrian Grand Prix", start: "2026-06-26T10:00:00Z", end: "2026-06-28T16:00:00Z" });
		expect(selectHubMeeting([future, meeting()], new Date("2026-06-14T12:00:00Z"))).toEqual({
			meeting: meeting(),
			live: true,
		});
	});

	it("selects the next weekend when none is active", () => {
		const next = meeting({ start: "2026-06-20T10:00:00Z", end: "2026-06-22T16:00:00Z" });
		expect(selectHubMeeting([next], new Date("2026-06-14T12:00:00Z"))).toEqual({ meeting: next, live: false });
	});
});

describe("matchMeetingToRound", () => {
	it("matches schedule and Jolpica names", () => {
		expect(matchMeetingToRound(meeting(), [seasonRound()])?.round).toBe(10);
	});

	it("falls back to country when race naming differs", () => {
		expect(matchMeetingToRound(meeting({ name: "Montreal" }), [seasonRound()])?.round).toBe(10);
	});
});
