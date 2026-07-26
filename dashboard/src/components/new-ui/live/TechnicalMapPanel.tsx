"use client";

import Map from "@/components/dashboard/Map";
import Panel from "@/components/new-ui/primitives/Panel";
import ViewState from "@/components/new-ui/primitives/ViewState";
import { useDataStore } from "@/stores/useDataStore";
import { useDriverSelectionStore } from "@/stores/useDriverSelectionStore";

export default function TechnicalMapPanel() {
	const selected = useDriverSelectionStore((state) => state.selectedDriver);
	const driver = useDataStore((state) => selected ? state.state?.DriverList?.[selected] : undefined);

	return (
		<Panel title="Track context" eyebrow="Technical map" className="flex min-h-0 flex-col">
			{!selected ? (
				<ViewState state="empty" title="Select a driver" description="Choose a driver to focus track position and traces." />
			) : !driver ? (
				<ViewState state="unavailable" title="Driver unavailable" />
			) : (
				<>
					<div className="mb-2 flex items-center gap-2"><span className="h-5 w-1 rounded" style={{ backgroundColor: `#${driver.TeamColour || "6d7680"}` }} /><strong>{driver.Tla}</strong><span className="text-xs text-[var(--ui-muted)]">focused on track</span></div>
					<div className="min-h-0 flex-1 overflow-hidden rounded-md bg-black/30"><Map variant="technical" showLabels showTrails /></div>
				</>
			)}
		</Panel>
	);
}
