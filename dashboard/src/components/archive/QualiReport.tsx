import { formatLapTimeMs, type LapRecord } from "@/lib/lapHistory";
import type { AnalysisDrivers } from "@/lib/analysisSeries";
import { buildPotentialLapsFromLaps } from "@/lib/sessionInsights";

/**
 * Quali ranking ordered by real best lap, with the theoretical best and the gap
 * to the provisional pole. Thin wrapper over the shared potential-lap builder so
 * the live insights tab and the archive report stay in sync (here `deltaMs` is
 * the gap to pole, i.e. the builder's `gapMs`).
 */
export function buildQualiRanking(laps: Record<string, LapRecord[]>, drivers: AnalysisDrivers) {
	return buildPotentialLapsFromLaps(laps, drivers).map((r) => ({
		nr: r.nr,
		label: r.label,
		bestMs: r.bestMs,
		theoreticalMs: r.theoreticalMs,
		deltaMs: r.gapMs,
	}));
}
export default function QualiReport({
	laps,
	drivers,
}: {
	laps: Record<string, LapRecord[]>;
	drivers: AnalysisDrivers;
}) {
	const rows = buildQualiRanking(laps, drivers);
	return (
		<div className="overflow-x-auto">
			<table className="w-full text-left text-sm">
				<thead className="font-mono text-xs text-zinc-500">
					<tr>
						<th className="p-2">P</th>
						<th>Driver</th>
						<th>Best</th>
						<th>Theoretical</th>
						<th>Delta</th>
					</tr>
				</thead>
				<tbody>
					{rows.map((r, i) => (
						<tr key={r.nr} className="border-t border-cyan-300/10">
							<td className="p-2">{i + 1}</td>
							<td className="font-bold">{r.label}</td>
							<td className="font-mono">{formatLapTimeMs(r.bestMs)}</td>
							<td className="font-mono">{formatLapTimeMs(r.theoreticalMs)}</td>
							<td className="font-mono text-cyan-300">{i === 0 ? "-" : `+${(r.deltaMs / 1000).toFixed(3)}`}</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}
