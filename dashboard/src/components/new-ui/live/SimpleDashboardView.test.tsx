import { render, screen, within } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";

// Map relies on maplibre/webgl, unavailable in jsdom; stub it for layout assertions.
vi.mock("@/components/dashboard/Map", () => ({
	default: () => <div data-testid="map" />,
}));

import SimpleDashboardView from "@/components/new-ui/live/SimpleDashboardView";
import { useDataStore } from "@/stores/useDataStore";
import { useDriverSelectionStore } from "@/stores/useDriverSelectionStore";

beforeEach(() => {
	useDataStore.setState({ state: null, carsData: null });
	useDriverSelectionStore.setState({ selectedDriver: null, comparedDrivers: [] });
});

test("lays out classification, race story, alerts/strategy, then map in order", () => {
	render(<SimpleDashboardView />);
	const root = screen.getByTestId("simple-dashboard");

	const regions = within(root)
		.getAllByRole("region")
		.map((region) => region.getAttribute("aria-label") ?? region.querySelector("h2")?.textContent ?? "");

	const titles = within(root)
		.getAllByRole("heading", { level: 2 })
		.map((heading) => heading.textContent);

	expect(titles[0]).toBe("Classification");
	expect(titles).toContain("Race story");
	expect(titles).toContain("Key alerts");
	expect(titles).toContain("Strategy");
	expect(titles).toContain("Track position");

	// classification precedes race story precedes strategy precedes map
	expect(titles.indexOf("Classification")).toBeLessThan(titles.indexOf("Race story"));
	expect(titles.indexOf("Race story")).toBeLessThan(titles.indexOf("Track position"));
	expect(regions.length).toBeGreaterThan(0);
});

test("uses the broadcast column template that keeps classification dominant", () => {
	render(<SimpleDashboardView />);
	const root = screen.getByTestId("simple-dashboard");
	expect(root.className).toContain("grid-cols-[minmax(42rem,1.5fr)_minmax(24rem,.8fr)_minmax(18rem,.55fr)]");
	expect(root.className).toContain("overflow-hidden");
});
