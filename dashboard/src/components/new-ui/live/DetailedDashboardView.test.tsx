import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, test } from "vitest";

import DetailedDashboardView from "@/components/new-ui/live/DetailedDashboardView";
import { useDataStore } from "@/stores/useDataStore";
import { useDetailedLayoutStore } from "@/stores/useDetailedLayoutStore";
import { useDriverSelectionStore } from "@/stores/useDriverSelectionStore";

beforeEach(() => {
	localStorage.clear();
	useDataStore.setState({ state: null, carsData: null, positions: null });
	useDetailedLayoutStore.setState({ activePresetByRoute: {}, layouts: {} });
	useDriverSelectionStore.setState({ selectedDriver: "4", comparedDrivers: ["1", "4"] });
});

test("renders preset controls and a scrollable workspace", () => {
	render(<DetailedDashboardView />);
	const dashboard = screen.getByTestId("detailed-dashboard");
	expect(dashboard.className).toContain("h-[calc(100dvh-3.25rem)]");
	expect(dashboard).toHaveClass("overflow-auto");
	expect(screen.getByRole("radiogroup", { name: "Workspace preset" })).toBeVisible();
	expect(screen.getByRole("button", { name: "Reset layout" })).toBeVisible();
	expect(screen.getAllByRole("separator")).toHaveLength(4);
});

test("changes the dashboard preset without clearing selected drivers", async () => {
	render(<DetailedDashboardView />);
	await userEvent.click(screen.getByRole("radio", { name: "Driver" }));
	expect(useDetailedLayoutStore.getState().activePresetByRoute.dashboard).toBe("driver");
	expect(useDriverSelectionStore.getState()).toMatchObject({ selectedDriver: "4", comparedDrivers: ["1", "4"] });
	expect(screen.getByRole("region", { name: "Telemetry" })).toBeVisible();
});
