"use client";

import Panel from "@/components/new-ui/primitives/Panel";
import ViewState from "@/components/new-ui/primitives/ViewState";
import { formatLapTimeMs } from "@/lib/lapHistory";
import { useDataStore } from "@/stores/useDataStore";
import { useDriverSelectionStore } from "@/stores/useDriverSelectionStore";
import { useLapHistoryStore } from "@/stores/useLapHistoryStore";

export default function RecentLapsPanel() {
	const selected = useDriverSelectionStore((state) => state.selectedDriver);
	const driver = useDataStore((state) => selected ? state.state?.DriverList?.[selected] : undefined);
	const laps = useLapHistoryStore((state) => selected ? state.laps[selected] : undefined);

	return (
		<Panel title="Recent laps" eyebrow="Selected driver" className="flex min-h-0 flex-col">
			{!selected ? <ViewState state="empty" title="Select a driver" description="Choose a driver to inspect recent pace." />
				: !driver ? <ViewState state="unavailable" title="Driver unavailable" />
				: !laps?.length ? <ViewState state="empty" title={`${driver.Tla} has no recorded laps`} description="Completed laps appear here during the session." />
				: <div className="min-h-0 overflow-y-auto"><div className="mb-2 flex items-center gap-2"><span className="h-6 w-1 rounded" style={{ backgroundColor: `#${driver.TeamColour || "6d7680"}` }} /><strong>{driver.Tla}</strong></div><ol className="space-y-1">{laps.slice(-8).reverse().map((lap) => <li key={lap.lap} className="grid grid-cols-[3rem_1fr_auto] gap-2 rounded bg-white/[0.03] px-2 py-1.5 text-sm"><span className="text-[var(--ui-muted)]">L{lap.lap}</span><span className="new-ui-number">{formatLapTimeMs(lap.lapTimeMs)}</span><span className="text-xs text-[var(--ui-muted)]">{lap.compound ?? "-"} {lap.tyreAge ?? "-"}L</span></li>)}</ol></div>}
		</Panel>
	);
}
