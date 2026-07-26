"use client";
import { useMemo, useState } from "react";
import LineChart from "@/components/analysis/LineChart";
import DriverToggles from "@/components/analysis/DriverToggles";
import { driverIdentity, type AnalysisDrivers } from "@/lib/analysisSeries";
import { getBestLap, formatLapTimeMs } from "@/lib/lapHistory";
import type { ArchiveLaps } from "@/types/archive.type";
import type { TelemetrySample } from "@/types/archive.type";

type DriverTrace = { driver: string; lap: number; samples: TelemetrySample[] };

// Best timed lap per driver, computed from the lap history already in memory.
// Drivers without a valid (non-pitted, timed) lap have no telemetry to compare.
function bestLaps(laps: ArchiveLaps): Record<string, number> {
	const out: Record<string, number> = {};
	for (const [nr, records] of Object.entries(laps)) {
		const best = getBestLap(records);
		if (best) out[nr] = best.lap;
	}
	return out;
}

export default function TelemetryCompare({
	sessionId,
	drivers,
	laps,
}: {
	sessionId: number;
	drivers: AnalysisDrivers;
	laps: ArchiveLaps;
}) {
	const best = useMemo(() => bestLaps(laps), [laps]);
	// Default selection: up to three drivers with the fastest best laps.
	const ranked = useMemo(
		() =>
			Object.keys(best).sort((a, b) => {
				const ta = getBestLap(laps[a])?.lapTimeMs ?? Infinity;
				const tb = getBestLap(laps[b])?.lapTimeMs ?? Infinity;
				return ta - tb;
			}),
		[best, laps],
	);
	const [selected, setSelected] = useState<string[]>(() => ranked.slice(0, 3));
	// Per-driver lap override; falls back to the driver's best lap when unset.
	const [lapOverride, setLapOverride] = useState<Record<string, number>>({});
	const [traces, setTraces] = useState<DriverTrace[]>([]);
	const [loading, setLoading] = useState(false);

	const lapFor = (nr: string) => lapOverride[nr] ?? best[nr];

	const toggle = (nr: string) =>
		setSelected((prev) => (prev.includes(nr) ? prev.filter((x) => x !== nr) : [...prev, nr]));

	async function compare() {
		const targets = selected.filter((nr) => best[nr] !== undefined);
		if (targets.length === 0) return;
		setLoading(true);
		setTraces(await Promise.all(targets.map((nr) => load(sessionId, nr, lapFor(nr)))));
		setLoading(false);
	}

	// One series per driver, x axis = seconds elapsed since the start of the lap
	// (telemetry-graph style), so braking/acceleration points line up by time.
	const channelSeries = (channel: "speed" | "throttle" | "brake" | "gear") =>
		traces.map((trace) => {
			const identity = driverIdentity(trace.driver, drivers);
			return {
				id: `${trace.driver}-${channel}`,
				label: identity.label,
				color: identity.color,
				points: trace.samples
					.filter((s) => s[channel] !== null)
					.map((s) => ({ x: s.tMs / 1000, y: Number(s[channel]) })),
			};
		});

	const speed = channelSeries("speed");
	const throttle = channelSeries("throttle");
	const brake = channelSeries("brake");
	const gear = channelSeries("gear");

	const fastestMs = Math.min(...selected.map((nr) => getBestLap(laps[nr])?.lapTimeMs ?? Infinity));
	const secondsAxis = (x: number) => `${x.toFixed(1)}s`;

	if (ranked.length === 0) {
		return <p className="font-mono text-sm text-zinc-400">No timed laps with telemetry are available for this session.</p>;
	}

	return (
		<div className="space-y-3">
			<DriverToggles selected={selected} onToggle={toggle} drivers={drivers} />
			<div className="flex flex-wrap items-center gap-2">
				{selected
					.filter((nr) => best[nr] !== undefined)
					.map((nr) => {
						const lapList = (laps[nr] ?? [])
							.filter((l) => l.lapTimeMs !== null && !l.pitted)
							.map((l) => l.lap);
						return (
							<label key={nr} className="flex items-center gap-1 font-mono text-xs text-zinc-400">
								<span style={{ color: driverIdentity(nr, drivers).color }}>{driverIdentity(nr, drivers).label}</span>
								<select
									value={lapFor(nr)}
									onChange={(e) => setLapOverride((prev) => ({ ...prev, [nr]: Number(e.target.value) }))}
									className="data-chip rounded px-2 py-1"
									aria-label={`Lap for ${driverIdentity(nr, drivers).label}`}
								>
									{lapList.map((n) => (
										<option key={n} value={n}>
											Lap {n}
											{n === best[nr] ? " (best)" : ""}
										</option>
									))}
								</select>
							</label>
						);
					})}
				<button onClick={compare} className="rounded bg-cyan-300 px-3 py-1 font-bold text-black">
					{loading ? "Loading..." : "Compare best laps"}
				</button>
			</div>
			{traces.length > 0 && (
				<>
					<div className="flex flex-wrap gap-3 font-mono text-xs">
						{selected
							.filter((nr) => best[nr] !== undefined)
							.map((nr) => {
								const ms = getBestLap(laps[nr])?.lapTimeMs ?? null;
								const gap = ms !== null && Number.isFinite(fastestMs) ? ms - fastestMs : null;
								return (
									<span key={nr} style={{ color: driverIdentity(nr, drivers).color }}>
										{driverIdentity(nr, drivers).label} {formatLapTimeMs(ms)}
										{gap !== null && gap > 0 ? ` (+${(gap / 1000).toFixed(3)}s)` : gap === 0 ? " (fastest)" : ""}
									</span>
								);
							})}
					</div>
					<div>
						<p className="panel-title">Speed</p>
						<LineChart series={speed} xFormatter={secondsAxis} yFormatter={(y) => `${Math.round(y)} km/h`} />
					</div>
					<div>
						<p className="panel-title">Throttle</p>
						<LineChart series={throttle} xFormatter={secondsAxis} yFormatter={(y) => `${Math.round(y)}%`} />
					</div>
					<div>
						<p className="panel-title">Brake</p>
						<LineChart series={brake} xFormatter={secondsAxis} yFormatter={(y) => `${Math.round(y)}%`} />
					</div>
					<div>
						<p className="panel-title">Gear</p>
						<LineChart series={gear} xFormatter={secondsAxis} yFormatter={(y) => String(y)} integerY />
					</div>
				</>
			)}
			<p className="font-mono text-xs text-zinc-500">
				Traces are aligned by elapsed lap time from each lap start, not by GPS distance. Lap deltas use recorded lap
				times.
			</p>
		</div>
	);
}

async function load(sessionId: number, driver: string, lap: number): Promise<DriverTrace> {
	const response = await fetch(`/archive/api/telemetry?sessionId=${sessionId}&driver=${driver}&lap=${lap}`);
	const data = (await response.json()) as { samples: TelemetrySample[] };
	return { driver, lap, samples: data.samples };
}
