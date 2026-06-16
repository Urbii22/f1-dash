"use client";

import Link from "next/link";

import RouteHeader from "@/components/new-ui/routes/RouteHeader";
import Panel from "@/components/new-ui/primitives/Panel";
import Kpi from "@/components/new-ui/primitives/Kpi";
import ViewState from "@/components/new-ui/primitives/ViewState";
import ArchiveAnalysis from "@/components/archive/ArchiveAnalysis";
import type { ArchiveSession, ArchiveSessionDetail, ArchiveEvent, ArchiveLaps, ArchiveStints } from "@/types/archive.type";

function KindBadge({ kind }: { kind: string }) {
	return (
		<span className="inline-block rounded px-1.5 py-0.5 font-mono text-[0.65rem] uppercase tracking-wide bg-[var(--ui-surface-2)] text-[var(--ui-muted)]">
			{kind}
		</span>
	);
}

function SessionCard({ session }: { session: ArchiveSession }) {
	return (
		<Link
			href={`/archive/${session.id}`}
			className="flex flex-col gap-1 rounded-lg border border-[var(--ui-border)] p-3 transition-colors hover:border-[var(--ui-accent)] hover:bg-[var(--ui-surface-2)]"
		>
			<div className="flex items-start justify-between gap-2">
				<KindBadge kind={session.kind} />
				{!session.complete && (
					<span className="text-[0.65rem] text-[var(--ui-subtle)]">Partial</span>
				)}
			</div>
			<p className="mt-1 font-semibold text-sm text-[var(--ui-text)] leading-snug">{session.name}</p>
			<p className="text-xs text-[var(--ui-muted)]">{session.country ?? session.meeting}</p>
		</Link>
	);
}

function SessionCardDetailed({ session }: { session: ArchiveSession }) {
	return (
		<Link
			href={`/archive/${session.id}`}
			className="flex flex-col gap-1.5 rounded-lg border border-[var(--ui-border)] p-3 transition-colors hover:border-[var(--ui-accent)] hover:bg-[var(--ui-surface-2)]"
		>
			<div className="flex items-center justify-between gap-2">
				<KindBadge kind={session.kind} />
				<span className={`text-[0.65rem] font-mono ${session.complete ? "text-emerald-400" : "text-[var(--ui-subtle)]"}`}>
					{session.complete ? "Complete" : "Partial"}
				</span>
			</div>
			<p className="mt-1 font-semibold text-sm text-[var(--ui-text)]">{session.name}</p>
			<p className="text-xs text-[var(--ui-muted)]">{session.country ?? session.meeting}</p>
			{session.totalLaps != null && (
				<p className="font-mono text-xs text-[var(--ui-subtle)]">{session.totalLaps} laps</p>
			)}
			{session.startUtc && (
				<p className="font-mono text-[0.65rem] text-[var(--ui-subtle)]">
					{new Date(session.startUtc).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
				</p>
			)}
		</Link>
	);
}

export function SimpleArchiveListView({ sessions }: { sessions: ArchiveSession[] }) {
	return (
		<div className="flex h-full min-h-0 flex-col gap-4 overflow-y-auto p-4">
			<RouteHeader
				eyebrow="Session archive"
				title="Recorded history"
				description="Explore race pace, qualifying, strategy, events, and lap telemetry without a live connection."
			/>

			{sessions.length === 0 ? (
				<Panel title="No recordings yet" level="primary">
					<ViewState
						state="empty"
						title="No archived sessions"
						description="Enable recording, run a session, then ingest the recording to populate this library."
					/>
				</Panel>
			) : (
				<Panel title="Sessions" eyebrow={`${sessions.length} recorded`} level="primary">
					<div className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
						{sessions.map((session) => (
							<SessionCard key={session.id} session={session} />
						))}
					</div>
				</Panel>
			)}
		</div>
	);
}

export function DetailedArchiveListView({ sessions }: { sessions: ArchiveSession[] }) {
	const complete = sessions.filter((s) => s.complete).length;
	const partial = sessions.length - complete;

	return (
		<div className="flex h-full min-h-0 flex-col gap-4 overflow-y-auto p-4">
			<RouteHeader
				eyebrow="Session archive"
				title="Recorded history"
				description="Full session library with recording completeness and lap counts."
			/>

			{sessions.length > 0 && (
				<div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
					<Kpi label="Total sessions" value={sessions.length} />
					<Kpi label="Complete" value={complete} context="full recording" />
					<Kpi label="Partial" value={partial} context="incomplete data" />
					<Kpi label="Years" value={new Set(sessions.map((s) => s.year)).size} />
				</div>
			)}

			{sessions.length === 0 ? (
				<Panel title="No recordings yet" level="primary">
					<ViewState
						state="empty"
						title="No archived sessions"
						description="Enable RECORDING_ENABLED=true, run a session, then ingest it."
					/>
				</Panel>
			) : (
				<Panel title="All sessions" eyebrow={`${sessions.length} recorded`} level="primary">
					<div className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
						{sessions.map((session) => (
							<SessionCardDetailed key={session.id} session={session} />
						))}
					</div>
				</Panel>
			)}
		</div>
	);
}

export function SimpleArchiveSessionView({
	session,
}: {
	session: ArchiveSessionDetail;
	laps: ArchiveLaps;
	stints: ArchiveStints;
	events: ArchiveEvent[];
}) {
	const weather = session.weatherSummary;

	return (
		<div className="flex h-full min-h-0 flex-col gap-4 overflow-y-auto p-4">
			<RouteHeader
				eyebrow={`${session.kind} · ${session.country ?? session.meeting}`}
				title={session.name}
				description={`Recorded ${session.complete ? "complete" : "partial"} session. ${session.drivers.length} drivers.`}
				status={
					<Link href="/archive" className="text-xs text-[var(--ui-accent)]">
						← Archive
					</Link>
				}
			/>

			<div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
				{session.totalLaps != null && <Kpi label="Total laps" value={session.totalLaps} />}
				<Kpi label="Drivers" value={session.drivers.length} />
				{weather.airTemp != null && <Kpi label="Air temp" value={`${weather.airTemp}°`} unit="C" />}
				{weather.trackTemp != null && <Kpi label="Track temp" value={`${weather.trackTemp}°`} unit="C" />}
			</div>

			<Panel title="Drivers" eyebrow="Recorded" level="primary">
				<div className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
					{session.drivers.map((d) => (
						<div
							key={d.racingNumber}
							className="flex items-center gap-2 rounded-md border border-[var(--ui-border)] p-2"
						>
							{d.teamColour && (
								<span
									className="inline-block h-4 w-1 flex-shrink-0 rounded-full"
									style={{ background: `#${d.teamColour}` }}
									aria-hidden="true"
								/>
							)}
							<span className="font-mono text-sm font-semibold text-[var(--ui-text)]">{d.tla ?? d.racingNumber}</span>
							<span className="text-xs text-[var(--ui-muted)] truncate">{d.teamName ?? ""}</span>
						</div>
					))}
				</div>
			</Panel>

			<Panel title="Analysis" eyebrow="Full post-session data">
				<p className="mt-1 text-sm text-[var(--ui-muted)]">
					Switch to Detailed mode for full race pace, stint timeline, telemetry comparison, and events log.
				</p>
			</Panel>
		</div>
	);
}

export function DetailedArchiveSessionView({
	session,
	laps,
	stints,
	events,
}: {
	session: ArchiveSessionDetail;
	laps: ArchiveLaps;
	stints: ArchiveStints;
	events: ArchiveEvent[];
}) {
	return (
		<div className="flex h-full min-h-0 flex-col gap-4 overflow-y-auto p-4">
			<RouteHeader
				eyebrow={`${session.kind} · ${session.country ?? session.meeting}`}
				title={session.name}
				description={`${session.complete ? "Complete" : "Partial"} recording · ${session.drivers.length} drivers`}
				status={
					<Link href="/archive" className="text-xs text-[var(--ui-accent)]">
						← Archive
					</Link>
				}
			/>
			<ArchiveAnalysis session={session} laps={laps} stints={stints} events={events} />
		</div>
	);
}
