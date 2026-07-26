"use client";

import CompactTimingBoard from "@/components/new-ui/live/CompactTimingBoard";
import ConnectedRaceStoryPanel from "@/components/new-ui/live/RaceStoryPanel";
import ConnectedKeyAlertsPanel from "@/components/new-ui/live/KeyAlertsPanel";
import CompactTrackMap from "@/components/new-ui/live/CompactTrackMap";
import SimpleStrategySummary from "@/components/new-ui/live/SimpleStrategySummary";
import DriverDetailDrawer from "@/components/new-ui/live/DriverDetailDrawer";

// Broadcast layout: classification dominates, strategic context next, map secondary.
// The drawer overlays the secondary column instead of shrinking classification.
export default function SimpleDashboardView() {
	return (
		<div
			data-testid="simple-dashboard"
			className="relative grid h-[calc(100dvh-3.25rem)] min-h-0 grid-cols-[minmax(42rem,1.5fr)_minmax(24rem,.8fr)_minmax(18rem,.55fr)] gap-3 overflow-auto p-3"
		>
			<CompactTimingBoard />

			<div className="grid min-h-0 grid-rows-[auto_1fr] gap-3">
				<ConnectedRaceStoryPanel />
				<ConnectedKeyAlertsPanel />
			</div>

			<div className="grid min-h-0 grid-rows-[minmax(14rem,.7fr)_minmax(18rem,1fr)] gap-3">
				<CompactTrackMap />
				<SimpleStrategySummary />
			</div>

			<DriverDetailDrawer />
		</div>
	);
}
