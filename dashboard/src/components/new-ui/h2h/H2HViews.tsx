"use client";

import RouteHeader from "@/components/new-ui/routes/RouteHeader";
import Panel from "@/components/new-ui/primitives/Panel";
import Kpi from "@/components/new-ui/primitives/Kpi";
import ViewState from "@/components/new-ui/primitives/ViewState";
import type { DriverStandingRow } from "@/lib/f1data";
import type { SeasonH2H } from "@/lib/seasonH2H";

function driverLabel(row: DriverStandingRow): string {
	const d = row.driver;
	return [d.givenName, d.familyName].filter(Boolean).join(" ") || d.code || "Driver";
}

function ScoreBar({ a, b, aLabel, bLabel }: { a: number; b: number; aLabel: string; bLabel: string }) {
	const total = a + b;
	const aPercent = total > 0 ? Math.round((a / total) * 100) : 50;
	return (
		<div className="flex flex-col gap-1">
			<div className="flex items-center justify-between text-xs text-[var(--ui-muted)]">
				<span>{aLabel}</span>
				<span>{bLabel}</span>
			</div>
			<div className="h-2 w-full overflow-hidden rounded-full bg-[var(--ui-surface-2)]">
				<div className="h-full rounded-full bg-[var(--ui-accent)]" style={{ width: `${aPercent}%` }} />
			</div>
			<div className="flex items-center justify-between font-mono text-sm font-bold">
				<span>{a}</span>
				<span>{b}</span>
			</div>
		</div>
	);
}

function formatFinish(position: number | null): string {
	return position ? `P${position}` : "-";
}

export function SimpleH2HView({
	driverA,
	driverB,
	comparison,
	season,
}: {
	driverA: DriverStandingRow | null;
	driverB: DriverStandingRow | null;
	comparison: SeasonH2H | null;
	season: number;
}) {
	if (!driverA || !driverB) {
		return (
			<div className="new-ui-route-scroll flex h-full min-h-0 flex-col gap-4 overflow-y-auto p-4">
				<RouteHeader eyebrow={`${season} season`} title="Driver head-to-head" description="Official race and qualifying results." />
				<ViewState state="unavailable" title="Driver data unavailable" description="No official data for the selected season." />
			</div>
		);
	}

	const labelA = driverLabel(driverA);
	const labelB = driverLabel(driverB);

	return (
		<div className="new-ui-route-scroll flex h-full min-h-0 flex-col gap-4 overflow-y-auto p-4">
			<RouteHeader
				eyebrow={`${season} season comparison`}
				title="Driver head-to-head"
				description={`${labelA} vs. ${labelB} · official race and qualifying results.`}
			/>

			{comparison ? (
				<>
					<div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
						<Kpi label={labelA} value={driverA.points ?? 0} unit="pts" context={`P${driverA.position ?? "—"}`} />
						<Kpi label={labelB} value={driverB.points ?? 0} unit="pts" context={`P${driverB.position ?? "—"}`} />
						<Kpi label="Race wins" value={`${comparison.a.wins} – ${comparison.b.wins}`} />
						<Kpi label="Podiums" value={`${comparison.a.podiums} – ${comparison.b.podiums}`} />
					</div>

					<Panel title="Head-to-head score" eyebrow="Qualifying and race" level="primary">
						<div className="mt-3 flex flex-col gap-4">
							<div>
								<p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--ui-subtle)]">Race</p>
								<ScoreBar a={comparison.race.a} b={comparison.race.b} aLabel={driverA.driver.code ?? labelA} bLabel={driverB.driver.code ?? labelB} />
							</div>
							<div>
								<p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--ui-subtle)]">Qualifying</p>
								<ScoreBar a={comparison.qualifying.a} b={comparison.qualifying.b} aLabel={driverA.driver.code ?? labelA} bLabel={driverB.driver.code ?? labelB} />
							</div>
						</div>
					</Panel>

					<Panel title="Season summary" eyebrow="Points and finishes">
						<div className="mt-2 grid gap-3 sm:grid-cols-2">
							{([driverA, driverB] as const).map((row, i) => {
								const s = i === 0 ? comparison.a : comparison.b;
								return (
									<div key={row.driver.driverId} className="rounded-md border border-[var(--ui-border)] p-3">
										<p className="font-semibold text-sm text-[var(--ui-text)]">{i === 0 ? labelA : labelB}</p>
										<p className="text-xs text-[var(--ui-muted)] mb-2">{row.constructor ?? ""}</p>
										<div className="grid grid-cols-3 gap-2 text-center">
											<div><p className="new-ui-number text-lg font-bold">{s.wins}</p><p className="text-xs text-[var(--ui-muted)]">Wins</p></div>
											<div><p className="new-ui-number text-lg font-bold">{s.podiums}</p><p className="text-xs text-[var(--ui-muted)]">Podiums</p></div>
											<div><p className="new-ui-number text-lg font-bold">{s.points}</p><p className="text-xs text-[var(--ui-muted)]">Points</p></div>
										</div>
									</div>
								);
							})}
						</div>
					</Panel>
				</>
			) : (
				<ViewState state="unavailable" title="Comparison unavailable" description="No common race results found for the selected season." />
			)}
		</div>
	);
}

export function DetailedH2HView({
	driverA,
	driverB,
	comparison,
	season,
}: {
	driverA: DriverStandingRow | null;
	driverB: DriverStandingRow | null;
	comparison: SeasonH2H | null;
	season: number;
	standings?: DriverStandingRow[];
}) {
	if (!driverA || !driverB) {
		return (
			<div className="new-ui-route-scroll flex h-full min-h-0 flex-col gap-4 overflow-y-auto p-4">
				<RouteHeader eyebrow={`${season} season`} title="Driver head-to-head" description="Official race and qualifying results." />
				<ViewState state="unavailable" title="Driver data unavailable" description="No official data for the selected season." />
			</div>
		);
	}

	const labelA = driverLabel(driverA);
	const labelB = driverLabel(driverB);

	return (
		<div className="new-ui-route-scroll flex h-full min-h-0 flex-col gap-4 overflow-y-auto p-4">
			<RouteHeader
				eyebrow={`${season} season comparison`}
				title="Driver head-to-head"
				description={`${labelA} vs. ${labelB} · complete race and qualifying breakdown.`}
			/>
			{comparison ? (
				<>
					<div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
						<Kpi label={`${driverA.driver.code ?? labelA} points`} value={comparison.a.points} unit="pts" context={`${comparison.a.starts} starts`} />
						<Kpi label={`${driverB.driver.code ?? labelB} points`} value={comparison.b.points} unit="pts" context={`${comparison.b.starts} starts`} />
						<Kpi label="Race score" value={`${comparison.race.a} - ${comparison.race.b}`} context={`${comparison.race.ties} ties`} />
						<Kpi label="Qualifying score" value={`${comparison.qualifying.a} - ${comparison.qualifying.b}`} context={`${comparison.qualifying.ties} ties`} />
					</div>

					<Panel title="Head-to-head score" eyebrow="Race and qualifying" level="primary">
						<div className="mt-3 grid gap-5 xl:grid-cols-2">
							<div>
								<p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--ui-subtle)]">Race result comparison</p>
								<ScoreBar a={comparison.race.a} b={comparison.race.b} aLabel={driverA.driver.code ?? labelA} bLabel={driverB.driver.code ?? labelB} />
							</div>
							<div>
								<p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--ui-subtle)]">Qualifying comparison</p>
								<ScoreBar a={comparison.qualifying.a} b={comparison.qualifying.b} aLabel={driverA.driver.code ?? labelA} bLabel={driverB.driver.code ?? labelB} />
							</div>
						</div>
					</Panel>

					<Panel title="Season classification" eyebrow="Official race results">
						<div className="mt-2 overflow-x-auto">
							<table className="w-full min-w-[42rem] text-left text-sm">
								<thead className="text-xs uppercase tracking-wide text-[var(--ui-subtle)]">
									<tr className="border-b border-[var(--ui-border)]">
										<th className="py-2 pr-3">Driver</th>
										<th className="py-2 pr-3">Team</th>
										<th className="py-2 pr-3 text-right">Points</th>
										<th className="py-2 pr-3 text-right">Wins</th>
										<th className="py-2 pr-3 text-right">Podiums</th>
										<th className="py-2 text-right">Range</th>
									</tr>
								</thead>
								<tbody>
									{[
										{ row: driverA, summary: comparison.a, label: labelA },
										{ row: driverB, summary: comparison.b, label: labelB },
									].map(({ row, summary, label }) => (
										<tr key={row.driver.driverId ?? label} className="border-b border-[var(--ui-border)] last:border-b-0">
											<td className="py-3 pr-3 font-semibold text-[var(--ui-text)]">
												<span className="font-mono text-xs text-[var(--ui-accent)]">{row.driver.code ?? "--"}</span> {label}
											</td>
											<td className="py-3 pr-3 text-[var(--ui-muted)]">{row.constructor ?? "-"}</td>
											<td className="new-ui-number py-3 pr-3 text-right font-bold">{summary.points}</td>
											<td className="new-ui-number py-3 pr-3 text-right font-bold">{summary.wins}</td>
											<td className="new-ui-number py-3 pr-3 text-right font-bold">{summary.podiums}</td>
											<td className="py-3 text-right text-[var(--ui-muted)]">
												{formatFinish(summary.best)} best / {formatFinish(summary.worst)} worst
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</Panel>
				</>
			) : (
				<ViewState state="unavailable" title="Comparison unavailable" />
			)}
		</div>
	);
}
