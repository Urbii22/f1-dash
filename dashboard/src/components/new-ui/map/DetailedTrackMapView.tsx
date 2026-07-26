"use client";

import { useState } from "react";
import Link from "next/link";

import Map from "@/components/dashboard/Map";
import MapOverlayControls, { type MapOverlays } from "@/components/new-ui/map/MapOverlayControls";
import Panel from "@/components/new-ui/primitives/Panel";
import ViewState from "@/components/new-ui/primitives/ViewState";
import RouteHeader from "@/components/new-ui/routes/RouteHeader";
import { useDataStore } from "@/stores/useDataStore";
import { useDriverSelectionStore } from "@/stores/useDriverSelectionStore";

const defaults: MapOverlays = { labels: true, trails: false, marshalSectors: true, pitStatus: true };

export default function DetailedTrackMapView() {
	const [overlays, setOverlays] = useState(defaults);
	const drivers = useDataStore((state) => state.state?.DriverList);
	const selectedDriver = useDriverSelectionStore((state) => state.selectedDriver);
	const selected = selectedDriver ? drivers?.[selectedDriver] : undefined;

	return <div className="new-ui-route-scroll flex h-full min-h-0 flex-col gap-4 overflow-y-auto p-4">
		<RouteHeader eyebrow="Live circuit" title="Detailed track map" description="Configurable driver, FIA sector, trail, and pit overlays." actions={<MapOverlayControls value={overlays} onChange={setOverlays} />} />
		<div className="grid min-h-[42rem] gap-3 2xl:grid-cols-[1.5fr_.5fr]">
			<Panel title="Circuit overlays" eyebrow="Technical map" level="primary"><div className="h-[38rem]"><Map variant="technical" showDriverLabels={overlays.labels} showTrails={overlays.trails} showMarshalSectors={overlays.marshalSectors} showPitStatus={overlays.pitStatus} /></div></Panel>
			<Panel title="Selected driver" eyebrow="Telemetry link">{selected && selectedDriver ? <><p className="text-3xl font-bold">{selected.Tla}</p><Link href={`/dashboard/driver/${selectedDriver}`} className="mt-4 inline-flex rounded-md border border-[var(--ui-border)] px-3 py-2 text-sm">Open {selected.Tla} telemetry</Link></> : <ViewState state="empty" title="Select a driver" description="Choose a map marker to open telemetry." />}</Panel>
		</div>
	</div>;
}
