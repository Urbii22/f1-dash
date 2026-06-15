import type { ResizableWorkspaceProps } from "@/components/new-ui/layout/ResizableWorkspace";
import RecentLapsPanel from "@/components/new-ui/live/RecentLapsPanel";
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

	return {
		route: "dashboard",
		preset: "race",
		primary: <TechnicalTimingBoard />,
		secondaryTop: <TechnicalEventsPanel />,
		secondaryBottom: <TechnicalMapPanel />,
		bottomLeft: <TechnicalStrategyPanel />,
		bottomRight: <TechnicalComparisonPanel />,
	};
}
