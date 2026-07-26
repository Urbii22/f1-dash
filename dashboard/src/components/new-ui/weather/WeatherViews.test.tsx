import { render, screen } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";

vi.mock("@/app/dashboard/weather/map", () => ({
	WeatherMap: ({ variant }: { variant?: string }) => <div data-testid="weather-radar" data-variant={variant}>Radar unavailable</div>,
}));

import DetailedWeatherView from "@/components/new-ui/weather/DetailedWeatherView";
import SimpleWeatherView from "@/components/new-ui/weather/SimpleWeatherView";
import { useDataStore } from "@/stores/useDataStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import type { State } from "@/types/state.type";

beforeEach(() => {
	useDataStore.setState({
		state: {
			Heartbeat: { Utc: "2026-06-15T12:00:00Z" },
			SessionInfo: { Meeting: { Name: "Spanish Grand Prix" } },
			WeatherData: { AirTemp: "24.2", TrackTemp: "36.5", Humidity: "62", Pressure: "1012", Rainfall: "0", WindDirection: "180", WindSpeed: "4.8" },
		} as unknown as State,
		carsData: null,
	});
	useSettingsStore.setState({ speedUnit: "metric" });
});

test("Simple shows impact summary, four metrics, and concise observation timeline", () => {
	render(<SimpleWeatherView />);
	expect(screen.getByRole("heading", { name: "Weather impact" })).toBeVisible();
	for (const metric of ["Air", "Track", "Humidity", "Wind"]) expect(screen.getAllByText(metric).length).toBeGreaterThan(0);
	expect(screen.getByRole("heading", { name: "Observation timeline" })).toBeVisible();
	expect(screen.getAllByText(/radar outlook unavailable/i).length).toBeGreaterThan(0);
});

test("Detailed shows neutral radar, controls, full measurements, and trend explanation", () => {
	render(<DetailedWeatherView />);
	expect(screen.getByTestId("weather-radar")).toHaveAttribute("data-variant", "new");
	expect(screen.getByText("Radar unavailable")).toBeVisible();
	expect(screen.getByRole("heading", { name: "Radar timeline" })).toBeVisible();
	expect(screen.getByRole("heading", { name: "Full measurements" })).toBeVisible();
	expect(screen.getByRole("heading", { name: "Session impact" })).toBeVisible();
	expect(screen.getAllByText(/track evolution unavailable/i).length).toBeGreaterThan(0);
});
