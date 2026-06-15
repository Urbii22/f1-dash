import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, test } from "vitest";

import TechnicalComparisonPanel from "@/components/new-ui/live/TechnicalComparisonPanel";
import TechnicalEventsPanel from "@/components/new-ui/live/TechnicalEventsPanel";
import { useAlertStore } from "@/stores/useAlertStore";
import { useDataStore } from "@/stores/useDataStore";
import { useDriverSelectionStore } from "@/stores/useDriverSelectionStore";
import type { Driver, State, TimingDataDriver } from "@/types/state.type";

function driver(number: string, tla: string, colour: string): Driver {
	return { RacingNumber: number, BroadcastName: tla, FullName: tla, Tla: tla, Line: Number(number), TeamName: "Team", TeamColour: colour, FirstName: tla, LastName: tla, Reference: tla, HeadshotUrl: "", CountryCode: "" };
}

function timing(number: string, position: string, gap: string): TimingDataDriver {
	return { GapToLeader: gap, Line: Number(position), Position: position, ShowPosition: true, RacingNumber: number, Retired: false, InPit: false, PitOut: false, Stopped: false, Status: 0, Sectors: [], Speeds: { I1: { Value: "", Status: 0, OverallFastest: false, PersonalFastest: false }, I2: { Value: "", Status: 0, OverallFastest: false, PersonalFastest: false }, FL: { Value: "", Status: 0, OverallFastest: false, PersonalFastest: false }, ST: { Value: "", Status: 0, OverallFastest: false, PersonalFastest: false } }, BestLapTime: { Value: "1:20.000", Position: Number(position) }, LastLapTime: { Value: "1:21.000", Status: 0, OverallFastest: false, PersonalFastest: false }, NumberOfLaps: 10 };
}

beforeEach(() => {
	useDataStore.setState({
		state: {
			DriverList: { "1": driver("1", "VER", "3671C6"), "4": driver("4", "NOR", "FF8700") },
			TimingData: { Withheld: false, Lines: { "1": timing("1", "1", ""), "4": timing("4", "2", "+2.500") } },
			TimingAppData: { Lines: { "1": { RacingNumber: "1", Line: 1, GridPos: "1", Stints: [{ Compound: "HARD", TotalLaps: 10 }] }, "4": { RacingNumber: "4", Line: 2, GridPos: "2", Stints: [{ Compound: "MEDIUM", TotalLaps: 8 }] } } },
			RaceControlMessages: { Messages: [{ Utc: "invalid", Lap: 10, Message: "CAR 4 LAP TIME DELETED", Category: "Other" }] },
			TeamRadio: { Captures: [] },
			SessionInfo: { Meeting: { Key: 1, Name: "Test GP", OfficialName: "Test GP", Location: "Test", Country: { Key: 1, Code: "TST", Name: "Test" }, Circuit: { Key: 1, ShortName: "Test" } }, ArchiveStatus: { Status: "" }, Key: 1, Type: "Race", Name: "Race", StartDate: "2026-01-01T00:00:00Z", EndDate: "2026-01-01T02:00:00Z", GmtOffset: "00:00:00", Path: "test" },
		} as State,
	});
	useAlertStore.setState({ alerts: [{ id: "a", rule: "track-limits", severity: "warning", title: "Track limits", body: "Lap deleted", driverNumber: "4", utc: "2026-01-01T00:10:00Z", receivedAt: 1 }] });
	useDriverSelectionStore.setState({ selectedDriver: null, comparedDrivers: ["1", "4"] });
});

test("events tabs switch with click and arrow keys", async () => {
	render(<TechnicalEventsPanel />);
	const alerts = screen.getByRole("tab", { name: "Alerts" });
	await userEvent.click(alerts);
	expect(screen.getByText("Track limits")).toBeVisible();
	fireEvent.keyDown(alerts, { key: "ArrowRight" });
	expect(screen.getByRole("tab", { name: "Radios" })).toHaveAttribute("aria-selected", "true");
});

test("invalid event timestamps are shown as unavailable", () => {
	render(<TechnicalEventsPanel />);
	expect(screen.getByText("Time unavailable")).toBeVisible();
});

test("comparison shows both selected drivers and their aligned gap", () => {
	render(<TechnicalComparisonPanel />);
	expect(screen.getByText("VER")).toBeVisible();
	expect(screen.getByText("NOR")).toBeVisible();
	expect(screen.getByText("+2.500")).toBeVisible();
});

test("comparison asks for two drivers when selection is incomplete", () => {
	useDriverSelectionStore.setState({ comparedDrivers: ["1"] });
	render(<TechnicalComparisonPanel />);
	expect(screen.getByText(/Select two drivers/i)).toBeVisible();
});
