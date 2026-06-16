import { render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";

vi.mock("@/components/results/SeasonResultsList", () => ({
	default: ({ season }: { season: number }) => <div data-testid="season-results-list">Season {season}</div>,
}));
vi.mock("@/components/results/RaceResultTable", () => ({
	default: () => <div data-testid="race-result-table">Race result table</div>,
}));
vi.mock("@/components/results/QualiResultTable", () => ({
	default: () => <div data-testid="quali-result-table">Quali result table</div>,
}));
vi.mock("@/components/results/GridList", () => ({
	default: () => <div data-testid="grid-list">Grid list</div>,
}));

import {
	SimpleResultsListView,
	DetailedResultsListView,
	SimpleRoundResultView,
	DetailedRoundResultView,
} from "@/components/new-ui/results/ResultsViews";
import type { RaceResult } from "@/lib/f1data";

const mockRace: RaceResult = {
	round: 10,
	season: "2026",
	raceName: "British Grand Prix",
	date: "2026-07-05",
	time: "14:00",
	circuitName: "Silverstone",
	country: "Great Britain",
	locality: "Silverstone",
	results: [
		{
			position: 1,
			points: 25,
			grid: 1,
			laps: 52,
			status: "Finished",
			time: "1:23:00.000",
			fastestLapRank: "1",
			fastestLapTime: "1:27.097",
			constructor: "Red Bull",
			driver: { driverId: "ver", code: "VER", permanentNumber: "1", givenName: "Max", familyName: "Verstappen", nationality: null },
		},
		{
			position: 2,
			points: 18,
			grid: 2,
			laps: 52,
			status: "Finished",
			time: "+5.2s",
			fastestLapRank: null,
			fastestLapTime: null,
			constructor: "McLaren",
			driver: { driverId: "nor", code: "NOR", permanentNumber: "4", givenName: "Lando", familyName: "Norris", nationality: null },
		},
		{
			position: 3,
			points: 15,
			grid: 3,
			laps: 52,
			status: "Finished",
			time: "+8.1s",
			fastestLapRank: null,
			fastestLapTime: null,
			constructor: "Ferrari",
			driver: { driverId: "lec", code: "LEC", permanentNumber: "16", givenName: "Charles", familyName: "Leclerc", nationality: null },
		},
	],
};

const mockItems = [
	{ round: { season: "2026", round: 10, raceName: "British Grand Prix", date: "2026-07-05", time: null, circuitName: "Silverstone", country: "Great Britain", locality: "Silverstone" }, result: mockRace },
	{ round: { season: "2026", round: 11, raceName: "Hungarian Grand Prix", date: "2026-07-19", time: null, circuitName: "Hungaroring", country: "Hungary", locality: "Budapest" }, result: null },
];

test("SimpleResultsListView shows route header and rounds", () => {
	render(<SimpleResultsListView items={mockItems} season={2026} />);
	expect(screen.getByRole("heading", { name: "2026 Grand Prix results" })).toBeVisible();
	expect(screen.getAllByText("British Grand Prix").length).toBeGreaterThan(0);
	expect(screen.getByText("Hungarian Grand Prix")).toBeVisible();
});

test("SimpleResultsListView shows latest result podium", () => {
	render(<SimpleResultsListView items={mockItems} season={2026} />);
	expect(screen.getByText("Max Verstappen")).toBeVisible();
	expect(screen.getByText("Lando Norris")).toBeVisible();
});

test("DetailedResultsListView renders SeasonResultsList component", () => {
	render(<DetailedResultsListView items={mockItems} season={2026} />);
	expect(screen.getByTestId("season-results-list")).toBeVisible();
});

test("SimpleRoundResultView shows round header and podium", () => {
	render(<SimpleRoundResultView race={mockRace} qualifying={null} season={2026} recording={null} />);
	expect(screen.getByRole("heading", { name: "British Grand Prix" })).toBeVisible();
	expect(screen.getByRole("heading", { name: "Podium" })).toBeVisible();
	expect(screen.getAllByText("Max Verstappen").length).toBeGreaterThan(0);
});

test("DetailedRoundResultView renders full classification table", () => {
	render(<DetailedRoundResultView race={mockRace} qualifying={null} season={2026} recording={null} />);
	expect(screen.getByTestId("race-result-table")).toBeVisible();
	expect(screen.getByTestId("grid-list")).toBeVisible();
});

test("DetailedRoundResultView shows unavailable state when no qualifying", () => {
	render(<DetailedRoundResultView race={mockRace} qualifying={null} season={2026} recording={null} />);
	expect(screen.getByText(/Qualifying result unavailable/i)).toBeVisible();
});
