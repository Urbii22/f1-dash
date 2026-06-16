/**
 * Verifies that focused Zustand selectors in New UI panels prevent
 * cross-slice re-renders when unrelated store slices update.
 */
import { render, act } from "@testing-library/react";
import { expect, test, beforeEach } from "vitest";

import { useDataStore } from "@/stores/useDataStore";

function weatherData(temp: string) {
	return {
		AirTemp: temp,
		Humidity: "55",
		Pressure: "1013",
		Rainfall: "0",
		TrackTemp: "38",
		WindDirection: "180",
		WindSpeed: "2",
	};
}

const baseTimingData = { Lines: {} as Record<string, unknown>, Withheld: false };

beforeEach(() => {
	useDataStore.getState().setState(null);
});

test("WeatherData subscriber re-renders when WeatherData changes", async () => {
	const counter = { n: 0 };

	function WeatherSubscriber() {
		useDataStore((s) => s.state?.WeatherData);
		counter.n++;
		return null;
	}

	render(<WeatherSubscriber />);
	const after0 = counter.n;

	await act(async () => {
		useDataStore.getState().setState({ WeatherData: weatherData("22") });
	});

	expect(counter.n).toBeGreaterThan(after0);
});

test("TimingData subscriber does not re-render when only WeatherData changes", async () => {
	const counter = { n: 0 };

	function TimingSubscriber() {
		useDataStore((s) => s.state?.TimingData);
		counter.n++;
		return null;
	}

	render(<TimingSubscriber />);

	await act(async () => {
		useDataStore.getState().setState({ TimingData: baseTimingData as never });
	});
	const afterTimingInit = counter.n;

	await act(async () => {
		useDataStore.getState().setState({ WeatherData: weatherData("30") });
	});

	expect(counter.n).toBe(afterTimingInit);
});

test("WeatherData subscriber does not re-render when only TimingData changes", async () => {
	const counter = { n: 0 };

	function WeatherSubscriber() {
		useDataStore((s) => s.state?.WeatherData);
		counter.n++;
		return null;
	}

	render(<WeatherSubscriber />);

	await act(async () => {
		useDataStore.getState().setState({ WeatherData: weatherData("20") });
	});
	const afterWeatherInit = counter.n;

	await act(async () => {
		useDataStore.getState().setState({ TimingData: baseTimingData as never });
	});

	expect(counter.n).toBe(afterWeatherInit);
});

test("DriverList subscriber does not re-render when only WeatherData changes", async () => {
	const counter = { n: 0 };

	function DriverListSubscriber() {
		useDataStore((s) => s.state?.DriverList);
		counter.n++;
		return null;
	}

	render(<DriverListSubscriber />);

	await act(async () => {
		useDataStore.getState().setState({ DriverList: {} });
	});
	const afterInit = counter.n;

	await act(async () => {
		useDataStore.getState().setState({ WeatherData: weatherData("25") });
	});

	expect(counter.n).toBe(afterInit);
});

test("ChampionshipPrediction subscriber does not re-render when TimingData changes", async () => {
	const counter = { n: 0 };

	function PredictionSubscriber() {
		useDataStore((s) => s.state?.ChampionshipPrediction);
		counter.n++;
		return null;
	}

	render(<PredictionSubscriber />);

	await act(async () => {
		useDataStore.getState().setState({ ChampionshipPrediction: undefined });
	});
	const afterInit = counter.n;

	await act(async () => {
		useDataStore.getState().setState({ TimingData: baseTimingData as never });
	});

	expect(counter.n).toBe(afterInit);
});
