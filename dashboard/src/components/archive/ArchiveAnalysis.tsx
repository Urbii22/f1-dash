"use client";
import clsx from "clsx";
import { useMemo, useState } from "react";
import DriverToggles from "@/components/analysis/DriverToggles";
import InsightsPanel from "@/components/analysis/InsightsPanel";
import PositionChart from "@/components/analysis/PositionChart";
import RacePaceChart from "@/components/analysis/RacePaceChart";
import SpeedScatter from "@/components/analysis/SpeedScatter";
import StintTimeline from "@/components/analysis/StintTimeline";
import EventsLog from "@/components/archive/EventsLog";
import QualiReport from "@/components/archive/QualiReport";
import TelemetryCompare from "@/components/archive/TelemetryCompare";
import type { AnalysisDrivers } from "@/lib/analysisSeries";
import {
	buildBestSectorsFromLaps,
	buildPotentialLapsFromLaps,
	buildTopSpeedsFromLaps,
} from "@/lib/sessionInsights";
import type { ArchiveEvent, ArchiveLaps, ArchiveSessionDetail, ArchiveStints } from "@/types/archive.type";

export default function ArchiveAnalysis({
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
	const drivers: AnalysisDrivers = useMemo(
		() =>
			Object.fromEntries(
				session.drivers.map((d) => [
					d.racingNumber,
					{ Tla: d.tla ?? undefined, TeamColour: d.teamColour ?? undefined },
				]),
			),
		[session.drivers],
	);
	const potential = useMemo(() => buildPotentialLapsFromLaps(laps, drivers), [laps, drivers]);
	const topSpeeds = useMemo(() => buildTopSpeedsFromLaps(laps, drivers), [laps, drivers]);
	const sectors = useMemo(() => buildBestSectorsFromLaps(laps, drivers), [laps, drivers]);
	const numbers = Object.keys(laps);
	const [selected, setSelected] = useState(numbers.slice(0, 5));
	const [minStint, setMinStint] = useState(1);
	const kind = session.kind.toLowerCase();
	const tabs = kind.includes("qual")
		? ["quali", "pace", "insights", "speed", "events", "telemetry"]
		: kind.includes("practice")
			? ["pace", "stints", "insights", "speed", "events", "telemetry"]
			: ["pace", "positions", "stints", "insights", "speed", "events", "telemetry"];
	const [tab, setTab] = useState(tabs[0]);
	const filtered = useMemo(() => {
		if (minStint <= 1) return laps;
		return Object.fromEntries(
			Object.entries(laps).map(([nr, items]) => [
				nr,
				items.filter((lap) =>
					stints[nr]?.some(
						(stint) => stint.lapCount >= minStint && lap.lap >= stint.startLap && lap.lap <= stint.endLap,
					),
				),
			]),
		);
	}, [laps, stints, minStint]);
	const toggle = (nr: string) =>
		setSelected(selected.includes(nr) ? selected.filter((x) => x !== nr) : [...selected, nr]);
	return (
		<div className="telemetry-panel rounded-lg p-3">
			<div className="flex flex-wrap justify-between gap-3 border-b border-cyan-300/10 pb-3">
				<div>
					<p className="panel-title">Post-session intelligence</p>
					<h1 className="text-2xl font-black">
						{session.meeting} · {session.name}
					</h1>
				</div>
				<div className="flex flex-wrap gap-1">
					{tabs.map((id) => (
						<button
							key={id}
							onClick={() => setTab(id)}
							className={clsx(
								"rounded px-3 py-1.5 font-mono text-xs capitalize",
								tab === id ? "bg-cyan-300 text-black" : "data-chip text-zinc-300",
							)}
						>
							{id}
						</button>
					))}
				</div>
			</div>
			{["pace", "positions", "speed"].includes(tab) && (
				<div className="mt-3 flex flex-wrap items-center justify-between gap-2">
					<DriverToggles selected={selected} onToggle={toggle} drivers={drivers} />
					{kind.includes("practice") && tab === "pace" && (
						<label className="font-mono text-xs text-zinc-400">
							Min stint{" "}
							<select
								value={minStint}
								onChange={(e) => setMinStint(Number(e.target.value))}
								className="data-chip ml-2 rounded px-2 py-1"
							>
								{[1, 3, 5, 8, 10].map((n) => (
									<option key={n} value={n}>
										{n} laps
									</option>
								))}
							</select>
						</label>
					)}
				</div>
			)}
			<div className="mt-4">
				{tab === "pace" && <RacePaceChart selected={selected} laps={filtered} drivers={drivers} />}{" "}
				{tab === "positions" && <PositionChart selected={selected} laps={laps} drivers={drivers} />}{" "}
				{tab === "stints" && <StintTimeline stints={stints} laps={laps} drivers={drivers} />}{" "}
				{tab === "insights" && (
					<InsightsPanel
						potential={potential}
						topSpeeds={topSpeeds}
						sectors={sectors}
						stints={stints}
						drivers={drivers}
					/>
				)}{" "}
				{tab === "speed" && <SpeedScatter laps={laps} selected={selected} drivers={drivers} />}{" "}
				{tab === "quali" && <QualiReport laps={laps} drivers={drivers} />}{" "}
				{tab === "events" && <EventsLog events={events} />}{" "}
				{tab === "telemetry" && <TelemetryCompare sessionId={session.id} drivers={drivers} laps={laps} />}
			</div>
		</div>
	);
}
