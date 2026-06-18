import type { ResizableWorkspaceProps } from "@/components/new-ui/layout/ResizableWorkspace";
import RecentLapsPanel from "@/components/new-ui/live/RecentLapsPanel";
import TechnicalBattlesPanel from "@/components/new-ui/live/TechnicalBattlesPanel";
import TechnicalChampionshipPanel from "@/components/new-ui/live/TechnicalChampionshipPanel";
import SimpleStrategySummary from "@/components/new-ui/live/SimpleStrategySummary";
import TechnicalComparisonPanel from "@/components/new-ui/live/TechnicalComparisonPanel";
import TechnicalEventsPanel from "@/components/new-ui/live/TechnicalEventsPanel";
import TechnicalMapPanel from "@/components/new-ui/live/TechnicalMapPanel";
import TechnicalStrategyPanel from "@/components/new-ui/live/TechnicalStrategyPanel";
import TechnicalTelemetryPanel from "@/components/new-ui/live/TechnicalTelemetryPanel";
import TechnicalTimingBoard from "@/components/new-ui/live/TechnicalTimingBoard";
import TechnicalWeatherPanel from "@/components/new-ui/live/TechnicalWeatherPanel";
import type { DetailedPreset } from "@/lib/detailedLayout";

export function getDashboardPresetSlots(preset: DetailedPreset): ResizableWorkspaceProps {
	if (preset === "strategy") {
		return {
			route: "dashboard",
			preset,
			primary: <TechnicalTimingBoard />,
			secondaryTop: <TechnicalStrategyPanel />,
			secondaryBottom: <TechnicalWeatherPanel />,
			bottomLeft: <SimpleStrategySummary />,
			bottomRight: <TechnicalMapPanel />,
		};
	}

	if (preset === "driver") {
		return {
			route: "dashboard",
			preset,
			primary: <TechnicalTimingBoard />,
			secondaryTop: <TechnicalTelemetryPanel />,
			secondaryBottom: <TechnicalComparisonPanel />,
			bottomLeft: <RecentLapsPanel />,
			bottomRight: <TechnicalMapPanel />,
		};
	}

	// Race-watching layout: classification + events + map up top, the live fights and
	// predicted championship below. Strategy/comparison live in their own presets.
	return {
		route: "dashboard",
		preset: "race",
		primary: <TechnicalTimingBoard />,
		secondaryTop: <TechnicalEventsPanel />,
		secondaryBottom: <TechnicalMapPanel />,
		bottomLeft: <TechnicalBattlesPanel />,
		bottomRight: <TechnicalChampionshipPanel />,
	};
}
