import type { State } from "@/types/state.type";
import { getTrackStatusMessage } from "@/lib/getTrackStatusMessage";
import { calculateSessionClock } from "@/hooks/useSessionClock";

export type SessionBarTone = "neutral" | "green" | "yellow" | "red";

export type SessionBarConnectionLabel =
	| "Live"
	| "Delayed"
	| "Replay"
	| "Disconnected"
	| "Ended"
	| "No session";

export type SessionBarModel = {
	eventName: string;
	sessionName: string;
	clock: string;
	lapLabel: string | null;
	trackStatus: { label: string; tone: SessionBarTone };
	connectionLabel: SessionBarConnectionLabel;
	weatherLabel: string | null;
};

export type SessionBarInput = {
	state: State | null;
	connected: boolean;
	delaySeconds: number;
	replayPaused: boolean;
};

// FIA hex from getTrackStatusMessage mapped to a semantic tone. Color is never
// the only signal — the label text always travels with it.
const hexToTone = (hex: string): SessionBarTone => {
	switch (hex) {
		case "#34b981":
			return "green";
		case "#fbbf24":
			return "yellow";
		case "#ef4444":
			return "red";
		default:
			return "neutral";
	}
};

const buildTrackStatus = (state: State | null): { label: string; tone: SessionBarTone } => {
	const raw = state?.TrackStatus?.Status;
	const code = raw ? parseInt(raw, 10) : undefined;
	const message = getTrackStatusMessage(Number.isFinite(code) ? code : undefined);
	if (!message) return { label: "No status", tone: "neutral" };
	return { label: message.message, tone: hexToTone(message.hex) };
};

const buildConnectionLabel = (input: SessionBarInput): SessionBarConnectionLabel => {
	if (!input.state?.SessionInfo) return "No session";
	if (input.state.SessionStatus?.Status === "Ends") return "Ended";
	// Replay playback is paused content reconstructed from a buffer; never Live.
	if (input.replayPaused) return "Replay";
	if (!input.connected) return "Disconnected";
	if (input.delaySeconds > 0) return "Delayed";
	return "Live";
};

const buildWeatherLabel = (state: State | null): string | null => {
	const weather = state?.WeatherData;
	if (!weather) return null;
	const rainfall = Number.parseFloat(weather.Rainfall);
	const condition = Number.isFinite(rainfall) && rainfall > 0 ? "Rain" : "Dry";
	const airTemp = weather.AirTemp ? `${weather.AirTemp}°C air` : null;
	const trackTemp = weather.TrackTemp ? `${weather.TrackTemp}°C track` : null;
	return [condition, airTemp, trackTemp].filter(Boolean).join(" · ");
};

export function buildSessionBarModel(input: SessionBarInput): SessionBarModel {
	const session = input.state?.SessionInfo;

	if (!session) {
		return {
			eventName: "No session",
			sessionName: "—",
			clock: "—",
			lapLabel: null,
			trackStatus: { label: "No status", tone: "neutral" },
			connectionLabel: "No session",
			weatherLabel: null,
		};
	}

	const clock = calculateSessionClock(input.state?.ExtrapolatedClock, input.delaySeconds, Date.now());
	const lapCount = input.state?.LapCount;
	const lapLabel =
		lapCount && Number.isFinite(lapCount.CurrentLap) && Number.isFinite(lapCount.TotalLaps)
			? `Lap ${lapCount.CurrentLap} / ${lapCount.TotalLaps}`
			: null;

	return {
		eventName: session.Meeting?.Name ?? "Unknown event",
		sessionName: session.Name ?? "Session",
		clock: clock ?? "—",
		lapLabel,
		trackStatus: buildTrackStatus(input.state),
		connectionLabel: buildConnectionLabel(input),
		weatherLabel: buildWeatherLabel(input.state),
	};
}
