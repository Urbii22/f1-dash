"use client";

import { utc, now } from "moment";

import RouteHeader from "@/components/new-ui/routes/RouteHeader";
import Panel from "@/components/new-ui/primitives/Panel";
import ViewState from "@/components/new-ui/primitives/ViewState";
import Countdown from "@/components/schedule/Countdown";
import type { Round, Session } from "@/types/schedule.type";

function upcomingSessions(round: Round): Session[] {
	return round.sessions.filter((s) => utc(s.start) > utc());
}

function nextNonRace(round: Round): Session | undefined {
	return upcomingSessions(round).find((s) => s.kind.toLowerCase() !== "race");
}

function nextRace(round: Round): Session | undefined {
	return round.sessions.find((s) => s.kind.toLowerCase() === "race");
}

function SessionRow({ session }: { session: Session }) {
	const past = utc(session.end).isBefore(now());
	return (
		<div className={`flex items-center justify-between py-1.5 border-b border-[var(--ui-border)] last:border-0 ${past ? "opacity-40" : ""}`}>
			<span className="text-sm text-[var(--ui-text)]">{session.kind}</span>
			<span className="font-mono text-xs text-[var(--ui-muted)]">
				{utc(session.start).local().format("ddd HH:mm")} – {utc(session.end).local().format("HH:mm")}
			</span>
		</div>
	);
}

function RoundCard({ round, isNext }: { round: Round; isNext: boolean }) {
	return (
		<div className={`new-ui-panel ${isNext ? "ring-1 ring-[var(--ui-accent)]" : ""}`} data-level="secondary">
			<header className="new-ui-panel__header">
				<div className="new-ui-panel__heading">
					{isNext && <p className="new-ui-panel__eyebrow">Up next</p>}
					<h2 className="new-ui-panel__title">{round.countryName}</h2>
					<p className="text-xs text-[var(--ui-muted)] mt-0.5">{round.name}</p>
				</div>
				<span className="font-mono text-xs text-[var(--ui-subtle)]">
					{utc(round.start).format("MMM D")} – {utc(round.end).format("D")}
				</span>
			</header>
			<div className="new-ui-panel__body">
				{round.sessions.map((s, i) => <SessionRow key={i} session={s} />)}
			</div>
		</div>
	);
}

export function SimpleScheduleView({ next, schedule }: { next: Round | null; schedule: Round[] | null }) {
	const nextRound = schedule?.find((r) => !r.over) ?? null;

	return (
		<div className="flex h-full min-h-0 flex-col gap-4 overflow-y-auto p-4">
			<RouteHeader
				eyebrow="Season calendar"
				title="Schedule"
				description="Next session countdown and upcoming rounds. All times are local."
			/>

			{next ? (
				<Panel title={next.countryName} eyebrow="Next event" level="primary">
					<p className="text-xs text-[var(--ui-muted)] mb-4">{next.name}</p>
					<div className="grid gap-4 sm:grid-cols-2">
						<div className="flex flex-col gap-3">
							{nextNonRace(next) && <Countdown next={nextNonRace(next)!} type="other" />}
							{nextRace(next) && <Countdown next={nextRace(next)!} type="race" />}
						</div>
						<div>
							{next.sessions.map((s, i) => <SessionRow key={i} session={s} />)}
						</div>
					</div>
				</Panel>
			) : (
				<ViewState state="empty" title="No upcoming event" description="The current season schedule is unavailable." />
			)}

			{schedule && schedule.length > 0 && (
				<Panel title="Full calendar" eyebrow={`${schedule.length} rounds`}>
					<div className="mt-2 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
						{schedule.map((round, i) => (
							<div key={i} className={`rounded-md border border-[var(--ui-border)] p-3 ${round.over ? "opacity-50" : ""} ${nextRound?.name === round.name ? "border-[var(--ui-accent)]" : ""}`}>
								<p className="font-semibold text-sm text-[var(--ui-text)]">{round.countryName}</p>
								<p className="text-xs text-[var(--ui-muted)]">{round.name}</p>
								<p className="mt-1 font-mono text-xs text-[var(--ui-subtle)]">
									{utc(round.start).format("MMM D")} – {utc(round.end).format("D")}
								</p>
							</div>
						))}
					</div>
				</Panel>
			)}
		</div>
	);
}

export function DetailedScheduleView({ next, schedule }: { next: Round | null; schedule: Round[] | null }) {
	const nextRound = schedule?.find((r) => !r.over) ?? null;

	return (
		<div className="flex h-full min-h-0 flex-col gap-4 overflow-y-auto p-4">
			<RouteHeader
				eyebrow="Season calendar"
				title="Schedule"
				description="Complete session schedule for every round. All times are local."
			/>

			{next ? (
				<Panel title={next.countryName} eyebrow="Next event" level="primary">
					<p className="text-xs text-[var(--ui-muted)] mb-4">{next.name}</p>
					<div className="grid gap-4 sm:grid-cols-2">
						<div className="flex flex-col gap-3">
							{nextNonRace(next) && <Countdown next={nextNonRace(next)!} type="other" />}
							{nextRace(next) && <Countdown next={nextRace(next)!} type="race" />}
						</div>
						<div>
							{next.sessions.map((s, i) => <SessionRow key={i} session={s} />)}
						</div>
					</div>
				</Panel>
			) : (
				<ViewState state="empty" title="No upcoming event" />
			)}

			{schedule && schedule.length > 0 ? (
				<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
					{schedule.map((round, i) => (
						<RoundCard key={i} round={round} isNext={nextRound?.name === round.name} />
					))}
				</div>
			) : (
				<ViewState state="unavailable" title="Schedule unavailable" description="Season schedule data could not be loaded." />
			)}
		</div>
	);
}
