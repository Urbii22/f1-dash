import { render, screen } from "@testing-library/react";
import { beforeEach, expect, test } from "vitest";

import DetailedQualifyingView from "@/components/new-ui/qualifying/DetailedQualifyingView";
import SimpleQualifyingView from "@/components/new-ui/qualifying/SimpleQualifyingView";
import { useDataStore } from "@/stores/useDataStore";
import type { State } from "@/types/state.type";

const qualifyingState = {
	SessionInfo: { Name: "Qualifying", Type: "Qualifying", Meeting: { Name: "Spanish Grand Prix" } },
	SessionStatus: { Status: "Started" },
	TimingData: {
		Withheld: false,
		SessionPart: 2,
		Lines: {
			"4": {
				RacingNumber: "4",
				Position: "10",
				BestLapTime: { Value: "1:20.000", Position: 10 },
				LastLapTime: { Value: "1:20.100" },
				Sectors: [
					{ Value: "25.000", PersonalFastest: true, Segments: [] },
					{ Value: "30.000", PersonalFastest: false, Segments: [] },
					{ Value: "25.000", PersonalFastest: false, Segments: [] },
				],
				InPit: false,
				PitOut: false,
				Stopped: false,
				KnockedOut: false,
			},
			"16": {
				RacingNumber: "16",
				Position: "11",
				BestLapTime: { Value: "1:20.200", Position: 11 },
				LastLapTime: { Value: "1:20.300" },
				Sectors: [],
				InPit: true,
				PitOut: false,
				Stopped: false,
				KnockedOut: false,
			},
		},
	},
	TimingStats: {
		Lines: {
			"4": {
				BestSectors: [{ Value: "25.000" }, { Value: "30.000" }, { Value: "25.000" }],
				BestSpeeds: { ST: { Value: "331.5" } },
			},
		},
	},
	DriverList: {
		"4": { Tla: "NOR", TeamColour: "FF8000" },
		"16": { Tla: "LEC", TeamColour: "E8002D" },
	},
	RaceControlMessages: {
		Messages: [{ Utc: "2026-06-15T12:00:00Z", Message: "CAR 16 LAP TIME DELETED", Lap: 4, Category: "Other" }],
	},
} as unknown as State;

beforeEach(() => {
	useDataStore.setState({ state: qualifyingState, carsData: null });
});

test("Simple shows the qualifying story without technical tables", () => {
	render(<SimpleQualifyingView />);
	expect(screen.getByRole("heading", { name: "Qualifying" })).toBeVisible();
	expect(screen.getByRole("heading", { name: "Cutoff" })).toBeVisible();
	expect(screen.getByRole("heading", { name: "At risk" })).toBeVisible();
	expect(screen.getByRole("heading", { name: "Hot laps" })).toBeVisible();
	expect(screen.getByRole("heading", { name: "Major deletions" })).toBeVisible();
	expect(screen.queryByTestId("qualifying-technical-board")).not.toBeInTheDocument();
	expect(screen.queryByText("Speed trap")).not.toBeInTheDocument();
});

test("Detailed shows technical board, progression, sectors, deletions, and speed trap", () => {
	render(<DetailedQualifyingView />);
	expect(screen.getByTestId("qualifying-technical-board")).toBeVisible();
	expect(screen.getByText("Sectors / theoretical best")).toBeVisible();
	expect(screen.getByTestId("qualifying-progression")).toBeVisible();
	expect(screen.getByRole("heading", { name: "Deleted laps" })).toBeVisible();
	expect(screen.getByRole("heading", { name: "Speed trap" })).toBeVisible();
});

test("both views expose a truthful unavailable state outside qualifying", () => {
	useDataStore.setState({ state: { SessionInfo: { Name: "Race", Type: "Race" } } as State, carsData: null });
	const { unmount } = render(<SimpleQualifyingView />);
	expect(screen.getByText("Qualifying unavailable")).toBeVisible();
	unmount();
	render(<DetailedQualifyingView />);
	expect(screen.getByText("Qualifying unavailable")).toBeVisible();
});
