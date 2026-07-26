import { render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";

vi.mock("@/components/dashboard/Map", () => ({
	default: (props: Record<string, unknown>) => (
		<div
			data-testid="map"
			data-variant={String(props.variant)}
			data-show-labels={String(props.showLabels)}
			data-show-trails={String(props.showTrails)}
		/>
	),
}));

import CompactTrackMap from "@/components/new-ui/live/CompactTrackMap";

test("wrapper is titled Track position", () => {
	render(<CompactTrackMap />);
	expect(screen.getByRole("region", { name: "Track position" })).toBeVisible();
});

test("helper text frames the map as orientation, not a primary panel", () => {
	render(<CompactTrackMap />);
	expect(screen.getByText(/for orientation and battle context/i)).toBeVisible();
});

test("forwards the compact variant without trails or technical overlays", () => {
	render(<CompactTrackMap />);
	const map = screen.getByTestId("map");
	expect(map).toHaveAttribute("data-variant", "compact");
	expect(map).toHaveAttribute("data-show-trails", "false");
});

test("does not render technical overlay controls in simple mode", () => {
	const { container } = render(<CompactTrackMap />);
	expect(container.querySelector("[data-map-controls]")).toBeNull();
});
