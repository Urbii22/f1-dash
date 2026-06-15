"use client";

import Kpi from "@/components/new-ui/primitives/Kpi";
import Panel from "@/components/new-ui/primitives/Panel";
import ViewState from "@/components/new-ui/primitives/ViewState";
import { useDataStore } from "@/stores/useDataStore";
import { useDriverSelectionStore } from "@/stores/useDriverSelectionStore";

export default function TechnicalTelemetryPanel() {
	const selected = useDriverSelectionStore((state) => state.selectedDriver);
	const driver = useDataStore((state) => selected ? state.state?.DriverList?.[selected] : undefined);
	const channels = useDataStore((state) => selected ? state.carsData?.[selected]?.Channels : undefined);
	const timing = useDataStore((state) => selected ? state.state?.TimingData?.Lines?.[selected] : undefined);

	return (
		<Panel title="Telemetry" eyebrow="Selected driver" className="flex min-h-0 flex-col">
			{!selected ? (
				<ViewState state="empty" title="Select a driver" description="Choose a timing row or car to inspect telemetry." />
			) : !driver ? (
				<ViewState state="unavailable" title="Driver unavailable" />
			) : (
				<div className="space-y-3">
					<div className="flex items-center gap-2"><span className="h-8 w-1 rounded" style={{ backgroundColor: `#${driver.TeamColour || "6d7680"}` }} /><strong className="text-xl">{driver.Tla}</strong><span className="text-sm text-[var(--ui-muted)]">{driver.FullName}</span></div>
					<div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
						<Kpi label="Speed" value={channels?.["2"] ?? "-"} unit={channels ? "km/h" : undefined} />
						<Kpi label="Gear" value={channels?.["3"] ?? "-"} />
						<Kpi label="Throttle" value={channels?.["4"] ?? "-"} unit={channels ? "%" : undefined} />
						<Kpi label="Brake" value={channels ? (channels["5"] > 0 ? "On" : "Off") : "-"} />
					</div>
					<div className="grid grid-cols-2 gap-2 text-sm">
						<p><span className="text-[var(--ui-muted)]">Last lap </span><span className="new-ui-number">{timing?.LastLapTime?.Value || "-"}</span></p>
						<p><span className="text-[var(--ui-muted)]">Best lap </span><span className="new-ui-number">{timing?.BestLapTime?.Value || "-"}</span></p>
					</div>
				</div>
			)}
		</Panel>
	);
}
