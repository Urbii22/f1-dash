import { describe, expect, it } from "vitest";
import { buildSessionBarModel } from "@/lib/view-models/sessionBar";
import type { State } from "@/types/state.type";

const baseState: State = {
	SessionInfo: {
		Meeting: {
			Key: 1,
			Name: "Monaco Grand Prix",
			OfficialName: "FORMULA 1 MONACO GRAND PRIX",
			Location: "Monte Carlo",
			Country: { Key: 1, Code: "MC", Name: "Monaco" },
			Circuit: { Key: 1, ShortName: "Monte Carlo" },
		},
		ArchiveStatus: { Status: "Complete" },
		Key: 1,
		Type: "Race",
		Name: "Race",
		StartDate: "2026-05-24T13:00:00",
		EndDate: "2026-05-24T15:00:00",
		GmtOffset: "02:00:00",
		Path: "",
	},
	ExtrapolatedClock: {
		Utc: "2026-05-24T13:30:00Z",
		Remaining: "01:15:00",
		Extrapolating: false,
	},
	TrackStatus: { Status: "1", Message: "AllClear" },
	LapCount: { CurrentLap: 12, TotalLaps: 78 },
	WeatherData: {
		AirTemp: "24",
		Humidity: "40",
		Pressure: "1013",
		Rainfall: "0",
		TrackTemp: "38",
		WindDirection: "180",
		WindSpeed: "2.1",
	},
};

describe("buildSessionBarModel", () => {
	it("labels a connected live session as Live", () => {
		const model = buildSessionBarModel({ state: baseState, connected: true, delaySeconds: 0, replayPaused: false });
		expect(model.connectionLabel).toBe("Live");
		expect(model.eventName).toBe("Monaco Grand Prix");
		expect(model.sessionName).toBe("Race");
		expect(model.clock).toBe("01:15:00");
		expect(model.lapLabel).toBe("Lap 12 / 78");
		expect(model.trackStatus.tone).toBe("green");
	});

	it("labels a delayed feed as Delayed, never Live", () => {
		const model = buildSessionBarModel({ state: baseState, connected: true, delaySeconds: 30, replayPaused: false });
		expect(model.connectionLabel).toBe("Delayed");
	});

	it("labels replay content as Replay when paused", () => {
		const model = buildSessionBarModel({ state: baseState, connected: false, delaySeconds: 0, replayPaused: true });
		expect(model.connectionLabel).toBe("Replay");
	});

	it("labels disconnected with a session as Disconnected", () => {
		const model = buildSessionBarModel({ state: baseState, connected: false, delaySeconds: 0, replayPaused: false });
		expect(model.connectionLabel).toBe("Disconnected");
	});

	it("labels an ended session as Ended", () => {
		const ended: State = { ...baseState, SessionStatus: { Status: "Ends" } };
		const model = buildSessionBarModel({ state: ended, connected: true, delaySeconds: 0, replayPaused: false });
		expect(model.connectionLabel).toBe("Ended");
	});

	it("reports No session when there is no session info", () => {
		const model = buildSessionBarModel({ state: null, connected: false, delaySeconds: 0, replayPaused: false });
		expect(model.connectionLabel).toBe("No session");
		expect(model.eventName).toBe("No session");
		expect(model.lapLabel).toBeNull();
		expect(model.trackStatus.tone).toBe("neutral");
	});

	it("maps a red flag to a red tone", () => {
		const red: State = { ...baseState, TrackStatus: { Status: "5", Message: "Red" } };
		const model = buildSessionBarModel({ state: red, connected: true, delaySeconds: 0, replayPaused: false });
		expect(model.trackStatus.label).toBe("Red Flag");
		expect(model.trackStatus.tone).toBe("red");
	});
});
