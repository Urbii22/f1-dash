import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";

vi.mock("next/navigation", () => ({
	useRouter: () => ({ push: vi.fn() }),
	usePathname: () => "/dashboard/standings",
	useSearchParams: () => new URLSearchParams(),
}));

import DetailedStandingsView from "@/components/new-ui/standings/DetailedStandingsView";
import SimpleStandingsView from "@/components/new-ui/standings/SimpleStandingsView";
import { useDataStore } from "@/stores/useDataStore";
import type { DriverStandingRow } from "@/lib/f1data";
import type { State } from "@/types/state.type";

const drivers: DriverStandingRow[] = [
	{ position: 1, points: 100, wins: 4, driver: { driverId: "ver", code: "VER", permanentNumber: "1", givenName: "Max", familyName: "Verstappen", nationality: null }, constructorId: "red-bull", constructor: "Red Bull" },
	{ position: 2, points: 90, wins: 3, driver: { driverId: "nor", code: "NOR", permanentNumber: "4", givenName: "Lando", familyName: "Norris", nationality: null }, constructorId: "mclaren", constructor: "McLaren" },
	{ position: 3, points: 89, wins: 2, driver: { driverId: "lec", code: "LEC", permanentNumber: "16", givenName: "Charles", familyName: "Leclerc", nationality: null }, constructorId: "ferrari", constructor: "Ferrari" },
];

beforeEach(() => {
	useDataStore.setState({ state: { ChampionshipPrediction: { Drivers: { "4": { RacingNumber: "4", CurrentPosition: 2, PredictedPosition: 1, CurrentPoints: 90, PredictedPoints: 110 } }, Teams: {} } } as State, carsData: null });
});

test("Simple presents podium cards and championship stories", () => {
	render(<SimpleStandingsView drivers={drivers} constructors={[]} season={2026} />);
	expect(screen.getByRole("heading", { name: "Championship standings" })).toBeVisible();
	expect(screen.getByTestId("standings-podium")).toBeVisible();
	expect(screen.getByText("Leader margin")).toBeVisible();
	expect(screen.getByText("Closest battle")).toBeVisible();
	expect(screen.getByText("Biggest predicted change")).toBeVisible();
});

test("Detailed renders sortable complete standings and prediction columns", () => {
	render(<DetailedStandingsView drivers={drivers} constructors={[]} season={2026} />);
	expect(screen.getByLabelText("Season")).toBeVisible();
	expect(screen.getByRole("columnheader", { name: "Predicted" })).toBeVisible();
	fireEvent.click(screen.getByRole("button", { name: "Points" }));
	expect(screen.getAllByTestId("standing-code").map((item) => item.textContent)).toEqual(["VER", "NOR", "LEC"]);
});
