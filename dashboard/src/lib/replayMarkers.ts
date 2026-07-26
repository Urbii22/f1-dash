import type { Message, State } from "@/types/state.type";

import type { LapRecord } from "@/lib/lapHistory";
import { utcToLocalMs } from "@/lib/utcToLocalMs";

export type ReplayMarkerType = "safety-car" | "red-flag" | "yellow-flag" | "green-flag" | "chequered" | "pit";

export type ReplayMarker = {
	tsMs: number;
	type: ReplayMarkerType;
	label: string;
	color: string;
};

const MARKER_COLORS: Record<ReplayMarkerType, string> = {
	"safety-car": "#fbbf24",
	"red-flag": "#ef4444",
	"yellow-flag": "#fbbf24",
	"green-flag": "#34d399",
	chequered: "#e4e4e7",
	pit: "#22d3ee",
};

function normalizeMessages(messages: Message[] | Record<string, Message> | undefined): Message[] {
	if (!messages) return [];
	return Array.isArray(messages) ? messages : Object.values(messages);
}

function messageMarker(msg: Message): ReplayMarker | null {
	if (!msg.Utc) return null;
	const tsMs = utcToLocalMs(msg.Utc);
	if (!Number.isFinite(tsMs)) return null;

	const text = msg.Message?.toUpperCase() ?? "";

	if (msg.Category === "SafetyCar" || text.includes("SAFETY CAR")) {
		return { tsMs, type: "safety-car", label: msg.Message || "Safety Car", color: MARKER_COLORS["safety-car"] };
	}

	switch (msg.Flag) {
		case "RED":
			return { tsMs, type: "red-flag", label: msg.Message || "Red flag", color: MARKER_COLORS["red-flag"] };
		case "YELLOW":
		case "DOUBLE YELLOW":
			return { tsMs, type: "yellow-flag", label: msg.Message || "Yellow flag", color: MARKER_COLORS["yellow-flag"] };
		case "GREEN":
		case "CLEAR":
			return { tsMs, type: "green-flag", label: msg.Message || "Green flag", color: MARKER_COLORS["green-flag"] };
		case "CHEQUERED":
			return { tsMs, type: "chequered", label: msg.Message || "Chequered flag", color: MARKER_COLORS.chequered };
		default:
			return null;
	}
}

/**
 * Markers shown on the replay timeline, derived from data already in the
 * merged state plus recorded pit laps. Window filtering happens in the UI.
 */
export function buildReplayMarkers(
	state: State | null,
	lapsByDriver: Record<string, LapRecord[]> = {},
): ReplayMarker[] {
	const markers: ReplayMarker[] = [];

	for (const msg of normalizeMessages(state?.RaceControlMessages?.Messages)) {
		const marker = messageMarker(msg);
		if (marker) markers.push(marker);
	}

	const drivers = state?.DriverList;
	for (const [nr, laps] of Object.entries(lapsByDriver)) {
		for (const lap of laps) {
			if (!lap.pitted || !lap.utc) continue;
			const tsMs = utcToLocalMs(lap.utc);
			if (!Number.isFinite(tsMs)) continue;
			markers.push({
				tsMs,
				type: "pit",
				label: `${drivers?.[nr]?.Tla ?? `#${nr}`} pit (lap ${lap.lap})`,
				color: MARKER_COLORS.pit,
			});
		}
	}

	return markers.sort((a, b) => a.tsMs - b.tsMs);
}

/**
 * Markers carry recording-clock timestamps (derived from feed `Utc`), but the
 * replay window is measured in wall-clock receive time (`Date.now()` when each
 * frame was buffered). Those scales differ by days in a recorded replay, so a
 * raw comparison filters every marker out. Anchor both to the same scale using
 * the currently displayed frame: the cursor (receive time) and the frame's
 * heartbeat (recording time) describe the same instant, so the offset between a
 * marker and the heartbeat — invariant to scale — placed relative to the cursor
 * yields the marker's position on the timeline.
 */
export function projectMarkerMs(markerTsMs: number, cursorMs: number, heartbeatEventMs: number | null): number {
	if (heartbeatEventMs === null || !Number.isFinite(heartbeatEventMs)) return markerTsMs;
	return cursorMs + (markerTsMs - heartbeatEventMs);
}
