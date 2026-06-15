"use client";

import Map from "@/components/dashboard/Map";
import Panel from "@/components/new-ui/primitives/Panel";

// Secondary orientation map for the Simple dashboard. It reuses the Legacy map
// engine through compact adapter props: no trails, no corner labels, and no
// technical overlay controls. Selection still flows through the shared
// useDriverSelectionStore inside Map, so the selected driver stays in sync.
export default function CompactTrackMap() {
	return (
		<Panel
			title="Track position"
			eyebrow="Orientation"
			level="contextual"
			className="flex min-h-0 flex-col"
		>
			<p className="mb-2 text-xs text-[var(--ui-muted)]">
				Compact map for orientation and battle context. Select a driver for detail.
			</p>
			<div className="relative min-h-0 flex-1 overflow-hidden rounded-md bg-black/30">
				<Map variant="compact" showLabels={false} showTrails={false} />
			</div>
		</Panel>
	);
}
