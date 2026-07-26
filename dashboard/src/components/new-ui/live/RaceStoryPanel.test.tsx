import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, expect, test } from "vitest";

import { RaceStoryPanel } from "@/components/new-ui/live/RaceStoryPanel";
import { KeyAlertsPanel } from "@/components/new-ui/live/KeyAlertsPanel";
import type { RaceStoryItem } from "@/lib/view-models/raceStory";
import { useDriverSelectionStore } from "@/stores/useDriverSelectionStore";

function item(overrides: Partial<RaceStoryItem> = {}): RaceStoryItem {
	return {
		id: "i1",
		kind: "battle",
		priority: 2,
		title: "Story",
		detail: "Detail text",
		timestamp: "2026-06-15T12:00:00Z",
		driverNumber: null,
		...overrides,
	};
}

beforeEach(() => {
	useDriverSelectionStore.setState({ selectedDriver: null });
});

test("race story panel shows the highest priority item first", () => {
	const items = [
		item({ id: "low", priority: 1, title: "Top story" }),
		item({ id: "mid", priority: 2, title: "Second story" }),
		item({ id: "last", priority: 3, title: "Third story" }),
	];
	render(<RaceStoryPanel items={items} />);
	const headings = screen.getAllByTestId("race-story-title");
	expect(headings[0]).toHaveTextContent("Top story");
});

test("race story panel renders at most three cards", () => {
	const items = Array.from({ length: 6 }, (_, index) => item({ id: `s${index}`, title: `Story ${index}` }));
	render(<RaceStoryPanel items={items} />);
	expect(screen.getAllByTestId("race-story-card")).toHaveLength(3);
});

test("selecting a driver story updates the selection store", () => {
	render(<RaceStoryPanel items={[item({ id: "d", driverNumber: "4", title: "NOR battle" })]} />);
	fireEvent.click(screen.getByRole("button", { name: /NOR battle/i }));
	expect(useDriverSelectionStore.getState().selectedDriver).toBe("4");
});

test("key alerts panel renders up to six items with category and impact text", () => {
	const items = Array.from({ length: 8 }, (_, index) =>
		item({ id: `a${index}`, kind: "penalty", title: `Alert ${index}`, detail: `Impact ${index}` }),
	);
	render(<KeyAlertsPanel items={items} />);
	const cards = screen.getAllByTestId("key-alert-card");
	expect(cards).toHaveLength(6);
	// category label and impact detail are both present
	expect(screen.getAllByText(/penalty/i).length).toBeGreaterThan(0);
	expect(screen.getByText("Impact 0")).toBeVisible();
});

test("key alerts panel shows an empty state when there is nothing to report", () => {
	render(<KeyAlertsPanel items={[]} />);
	expect(screen.getByText(/no key alerts/i)).toBeVisible();
});
