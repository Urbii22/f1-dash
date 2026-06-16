import { render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";

vi.mock("@/components/h2h/SeasonH2HView", () => ({
	default: () => <div data-testid="season-h2h-view">H2H view mock</div>,
}));

import { SimpleH2HView, DetailedH2HView } from "@/components/new-ui/h2h/H2HViews";
import type { DriverStandingRow } from "@/lib/f1data";
import type { SeasonH2H } from "@/lib/seasonH2H";

const driverA: DriverStandingRow = {
	position: 1,
	points: 200,
	wins: 8,
	driver: { driverId: "ver", code: "VER", permanentNumber: "1", givenName: "Max", familyName: "Verstappen", nationality: null },
	constructorId: "red-bull",
	constructor: "Red Bull",
};
const driverB: DriverStandingRow = {
	position: 2,
	points: 180,
	wins: 5,
	driver: { driverId: "nor", code: "NOR", permanentNumber: "4", givenName: "Lando", familyName: "Norris", nationality: null },
	constructorId: "mclaren",
	constructor: "McLaren",
};
const comparison: SeasonH2H = {
	a: { points: 200, wins: 8, podiums: 12, best: 1, worst: 8, starts: 14 },
	b: { points: 180, wins: 5, podiums: 10, best: 1, worst: 6, starts: 14 },
	race: { a: 9, b: 5, ties: 0 },
	qualifying: { a: 11, b: 3, ties: 0 },
};

test("Simple shows driver names and head-to-head header", () => {
	render(<SimpleH2HView driverA={driverA} driverB={driverB} comparison={comparison} season={2026} />);
	expect(screen.getByRole("heading", { name: "Driver head-to-head" })).toBeVisible();
	expect(screen.getAllByText(/Max Verstappen/i).length).toBeGreaterThan(0);
	expect(screen.getAllByText(/Lando Norris/i).length).toBeGreaterThan(0);
});

test("Simple shows head-to-head score panel", () => {
	render(<SimpleH2HView driverA={driverA} driverB={driverB} comparison={comparison} season={2026} />);
	expect(screen.getByRole("heading", { name: "Head-to-head score" })).toBeVisible();
	expect(screen.getByText("Race")).toBeVisible();
	expect(screen.getByText("Qualifying")).toBeVisible();
});

test("Simple shows unavailable state when drivers are null", () => {
	render(<SimpleH2HView driverA={null} driverB={null} comparison={null} season={2026} />);
	expect(screen.getByText(/Driver data unavailable/i)).toBeVisible();
});

test("Detailed renders SeasonH2HView when comparison exists", () => {
	render(<DetailedH2HView driverA={driverA} driverB={driverB} comparison={comparison} season={2026} standings={[driverA, driverB]} />);
	expect(screen.getByTestId("season-h2h-view")).toBeVisible();
});
