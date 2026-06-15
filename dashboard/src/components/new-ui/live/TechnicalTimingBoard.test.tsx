import { render, screen, within } from "@testing-library/react";
import { beforeEach, expect, test } from "vitest";

import TechnicalTimingBoard from "@/components/new-ui/live/TechnicalTimingBoard";
import type { CarsData, State } from "@/types/state.type";
import { useDataStore } from "@/stores/useDataStore";
import { useDriverSelectionStore } from "@/stores/useDriverSelectionStore";

function seed(options: { cars?: CarsData } = {}) {
	useDataStore.setState({
		state: {
			DriverList: {
				"1": {
					RacingNumber: "1",
					BroadcastName: "M VERSTAPPEN",
					FullName: "Max VERSTAPPEN",
					Tla: "VER",
					Line: 1,
					TeamName: "Red Bull Racing",
					TeamColour: "3671C6",
					FirstName: "Max",
					LastName: "Verstappen",
					Reference: "MAXVER01",
					HeadshotUrl: "",
					CountryCode: "NED",
				},
			},
			TimingData: {
				Withheld: false,
				Lines: {
					"1": {
						GapToLeader: "",
						Line: 1,
						Position: "1",
						ShowPosition: true,
						RacingNumber: "1",
						Retired: false,
						InPit: false,
						PitOut: false,
						Stopped: false,
						Status: 0,
						Sectors: [
							{ Stopped: false, Value: "25.100", Status: 0, OverallFastest: false, PersonalFastest: false, Segments: [] },
							{ Stopped: false, Value: "30.200", Status: 0, OverallFastest: false, PersonalFastest: false, Segments: [] },
							{ Stopped: false, Value: "24.800", Status: 0, OverallFastest: false, PersonalFastest: false, Segments: [] },
						],
						Speeds: {
							I1: { Value: "300", Status: 0, OverallFastest: false, PersonalFastest: false },
							I2: { Value: "280", Status: 0, OverallFastest: false, PersonalFastest: false },
							FL: { Value: "310", Status: 0, OverallFastest: false, PersonalFastest: false },
							ST: { Value: "330", Status: 0, OverallFastest: false, PersonalFastest: false },
						},
						BestLapTime: { Value: "1:20.100", Position: 1 },
						LastLapTime: { Value: "1:20.500", Status: 0, OverallFastest: false, PersonalFastest: false },
						NumberOfLaps: 10,
					},
				},
			},
			TimingAppData: {
				Lines: {
					"1": { RacingNumber: "1", Line: 1, GridPos: "1", Stints: [{ Compound: "SOFT", TotalLaps: 6 }] },
				},
			},
		} as unknown as State,
		carsData: options.cars ?? null,
	});
}

beforeEach(() => {
	useDataStore.setState({ state: null, carsData: null });
	useDriverSelectionStore.setState({ selectedDriver: null, comparedDrivers: [] });
});

test("renders the required technical column headers", () => {
	seed();
	render(<TechnicalTimingBoard />);
	const header = screen.getByTestId("technical-timing-header");
	expect(within(header).getByText(/pos/i)).toBeVisible();
	expect(within(header).getByText(/tyre/i)).toBeVisible();
	expect(within(header).getByText(/interval/i)).toBeVisible();
	expect(within(header).getByText(/best/i)).toBeVisible();
	expect(within(header).getByText("S1")).toBeVisible();
	expect(within(header).getByText("S2")).toBeVisible();
	expect(within(header).getByText("S3")).toBeVisible();
	expect(within(header).getByText(/speed/i)).toBeVisible();
});

test("renders sector and speed-trap values for a driver", () => {
	seed();
	render(<TechnicalTimingBoard />);
	const row = screen.getByTestId("technical-row-1");
	expect(within(row).getByText("25.100")).toBeVisible();
	expect(within(row).getByText("330")).toBeVisible();
});

test("shows a telemetry column value only when car data exists", () => {
	seed({ cars: { "1": { Channels: { "0": 11000, "2": 305, "3": 7, "4": 100, "5": 0, "45": 0 } } } });
	render(<TechnicalTimingBoard />);
	const row = screen.getByTestId("technical-row-1");
	expect(within(row).getByText(/305/)).toBeVisible();
});

test("missing telemetry renders a dash, never a synthesized zero", () => {
	seed();
	render(<TechnicalTimingBoard />);
	const row = screen.getByTestId("technical-row-1");
	expect(within(row).getByTestId("technical-telemetry-1")).toHaveTextContent("-");
});

test("selecting a row updates the shared driver selection", () => {
	seed();
	render(<TechnicalTimingBoard />);
	screen.getByTestId("technical-row-1").click();
	expect(useDriverSelectionStore.getState().selectedDriver).toBe("1");
});
