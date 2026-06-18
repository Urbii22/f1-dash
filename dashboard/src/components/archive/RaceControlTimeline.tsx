import { buildRaceControlTimeline, type RcSeverity } from "@/lib/raceControlTimeline";
import type { ArchiveEvent } from "@/types/archive.type";

const SEVERITY_DOT: Record<RcSeverity, string> = {
	info: "bg-emerald-400",
	warning: "bg-amber-400",
	critical: "bg-rose-500",
};

const SEVERITY_TEXT: Record<RcSeverity, string> = {
	info: "text-emerald-300",
	warning: "text-amber-300",
	critical: "text-rose-400",
};

// Lap-aligned, classified race-control chronology. Presentational (no hooks).
export default function RaceControlTimeline({ events }: { events: ArchiveEvent[] }) {
	const { items, summary } = buildRaceControlTimeline(events);

	if (items.length === 0) {
		return <p className="p-6 text-center text-sm text-zinc-500">No race-control messages recorded.</p>;
	}

	return (
		<div className="flex flex-col gap-3">
			<div className="flex flex-wrap gap-2" data-testid="rc-summary">
				{summary.map((entry) => (
					<span
						key={entry.category}
						className="rounded-md border border-white/10 px-2 py-1 font-mono text-xs text-zinc-300"
					>
						{entry.label} <strong className="text-cyan-200">{entry.count}</strong>
					</span>
				))}
			</div>

			<ol className="flex flex-col">
				{items.map((item, index) => (
					<li
						key={`${item.utc}.${item.kind}.${index}`}
						className="grid grid-cols-[3.5rem_4rem_1fr] items-start gap-3 border-t border-white/5 py-2 font-mono text-xs"
					>
						<span className="flex items-center gap-1.5 text-zinc-500">
							<span className={`inline-block h-2 w-2 shrink-0 rounded-full ${SEVERITY_DOT[item.severity]}`} />
							{item.lap != null ? `L${item.lap}` : "—"}
						</span>
						<time className="text-zinc-500">{item.time}</time>
						<span className="leading-snug">
							<span className={`mr-2 uppercase ${SEVERITY_TEXT[item.severity]}`}>{item.kind}</span>
							{item.driverNr && <span className="mr-1 text-zinc-400">#{item.driverNr}</span>}
							<span className="text-zinc-200">{item.message}</span>
						</span>
					</li>
				))}
			</ol>
		</div>
	);
}
