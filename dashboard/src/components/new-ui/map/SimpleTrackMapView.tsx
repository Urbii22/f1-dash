"use client";

import Map from "@/components/dashboard/Map";
import Panel from "@/components/new-ui/primitives/Panel";
import ViewState from "@/components/new-ui/primitives/ViewState";
import RouteHeader from "@/components/new-ui/routes/RouteHeader";
import { useDataStore } from "@/stores/useDataStore";
import { useDriverSelectionStore } from "@/stores/useDriverSelectionStore";

export default function SimpleTrackMapView() {
	const drivers = useDataStore((state) => state.state?.DriverList);
	const timing = useDataStore((state) => state.state?.TimingData?.Lines);
	const selectedDriver = useDriverSelectionStore((state) => state.selectedDriver);
	const selected = selectedDriver ? drivers?.[selectedDriver] : undefined;
	const selectedTiming = selectedDriver ? timing?.[selectedDriver] : undefined;
	const ordered = Object.values(timing ?? {}).sort((a, b) => Number(a.Position) - Number(b.Position));
	const selectedIndex = selectedDriver ? ordered.findIndex((item) => item.RacingNumber === selectedDriver) : -1;
	const rivalTiming = selectedIndex >= 0 ? ordered[selectedIndex + 1] ?? ordered[selectedIndex - 1] : ordered[1];
	const rival = rivalTiming ? drivers?.[rivalTiming.RacingNumber] : undefined;

	return <div className="flex h-full min-h-0 flex-col gap-4 overflow-y-auto p-4">
		<RouteHeader eyebrow="Live circuit" title="Track orientation" description="Driver position and nearby battle context without making the map the whole dashboard." />
		<div className="grid min-h-[38rem] gap-3 2xl:grid-cols-[1.35fr_.65fr]">
			<Panel title="Circuit" eyebrow="Orientation" level="primary"><div className="h-[34rem]"><Map variant="compact" showLabels={false} showDriverLabels={false} showTrails={false} /></div></Panel>
			<div className="grid content-start gap-3">
				<Panel title="Selected driver" eyebrow="Focus">{selected && selectedTiming ? <><p className="text-2xl font-bold">{selected.Tla}</p><p className="mt-2 text-sm text-[var(--ui-muted)]">P{selectedTiming.Position} | {selectedTiming.InPit ? "Pit" : "On track"}</p></> : <ViewState state="empty" title="Select a driver" />}</Panel>
				<Panel title="Current battle" eyebrow="Nearest context">{rival ? <p className="text-sm"><strong>{selected?.Tla ?? ordered[0]?.RacingNumber ?? "Leader"}</strong> and <strong>{rival.Tla}</strong> are separated by {rivalTiming?.IntervalToPositionAhead?.Value || rivalTiming?.GapToLeader || "an unavailable gap"}.</p> : <ViewState state="empty" title="Battle unavailable" />}</Panel>
			</div>
		</div>
	</div>;
}
