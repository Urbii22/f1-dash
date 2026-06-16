import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, expect, test } from "vitest";

import DetailedAnalysisView from "@/components/new-ui/analysis/DetailedAnalysisView";
import SimpleAnalysisView from "@/components/new-ui/analysis/SimpleAnalysisView";
import ChartFrame from "@/components/new-ui/charts/ChartFrame";
import DensityToggle from "@/components/new-ui/DensityToggle";
import UiModeBoundary from "@/components/new-ui/UiModeBoundary";
import { useAnalysisViewStore } from "@/stores/useAnalysisViewStore";
import { useDataStore } from "@/stores/useDataStore";
import { useLapHistoryStore } from "@/stores/useLapHistoryStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { useUiPreferencesStore } from "@/stores/useUiPreferencesStore";
import type { LapRecord } from "@/lib/lapHistory";
import type { State } from "@/types/state.type";

function lap(number: number, time: number, position: number): LapRecord {
	return { lap: number, lapTimeMs: time, sectorsMs: [25_000, 30_000, 25_000], position, gapToLeaderMs: null, compound: "MEDIUM", tyreAge: number, pitted: false, speedTrapKph: 330, utc: "2026-06-15T12:00:00Z" };
}

beforeEach(() => {
	useDataStore.setState({
		state: {
			SessionInfo: { Type: "Race", Name: "Race", Meeting: { Name: "Spanish Grand Prix" } },
			DriverList: { "4": { Tla: "NOR", TeamColour: "FF8000" }, "81": { Tla: "PIA", TeamColour: "FF8000" } },
			TimingData: { Lines: { "4": { RacingNumber: "4", Position: "1" }, "81": { RacingNumber: "81", Position: "2" } } },
		} as unknown as State,
		carsData: null,
	});
	useLapHistoryStore.setState({
		laps: { "4": [lap(1, 80_000, 3), lap(2, 80_200, 2), lap(3, 80_400, 1)], "81": [lap(1, 81_000, 1), lap(2, 81_200, 2), lap(3, 81_400, 3)] },
		stints: {
			"4": [{ stint: 1, compound: "MEDIUM", startLap: 1, endLap: 6, lapCount: 6, bestMs: 80_000, avgMs: 80_200, degMsPerLap: 200 }],
		},
	});
	useSettingsStore.setState({ favoriteDrivers: ["4"] });
	useAnalysisViewStore.setState({ activeTab: "pace", selectedDrivers: null });
	useUiPreferencesStore.setState({ generation: "new", density: "simple", hydrated: true });
});

test("ChartFrame exposes units, summary, legend, and empty state", () => {
	render(<ChartFrame title="Pace" unit="lap time" summary="Lower is faster." legend={<span>NOR</span>} state="empty" />);
	expect(screen.getByRole("heading", { name: "Pace" })).toBeVisible();
	expect(screen.getByText("lap time")).toBeVisible();
	expect(screen.getByText("Lower is faster.")).toBeVisible();
	expect(screen.getByText("NOR")).toBeVisible();
	expect(screen.getByText("No chart data")).toBeVisible();
});

test("Simple shows conclusions and three essential visuals without tabs", () => {
	render(<SimpleAnalysisView />);
	expect(screen.getByRole("heading", { name: "Session analysis" })).toBeVisible();
	expect(screen.getByRole("heading", { name: "Race pace" })).toBeVisible();
	expect(screen.getByRole("heading", { name: "Tyre and stint picture" })).toBeVisible();
	expect(screen.getByRole("heading", { name: "Position changes" })).toBeVisible();
	expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
});

test("Detailed preserves active tab and driver filters in the shared store", () => {
	useAnalysisViewStore.setState({ activeTab: "positions", selectedDrivers: ["4"] });
	render(<DetailedAnalysisView />);
	expect(screen.getByRole("tab", { name: "Positions" })).toHaveAttribute("aria-selected", "true");
	expect(screen.getByRole("button", { name: "NOR" })).toHaveAttribute("aria-pressed", "true");

	fireEvent.click(screen.getByRole("tab", { name: "Strategy" }));
	fireEvent.click(screen.getByRole("button", { name: "PIA" }));

	expect(useAnalysisViewStore.getState()).toMatchObject({ activeTab: "strategy", selectedDrivers: ["4", "81"] });
});

test("switching density keeps analysis tab and driver selection", () => {
	useAnalysisViewStore.setState({ activeTab: "positions", selectedDrivers: ["4"] });
	render(
		<>
			<DensityToggle />
			<UiModeBoundary legacy={<div>Legacy</div>} simple={<SimpleAnalysisView />} detailed={<DetailedAnalysisView />} />
		</>,
	);

	fireEvent.click(screen.getByRole("radio", { name: "Detailed" }));

	expect(screen.getByRole("heading", { name: "Detailed session analysis" })).toBeVisible();
	expect(screen.getByRole("tab", { name: "Positions" })).toHaveAttribute("aria-selected", "true");
	expect(useAnalysisViewStore.getState().selectedDrivers).toEqual(["4"]);
});
