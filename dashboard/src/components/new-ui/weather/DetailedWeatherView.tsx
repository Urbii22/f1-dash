"use client";

import { useState } from "react";

import { WeatherMap } from "@/app/dashboard/weather/map";
import Kpi from "@/components/new-ui/primitives/Kpi";
import Panel from "@/components/new-ui/primitives/Panel";
import ViewState from "@/components/new-ui/primitives/ViewState";
import InsightSummary from "@/components/new-ui/routes/InsightSummary";
import RouteHeader from "@/components/new-ui/routes/RouteHeader";
import { buildWeatherImpact } from "@/lib/view-models/weather";
import { useDataStore } from "@/stores/useDataStore";
import { useSettingsStore } from "@/stores/useSettingsStore";

export default function DetailedWeatherView() {
	const weather = useDataStore((state) => state.state?.WeatherData);
	const meeting = useDataStore((state) => state.state?.SessionInfo?.Meeting?.Name);
	const speedUnit = useSettingsStore((state) => state.speedUnit);
	const [radarAvailable, setRadarAvailable] = useState<boolean | null>(null);
	if (!weather) return <ViewState state="unavailable" title="Weather unavailable" description="The live feed has not provided measurements." />;
	const model = buildWeatherImpact({ current: weather, radarFrames: radarAvailable === null ? undefined : radarAvailable ? { past: 1, nowcast: 1 } : null, speedUnit });

	return <div className="flex h-full min-h-0 flex-col gap-4 overflow-y-auto p-4">
		<RouteHeader eyebrow={meeting ?? "Current session"} title="Detailed weather" description="Live measurements, session impact, and radar frame context." status={<span>Confidence: {model.confidence}</span>} />
		<InsightSummary insights={model.insights} />
		<div className="grid gap-3 2xl:grid-cols-[1.35fr_.65fr]">
			<Panel title="Radar timeline" eyebrow="RainViewer frames" level="primary"><div className="h-[28rem]"><WeatherMap variant="new" onRadarAvailabilityChange={setRadarAvailable} /></div></Panel>
			<div className="grid gap-3">
				<Panel title="Full measurements" eyebrow="Current observation"><div className="grid grid-cols-2 gap-3"><Kpi label="Air" value={model.metrics.air} /><Kpi label="Track" value={model.metrics.track} /><Kpi label="Humidity" value={model.metrics.humidity} /><Kpi label="Wind" value={model.metrics.wind} /><Kpi label="Pressure" value={weather.Pressure || "--"} unit={weather.Pressure ? "hPa" : undefined} /><Kpi label="Rainfall" value={weather.Rainfall || "--"} /></div></Panel>
				<Panel title="Session impact" eyebrow="Interpretation"><p className="text-sm text-[var(--ui-muted)]">{model.trackEvolution}</p><p className="mt-3 text-sm text-[var(--ui-muted)]">{model.windImpact}</p><p className="mt-3 text-sm text-[var(--ui-muted)]">{model.rainRiskLabel}</p></Panel>
			</div>
		</div>
	</div>;
}
