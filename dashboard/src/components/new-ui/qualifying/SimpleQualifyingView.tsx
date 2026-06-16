"use client";

import InsightSummary from "@/components/new-ui/routes/InsightSummary";
import RouteHeader from "@/components/new-ui/routes/RouteHeader";
import Panel from "@/components/new-ui/primitives/Panel";
import ViewState from "@/components/new-ui/primitives/ViewState";
import { buildQualifyingSummary } from "@/lib/view-models/qualifying";
import { useDataStore } from "@/stores/useDataStore";

export default function SimpleQualifyingView() {
	const state = useDataStore((store) => store.state);
	const model = buildQualifyingSummary(state);

	if (!state?.SessionInfo) return <ViewState state="loading" title="Loading qualifying" />;
	if (!model) {
		return <ViewState state="unavailable" title="Qualifying unavailable" description="This view is available during qualifying sessions." />;
	}

	return (
		<div className="new-ui-route-scroll flex h-full min-h-0 flex-col gap-4 overflow-y-auto p-4">
			<RouteHeader
				eyebrow={state.SessionInfo.Meeting?.Name ?? "Live session"}
				title="Qualifying"
				description="The cutoff fight, active improvements, and major FIA decisions at a glance."
				status={<span>{model.phaseLabel} in progress</span>}
			/>
			<InsightSummary insights={model.insights} />

			<div className="grid gap-3 xl:grid-cols-[minmax(18rem,.65fr)_minmax(30rem,1.35fr)]">
				<Panel title="Cutoff" eyebrow={model.phaseLabel} level="primary">
					<p className="new-ui-number text-3xl font-bold">{model.cutoffTime ?? "No cutoff"}</p>
					<p className="mt-2 text-sm text-[var(--ui-muted)]">
						{model.cutoffPosition ? `Current elimination line: P${model.cutoffPosition}.` : "Final phase: provisional pole is the reference."}
					</p>
				</Panel>

				<Panel title="At risk" eyebrow="Threat window" level="primary">
					{model.atRisk.length === 0 ? (
						<ViewState state="empty" title="No cutoff battle" />
					) : (
						<ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
							{model.atRisk.map((driver) => (
								<li key={driver.driverNumber} className="grid grid-cols-[1fr_auto] gap-2 rounded-md border border-[var(--ui-border)] p-3">
									<div><strong>{driver.code}</strong><p className="text-xs text-[var(--ui-muted)]">{driver.state}</p></div>
									<span className="new-ui-number font-semibold">{driver.delta}</span>
								</li>
							))}
						</ul>
					)}
				</Panel>
			</div>

			<div className="grid gap-3 xl:grid-cols-2">
				<Panel title="Hot laps" eyebrow="Improving now">
					{model.hotLaps.length === 0 ? <ViewState state="empty" title="No active improvements" /> : (
						<ul className="space-y-2">{model.hotLaps.map((lap) => <li key={lap.driverNumber}><strong>{lap.code}</strong> <span className="text-[var(--ui-muted)]">Sector {lap.sector ?? "unknown"}</span></li>)}</ul>
					)}
				</Panel>
				<Panel title="Major deletions" eyebrow="FIA decisions">
					{model.deletedLaps.length === 0 ? <ViewState state="empty" title="No deleted laps" /> : (
						<ul className="space-y-2">{model.deletedLaps.slice(0, 4).map((item) => <li key={`${item.timestamp}-${item.message}`} className="text-sm">{item.message}</li>)}</ul>
					)}
				</Panel>
			</div>
		</div>
	);
}
