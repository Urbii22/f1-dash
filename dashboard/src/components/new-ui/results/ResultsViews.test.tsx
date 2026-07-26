import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";

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

test("DetailedResultsListView renders new UI round cards", () => {
	render(<DetailedResultsListView items={mockItems} season={2026} />);
	expect(screen.getByRole("heading", { name: "All rounds" })).toBeVisible();
	expect(screen.getAllByText("British Grand Prix").length).toBeGreaterThan(0);
	expect(screen.getByText("Hungarian Grand Prix")).toBeVisible();
	expect(screen.getByText("Done")).toBeVisible();
	expect(screen.getByText("Upcoming")).toBeVisible();
});

test("SimpleRoundResultView shows round header and podium", () => {
	render(<SimpleRoundResultView race={mockRace} qualifying={null} season={2026} recording={null} />);
	expect(screen.getByRole("heading", { name: "British Grand Prix" })).toBeVisible();
	expect(screen.getByRole("heading", { name: "Podium" })).toBeVisible();
	expect(screen.getAllByText("Max Verstappen").length).toBeGreaterThan(0);
});

test("DetailedRoundResultView renders full classification table", () => {
	render(<DetailedRoundResultView race={mockRace} qualifying={null} season={2026} recording={null} />);
	expect(screen.getByRole("heading", { name: "Race classification" })).toBeVisible();
	expect(screen.getByRole("heading", { name: "Starting grid" })).toBeVisible();
	expect(screen.getAllByText("Max Verstappen").length).toBeGreaterThan(0);
});

test("DetailedRoundResultView shows unavailable state when no qualifying", () => {
	render(<DetailedRoundResultView race={mockRace} qualifying={null} season={2026} recording={null} />);
	expect(screen.getByText(/Qualifying result unavailable/i)).toBeVisible();
});
