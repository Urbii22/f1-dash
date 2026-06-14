"use client";

import { useMemo, useState } from "react";

import type { AnalysisDrivers } from "@/lib/analysisSeries";
import { formatLapTimeMs } from "@/lib/lapHistory";
import {
	buildLongStints,
	type BestSectorsGroup,
	type PotentialLapRow,
	type StintsByDriver,
	type TopSpeedRow,
} from "@/lib/sessionInsights";

function deltaText(ms: number | null): string {
	if (ms == null) return "—";
	if (ms === 0) return "—";
	return `+${(ms / 1000).toFixed(3)}`;
}

function Card({ title, hint, children }: { title: string; hint?: React.ReactNode; children: React.ReactNode }) {
	return (
		<div className="telemetry-panel rounded-lg p-3">
			<div className="flex items-baseline justify-between gap-2 border-b border-cyan-300/10 pb-2">
				<p className="panel-title">{title}</p>
				{hint && <span className="font-mono text-[0.6rem] text-zinc-500">{hint}</span>}
			</div>
			<div className="mt-2">{children}</div>
		</div>
	);
}

export function PotentialLapTable({ rows, limit = 10 }: { rows: PotentialLapRow[]; limit?: number }) {
	if (rows.length === 0) return <Empty />;
	return (
		<div className="overflow-x-auto">
			<table className="w-full text-left text-sm">
				<thead className="font-mono text-[0.65rem] text-zinc-500">
					<tr>
						<th className="p-1">P</th>
						<th>Driver</th>
						<th className="text-right">Best</th>
						<th className="text-right">Theoretical</th>
						<th className="text-right">Lost</th>
					</tr>
				</thead>
				<tbody>
					{rows.slice(0, limit).map((r, i) => (
						<tr key={r.nr} className="border-t border-cyan-300/10">
							<td className="p-1 font-mono text-zinc-400">{i + 1}</td>
							<td className="font-bold">{r.label}</td>
							<td className="text-right font-mono">{formatLapTimeMs(r.bestMs)}</td>
							<td className="text-right font-mono text-cyan-300">{formatLapTimeMs(r.theoreticalMs)}</td>
							<td className="text-right font-mono text-amber-300">{deltaText(r.deltaMs)}</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}

function TopSpeedTable({ rows }: { rows: TopSpeedRow[] }) {
	if (rows.length === 0) return <Empty />;
	return (
		<div className="flex flex-col gap-1">
			{rows.slice(0, 10).map((r) => (
				<div key={r.nr} className="flex items-center gap-2">
					<span className="w-10 font-bold">{r.label}</span>
					<div className="relative h-4 flex-1 overflow-hidden rounded bg-cyan-300/5">
						<div className="h-full rounded bg-cyan-400/40" style={{ width: `${(r.fraction * 100).toFixed(1)}%` }} />
					</div>
					<span className="w-16 text-right font-mono text-cyan-200">{r.kph} km/h</span>
				</div>
			))}
		</div>
	);
}

function BestSectorsTables({ groups }: { groups: BestSectorsGroup[] }) {
	if (groups.every((g) => g.rows.length === 0)) return <Empty />;
	return (
		<div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
			{groups.map((g) => (
				<div key={g.sector}>
					<p className="mb-1 font-mono text-[0.65rem] text-zinc-500">S{g.sector + 1}</p>
					<table className="w-full text-left text-xs">
						<tbody>
							{g.rows.slice(0, 5).map((r, i) => (
								<tr key={r.nr} className="border-t border-cyan-300/10">
									<td className="py-0.5 font-bold">{r.label}</td>
									<td className="py-0.5 text-right font-mono">{formatLapTimeMs(r.valueMs)}</td>
									<td className="w-12 py-0.5 text-right font-mono text-zinc-500">{i === 0 ? "—" : deltaText(r.deltaMs)}</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			))}
		</div>
	);
}

function LongStintsTable({ stints, drivers, minLaps }: { stints: StintsByDriver; drivers?: AnalysisDrivers; minLaps: number }) {
	const rows = useMemo(() => buildLongStints(stints, drivers, minLaps), [stints, drivers, minLaps]);
	if (rows.length === 0) return <Empty message="No stints over the threshold yet." />;
	return (
		<div className="overflow-x-auto">
			<table className="w-full text-left text-sm">
				<thead className="font-mono text-[0.65rem] text-zinc-500">
					<tr>
						<th className="p-1">Driver</th>
						<th>Tyre</th>
						<th className="text-right">Laps</th>
						<th className="text-right">Avg</th>
						<th className="text-right">Best</th>
						<th className="text-right">Deg/lap</th>
					</tr>
				</thead>
				<tbody>
					{rows.slice(0, 12).map((r, i) => (
						<tr key={`${r.nr}.${i}`} className="border-t border-cyan-300/10">
							<td className="p-1 font-bold">{r.label}</td>
							<td className="font-mono text-zinc-300">{r.compound ?? "—"}</td>
							<td className="text-right font-mono">{r.laps}</td>
							<td className="text-right font-mono">{formatLapTimeMs(r.avgMs)}</td>
							<td className="text-right font-mono text-cyan-300">{formatLapTimeMs(r.bestMs)}</td>
							<td
								className="text-right font-mono"
								style={{ color: (r.degMsPerLap ?? 0) > 0 ? "#fbbf24" : "#34d399" }}
							>
								{r.degMsPerLap == null ? "—" : `${r.degMsPerLap > 0 ? "+" : ""}${(r.degMsPerLap / 1000).toFixed(3)}`}
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}

function Empty({ message = "No data yet." }: { message?: string }) {
	return <p className="p-3 text-center text-xs text-zinc-500">{message}</p>;
}

export default function InsightsPanel({
	potential,
	topSpeeds,
	sectors,
	stints,
	drivers,
}: {
	potential: PotentialLapRow[];
	topSpeeds: TopSpeedRow[];
	sectors: BestSectorsGroup[];
	stints: StintsByDriver;
	drivers?: AnalysisDrivers;
}) {
	const [minLaps, setMinLaps] = useState(6);
	return (
		<div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
			<Card title="Potential Lap" hint="real vs theoretical best">
				<PotentialLapTable rows={potential} />
			</Card>
			<Card title="Top Speed" hint="speed trap">
				<TopSpeedTable rows={topSpeeds} />
			</Card>
			<Card title="Best Sectors">
				<BestSectorsTables groups={sectors} />
			</Card>
			<Card
				title="Long Stints"
				hint={
					<label className="flex items-center gap-1">
						min
						<select
							value={minLaps}
							onChange={(e) => setMinLaps(Number(e.target.value))}
							className="data-chip rounded px-1 py-0.5"
						>
							{[3, 5, 6, 8, 10].map((n) => (
								<option key={n} value={n}>
									{n}
								</option>
							))}
						</select>
						laps
					</label>
				}
			>
				<LongStintsTable stints={stints} drivers={drivers} minLaps={minLaps} />
			</Card>
		</div>
	);
}
