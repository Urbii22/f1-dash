"use client";

import clsx from "clsx";
import { useMemo, useState } from "react";

import PositionChart from "@/components/analysis/PositionChart";
import QualiInsights from "@/components/analysis/QualiInsights";
import RacePaceChart from "@/components/analysis/RacePaceChart";
import SpeedScatter from "@/components/analysis/SpeedScatter";
import StintTimeline from "@/components/analysis/StintTimeline";
import StrategyView from "@/components/analysis/StrategyView";
import { useAnalysisPresentationData } from "@/components/new-ui/analysis/useAnalysisPresentationData";
import ChartFrame from "@/components/new-ui/charts/ChartFrame";
import Panel from "@/components/new-ui/primitives/Panel";
import InsightSummary from "@/components/new-ui/routes/InsightSummary";
import RouteHeader from "@/components/new-ui/routes/RouteHeader";
import { formatLapTimeMs } from "@/lib/lapHistory";
import { buildLongStints } from "@/lib/sessionInsights";
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
		<div className="new-ui-route-scroll flex h-full min-h-0 flex-col gap-4 overflow-y-auto p-4">
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
			{activeTab === "insights" ? <NewUiInsights data={data} /> : null}
			{activeTab === "speed" ? <ChartFrame title="Speed correlation" unit="km/h versus lap time" summary="Measured speed trap against completed lap time."><SpeedScatter laps={data.laps} selected={data.selected} drivers={data.drivers} /></ChartFrame> : null}
			{activeTab === "quali" && qualifying ? <ChartFrame title="Qualifying potential" unit="lap and sector time" summary="Best observed sectors compared with completed qualifying laps."><QualiInsights potential={data.potential} laps={data.laps} selected={data.selected} drivers={data.drivers} /></ChartFrame> : null}
		</div>
	);
}

function NewUiInsights({ data }: { data: ReturnType<typeof useAnalysisPresentationData> }) {
	const [minLaps, setMinLaps] = useState(6);
	const longStints = useMemo(
		() => buildLongStints(data.stints, data.drivers, minLaps),
		[data.stints, data.drivers, minLaps],
	);

	return (
		<div className="new-ui-panel__stack grid gap-3 xl:grid-cols-2">
			<Panel title="Potential lap" eyebrow="Session bests">
				{data.potential.length === 0 ? <EmptyInsight /> : (
					<table className="w-full text-left text-sm">
						<thead className="text-[var(--ui-subtle)]">
							<tr>
								<th className="py-2">Driver</th>
								<th className="py-2 text-right">Best</th>
								<th className="py-2 text-right">Theoretical</th>
								<th className="py-2 text-right">Lost</th>
							</tr>
						</thead>
						<tbody>
							{data.potential.slice(0, 10).map((row) => (
								<tr key={row.nr} className="border-t border-[var(--ui-border)]">
									<td className="py-2 font-semibold">{row.label}</td>
									<td className="new-ui-number py-2 text-right">{formatLapTimeMs(row.bestMs)}</td>
									<td className="new-ui-number py-2 text-right">{formatLapTimeMs(row.theoreticalMs)}</td>
									<td className="new-ui-number py-2 text-right">{formatDelta(row.deltaMs)}</td>
								</tr>
							))}
						</tbody>
					</table>
				)}
			</Panel>

			<Panel title="Top speed" eyebrow="Speed trap">
				{data.topSpeeds.length === 0 ? <EmptyInsight /> : (
					<div className="flex flex-col gap-2">
						{data.topSpeeds.slice(0, 10).map((row) => (
							<div key={row.nr} className="grid grid-cols-[4rem_1fr_5rem] items-center gap-3">
								<span className="font-semibold">{row.label}</span>
								<div className="h-2 overflow-hidden rounded-full bg-white/8">
									<div className="h-full rounded-full bg-sky-300" style={{ width: `${(row.fraction * 100).toFixed(1)}%` }} />
								</div>
								<span className="new-ui-number text-right">{row.kph} km/h</span>
							</div>
						))}
					</div>
				)}
			</Panel>

			<Panel title="Best sectors" eyebrow="Mini-sector pace">
				{data.sectors.every((group) => group.rows.length === 0) ? <EmptyInsight /> : (
					<div className="grid gap-3 md:grid-cols-3">
						{data.sectors.map((group) => (
							<div key={group.sector}>
								<p className="mb-2 text-xs font-semibold text-[var(--ui-subtle)]">S{group.sector + 1}</p>
								{group.rows.slice(0, 5).map((row) => (
									<div key={row.nr} className="flex items-center justify-between border-t border-[var(--ui-border)] py-1.5 text-sm">
										<span className="font-semibold">{row.label}</span>
										<span className="new-ui-number">{formatLapTimeMs(row.valueMs)}</span>
									</div>
								))}
							</div>
						))}
					</div>
				)}
			</Panel>

			<Panel
				title="Long stints"
				eyebrow="Tyre runs"
				action={
					<label className="flex items-center gap-2 text-xs text-[var(--ui-muted)]">
						Min laps
						<select
							value={minLaps}
							onChange={(event) => setMinLaps(Number(event.target.value))}
							className="rounded-md border border-[var(--ui-border)] bg-[var(--ui-surface-2)] px-2 py-1 text-[var(--ui-text)]"
						>
							{[3, 5, 6, 8, 10].map((value) => <option key={value} value={value}>{value}</option>)}
						</select>
					</label>
				}
			>
				{longStints.length === 0 ? <EmptyInsight message="No stints over the threshold yet." /> : (
					<table className="w-full text-left text-sm">
						<thead className="text-[var(--ui-subtle)]">
							<tr>
								<th className="py-2">Driver</th>
								<th className="py-2">Tyre</th>
								<th className="py-2 text-right">Laps</th>
								<th className="py-2 text-right">Avg</th>
								<th className="py-2 text-right">Deg/lap</th>
							</tr>
						</thead>
						<tbody>
							{longStints.slice(0, 12).map((row, index) => (
								<tr key={`${row.nr}-${index}`} className="border-t border-[var(--ui-border)]">
									<td className="py-2 font-semibold">{row.label}</td>
									<td className="py-2">{row.compound ?? "-"}</td>
									<td className="new-ui-number py-2 text-right">{row.laps}</td>
									<td className="new-ui-number py-2 text-right">{formatLapTimeMs(row.avgMs)}</td>
									<td className="new-ui-number py-2 text-right">{formatDelta(row.degMsPerLap)}</td>
								</tr>
							))}
						</tbody>
					</table>
				)}
			</Panel>
		</div>
	);
}

function EmptyInsight({ message = "No data yet." }: { message?: string }) {
	return <p className="py-6 text-center text-sm text-[var(--ui-muted)]">{message}</p>;
}

function formatDelta(ms: number | null) {
	if (ms == null || ms === 0) return "-";
	return `${ms > 0 ? "+" : ""}${(ms / 1000).toFixed(3)}`;
}
