import { pitStopsByDriver, rankPitStops, type PitStop } from "@/lib/f1data";

// Presentational only (no hooks) so it renders in the legacy server page and the
// New-UI client views alike. Neutral dark styling fits both themes.
export default function PitStopsPanel({
	pitStops,
	labels,
}: {
	pitStops: PitStop[];
	labels: Record<string, string>;
}) {
	if (pitStops.length === 0) return null;

	const labelOf = (id: string | null) => (id ? (labels[id] ?? id) : "—");
	const fastest = rankPitStops(pitStops).slice(0, 8);
	const byDriver = pitStopsByDriver(pitStops).sort(
		(a, b) => (a.bestSeconds ?? Infinity) - (b.bestSeconds ?? Infinity),
	);

	const fmt = (seconds: number | null) => (seconds == null ? "—" : `${seconds.toFixed(3)}s`);

	return (
		<section className="rounded-lg border border-white/10 bg-white/[0.03] p-4" data-testid="pit-stops-panel">
			<p className="text-xs font-semibold tracking-widest text-cyan-300 uppercase">Pit stops</p>
			<div className="mt-3 grid gap-4 md:grid-cols-2">
				<div>
					<p className="mb-2 font-mono text-[0.65rem] text-zinc-500 uppercase">Fastest stops</p>
					<ol className="flex flex-col gap-1">
						{fastest.map((stop, index) => (
							<li
								key={`${stop.driverId}.${stop.lap}.${stop.stop}`}
								className="flex items-center justify-between rounded-md border border-white/5 px-3 py-1.5 text-sm"
							>
								<span className="flex items-center gap-2">
									<span className="font-mono text-zinc-500">{index + 1}</span>
									<strong className="font-mono">{labelOf(stop.driverId)}</strong>
									<span className="text-xs text-zinc-500">L{stop.lap ?? "—"}</span>
								</span>
								<span className="font-mono text-cyan-200">{fmt(stop.durationSeconds)}</span>
							</li>
						))}
					</ol>
				</div>
				<div>
					<p className="mb-2 font-mono text-[0.65rem] text-zinc-500 uppercase">By driver</p>
					<ol className="flex flex-col gap-1">
						{byDriver.map((row) => (
							<li
								key={row.driverId}
								className="flex items-center justify-between rounded-md border border-white/5 px-3 py-1.5 text-sm"
							>
								<span className="flex items-center gap-2">
									<strong className="font-mono">{labelOf(row.driverId)}</strong>
									<span className="text-xs text-zinc-500">
										{row.stops} stop{row.stops === 1 ? "" : "s"}
									</span>
								</span>
								<span className="flex items-center gap-3 font-mono text-xs">
									<span className="text-zinc-400">best {fmt(row.bestSeconds)}</span>
									<span className="text-zinc-500">total {row.totalSeconds.toFixed(1)}s</span>
								</span>
							</li>
						))}
					</ol>
				</div>
			</div>
		</section>
	);
}
