import { describe, expect, it } from "vitest";

import { classifyRound, findArchiveSession, latestCompletedRound, type RoundWithResult } from "@/lib/seasonResults";
import type { SeasonRound } from "@/lib/f1data";
import type { ArchiveSession } from "@/types/archive.type";

const round = (partial: Partial<SeasonRound> = {}): SeasonRound => ({
	season: "2026",
	round: 1,
	raceName: "Australian Grand Prix",
	date: "2026-03-08",
	time: "04:00:00Z",
	circuitName: "Albert Park",
	country: "Australia",
	locality: "Melbourne",
	...partial,
});

describe("classifyRound", () => {
	it("marks rounds with a result as done and future rounds as upcoming", () => {
		expect(classifyRound(round(), new Date("2026-06-14T12:00:00Z"), true)).toBe("done");
		expect(
			classifyRound(round({ date: "2026-07-05", time: "14:00:00Z" }), new Date("2026-06-14T12:00:00Z"), false),
		).toBe("upcoming");
	});

	it("marks the selected current meeting as live", () => {
		expect(classifyRound(round({ round: 9 }), new Date("2026-06-14T12:00:00Z"), false, 9)).toBe("live");
	});
});

describe("latestCompletedRound", () => {
	it("returns the highest completed round", () => {
		const rounds: RoundWithResult[] = [
			{ round: round({ round: 1 }), result: { ...round({ round: 1 }), results: [] } },
			{ round: round({ round: 3 }), result: null },
			{ round: round({ round: 2 }), result: { ...round({ round: 2 }), results: [] } },
		];
		expect(latestCompletedRound(rounds)?.round.round).toBe(2);
	});
});

describe("findArchiveSession", () => {
	it("matches a race to a recording despite Formula 1, year and GP wording", () => {
		const sessions: ArchiveSession[] = [
			{
				id: 42,
				path: "recording",
				year: 2026,
				meeting: "FORMULA 1 AUSTRALIAN GRAND PRIX 2026",
				country: "Australia",
				kind: "Race",
				name: "Race",
				startUtc: "2026-03-08T04:00:00Z",
				complete: true,
			},
		];

		expect(findArchiveSession(round(), sessions)?.id).toBe(42);
	});

	it("does not match recordings from another season", () => {
		const sessions: ArchiveSession[] = [
			{
				id: 7,
				path: "recording",
				year: 2025,
				meeting: "Australian Grand Prix",
				country: "Australia",
				kind: "Race",
				name: "Race",
				startUtc: null,
				complete: true,
			},
		];

		expect(findArchiveSession(round(), sessions)).toBeNull();
	});

	it("uses the weekend date when a country hosts multiple races", () => {
		const sessions: ArchiveSession[] = [
			{
				id: 10,
				path: "madrid",
				year: 2026,
				meeting: "Spanish Grand Prix",
				country: "Spain",
				kind: "Race",
				name: "Race",
				startUtc: "2026-09-13T14:00:00Z",
				complete: true,
			},
			{
				id: 11,
				path: "barcelona",
				year: 2026,
				meeting: "Barcelona-Catalunya Grand Prix",
				country: "Spain",
				kind: "Race",
				name: "Race",
				startUtc: "2026-06-14T13:00:00Z",
				complete: true,
			},
		];
		const barcelona = round({ raceName: "Barcelona Grand Prix", country: "Spain", date: "2026-06-14" });

		expect(findArchiveSession(barcelona, sessions)?.id).toBe(11);
	});
});
