"use client";

import Link from "next/link";

import RouteHeader from "@/components/new-ui/routes/RouteHeader";
import Panel from "@/components/new-ui/primitives/Panel";
import Kpi from "@/components/new-ui/primitives/Kpi";
import ViewState from "@/components/new-ui/primitives/ViewState";
import SeasonResultsList from "@/components/results/SeasonResultsList";
import RaceResultTable from "@/components/results/RaceResultTable";
import QualiResultTable from "@/components/results/QualiResultTable";
import GridList from "@/components/results/GridList";
import type { RaceResult, QualiResult, DriverRef } from "@/lib/f1data";
import type { RoundWithResult } from "@/lib/seasonResults";
import type { ArchiveSession } from "@/types/archive.type";

type RoundResultItem = RoundWithResult;

function driverName(driver: DriverRef): string {
	return [driver.givenName, driver.familyName].filter(Boolean).join(" ") || driver.code || "Unknown";
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
	return (
		<div className="new-ui-route-scroll flex h-full min-h-0 flex-col gap-4 overflow-y-auto p-4">
			<RouteHeader
				eyebrow="Official history"
				title={`${season} Grand Prix results`}
				description="Complete season round list with links to full classifications."
			/>
			<Panel title="All rounds" eyebrow={`${season} season`} level="primary">
				<SeasonResultsList items={items} season={season} />
			</Panel>
		</div>
	);
}

export function SimpleRoundResultView({
	race,
	season,
	recording,
}: {
	race: RaceResult;
	qualifying: QualiResult | null;
	season: number;
	recording: ArchiveSession | null;
}) {
	const podium = race.results.slice(0, 3);
	const fastest = race.results.find((r) => r.fastestLapRank === "1");

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
				<Kpi label="Circuit" value={race.circuitName ?? "—"} />
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
		</div>
	);
}

export function DetailedRoundResultView({
	race,
	qualifying,
	season,
	recording,
}: {
	race: RaceResult;
	qualifying: QualiResult | null;
	season: number;
	recording: ArchiveSession | null;
}) {
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
				<RaceResultTable rows={race.results} season={season} />
			</Panel>

			<Panel title="Starting grid" eyebrow="Grid order">
				<GridList rows={race.results} />
			</Panel>

			{qualifying?.results.length ? (
				<Panel title="Qualifying" eyebrow="Session times">
					<QualiResultTable rows={qualifying.results} />
				</Panel>
			) : (
				<Panel title="Qualifying">
					<ViewState state="unavailable" title="Qualifying result unavailable" />
				</Panel>
			)}
		</div>
	);
}
