"use client";

import Link from "next/link";

import RouteHeader from "@/components/new-ui/routes/RouteHeader";
import Panel from "@/components/new-ui/primitives/Panel";
import ViewState from "@/components/new-ui/primitives/ViewState";
import HubCountdown from "@/components/hub/HubCountdown";
import type { DriverStandingRow, ConstructorStandingRow, RaceResult } from "@/lib/f1data";
import type { ArchiveSession } from "@/types/archive.type";
import type { Round } from "@/types/schedule.type";

type RoundResultItem = {
	round: {
		round: number | null;
		raceName: string | null;
		date: string | null;
	};
	result: RaceResult | null;
};

type HomeViewProps = {
	season: number;
	hubMeeting: { meeting: Round | null; live: boolean };
	nextSession: { kind: string; start: string } | null;
	drivers: { standings: DriverStandingRow[] } | null;
	constructors: { standings: ConstructorStandingRow[] } | null;
	roundResults: RoundResultItem[];
	latest: { round: RoundResultItem["round"]; result: RaceResult | null } | null;
	meetingRecordings: ArchiveSession[];
	liveRound: number | null;
};

function driverName(d: DriverStandingRow["driver"]): string {
	return [d.givenName, d.familyName].filter(Boolean).join(" ") || d.code || "Unknown";
}

export function SimpleHomeView({
	season,
	hubMeeting,
	nextSession,
	drivers,
	constructors,
	latest,
}: HomeViewProps) {
	const topDrivers = (drivers?.standings ?? []).slice(0, 3);
	const topConstructors = (constructors?.standings ?? []).slice(0, 3);

	return (
		<div className="flex h-full min-h-0 flex-col gap-4 overflow-y-auto p-4">
			<RouteHeader
				eyebrow="Always-on race companion"
				title="The season, live and between races."
				description="Next session, championship standings, and latest result in one place."
				actions={
					<div className="flex gap-2">
						<Link href="/dashboard" className="rounded-md bg-[var(--ui-accent)] px-3 py-1.5 text-sm font-semibold text-black">Live dashboard</Link>
						<Link href="/results" className="rounded-md border border-[var(--ui-border)] px-3 py-1.5 text-sm font-medium text-[var(--ui-text)]">Results</Link>
					</div>
				}
			/>

			{hubMeeting.live && (
				<Link
					href="/dashboard"
					className="flex items-center justify-between rounded-lg border border-rose-400/40 bg-rose-400/10 p-4"
				>
					<div>
						<p className="font-mono text-xs font-black tracking-widest text-rose-300 uppercase">● Weekend live</p>
						<p className="font-medium text-[var(--ui-text)]">{hubMeeting.meeting?.name}</p>
					</div>
					<span className="text-sm font-bold text-rose-200">Open live dashboard →</span>
				</Link>
			)}

			<div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
				<Panel title={hubMeeting.live ? "Current event" : "Next event"} eyebrow={hubMeeting.meeting?.countryName ?? "Schedule"} level="primary">
					<p className="mt-1 text-lg font-semibold text-[var(--ui-text)]">{hubMeeting.meeting?.name ?? "No upcoming event"}</p>
					{nextSession ? (
						<div className="mt-3">
							<p className="text-sm text-[var(--ui-muted)] mb-2">Next: <strong className="text-[var(--ui-text)]">{nextSession.kind}</strong></p>
							<HubCountdown target={nextSession.start} />
						</div>
					) : (
						<p className="mt-2 text-sm text-[var(--ui-muted)]">No upcoming session in this meeting.</p>
					)}
				</Panel>

				{latest?.result && (
					<Panel title={latest.result.raceName ?? "Latest result"} eyebrow="Most recent">
						<ol className="mt-2 flex flex-col gap-1.5">
							{latest.result.results.slice(0, 3).map((row) => (
								<li key={row.driver.driverId ?? row.position} className="flex items-center gap-2 rounded-md border border-[var(--ui-border)] p-2">
									<span className="new-ui-number font-bold text-sm w-5 text-center">{row.position}</span>
									<span className="flex-1 text-sm">{driverName(row.driver)}</span>
									<span className="text-xs text-[var(--ui-muted)]">{row.constructor ?? ""}</span>
								</li>
							))}
						</ol>
						{latest.round.round && (
							<Link href={`/results/${latest.round.round}?season=${season}`} className="mt-2 inline-block text-xs text-[var(--ui-accent)]">Full result →</Link>
						)}
					</Panel>
				)}
			</div>

			<div className="grid gap-4 xl:grid-cols-2">
				<Panel title="Drivers" eyebrow="Championship leaders">
					{topDrivers.length > 0 ? (
						<ol className="mt-2 flex flex-col gap-1">
							{topDrivers.map((row, i) => (
								<li key={row.driver.driverId ?? i} className="flex items-center justify-between border-b border-[var(--ui-border)] py-2 last:border-0">
									<span>
										<span className="mr-2 font-mono text-xs text-[var(--ui-accent)]">{i + 1}</span>
										{row.driver.driverId ? (
											<Link href={`/driver/${row.driver.driverId}?season=${season}`} className="font-medium hover:text-[var(--ui-accent)]">{driverName(row.driver)}</Link>
										) : (
											<span className="font-medium">{driverName(row.driver)}</span>
										)}
									</span>
									<span className="font-mono text-sm">{row.points ?? 0} pts</span>
								</li>
							))}
						</ol>
					) : (
						<ViewState state="unavailable" title="Standings unavailable" />
					)}
				</Panel>
				<Panel title="Constructors" eyebrow="Championship leaders">
					{topConstructors.length > 0 ? (
						<ol className="mt-2 flex flex-col gap-1">
							{topConstructors.map((row, i) => (
								<li key={row.constructorId ?? i} className="flex items-center justify-between border-b border-[var(--ui-border)] py-2 last:border-0">
									<span>
										<span className="mr-2 font-mono text-xs text-[var(--ui-accent)]">{i + 1}</span>
										<span className="font-medium">{row.name ?? "Unknown"}</span>
									</span>
									<span className="font-mono text-sm">{row.points ?? 0} pts</span>
								</li>
							))}
						</ol>
					) : (
						<ViewState state="unavailable" title="Standings unavailable" />
					)}
				</Panel>
			</div>
		</div>
	);
}

export function DetailedHomeView({
	season,
	hubMeeting,
	nextSession,
	drivers,
	constructors,
	roundResults,
	latest,
	meetingRecordings,
	liveRound,
}: HomeViewProps) {
	return (
		<div className="flex h-full min-h-0 flex-col gap-4 overflow-y-auto p-4">
			<RouteHeader
				eyebrow="Always-on race companion"
				title="The season, live and between races."
				description="Full season calendar, championship context, latest result, and archive recordings."
				actions={
					<div className="flex gap-2">
						<Link href="/dashboard" className="rounded-md bg-[var(--ui-accent)] px-3 py-1.5 text-sm font-semibold text-black">Live dashboard</Link>
						<Link href="/results" className="rounded-md border border-[var(--ui-border)] px-3 py-1.5 text-sm font-medium text-[var(--ui-text)]">Results</Link>
						<Link href="/h2h" className="rounded-md border border-[var(--ui-border)] px-3 py-1.5 text-sm font-medium text-[var(--ui-text)]">H2H</Link>
					</div>
				}
			/>

			{hubMeeting.live && (
				<Link href="/dashboard" className="flex items-center justify-between rounded-lg border border-rose-400/40 bg-rose-400/10 p-4">
					<div>
						<p className="font-mono text-xs font-black tracking-widest text-rose-300 uppercase">● Weekend live</p>
						<p className="font-medium text-[var(--ui-text)]">{hubMeeting.meeting?.name}</p>
					</div>
					<span className="text-sm font-bold text-rose-200">Open live dashboard →</span>
				</Link>
			)}

			<div className="grid gap-4 xl:grid-cols-[1.25fr_1fr]">
				<Panel title={hubMeeting.meeting?.name ?? "No upcoming event"} eyebrow={hubMeeting.live ? "Live now" : "Next event"} level="primary">
					<p className="text-sm text-[var(--ui-muted)]">{hubMeeting.meeting?.countryName}</p>
					{nextSession ? (
						<div className="mt-3">
							<p className="text-sm text-[var(--ui-muted)] mb-2">Next: <strong className="text-[var(--ui-text)]">{nextSession.kind}</strong></p>
							<HubCountdown target={nextSession.start} />
						</div>
					) : (
						<p className="mt-2 text-sm text-[var(--ui-muted)]">No upcoming session.</p>
					)}
				</Panel>

				<div className="flex flex-col gap-4">
					{latest?.result && (
						<Panel title={latest.result.raceName ?? "Latest"} eyebrow="Most recent result">
							<ol className="mt-2 flex flex-col gap-1">
								{latest.result.results.slice(0, 3).map((row) => (
									<li key={row.driver.driverId ?? row.position} className="flex items-center gap-2 rounded-md border border-[var(--ui-border)] p-2">
										<span className="new-ui-number font-bold text-sm w-5">{row.position}</span>
										<span className="flex-1 text-sm">{driverName(row.driver)}</span>
									</li>
								))}
							</ol>
							{latest.round.round && (
								<Link href={`/results/${latest.round.round}?season=${season}`} className="mt-2 inline-block text-xs text-[var(--ui-accent)]">Full result →</Link>
							)}
						</Panel>
					)}

					<div className="grid grid-cols-2 gap-3">
						<Panel title="Drivers" eyebrow="Top 3">
							{(drivers?.standings ?? []).slice(0, 3).map((row, i) => (
								<div key={row.driver.driverId ?? i} className="flex items-center justify-between py-1 border-b border-[var(--ui-border)] last:border-0">
									<span className="text-xs"><span className="font-mono text-[var(--ui-accent)] mr-1">{i + 1}</span>{row.driver.code ?? driverName(row.driver)}</span>
									<span className="font-mono text-xs">{row.points ?? 0}</span>
								</div>
							))}
						</Panel>
						<Panel title="Constructors" eyebrow="Top 3">
							{(constructors?.standings ?? []).slice(0, 3).map((row, i) => (
								<div key={row.constructorId ?? i} className="flex items-center justify-between py-1 border-b border-[var(--ui-border)] last:border-0">
									<span className="text-xs"><span className="font-mono text-[var(--ui-accent)] mr-1">{i + 1}</span>{row.name ?? "?"}</span>
									<span className="font-mono text-xs">{row.points ?? 0}</span>
								</div>
							))}
						</Panel>
					</div>
				</div>
			</div>

			<Panel title={`${season} calendar`} eyebrow="Season map" action={<Link href="/results" className="text-xs text-[var(--ui-accent)]">All results →</Link>}>
				<div className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
					{roundResults.map(({ round, result }) => {
						const isDone = !!result;
						const isLive = round.round === liveRound;
						const href = isDone ? `/results/${round.round}?season=${season}` : isLive ? "/dashboard" : "#";
						return (
							<Link
								key={round.round}
								href={href}
								aria-disabled={!isDone && !isLive}
								className={`flex items-center justify-between rounded-md border border-[var(--ui-border)] p-2.5 transition-colors ${isDone || isLive ? "hover:border-[var(--ui-accent)]" : "opacity-50 cursor-default"}`}
							>
								<div>
									<p className="font-mono text-[0.65rem] text-[var(--ui-muted)]">R{round.round} · {round.date}</p>
									<p className="text-sm font-medium text-[var(--ui-text)] truncate">{round.raceName}</p>
								</div>
								<span className={`font-mono text-xs ${isLive ? "text-rose-300" : isDone ? "text-[var(--ui-accent)]" : "text-[var(--ui-subtle)]"}`}>
									{isLive ? "live" : isDone ? "done" : "soon"}
								</span>
							</Link>
						);
					})}
				</div>
			</Panel>

			{meetingRecordings.length > 0 && (
				<Panel title="Deep analysis" eyebrow="Recorded weekend" action={<Link href="/archive" className="text-xs text-[var(--ui-accent)]">Archive →</Link>}>
					<div className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
						{meetingRecordings.map((session) => (
							<Link key={session.id} href={`/archive/${session.id}`} className="rounded-md border border-[var(--ui-border)] p-3 transition-colors hover:border-[var(--ui-accent)]">
								<p className="font-mono text-xs text-[var(--ui-muted)]">{session.kind}</p>
								<p className="font-medium text-sm">{session.name}</p>
								<p className="text-xs text-[var(--ui-subtle)]">{session.complete ? "Complete" : "Partial"}</p>
							</Link>
						))}
					</div>
				</Panel>
			)}
		</div>
	);
}
