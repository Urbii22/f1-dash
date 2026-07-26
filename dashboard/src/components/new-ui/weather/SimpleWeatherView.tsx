"use client";

import Kpi from "@/components/new-ui/primitives/Kpi";
import Panel from "@/components/new-ui/primitives/Panel";
import ViewState from "@/components/new-ui/primitives/ViewState";
import InsightSummary from "@/components/new-ui/routes/InsightSummary";
import RouteHeader from "@/components/new-ui/routes/RouteHeader";
import { buildWeatherImpact } from "@/lib/view-models/weather";
import { useDataStore } from "@/stores/useDataStore";
import { useSettingsStore } from "@/stores/useSettingsStore";

export default function SimpleWeatherView() {
	const weather = useDataStore((state) => state.state?.WeatherData);
	const meeting = useDataStore((state) => state.state?.SessionInfo?.Meeting?.Name);
	const observedAt = useDataStore((state) => state.state?.Heartbeat?.Utc);
	const speedUnit = useSettingsStore((state) => state.speedUnit);
	if (!weather) {
		return (
			<div className="new-ui-route-scroll flex h-full min-h-0 flex-col gap-4 overflow-y-auto p-4">
				<ViewState state="unavailable" title="Weather unavailable" description="The live feed has not provided measurements." />
			</div>
		);
	}
	const model = buildWeatherImpact({ current: weather, radarFrames: null, speedUnit });

	return <div className="new-ui-route-scroll flex h-full min-h-0 flex-col gap-4 overflow-y-auto p-4">
		<RouteHeader eyebrow={meeting ?? "Current session"} title="Weather impact" description="Observed conditions translated into likely session effects." status={<span>{model.rainRiskLabel}</span>} />
		<InsightSummary insights={model.insights} />
		<div className="grid grid-cols-2 gap-3 xl:grid-cols-4"><Kpi label="Air" value={model.metrics.air} /><Kpi label="Track" value={model.metrics.track} /><Kpi label="Humidity" value={model.metrics.humidity} /><Kpi label="Wind" value={model.metrics.wind} /></div>
		<Panel title="Observation timeline" eyebrow="Now and outlook">
			<div className="grid gap-3 md:grid-cols-3"><TimelineItem label="Observed" value={observedAt ?? "Time unavailable"} /><TimelineItem label="Track" value={model.trackEvolution} /><TimelineItem label="Radar" value={model.rainRiskLabel} /></div>
		</Panel>
	</div>;
}

function TimelineItem({ label, value }: { label: string; value: string }) {
	return <div className="rounded-md border border-[var(--ui-border)] p-3"><p className="text-xs font-semibold uppercase text-[var(--ui-subtle)]">{label}</p><p className="mt-1 text-sm text-[var(--ui-text)]">{value}</p></div>;
}
