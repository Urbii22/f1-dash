"use client";

import PresetSelector from "@/components/new-ui/layout/PresetSelector";
import ResizableWorkspace from "@/components/new-ui/layout/ResizableWorkspace";
import { getDashboardPresetSlots } from "@/components/new-ui/live/dashboardPresets";
import { useDetailedLayoutStore } from "@/stores/useDetailedLayoutStore";

const ROUTE = "dashboard";

export default function DetailedDashboardView() {
	const preset = useDetailedLayoutStore((state) => state.activePresetByRoute[ROUTE] ?? "race");
	const slots = getDashboardPresetSlots(preset);

	return (
		<div data-testid="detailed-dashboard" className="flex h-[calc(100dvh-3.25rem)] min-h-0 flex-col gap-2 overflow-auto p-3">
			<div className="flex shrink-0 items-center justify-between gap-3">
				<div>
					<p className="text-xs font-semibold tracking-wide text-[var(--ui-muted)] uppercase">Pit wall</p>
					<h1 className="text-xl font-bold">Detailed workspace</h1>
				</div>
				<PresetSelector route={ROUTE} preset={preset} />
			</div>
			<div className="min-h-0 flex-1">
				<ResizableWorkspace {...slots} />
			</div>
		</div>
	);
}
