import { expect, test } from "vitest";

import { getDashboardPresetSlots } from "@/components/new-ui/live/dashboardPresets";
import TechnicalBattlesPanel from "@/components/new-ui/live/TechnicalBattlesPanel";
import TechnicalChampionshipPanel from "@/components/new-ui/live/TechnicalChampionshipPanel";
import TechnicalComparisonPanel from "@/components/new-ui/live/TechnicalComparisonPanel";
import TechnicalEventsPanel from "@/components/new-ui/live/TechnicalEventsPanel";
import TechnicalMapPanel from "@/components/new-ui/live/TechnicalMapPanel";
import TechnicalStrategyPanel from "@/components/new-ui/live/TechnicalStrategyPanel";
import TechnicalTelemetryPanel from "@/components/new-ui/live/TechnicalTelemetryPanel";
import TechnicalTimingBoard from "@/components/new-ui/live/TechnicalTimingBoard";
import TechnicalWeatherPanel from "@/components/new-ui/live/TechnicalWeatherPanel";
import RecentLapsPanel from "@/components/new-ui/live/RecentLapsPanel";
import SimpleStrategySummary from "@/components/new-ui/live/SimpleStrategySummary";
import type { ReactElement } from "react";

function component(slot: React.ReactNode) {
	return (slot as ReactElement).type;
}

test("Race preset prioritizes timing, events, map, battles and championship", () => {
	const slots = getDashboardPresetSlots("race");
	expect(slots).toMatchObject({ route: "dashboard", preset: "race" });
	expect(component(slots.primary)).toBe(TechnicalTimingBoard);
	expect(component(slots.secondaryTop)).toBe(TechnicalEventsPanel);
	expect(component(slots.secondaryBottom)).toBe(TechnicalMapPanel);
	expect(component(slots.bottomLeft)).toBe(TechnicalBattlesPanel);
	expect(component(slots.bottomRight)).toBe(TechnicalChampionshipPanel);
});

test("Strategy preset mounts strategy, weather, pace and map panels", () => {
	const slots = getDashboardPresetSlots("strategy");
	expect(component(slots.primary)).toBe(TechnicalTimingBoard);
	expect(component(slots.secondaryTop)).toBe(TechnicalStrategyPanel);
	expect(component(slots.secondaryBottom)).toBe(TechnicalWeatherPanel);
	expect(component(slots.bottomLeft)).toBe(SimpleStrategySummary);
	expect(component(slots.bottomRight)).toBe(TechnicalMapPanel);
});

test("Driver preset mounts telemetry, comparison, recent laps and map", () => {
	const slots = getDashboardPresetSlots("driver");
	expect(component(slots.primary)).toBe(TechnicalTimingBoard);
	expect(component(slots.secondaryTop)).toBe(TechnicalTelemetryPanel);
	expect(component(slots.secondaryBottom)).toBe(TechnicalComparisonPanel);
	expect(component(slots.bottomLeft)).toBe(RecentLapsPanel);
	expect(component(slots.bottomRight)).toBe(TechnicalMapPanel);
});
