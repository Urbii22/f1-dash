import { formatLapTimeMs, type LapRecord } from "@/lib/lapHistory";
import type { AnalysisDrivers } from "@/lib/analysisSeries";
export function buildQualiRanking(laps: Record<string, LapRecord[]>, drivers: AnalysisDrivers) {
	const rows = Object.entries(laps)
		.map(([nr, items]) => {
			const timed = items.filter((l) => l.lapTimeMs !== null);
			const bestMs = Math.min(...timed.map((l) => l.lapTimeMs as number));
			const theoreticalMs = [0, 1, 2]
				.map((i) => Math.min(...timed.map((l) => l.sectorsMs[i]).filter((v): v is number => v !== null)))
				.reduce((a, b) => a + b, 0);
			return { nr, label: drivers[nr]?.Tla ?? `#${nr}`, bestMs, theoreticalMs };
		})
		.filter((r) => Number.isFinite(r.bestMs))
		.sort((a, b) => a.bestMs - b.bestMs);
	const best = rows[0]?.bestMs ?? 0;
	return rows.map((r) => ({ ...r, deltaMs: r.bestMs - best }));
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
