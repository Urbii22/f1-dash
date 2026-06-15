"use client";

import clsx from "clsx";

import InsightsPanel from "@/components/analysis/InsightsPanel";
import PositionChart from "@/components/analysis/PositionChart";
import QualiInsights from "@/components/analysis/QualiInsights";
import RacePaceChart from "@/components/analysis/RacePaceChart";
import SpeedScatter from "@/components/analysis/SpeedScatter";
import StintTimeline from "@/components/analysis/StintTimeline";
import StrategyView from "@/components/analysis/StrategyView";
import { useAnalysisPresentationData } from "@/components/new-ui/analysis/useAnalysisPresentationData";
import ChartFrame from "@/components/new-ui/charts/ChartFrame";
import InsightSummary from "@/components/new-ui/routes/InsightSummary";
import RouteHeader from "@/components/new-ui/routes/RouteHeader";
import { useAnalysisViewStore, type AnalysisTab } from "@/stores/useAnalysisViewStore";

const baseTabs: { id: AnalysisTab; label: string }[] = [
	{ id: "pace", label: "Race Pace" }, { id: "positions", label: "Positions" }, { id: "stints", label: "Stints" },
	{ id: "strategy", label: "Strategy" }, { id: "insights", label: "Insights" }, { id: "speed", label: "Speed" },
];

export default function DetailedAnalysisView() {
	const data = useAnalysisPresentationData();
	const storedTab = useAnalysisViewStore((state) => state.activeTab);
	const setActiveTab = useAnalysisViewStore((state) => state.setActiveTab);
	const qualifying = (data.sessionType ?? "").toLowerCase().includes("qual") || (data.sessionType ?? "").toLowerCase().includes("shootout");
	const tabs = qualifying ? [...baseTabs, { id: "quali" as const, label: "Quali" }] : baseTabs;
	const activeTab = !qualifying && storedTab === "quali" ? "pace" : storedTab;
	const insights = data.conclusions.map((item) => ({ ...item, value: `${item.value} | ${item.metric}` }));

	return (
		<div className="flex h-full min-h-0 flex-col gap-4 overflow-y-auto p-4">
			<RouteHeader eyebrow={data.meetingName ?? "Current session"} title="Detailed session analysis" description="All recorded views with shared driver filters and explicit measurement units." />
			<InsightSummary insights={insights} />

			<div role="tablist" aria-label="Analysis view" className="flex flex-wrap gap-2">
				{tabs.map((tab) => <button key={tab.id} type="button" role="tab" aria-selected={activeTab === tab.id} onClick={() => setActiveTab(tab.id)} className={clsx("rounded-md border px-3 py-2 text-sm", activeTab === tab.id ? "border-[var(--ui-text)] bg-white/10" : "border-[var(--ui-border)] text-[var(--ui-muted)]")}>{tab.label}</button>)}
			</div>

			<div className="flex flex-wrap gap-2" aria-label="Driver filters">
				{data.orderedDrivers.map(([nr, driver]) => <button key={nr} type="button" aria-pressed={data.selected.includes(nr)} onClick={() => data.toggleDriver(nr)} className="rounded-md border border-[var(--ui-border)] px-3 py-1.5 text-sm" style={{ borderLeftColor: `#${driver.TeamColour ?? "71717a"}` }}>{driver.Tla ?? nr}</button>)}
			</div>

			{activeTab === "pace" ? <ChartFrame title="Race pace" unit="lap time" summary="Clean laps, with clipped pit and outlier samples identified."><RacePaceChart selected={data.selected} laps={data.laps} drivers={data.drivers} /></ChartFrame> : null}
			{activeTab === "positions" ? <ChartFrame title="Position history" unit="position by lap" summary="Recorded classification movement for every selected driver."><PositionChart selected={data.selected} laps={data.laps} drivers={data.drivers} /></ChartFrame> : null}
			{activeTab === "stints" ? <ChartFrame title="Stint timeline" unit="compound, laps, degradation" summary="Observed tyre runs and calculated degradation from clean laps."><StintTimeline stints={data.stints} laps={data.laps} drivers={data.drivers} /></ChartFrame> : null}
			{activeTab === "strategy" ? <ChartFrame title="Strategy projections" unit="laps and time gap" summary="Pit-window and undercut estimates based on the current recorded sample."><StrategyView /></ChartFrame> : null}
			{activeTab === "insights" ? <ChartFrame title="Technical insights" unit="session bests" summary="Potential laps, sectors, long stints, and speed measurements."><InsightsPanel potential={data.potential} topSpeeds={data.topSpeeds} sectors={data.sectors} stints={data.stints} drivers={data.drivers} /></ChartFrame> : null}
			{activeTab === "speed" ? <ChartFrame title="Speed correlation" unit="km/h versus lap time" summary="Measured speed trap against completed lap time."><SpeedScatter laps={data.laps} selected={data.selected} drivers={data.drivers} /></ChartFrame> : null}
			{activeTab === "quali" && qualifying ? <ChartFrame title="Qualifying potential" unit="lap and sector time" summary="Best observed sectors compared with completed qualifying laps."><QualiInsights potential={data.potential} laps={data.laps} selected={data.selected} drivers={data.drivers} /></ChartFrame> : null}
		</div>
	);
}
