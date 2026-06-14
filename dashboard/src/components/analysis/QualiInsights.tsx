"use client";

import { useMemo } from "react";

import LineChart, { type ChartSeries } from "@/components/analysis/LineChart";
import type { AnalysisDrivers, LapsByDriver } from "@/lib/analysisSeries";
import { formatLapTimeMs } from "@/lib/lapHistory";
import { buildBestLapEvolution, type PotentialLapRow } from "@/lib/sessionInsights";

/**
 * Qualifying view: provisional pole ranking (best vs theoretical) plus the
 * best-lap evolution per driver, which surfaces how the track ramps up.
 */
export default function QualiInsights({
	potential,
	laps,
	selected,
	drivers,
}: {
	potential: PotentialLapRow[];
	laps: LapsByDriver;
	selected: string[];
	drivers?: AnalysisDrivers;
}) {
	const evolution = useMemo<ChartSeries[]>(
		() => buildBestLapEvolution(laps, selected, drivers),
		[laps, selected, drivers],
	);

	return (
		<div className="flex flex-col gap-3">
			<div className="telemetry-panel rounded-lg p-3">
				<p className="panel-title border-b border-cyan-300/10 pb-2">Provisional pole · gap to fastest</p>
				<div className="mt-2 overflow-x-auto">
					<table className="w-full text-left text-sm">
						<thead className="font-mono text-[0.65rem] text-zinc-500">
							<tr>
								<th className="p-1">P</th>
								<th>Driver</th>
								<th className="text-right">Best</th>
								<th className="text-right">Theoretical</th>
								<th className="text-right">Gap</th>
							</tr>
						</thead>
						<tbody>
							{potential.map((r, i) => (
								<tr key={r.nr} className="border-t border-cyan-300/10">
									<td className="p-1 font-mono text-zinc-400">{i + 1}</td>
									<td className="font-bold">{r.label}</td>
									<td className="text-right font-mono">{formatLapTimeMs(r.bestMs)}</td>
									<td className="text-right font-mono text-cyan-300">{formatLapTimeMs(r.theoreticalMs)}</td>
									<td className="text-right font-mono text-amber-300">
										{i === 0 ? "—" : `+${(r.gapMs / 1000).toFixed(3)}`}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</div>

			<div className="telemetry-panel rounded-lg p-3">
				<p className="panel-title border-b border-cyan-300/10 pb-2">Best-lap evolution</p>
				<div className="mt-2">
					{evolution.length === 0 ? (
						<p className="p-6 text-center text-sm text-zinc-500">Best-lap evolution builds as drivers set times.</p>
					) : (
						<LineChart
							series={evolution}
							yInverted
							yFormatter={(value) => formatLapTimeMs(Math.round(value))}
							xFormatter={(value) => `L${value}`}
						/>
					)}
				</div>
			</div>
		</div>
	);
}
