import Link from "next/link";

import HubCountdown from "@/components/hub/HubCountdown";
import { getArchiveSessions } from "@/lib/archive";
import {
	driverFullName,
	getConstructorStandings,
	getDriverStandings,
	getRoundResults,
	getSeason,
	podium,
	type StandingsResponse,
	type DriverStandingRow,
	type ConstructorStandingRow,
	type ResultRow,
} from "@/lib/f1data";
import { classifyRound, findArchiveSession, latestCompletedRound, type RoundWithResult } from "@/lib/seasonResults";
import { getSchedule } from "@/lib/schedule";
import { matchMeetingToRound, selectHubMeeting, type HubMeeting } from "@/lib/weekendHub";
import type { ArchiveSession } from "@/types/archive.type";
import type { Session } from "@/types/schedule.type";
import UiModeBoundary from "@/components/new-ui/UiModeBoundary";
import { SimpleHomeView, DetailedHomeView } from "@/components/new-ui/home/HomeViews";

export const dynamic = "force-dynamic";

export default async function Home() {
	const season = new Date().getFullYear();
	const now = new Date();
	const [seasonData, drivers, constructors, schedule, archive] = await Promise.all([
		getSeason(season),
		getDriverStandings(season),
		getConstructorStandings(season),
		getSchedule(),
		getArchiveSessions(season),
	]);
	const rounds = seasonData?.rounds ?? [];
	const roundResults = await getRoundResults(rounds, season);
	const latest = latestCompletedRound(roundResults);
	const hubMeeting = selectHubMeeting(schedule, now);
	const focusRound = matchMeetingToRound(hubMeeting.meeting, rounds) ?? latest?.round ?? null;
	const liveRound = hubMeeting.live ? focusRound?.round : null;
	const recorded = focusRound ? findArchiveSession(focusRound, archive) : null;
	const meetingRecordings = recorded
		? archive.filter((session) => session.year === recorded.year && session.meeting === recorded.meeting)
		: [];
	const nextSession = hubMeeting.meeting?.sessions
		.filter((session) => Date.parse(session.start) > now.getTime())
		.sort((a, b) => Date.parse(a.start) - Date.parse(b.start))[0];

	const homeProps = {
		season,
		hubMeeting,
		nextSession: nextSession ?? null,
		drivers,
		constructors,
		roundResults,
		latest: latest ?? null,
		meetingRecordings,
		liveRound: liveRound ?? null,
	};

	return (
		<UiModeBoundary
			legacy={<LegacyHome {...homeProps} now={now} />}
			simple={<SimpleHomeView {...homeProps} />}
			detailed={<DetailedHomeView {...homeProps} />}
		/>
	);
}

function HubLink({ href, label, primary = false }: { href: string; label: string; primary?: boolean }) {
	return (
		<Link
			href={href}
			className={
				primary
					? "rounded-md bg-cyan-300 px-4 py-2 font-bold text-black"
					: "data-chip rounded-md px-4 py-2 font-bold text-cyan-200"
			}
		>
			{label}
		</Link>
	);
}

function LeaderList({
	title,
	rows,
}: {
	title: string;
	rows: Array<{ key: string; name: string; points: number | null; href?: string }>;
}) {
	return (
		<div className="mt-3">
			<p className="mb-1 font-mono text-[0.65rem] text-zinc-500 uppercase">{title}</p>
			{rows.map((row, index) => (
				<div key={row.key} className="flex items-center justify-between border-t border-cyan-300/10 py-2">
					<span>
						<span className="mr-2 font-mono text-cyan-300">{index + 1}</span>
						{row.href ? (
							<Link href={row.href} className="hover:text-cyan-200">
								{row.name}
							</Link>
						) : (
							row.name
						)}
					</span>
					<span className="font-mono text-sm">{row.points ?? 0} pts</span>
				</div>
			))}
		</div>
	);
}

function LegacyHome({
	season,
	hubMeeting,
	nextSession,
	drivers,
	constructors,
	roundResults,
	latest,
	meetingRecordings,
	liveRound,
	now,
}: {
	season: number;
	hubMeeting: HubMeeting;
	nextSession: Session | null;
	drivers: StandingsResponse<DriverStandingRow> | null;
	constructors: StandingsResponse<ConstructorStandingRow> | null;
	roundResults: RoundWithResult[];
	latest: RoundWithResult | null;
	meetingRecordings: ArchiveSession[];
	liveRound: number | null;
	now: Date;
}) {
	return (
		<div className="flex flex-col gap-4 py-4">
			{hubMeeting.live && (
				<Link
					href="/dashboard"
					className="telemetry-panel flex items-center justify-between rounded-lg border-rose-400/40 p-4"
				>
					<div>
						<p className="font-mono text-xs font-black tracking-widest text-rose-300 uppercase">● Weekend live</p>
						<p className="font-bold">{hubMeeting.meeting?.name}</p>
					</div>
					<span className="text-sm font-bold text-rose-200">Open live dashboard →</span>
				</Link>
			)}

			<section className="telemetry-panel overflow-hidden rounded-xl p-6 sm:p-8">
				<div className="grid gap-8 lg:grid-cols-[1.25fr_1fr] lg:items-end">
					<div>
						<p className="panel-title">Always-on race companion</p>
						<h1 className="mt-2 text-4xl font-black tracking-tight sm:text-6xl">The season, live and between races.</h1>
						<p className="mt-4 max-w-2xl text-zinc-400">
							Official results, championship context, recorded telemetry and the next session in one place.
						</p>
						<div className="mt-6 flex flex-wrap gap-3">
							<HubLink href="/dashboard" label="Live dashboard" primary />
							<HubLink href="/results" label="Explore results" />
							<HubLink href="/h2h" label="Season H2H" />
						</div>
					</div>
					<div className="data-chip rounded-lg p-4">
						<p className="panel-title">{hubMeeting.live ? "Current Grand Prix" : "Next Grand Prix"}</p>
						<h2 className="mt-1 text-2xl font-black">{hubMeeting.meeting?.name ?? "Schedule unavailable"}</h2>
						<p className="mb-4 text-sm text-zinc-400">{hubMeeting.meeting?.countryName}</p>
						{nextSession ? (
							<>
								<p className="mb-2 text-sm">
									Next: <strong className="text-cyan-200">{nextSession.kind}</strong>
								</p>
								<HubCountdown target={nextSession.start} />
							</>
						) : (
							<p className="text-zinc-500">No upcoming session in this meeting.</p>
						)}
					</div>
				</div>
			</section>

			<div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
				<section className="telemetry-panel rounded-lg p-4">
					<div className="mb-3 flex items-center justify-between">
						<div>
							<p className="panel-title">Season map</p>
							<h2 className="text-2xl font-black">{season} Calendar</h2>
						</div>
						<Link href="/results" className="text-sm text-cyan-300">
							All results →
						</Link>
					</div>
					<div className="grid gap-2 sm:grid-cols-2">
						{roundResults.map(({ round, result }) => {
							const state = classifyRound(round, now, Boolean(result), liveRound);
							const href =
								state === "done" ? `/results/${round.round}?season=${season}` : state === "live" ? "/dashboard" : "#";
							return (
								<Link
									key={round.round}
									href={href}
									aria-disabled={state === "upcoming"}
									className="data-chip flex items-center justify-between rounded-md p-3"
								>
									<div className="min-w-0">
										<p className="font-mono text-[0.65rem] text-cyan-300">
											R{round.round} · {round.date}
										</p>
										<p className="truncate font-bold">{round.raceName}</p>
									</div>
									<span
										className={state === "live" ? "font-mono text-xs text-rose-300" : "font-mono text-xs text-zinc-500"}
									>
										{state}
									</span>
								</Link>
							);
						})}
					</div>
				</section>

				<div className="flex flex-col gap-4">
					<section className="telemetry-panel rounded-lg p-4">
						<div className="mb-3 flex items-center justify-between">
							<div>
								<p className="panel-title">Championship</p>
								<h2 className="text-xl font-black">Leaders</h2>
							</div>
							<Link href="/dashboard/standings" className="text-sm text-cyan-300">
								Full tables →
							</Link>
						</div>
						<LeaderList
							title="Drivers"
							rows={(drivers?.standings ?? []).slice(0, 3).map((row: DriverStandingRow) => ({
								key: row.driver.driverId ?? String(row.position),
								name: driverFullName(row.driver),
								points: row.points,
								href: row.driver.driverId ? `/driver/${row.driver.driverId}` : undefined,
							}))}
						/>
						<LeaderList
							title="Constructors"
							rows={(constructors?.standings ?? []).slice(0, 3).map((row: ConstructorStandingRow) => ({
								key: row.constructorId ?? String(row.position),
								name: row.name ?? "-",
								points: row.points,
							}))}
						/>
					</section>
					<section className="telemetry-panel rounded-lg p-4">
						<p className="panel-title">Latest result</p>
						<h2 className="text-xl font-black">{latest?.round.raceName ?? "No completed race"}</h2>
						{latest?.result && (
							<ol className="mt-3 flex flex-col gap-2">
								{podium(latest.result.results).map((row: ResultRow) => (
									<li
										key={row.driver.driverId ?? row.position}
										className="data-chip flex items-center justify-between rounded-md p-2"
									>
										<span>
											<span className="mr-2 font-mono text-cyan-300">P{row.position}</span>
											{driverFullName(row.driver)}
										</span>
										<span className="text-xs text-zinc-500">{row.constructor}</span>
									</li>
								))}
							</ol>
						)}
						{latest?.round.round && (
							<Link
								href={`/results/${latest.round.round}?season=${season}`}
								className="mt-3 inline-block text-sm text-cyan-300"
							>
								Race detail →
							</Link>
						)}
					</section>
				</div>
			</div>

			<section className="telemetry-panel rounded-lg p-4">
				<div className="mb-3 flex items-center justify-between">
					<div>
						<p className="panel-title">Recorded weekend</p>
						<h2 className="text-2xl font-black">Deep analysis</h2>
					</div>
					<Link href="/archive" className="text-sm text-cyan-300">
						Archive →
					</Link>
				</div>
				{meetingRecordings.length ? (
					<div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
						{meetingRecordings.map((session) => (
							<Link key={session.id} href={`/archive/${session.id}`} className="data-chip rounded-md p-3">
								<p className="font-mono text-xs text-cyan-300">{session.kind}</p>
								<p className="font-bold">{session.name}</p>
								<p className="text-xs text-zinc-500">{session.complete ? "Complete recording" : "Partial recording"}</p>
							</Link>
						))}
					</div>
				) : (
					<p className="data-chip rounded-md p-4 text-zinc-500">
						This meeting was not recorded. Official results remain available above.
					</p>
				)}
			</section>
		</div>
	);
}
