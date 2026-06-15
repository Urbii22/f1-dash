import { expect, test } from "vitest";

import { buildRaceStory, type RaceStrategySignal } from "@/lib/view-models/raceStory";
import type { State } from "@/types/state.type";
import type { StoredAlert } from "@/stores/useAlertStore";

function stateWith(messages: State["RaceControlMessages"]): State {
	return { RaceControlMessages: messages };
}

function alert(overrides: Partial<StoredAlert> = {}): StoredAlert {
	return {
		id: "a1",
		rule: "penalty",
		severity: "warning",
		title: "Penalty",
		body: "5s time penalty",
		utc: "2026-06-15T12:00:00Z",
		receivedAt: 1000,
		...overrides,
	};
}

test("orders items by priority then recency", () => {
	const items = buildRaceStory({
		state: null,
		alerts: [
			alert({ id: "info", severity: "info", title: "Fastest lap", rule: "fastest-lap", receivedAt: 50 }),
			alert({ id: "crit", severity: "critical", title: "Red flag", rule: "flag-change", receivedAt: 10 }),
			alert({ id: "warn", severity: "warning", title: "Penalty", rule: "penalty", receivedAt: 20 }),
		],
		strategySignals: [],
	});
	expect(items.map((item) => item.id)).toEqual(["crit", "warn", "info"]);
});

test("deduplicates by stable id", () => {
	const items = buildRaceStory({
		state: null,
		alerts: [alert({ id: "dup" }), alert({ id: "dup" })],
		strategySignals: [],
	});
	expect(items.filter((item) => item.id === "dup")).toHaveLength(1);
});

test("caps the story at six items", () => {
	const alerts = Array.from({ length: 10 }, (_, index) =>
		alert({ id: `a${index}`, receivedAt: index }),
	);
	const items = buildRaceStory({ state: null, alerts, strategySignals: [] });
	expect(items).toHaveLength(6);
});

test("distinguishes a track-limit warning from a penalty", () => {
	const state = stateWith({
		Messages: [
			{
				Utc: "2026-06-15T12:01:00Z",
				Lap: 10,
				Message: "CAR 4 (NOR) TRACK LIMITS AT TURN 9 LAP 10 DELETED",
				Category: "Other",
			},
			{
				Utc: "2026-06-15T12:02:00Z",
				Lap: 11,
				Message: "CAR 81 (PIA) 5 SECOND TIME PENALTY",
				Category: "Other",
			},
		],
	});
	const items = buildRaceStory({ state, alerts: [], strategySignals: [] });
	const kinds = items.map((item) => item.kind);
	expect(kinds).toContain("penalty");
	// a deleted lap / track limit is not classified as a penalty
	const trackLimit = items.find((item) => /track limit/i.test(item.detail) || /track limit/i.test(item.title));
	expect(trackLimit?.kind).not.toBe("penalty");
});

test("explains a closing battle from a strategy signal", () => {
	const signal: RaceStrategySignal = {
		id: "battle-4-81",
		driverNumber: "4",
		title: "NOR closing on PIA",
		detail: "NOR closing on PIA, 0.7s gap",
		priority: 1,
	};
	const items = buildRaceStory({ state: null, alerts: [], strategySignals: [signal] });
	const battle = items.find((item) => item.id === "battle-4-81");
	expect(battle?.kind).toBe("battle");
	expect(battle?.detail).toBe("NOR closing on PIA, 0.7s gap");
});

test("flag messages classify as flag stories", () => {
	const state = stateWith({
		Messages: [
			{
				Utc: "2026-06-15T12:03:00Z",
				Lap: 12,
				Message: "YELLOW FLAG IN SECTOR 2",
				Category: "Flag",
				Flag: "YELLOW",
			},
		],
	});
	const items = buildRaceStory({ state, alerts: [], strategySignals: [] });
	expect(items[0].kind).toBe("flag");
});
