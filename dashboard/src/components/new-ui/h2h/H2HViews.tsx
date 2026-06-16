"use client";

import RouteHeader from "@/components/new-ui/routes/RouteHeader";
import Panel from "@/components/new-ui/primitives/Panel";
import Kpi from "@/components/new-ui/primitives/Kpi";
import ViewState from "@/components/new-ui/primitives/ViewState";
import SeasonH2HView from "@/components/h2h/SeasonH2HView";
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
			<div className="flex h-full min-h-0 flex-col gap-4 overflow-y-auto p-4">
				<RouteHeader eyebrow={`${season} season`} title="Driver head-to-head" description="Official race and qualifying results." />
				<ViewState state="unavailable" title="Driver data unavailable" description="No official data for the selected season." />
			</div>
		);
	}

	const labelA = driverLabel(driverA);
	const labelB = driverLabel(driverB);

	return (
		<div className="flex h-full min-h-0 flex-col gap-4 overflow-y-auto p-4">
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
			<div className="flex h-full min-h-0 flex-col gap-4 overflow-y-auto p-4">
				<RouteHeader eyebrow={`${season} season`} title="Driver head-to-head" description="Official race and qualifying results." />
				<ViewState state="unavailable" title="Driver data unavailable" description="No official data for the selected season." />
			</div>
		);
	}

	const labelA = driverLabel(driverA);
	const labelB = driverLabel(driverB);

	return (
		<div className="flex h-full min-h-0 flex-col gap-4 overflow-y-auto p-4">
			<RouteHeader
				eyebrow={`${season} season comparison`}
				title="Driver head-to-head"
				description={`${labelA} vs. ${labelB} · complete race and qualifying breakdown.`}
			/>
			{comparison ? (
				<SeasonH2HView driverA={driverA} driverB={driverB} comparison={comparison} season={season} />
			) : (
				<ViewState state="unavailable" title="Comparison unavailable" />
			)}
		</div>
	);
}
