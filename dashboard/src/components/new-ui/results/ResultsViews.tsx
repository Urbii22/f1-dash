"use client";

import Link from "next/link";

import PitStopsPanel from "@/components/results/PitStopsPanel";
import RouteHeader from "@/components/new-ui/routes/RouteHeader";
import Panel from "@/components/new-ui/primitives/Panel";
import Kpi from "@/components/new-ui/primitives/Kpi";
import ViewState from "@/components/new-ui/primitives/ViewState";
import type { RaceResult, QualiResult, DriverRef, ResultRow, QualiRow } from "@/lib/f1data";
import { classifyRound } from "@/lib/seasonResults";
import type { RoundWithResult } from "@/lib/seasonResults";
import type { RoundExtras } from "@/lib/view-models/roundExtras";
import type { ArchiveSession } from "@/types/archive.type";

type RoundResultItem = RoundWithResult;

function driverName(driver: DriverRef): string {
	return [driver.givenName, driver.familyName].filter(Boolean).join(" ") || driver.code || "Unknown";
}

function ResultStateBadge({ state }: { state: "done" | "live" | "upcoming" }) {
	const label = state === "done" ? "Done" : state === "live" ? "Live" : "Upcoming";
	return (
		<span className="rounded-md border border-[var(--ui-border)] bg-[var(--ui-surface-2)] px-2 py-1 text-xs font-semibold text-[var(--ui-muted)]">
			{label}
		</span>
	);
}

function RaceClassificationTable({ rows, season }: { rows: ResultRow[]; season: number }) {
	return (
		<div className="mt-3 overflow-x-auto">
			<table className="w-full min-w-[48rem] text-left text-sm">
				<thead className="text-xs uppercase tracking-wide text-[var(--ui-subtle)]">
					<tr className="border-b border-[var(--ui-border)]">
						<th className="py-2 pr-3">Pos</th>
						<th className="py-2 pr-3">Driver</th>
						<th className="py-2 pr-3">Team</th>
						<th className="py-2 pr-3">Grid</th>
						<th className="py-2 pr-3">Time / gap</th>
						<th className="py-2 pr-3">Status</th>
						<th className="py-2 text-right">Pts</th>
					</tr>
				</thead>
				<tbody>
					{rows.map((row) => (
						<tr key={row.driver.driverId ?? row.position} className="border-b border-[var(--ui-border)] last:border-b-0">
							<td className="new-ui-number py-3 pr-3 font-bold text-[var(--ui-accent)]">{row.position ?? "-"}</td>
							<td className="py-3 pr-3 font-semibold text-[var(--ui-text)]">
								{row.driver.driverId ? (
									<Link href={`/driver/${row.driver.driverId}?season=${season}`} className="hover:text-[var(--ui-accent)]">
										{driverName(row.driver)}
									</Link>
								) : (
									driverName(row.driver)
								)}
							</td>
							<td className="py-3 pr-3 text-[var(--ui-muted)]">{row.constructor ?? "-"}</td>
							<td className="new-ui-number py-3 pr-3">{row.grid === 0 ? "PIT" : (row.grid ?? "-")}</td>
							<td className="new-ui-number py-3 pr-3 text-[var(--ui-muted)]">{row.time ?? "-"}</td>
							<td className="py-3 pr-3 text-[var(--ui-muted)]">{row.status ?? "-"}</td>
							<td className="new-ui-number py-3 text-right font-bold">{row.points ?? 0}</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}

function StartingGridList({ rows }: { rows: ResultRow[] }) {
	const grid = [...rows].sort((a, b) => (a.grid || 999) - (b.grid || 999));
	return (
		<div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
			{grid.map((row) => (
				<div key={row.driver.driverId ?? row.position} className="flex items-center gap-3 rounded-md border border-[var(--ui-border)] bg-[var(--ui-surface)] p-3">
					<span className="new-ui-number min-w-10 text-lg font-black text-[var(--ui-accent)]">
						{row.grid === 0 ? "PIT" : `P${row.grid ?? "-"}`}
					</span>
					<div className="min-w-0">
						<p className="truncate font-semibold text-[var(--ui-text)]">{driverName(row.driver)}</p>
						<p className="text-xs text-[var(--ui-muted)]">{row.constructor ?? "-"}</p>
					</div>
				</div>
			))}
		</div>
	);
}

function QualifyingClassificationTable({ rows }: { rows: QualiRow[] }) {
	return (
		<div className="mt-3 overflow-x-auto">
			<table className="w-full min-w-[40rem] text-left text-sm">
				<thead className="text-xs uppercase tracking-wide text-[var(--ui-subtle)]">
					<tr className="border-b border-[var(--ui-border)]">
						<th className="py-2 pr-3">Pos</th>
						<th className="py-2 pr-3">Driver</th>
						<th className="py-2 pr-3">Team</th>
						<th className="py-2 pr-3">Q1</th>
						<th className="py-2 pr-3">Q2</th>
						<th className="py-2">Q3</th>
					</tr>
				</thead>
				<tbody>
					{rows.map((row) => (
						<tr key={row.driver.driverId ?? row.position} className="border-b border-[var(--ui-border)] last:border-b-0">
							<td className="new-ui-number py-3 pr-3 font-bold text-[var(--ui-accent)]">{row.position ?? "-"}</td>
							<td className="py-3 pr-3 font-semibold text-[var(--ui-text)]">{driverName(row.driver)}</td>
							<td className="py-3 pr-3 text-[var(--ui-muted)]">{row.constructor ?? "-"}</td>
							<td className="new-ui-number py-3 pr-3">{row.q1 ?? "-"}</td>
							<td className="new-ui-number py-3 pr-3">{row.q2 ?? "-"}</td>
							<td className="new-ui-number py-3">{row.q3 ?? "-"}</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}

export function SimpleResultsListView({ items, season }: { items: RoundResultItem[]; season: number }) {
	const completed = items.filter((i) => i.result != null);
	const latest = completed[completed.length - 1];

	return (
		<div className="new-ui-route-scroll flex h-full min-h-0 flex-col gap-4 overflow-y-auto p-4">
			<RouteHeader
				eyebrow="Official history"
				title={`${season} Grand Prix results`}
				description="Podiums, classifications and recorded analysis for every round."
			/>

			{latest?.result && (
				<Panel title={latest.result.raceName ?? "Latest result"} eyebrow="Most recent" level="primary">
					<ol className="mt-2 flex flex-col gap-2">
						{latest.result.results.slice(0, 3).map((row) => (
							<li key={row.driver.driverId ?? row.position} className="flex items-center gap-3 rounded-md border border-[var(--ui-border)] p-2">
								<span className="new-ui-number font-bold text-sm w-6 text-center">{row.position}</span>
								<span className="flex-1 text-sm font-medium text-[var(--ui-text)]">{driverName(row.driver)}</span>
								<span className="text-xs text-[var(--ui-muted)]">{row.constructor ?? ""}</span>
							</li>
						))}
					</ol>
					{latest.round.round && (
						<Link href={`/results/${latest.round.round}?season=${season}`} className="mt-3 inline-block text-xs text-[var(--ui-accent)]">
							Full result →
						</Link>
					)}
				</Panel>
			)}

			<Panel title="Season rounds" eyebrow={`${items.length} races`}>
				<div className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
					{items.map(({ round, result }) => {
						const href = result ? `/results/${round.round}?season=${season}` : "#";
						return (
							<Link
								key={round.round}
								href={href}
								aria-disabled={!result}
								className={`flex items-center justify-between rounded-md border border-[var(--ui-border)] p-3 transition-colors ${result ? "hover:border-[var(--ui-accent)] hover:bg-[var(--ui-surface-2)]" : "opacity-50 cursor-default"}`}
							>
								<div>
									<p className="font-mono text-[0.65rem] text-[var(--ui-muted)]">R{round.round} · {round.date}</p>
									<p className="text-sm font-semibold text-[var(--ui-text)]">{round.raceName}</p>
								</div>
								{result ? (
									<span className="text-xs text-[var(--ui-accent)]">Result →</span>
								) : (
									<span className="text-xs text-[var(--ui-subtle)]">Upcoming</span>
								)}
							</Link>
						);
					})}
				</div>
			</Panel>
		</div>
	);
}

export function DetailedResultsListView({ items, season }: { items: RoundResultItem[]; season: number }) {
	const now = new Date();

	return (
		<div className="new-ui-route-scroll flex h-full min-h-0 flex-col gap-4 overflow-y-auto p-4">
			<RouteHeader
				eyebrow="Official history"
				title={`${season} Grand Prix results`}
				description="Complete season round list with links to full classifications."
			/>
			<Panel title="All rounds" eyebrow={`${season} season`} level="primary">
				<div className="mt-3 grid gap-3 xl:grid-cols-2">
					{items.map(({ round, result }) => {
						const state = classifyRound(round, now, Boolean(result));
						const podium = result?.results.slice(0, 3) ?? [];
						const href = result && round.round != null ? `/results/${round.round}?season=${season}` : "#";

						return (
							<Link
								key={`${round.season}-${round.round}`}
								href={href}
								aria-disabled={!result}
								className={`group rounded-lg border border-[var(--ui-border)] bg-[var(--ui-surface)] p-4 transition-colors ${
									result ? "hover:border-[var(--ui-accent)] hover:bg-[var(--ui-surface-2)]" : "cursor-default opacity-70"
								}`}
							>
								<div className="flex items-start justify-between gap-3">
									<div>
										<p className="font-mono text-[0.65rem] uppercase tracking-wide text-[var(--ui-subtle)]">
											Round {round.round ?? "-"} - {round.date ?? "Date TBC"}
										</p>
										<h3 className="mt-1 text-base font-semibold text-[var(--ui-text)]">{round.raceName}</h3>
										<p className="mt-1 text-xs text-[var(--ui-muted)]">
											{[round.circuitName, round.locality, round.country].filter(Boolean).join(" - ") || "Circuit TBC"}
										</p>
									</div>
									<ResultStateBadge state={state} />
								</div>

								{podium.length ? (
									<ol className="mt-4 grid gap-2">
										{podium.map((row) => (
											<li key={row.driver.driverId ?? row.position} className="flex items-center gap-3 rounded-md border border-[var(--ui-border)] px-3 py-2">
												<span className="new-ui-number w-7 text-center text-sm font-bold text-[var(--ui-accent)]">{row.position}</span>
												<span className="flex-1 text-sm font-semibold text-[var(--ui-text)]">{driverName(row.driver)}</span>
												<span className="text-xs text-[var(--ui-muted)]">{row.constructor ?? ""}</span>
											</li>
										))}
									</ol>
								) : (
									<p className="mt-4 rounded-md border border-dashed border-[var(--ui-border)] px-3 py-4 text-center text-sm text-[var(--ui-muted)]">
										No classification recorded yet.
									</p>
								)}

								{result ? (
									<p className="mt-3 text-xs font-semibold text-[var(--ui-accent)]">Open full classification -&gt;</p>
								) : null}
							</Link>
						);
					})}
				</div>
			</Panel>
		</div>
	);
}

export function SimpleRoundResultView({
	race,
	season,
	recording,
	sprint,
	pitStops,
	labels,
}: {
	race: RaceResult;
	qualifying: QualiResult | null;
	season: number;
	recording: ArchiveSession | null;
} & Partial<RoundExtras>) {
	const podium = race.results.slice(0, 3);
	const fastest = race.results.find((r) => r.fastestLapRank === "1");
	const sprintWinner = sprint?.results.find((r) => r.position === 1);

	return (
		<div className="new-ui-route-scroll flex h-full min-h-0 flex-col gap-4 overflow-y-auto p-4">
			<RouteHeader
				eyebrow={`Round ${race.round} · ${season}`}
				title={race.raceName ?? "Race result"}
				description={[race.circuitName, race.locality, race.country].filter(Boolean).join(" · ")}
				status={
					recording ? (
						<Link href={`/archive/${recording.id}`} className="text-xs text-[var(--ui-accent)]">
							Post-session analysis →
						</Link>
					) : null
				}
			/>

			<div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
				<Kpi label="Winner" value={podium[0] ? driverName(podium[0].driver) : "—"} />
				{fastest && <Kpi label="Fastest lap" value={driverName(fastest.driver)} context={fastest.fastestLapTime ?? ""} />}
				<Kpi label="Finishers" value={race.results.filter((r) => r.status === "Finished" || r.status?.startsWith("+")).length} />
				{sprintWinner ? <Kpi label="Sprint winner" value={driverName(sprintWinner.driver)} /> : <Kpi label="Circuit" value={race.circuitName ?? "—"} />}
			</div>

			<Panel title="Podium" eyebrow="Top three" level="primary">
				<ol className="mt-2 flex flex-col gap-2">
					{podium.map((row) => (
						<li key={row.driver.driverId ?? row.position} className="flex items-center gap-3 rounded-md border border-[var(--ui-border)] p-3">
							<span className="new-ui-number font-bold text-xl w-8 text-center text-[var(--ui-accent)]">{row.position}</span>
							<div className="flex-1">
								<p className="font-semibold text-[var(--ui-text)]">{driverName(row.driver)}</p>
								<p className="text-xs text-[var(--ui-muted)]">{row.constructor ?? ""}</p>
							</div>
							<span className="font-mono text-sm text-[var(--ui-muted)]">{row.time ?? row.status ?? ""}</span>
						</li>
					))}
				</ol>
				<Link href={`/results/${race.round}?season=${season}`} className="mt-3 inline-block text-xs text-[var(--ui-accent)]">
					Full classification →
				</Link>
			</Panel>

			<PitStopsPanel pitStops={pitStops ?? []} labels={labels ?? {}} />
		</div>
	);
}

export function DetailedRoundResultView({
	race,
	qualifying,
	season,
	recording,
	sprint,
	pitStops,
	labels,
}: {
	race: RaceResult;
	qualifying: QualiResult | null;
	season: number;
	recording: ArchiveSession | null;
} & Partial<RoundExtras>) {
	return (
		<div className="new-ui-route-scroll flex h-full min-h-0 flex-col gap-4 overflow-y-auto p-4">
			<RouteHeader
				eyebrow={`Round ${race.round} · ${season}`}
				title={race.raceName ?? "Race result"}
				description={[race.circuitName, race.locality, race.country].filter(Boolean).join(" · ")}
				status={
					recording ? (
						<Link href={`/archive/${recording.id}`} className="text-xs text-[var(--ui-accent)]">
							Post-session analysis →
						</Link>
					) : null
				}
			/>

			<Panel title="Race classification" eyebrow="Official result" level="primary">
				<RaceClassificationTable rows={race.results} season={season} />
			</Panel>

			{sprint?.results.length ? (
				<Panel title="Sprint classification" eyebrow="Sprint result">
					<RaceClassificationTable rows={sprint.results} season={season} />
				</Panel>
			) : null}

			<PitStopsPanel pitStops={pitStops ?? []} labels={labels ?? {}} />

			<Panel title="Starting grid" eyebrow="Grid order">
				<StartingGridList rows={race.results} />
			</Panel>

			{qualifying?.results.length ? (
				<Panel title="Qualifying" eyebrow="Session times">
					<QualifyingClassificationTable rows={qualifying.results} />
				</Panel>
			) : (
				<Panel title="Qualifying">
					<ViewState state="unavailable" title="Qualifying result unavailable" />
				</Panel>
			)}
		</div>
	);
}
