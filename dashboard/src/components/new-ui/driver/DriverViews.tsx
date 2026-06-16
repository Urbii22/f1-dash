"use client";

import Link from "next/link";

import RouteHeader from "@/components/new-ui/routes/RouteHeader";
import Panel from "@/components/new-ui/primitives/Panel";
import Kpi from "@/components/new-ui/primitives/Kpi";
import ViewState from "@/components/new-ui/primitives/ViewState";
import type { DriverStandingRow, DriverSeasonRound } from "@/lib/f1data";
import type { DriverSeasonSummary } from "@/lib/seasonH2H";

function fullName(row: DriverStandingRow): string {
	const d = row.driver;
	return [d.givenName, d.familyName].filter(Boolean).join(" ") || d.code || "Unknown";
}

export function SimpleDriverView({
	standing,
	rounds,
	summary,
	teamMate,
	season,
}: {
	standing: DriverStandingRow | null;
	rounds: DriverSeasonRound[];
	summary: DriverSeasonSummary;
	teamMate: DriverStandingRow | null;
	season: number;
}) {
	const name = standing ? fullName(standing) : "Unknown driver";
	const recentRounds = rounds.slice(-5).reverse();

	return (
		<div className="flex h-full min-h-0 flex-col gap-4 overflow-y-auto p-4">
			<RouteHeader
				eyebrow={`${season} driver profile`}
				title={name}
				description={[standing?.constructor, standing?.driver.nationality].filter(Boolean).join(" · ")}
				status={
					teamMate?.driver.driverId ? (
						<Link href={`/h2h?season=${season}&a=${standing?.driver.driverId}&b=${teamMate.driver.driverId}`} className="text-xs text-[var(--ui-accent)]">
							Compare with {fullName(teamMate)} →
						</Link>
					) : null
				}
			/>

			<div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
				<Kpi label="Championship" value={standing?.position ? `P${standing.position}` : "—"} />
				<Kpi label="Points" value={standing?.points ?? summary.points} />
				<Kpi label="Wins" value={summary.wins} />
				<Kpi label="Podiums" value={summary.podiums} />
				<Kpi label="Best result" value={summary.best ? `P${summary.best}` : "—"} />
			</div>

			{recentRounds.length > 0 && (
				<Panel title="Recent races" eyebrow="Last 5" level="primary">
					<div className="mt-2 flex flex-col gap-1">
						{recentRounds.map((r) => (
							<div key={r.round} className="flex items-center justify-between border-b border-[var(--ui-border)] py-2 last:border-0">
								<div>
									<span className="font-mono text-xs text-[var(--ui-muted)] mr-2">R{r.round}</span>
									<Link href={`/results/${r.round}?season=${season}`} className="text-sm font-medium text-[var(--ui-text)] hover:text-[var(--ui-accent)]">
										{r.raceName}
									</Link>
								</div>
								<div className="flex items-center gap-3">
									{r.position && <span className="font-mono text-sm font-bold text-[var(--ui-accent)]">P{r.position}</span>}
									<span className="font-mono text-xs text-[var(--ui-muted)]">{r.points ?? 0} pts</span>
								</div>
							</div>
						))}
					</div>
				</Panel>
			)}
		</div>
	);
}

export function DetailedDriverView({
	standing,
	rounds,
	summary,
	teamMate,
	season,
}: {
	standing: DriverStandingRow | null;
	rounds: DriverSeasonRound[];
	summary: DriverSeasonSummary;
	teamMate: DriverStandingRow | null;
	season: number;
}) {
	const name = standing ? fullName(standing) : "Unknown driver";

	return (
		<div className="flex h-full min-h-0 flex-col gap-4 overflow-y-auto p-4">
			<RouteHeader
				eyebrow={`${season} driver profile`}
				title={name}
				description={[standing?.constructor, standing?.driver.nationality].filter(Boolean).join(" · ")}
				status={
					teamMate?.driver.driverId ? (
						<Link href={`/h2h?season=${season}&a=${standing?.driver.driverId}&b=${teamMate.driver.driverId}`} className="text-xs text-[var(--ui-accent)]">
							Compare with team-mate {fullName(teamMate)} →
						</Link>
					) : null
				}
			/>

			<div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
				<Kpi label="Championship" value={standing?.position ? `P${standing.position}` : "—"} />
				<Kpi label="Points" value={standing?.points ?? summary.points} />
				<Kpi label="Wins" value={summary.wins} />
				<Kpi label="Podiums" value={summary.podiums} />
				<Kpi label="Best result" value={summary.best ? `P${summary.best}` : "—"} />
			</div>

			{rounds.length > 0 ? (
				<Panel title="Grand Prix log" eyebrow="Season results" level="primary">
					<div className="overflow-x-auto">
						<table className="w-full min-w-[620px] text-left text-sm">
							<thead className="font-mono text-[0.65rem] text-[var(--ui-subtle)] uppercase">
								<tr>
									<th className="p-2">Round</th>
									<th>Grand Prix</th>
									<th>Grid</th>
									<th>Finish</th>
									<th>Status</th>
									<th className="text-right">Pts</th>
								</tr>
							</thead>
							<tbody>
								{rounds.map((r) => (
									<tr key={r.round} className="border-t border-[var(--ui-border)]">
										<td className="p-2 font-mono text-[var(--ui-accent)]">{r.round}</td>
										<td>
											<Link className="font-medium hover:text-[var(--ui-accent)]" href={`/results/${r.round}?season=${season}`}>
												{r.raceName}
											</Link>
										</td>
										<td className="font-mono">{r.grid === 0 ? "PIT" : (r.grid ?? "—")}</td>
										<td className="font-mono font-semibold">{r.position ? `P${r.position}` : "—"}</td>
										<td className="text-[var(--ui-muted)]">{r.status ?? "—"}</td>
										<td className="text-right font-mono">{r.points ?? 0}</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</Panel>
			) : (
				<ViewState state="unavailable" title="No season rounds" description="No race data available for this driver and season." />
			)}
		</div>
	);
}
