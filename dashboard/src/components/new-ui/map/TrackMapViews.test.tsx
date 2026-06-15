import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";

vi.mock("@/components/dashboard/Map", () => ({
	default: (props: Record<string, unknown>) => <div data-testid="track-map" data-variant={String(props.variant)} data-labels={String(props.showDriverLabels)} data-trails={String(props.showTrails)} data-sectors={String(props.showMarshalSectors)} data-pit={String(props.showPitStatus)} />,
}));

import DetailedTrackMapView from "@/components/new-ui/map/DetailedTrackMapView";
import SimpleTrackMapView from "@/components/new-ui/map/SimpleTrackMapView";
import { useDataStore } from "@/stores/useDataStore";
import { useDriverSelectionStore } from "@/stores/useDriverSelectionStore";
import type { State } from "@/types/state.type";

beforeEach(() => {
	useDataStore.setState({ state: { DriverList: { "4": { Tla: "NOR", TeamColour: "FF8000" }, "81": { Tla: "PIA", TeamColour: "FF8000" } }, TimingData: { Lines: { "4": { RacingNumber: "4", Position: "1", GapToLeader: "", IntervalToPositionAhead: { Value: "" }, InPit: false }, "81": { RacingNumber: "81", Position: "2", GapToLeader: "+1.200", IntervalToPositionAhead: { Value: "+1.200" }, InPit: false } } } } as unknown as State, carsData: null });
	useDriverSelectionStore.setState({ selectedDriver: "4", comparedDrivers: [] });
});

test("Simple uses the map for orientation, selected-driver focus, and battle context", () => {
	render(<SimpleTrackMapView />);
	expect(screen.getByRole("heading", { name: "Track orientation" })).toBeVisible();
	expect(screen.getByTestId("track-map")).toHaveAttribute("data-variant", "compact");
	expect(screen.getByRole("heading", { name: "Selected driver" })).toBeVisible();
	expect(screen.getByRole("heading", { name: "Current battle" })).toBeVisible();
});

test("Detailed exposes overlay defaults and selected-driver telemetry link", () => {
	render(<DetailedTrackMapView />);
	const map = screen.getByTestId("track-map");
	expect(map).toHaveAttribute("data-variant", "technical");
	expect(map).toHaveAttribute("data-labels", "true");
	expect(map).toHaveAttribute("data-trails", "false");
	expect(map).toHaveAttribute("data-sectors", "true");
	expect(map).toHaveAttribute("data-pit", "true");
	expect(screen.getByRole("link", { name: "Open NOR telemetry" })).toHaveAttribute("href", "/dashboard/driver/4");

	fireEvent.click(screen.getByRole("checkbox", { name: "Trails" }));
	expect(map).toHaveAttribute("data-trails", "true");
});
