"use client";

import Kpi from "@/components/new-ui/primitives/Kpi";
import Panel from "@/components/new-ui/primitives/Panel";
import ViewState from "@/components/new-ui/primitives/ViewState";
import { estimatePitWindow } from "@/lib/strategy";
import { useStrategy } from "@/hooks/useStrategy";
import { useDataStore } from "@/stores/useDataStore";
import { useDriverSelectionStore } from "@/stores/useDriverSelectionStore";

export default function TechnicalStrategyPanel() {
	const selected = useDriverSelectionStore((state) => state.selectedDriver);
	const driver = useDataStore((state) => selected ? state.state?.DriverList?.[selected] : undefined);
	const stints = useDataStore((state) => selected ? state.state?.TimingAppData?.Lines?.[selected]?.Stints : undefined);
	const strategy = useStrategy();

	if (!selected) return <Panel title="Strategy" eyebrow="Selected driver"><ViewState state="empty" title="Select a driver" description="Choose a driver to inspect tyre and pit strategy." /></Panel>;
	if (!driver) return <Panel title="Strategy" eyebrow="Selected driver"><ViewState state="unavailable" title="Driver unavailable" /></Panel>;

	const stint = stints?.at(-1);
	const model = strategy.models[selected];
	const pitWindow = model ? estimatePitWindow(model, strategy.pitLossMs, strategy.currentLap, strategy.totalLaps) : null;

	return (
		<Panel title="Strategy" eyebrow="Selected driver" className="flex min-h-0 flex-col">
			<div className="space-y-3">
				<div className="flex items-center gap-2"><span className="h-8 w-1 rounded" style={{ backgroundColor: `#${driver.TeamColour || "6d7680"}` }} /><strong className="text-xl">{driver.Tla}</strong></div>
				<div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
					<Kpi label="Compound" value={stint?.Compound ?? "-"} />
					<Kpi label="Tyre age" value={stint?.TotalLaps ?? "-"} unit={stint ? "laps" : undefined} />
					<Kpi label="Stops" value={stints ? Math.max(0, stints.length - 1) : "-"} />
					<Kpi label="Degradation" value={model ? Math.round(model.degMsPerLap) : "-"} unit={model ? "ms/lap" : undefined} />
				</div>
				<p className="text-sm text-[var(--ui-muted)]">{pitWindow ? `Estimated pit window: laps ${pitWindow.fromLap}-${pitWindow.toLap}.` : "Pit window unavailable until enough clean race laps are recorded."}</p>
			</div>
		</Panel>
	);
}
