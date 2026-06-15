"use client";

import InsightSummary from "@/components/new-ui/routes/InsightSummary";
import RouteHeader from "@/components/new-ui/routes/RouteHeader";
import Panel from "@/components/new-ui/primitives/Panel";
import ViewState from "@/components/new-ui/primitives/ViewState";
import { formatLapTime, theoreticalBest } from "@/lib/quali";
import { buildProgressionGroups, rankSpeedTrap } from "@/lib/qualiView";
import { buildQualifyingSummary } from "@/lib/view-models/qualifying";
import { useDataStore } from "@/stores/useDataStore";

export default function DetailedQualifyingView() {
	const state = useDataStore((store) => store.state);
	const model = buildQualifyingSummary(state);

	if (!state?.SessionInfo) return <ViewState state="loading" title="Loading qualifying" />;
	if (!model) {
		return <ViewState state="unavailable" title="Qualifying unavailable" description="This view is available during qualifying sessions." />;
	}

	const rows = Object.values(state.TimingData?.Lines ?? {}).sort((a, b) => Number(a.Position) - Number(b.Position));
	const progression = buildProgressionGroups(state.TimingData?.Lines);
	const speedTrap = rankSpeedTrap(state.TimingStats?.Lines, state.DriverList);

	return (
		<div className="flex h-full min-h-0 flex-col gap-4 overflow-y-auto p-4">
			<RouteHeader
				eyebrow={state.SessionInfo.Meeting?.Name ?? "Live session"}
				title="Qualifying technical view"
				description="Full timing, sector potential, eliminations, and straight-line performance."
				status={<span>{model.phaseLabel} technical feed</span>}
			/>
			<InsightSummary insights={model.insights} />

			<div data-testid="qualifying-technical-board">
				<Panel title="Technical classification" eyebrow="Timing and sectors" level="primary">
					<p className="mb-3 text-xs font-semibold tracking-wide text-[var(--ui-subtle)] uppercase">Sectors / theoretical best</p>
					<div className="overflow-x-auto">
						<div className="min-w-[64rem]">
							<div className="grid grid-cols-[3rem_5rem_5rem_6rem_6rem_repeat(3,5rem)_6rem] gap-2 border-b border-[var(--ui-border)] pb-2 text-xs text-[var(--ui-subtle)]">
								<span>Pos</span><span>Driver</span><span>Status</span><span>Best</span><span>Last</span><span>S1</span><span>S2</span><span>S3</span><span>Ideal</span>
							</div>
							{rows.map((row) => {
								const driver = state.DriverList?.[row.RacingNumber];
								const ideal = theoreticalBest(state.TimingStats?.Lines?.[row.RacingNumber]?.BestSectors);
								const status = row.Stopped ? "Stopped" : row.InPit ? "Pit" : row.PitOut ? "Out lap" : "Track";
								return <div key={row.RacingNumber} className="new-ui-number grid grid-cols-[3rem_5rem_5rem_6rem_6rem_repeat(3,5rem)_6rem] gap-2 border-b border-[var(--ui-border)] py-2 text-sm">
									<strong>{row.Position}</strong><strong>{driver?.Tla ?? row.RacingNumber}</strong><span>{status}</span><span>{row.BestLapTime?.Value || "-"}</span><span>{row.LastLapTime?.Value || "-"}</span>
									{[0, 1, 2].map((index) => <span key={index}>{row.Sectors?.[index]?.Value || "-"}</span>)}<span>{ideal === undefined ? "-" : formatLapTime(ideal)}</span>
								</div>;
							})}
						</div>
					</div>
				</Panel>
			</div>

			<div className="grid gap-3 2xl:grid-cols-[1.25fr_.75fr]">
				<div data-testid="qualifying-progression">
					<Panel title="Qualifying progression" eyebrow="Round results">
						<div className="grid gap-3 md:grid-cols-3">
							{(["q1", "q2", "q3"] as const).map((phase) => <div key={phase}><h3 className="mb-2 text-xs font-semibold uppercase">{phase}</h3><p className="text-sm text-[var(--ui-muted)]">{progression[phase].length} classified drivers</p></div>)}
						</div>
					</Panel>
				</div>
				<Panel title="Speed trap" eyebrow="KM/H">
					{speedTrap.length === 0 ? <ViewState state="empty" title="No speed data" /> : <ol className="space-y-2">{speedTrap.slice(0, 8).map((entry) => <li key={entry.racingNumber} className="flex justify-between"><strong>{entry.tla}</strong><span className="new-ui-number">{entry.speed.toFixed(1)}</span></li>)}</ol>}
				</Panel>
			</div>

			<Panel title="Deleted laps" eyebrow="FIA decisions">
				{model.deletedLaps.length === 0 ? <ViewState state="empty" title="No deleted laps" /> : <ul className="space-y-2">{model.deletedLaps.map((item) => <li key={`${item.timestamp}-${item.message}`} className="text-sm">{item.message}</li>)}</ul>}
			</Panel>
		</div>
	);
}
