import { expect, test } from "vitest";

import { selectNextTargets } from "../src/lib/nextSession";
import type { Round } from "../src/types/schedule.type";

const round = (sessions: { kind: string; start: string }[]) => ({
	name: "Test GP",
	countryName: "X",
	countryKey: null,
	start: "",
	end: "",
	over: false,
	sessions: sessions.map((s) => ({ ...s, end: s.start })),
});

test("selects the earliest future non-race session", () => {
	const now = new Date("2026-06-10T00:00:00Z");
	const r = round([
		{ kind: "Practice 1", start: "2026-06-12T10:00:00Z" },
		{ kind: "Qualifying", start: "2026-06-13T14:00:00Z" },
		{ kind: "Race", start: "2026-06-14T13:00:00Z" },
	]);
	expect(selectNextTargets(r as Round, now).nextSession?.kind).toBe("Practice 1");
});

test("returns the future race when present", () => {
	const now = new Date("2026-06-10T00:00:00Z");
	const r = round([{ kind: "Race", start: "2026-06-14T13:00:00Z" }]);
	expect(selectNextTargets(r as Round, now).nextRace?.kind).toBe("Race");
});

test("returns null race when no future race exists", () => {
	const now = new Date("2026-06-14T18:00:00Z");
	const r = round([{ kind: "Race", start: "2026-06-14T13:00:00Z" }]);
	expect(selectNextTargets(r as Round, now).nextRace).toBeNull();
});

test("yields no targets when all sessions are in the past", () => {
	const now = new Date("2026-06-20T00:00:00Z");
	const r = round([{ kind: "Practice 1", start: "2026-06-12T10:00:00Z" }]);
	expect(selectNextTargets(r as Round, now)).toEqual({ nextSession: null, nextRace: null });
});

test("handles null and malformed rounds without throwing", () => {
	const now = new Date();
	expect(selectNextTargets(null, now)).toEqual({ nextSession: null, nextRace: null });
	expect(selectNextTargets({} as Round, now)).toEqual({ nextSession: null, nextRace: null });
});
