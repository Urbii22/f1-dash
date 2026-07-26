import { render, screen } from "@testing-library/react";
import { beforeEach, expect, test } from "vitest";

import TechnicalMapPanel from "@/components/new-ui/live/TechnicalMapPanel";
import TechnicalStrategyPanel from "@/components/new-ui/live/TechnicalStrategyPanel";
import TechnicalTelemetryPanel from "@/components/new-ui/live/TechnicalTelemetryPanel";
import TechnicalWeatherPanel from "@/components/new-ui/live/TechnicalWeatherPanel";
import { useDataStore } from "@/stores/useDataStore";
import { useDriverSelectionStore } from "@/stores/useDriverSelectionStore";
import { useLapHistoryStore } from "@/stores/useLapHistoryStore";
import type { State } from "@/types/state.type";

function seed() {
	useDataStore.setState({
		state: {
			DriverList: {
				"4": {
					RacingNumber: "4", BroadcastName: "L NORRIS", FullName: "Lando NORRIS", Tla: "NOR", Line: 1,
					TeamName: "McLaren", TeamColour: "FF8700", FirstName: "Lando", LastName: "Norris",
					Reference: "LANDO", HeadshotUrl: "", CountryCode: "GBR",
				},
			},
			TimingData: {
				Withheld: false,
				Lines: {
					"4": {
						GapToLeader: "+2.500", Line: 1, Position: "2", ShowPosition: true, RacingNumber: "4",
						Retired: false, InPit: false, PitOut: false, Stopped: false, Status: 0, Sectors: [],
						Speeds: { I1: { Value: "", Status: 0, OverallFastest: false, PersonalFastest: false }, I2: { Value: "", Status: 0, OverallFastest: false, PersonalFastest: false }, FL: { Value: "", Status: 0, OverallFastest: false, PersonalFastest: false }, ST: { Value: "320", Status: 0, OverallFastest: false, PersonalFastest: false } },
						BestLapTime: { Value: "1:20.000", Position: 2 }, LastLapTime: { Value: "1:20.500", Status: 0, OverallFastest: false, PersonalFastest: false }, NumberOfLaps: 12,
					},
				},
			},
			TimingAppData: { Lines: { "4": { RacingNumber: "4", Line: 1, GridPos: "2", Stints: [{ Compound: "MEDIUM", TotalLaps: 8 }] } } },
			WeatherData: { AirTemp: "24.2", TrackTemp: "36.5", Humidity: "62", Pressure: "1012", Rainfall: "0", WindDirection: "180", WindSpeed: "4.8" },
		} as State,
		carsData: { "4": { Channels: { "0": 11200, "2": 305, "3": 7, "4": 92, "5": 0, "45": 0 } } },
	});
	useDriverSelectionStore.setState({ selectedDriver: "4", comparedDrivers: [] });
}

beforeEach(() => {
	useDataStore.setState({ state: null, carsData: null, positions: null });
	useDriverSelectionStore.setState({ selectedDriver: null, comparedDrivers: [] });
	useLapHistoryStore.getState().reset();
});

test("telemetry, strategy and map use the same selected driver", () => {
	seed();
	render(<><TechnicalTelemetryPanel /><TechnicalStrategyPanel /><TechnicalMapPanel /></>);
	expect(screen.getAllByText("NOR")).toHaveLength(3);
	expect(screen.getByText("305")).toBeVisible();
	expect(screen.getByText(/MEDIUM/)).toBeVisible();
});

test("driver panels explain how to select a driver after selection is cleared", () => {
	seed();
	useDriverSelectionStore.setState({ selectedDriver: null });
	render(<><TechnicalTelemetryPanel /><TechnicalStrategyPanel /><TechnicalMapPanel /></>);
	expect(screen.getAllByText(/Select a driver/i)).toHaveLength(3);
});

test("weather panel renders session conditions without pretending missing data is zero", () => {
	seed();
	const { rerender } = render(<TechnicalWeatherPanel />);
	expect(screen.getByText("24.2")).toBeVisible();
	expect(screen.getByText("36.5")).toBeVisible();
	useDataStore.setState((state) => ({ state: { ...state.state, WeatherData: undefined } }));
	rerender(<TechnicalWeatherPanel />);
	expect(screen.getByText(/Weather unavailable/i)).toBeVisible();
});
