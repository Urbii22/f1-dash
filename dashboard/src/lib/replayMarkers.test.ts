import { describe, expect, it } from "vitest";

import type { Message, State } from "@/types/state.type";

import type { LapRecord } from "@/lib/lapHistory";
import { buildReplayMarkers, projectMarkerMs } from "@/lib/replayMarkers";

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

describe("projectMarkerMs", () => {
	// recording clock (2026-06-07) vs receive clock (now) differ by days
	const RECORD = Date.UTC(2026, 5, 7, 16, 10, 0);
	const NOW = Date.UTC(2026, 5, 11, 14, 0, 0);

	it("anchors a recording-clock marker onto the receive-clock window", () => {
		// the displayed frame's heartbeat is at RECORD, shown at cursor NOW.
		// a marker 60s before the heartbeat must land 60s before the cursor.
		const heartbeat = RECORD;
		const marker = RECORD - 60_000;
		expect(projectMarkerMs(marker, NOW, heartbeat)).toBe(NOW - 60_000);
	});

	it("places a marker at the cursor when it coincides with the heartbeat", () => {
		expect(projectMarkerMs(RECORD, NOW, RECORD)).toBe(NOW);
	});

	it("falls back to the raw timestamp without a heartbeat anchor", () => {
		expect(projectMarkerMs(RECORD, NOW, null)).toBe(RECORD);
	});

	it("keeps anchored markers inside the window that a raw compare would drop", () => {
		// regression for the days-apart scale mismatch bug
		const windowStart = NOW - 5 * 60_000;
		const windowEnd = NOW;
		const rawMarker = RECORD - 30_000; // far outside [windowStart, windowEnd]
		expect(rawMarker >= windowStart && rawMarker <= windowEnd).toBe(false);

		const projected = projectMarkerMs(rawMarker, NOW - 10_000, RECORD);
		expect(projected >= windowStart && projected <= windowEnd).toBe(true);
	});
});
