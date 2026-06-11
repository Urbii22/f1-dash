import { describe, expect, it } from "vitest";

import type { Message, State } from "@/types/state.type";

import type { LapRecord } from "@/lib/lapHistory";
import { buildReplayMarkers } from "@/lib/replayMarkers";

function stateWithMessages(messages: Message[]): State {
	return {
		RaceControlMessages: { Messages: messages },
	} as State;
}

describe("buildReplayMarkers", () => {
	it("derives flag and safety car markers from race control messages", () => {
		const state = stateWithMessages([
			{ Utc: "2026-06-11T14:00:00Z", Lap: 1, Message: "GREEN LIGHT - PIT EXIT OPEN", Category: "Flag", Flag: "GREEN" },
			{ Utc: "2026-06-11T14:20:00Z", Lap: 12, Message: "SAFETY CAR DEPLOYED", Category: "SafetyCar" },
			{ Utc: "2026-06-11T14:40:00Z", Lap: 24, Message: "RED FLAG", Category: "Flag", Flag: "RED" },
			{ Utc: "2026-06-11T14:10:00Z", Lap: 6, Message: "DRS ENABLED", Category: "Drs" },
		]);

		const markers = buildReplayMarkers(state);
		expect(markers.map((m) => m.type)).toEqual(["green-flag", "safety-car", "red-flag"]);
		// sorted by time
		expect(markers[0].tsMs).toBeLessThan(markers[1].tsMs);
	});

	it("adds pit markers from recorded pit laps", () => {
		const laps: Record<string, LapRecord[]> = {
			"1": [
				{
					lap: 18,
					lapTimeMs: 95000,
					sectorsMs: [null, null, null],
					position: 2,
					gapToLeaderMs: 2000,
					compound: "MEDIUM",
					tyreAge: 18,
					pitted: true,
					utc: "2026-06-11T14:30:00Z",
				},
			],
		};

		const markers = buildReplayMarkers(null, laps);
		expect(markers).toHaveLength(1);
		expect(markers[0].type).toBe("pit");
		expect(markers[0].label).toContain("lap 18");
	});

	it("ignores clean laps and malformed timestamps", () => {
		const laps: Record<string, LapRecord[]> = {
			"1": [
				{
					lap: 10,
					lapTimeMs: 84000,
					sectorsMs: [null, null, null],
					position: 1,
					gapToLeaderMs: 0,
					compound: "SOFT",
					tyreAge: 10,
					pitted: false,
					utc: "2026-06-11T14:15:00Z",
				},
			],
		};

		expect(buildReplayMarkers(null, laps)).toHaveLength(0);
	});

	it("handles empty state", () => {
		expect(buildReplayMarkers(null)).toEqual([]);
	});
});
