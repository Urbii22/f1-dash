import { render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";

vi.mock("next/navigation", () => ({
	useRouter: () => ({ push: vi.fn() }),
	usePathname: () => "/driver/ver",
}));

import { SimpleDriverView, DetailedDriverView } from "@/components/new-ui/driver/DriverViews";
import type { DriverStandingRow, DriverSeasonRound } from "@/lib/f1data";
import type { DriverSeasonSummary } from "@/lib/seasonH2H";

const standing: DriverStandingRow = {
	position: 1,
	points: 250,
	wins: 10,
	driver: { driverId: "ver", code: "VER", permanentNumber: "1", givenName: "Max", familyName: "Verstappen", nationality: "Dutch" },
	constructorId: "red-bull",
	constructor: "Red Bull",
};

const summary: DriverSeasonSummary = { points: 250, wins: 10, podiums: 14, best: 1, worst: 5, starts: 15 };

const rounds: DriverSeasonRound[] = [
	{ round: 1, raceName: "Bahrain Grand Prix", position: 1, points: 25, grid: 1, status: "Finished" },
	{ round: 2, raceName: "Saudi Arabian Grand Prix", position: 2, points: 18, grid: 3, status: "Finished" },
];

test("Simple shows driver name and championship KPIs", () => {
	render(<SimpleDriverView standing={standing} rounds={rounds} summary={summary} teamMate={null} season={2026} />);
	expect(screen.getByRole("heading", { name: "Max Verstappen" })).toBeVisible();
	expect(screen.getByText("Championship")).toBeVisible();
	expect(screen.getAllByText("P1").length).toBeGreaterThan(0);
	expect(screen.getByText("Wins")).toBeVisible();
});

test("Simple shows recent races", () => {
	render(<SimpleDriverView standing={standing} rounds={rounds} summary={summary} teamMate={null} season={2026} />);
	expect(screen.getByText("Bahrain Grand Prix")).toBeVisible();
});

test("Detailed shows full season table", () => {
	render(<DetailedDriverView standing={standing} rounds={rounds} summary={summary} teamMate={null} season={2026} />);
	expect(screen.getByRole("heading", { name: "Grand Prix log" })).toBeVisible();
	expect(screen.getByRole("columnheader", { name: "Grand Prix" })).toBeVisible();
	expect(screen.getByText("Bahrain Grand Prix")).toBeVisible();
	expect(screen.getByText("Saudi Arabian Grand Prix")).toBeVisible();
});

test("Detailed shows empty state when no rounds", () => {
	render(<DetailedDriverView standing={standing} rounds={[]} summary={summary} teamMate={null} season={2026} />);
	expect(screen.getByText(/No season rounds/i)).toBeVisible();
});
