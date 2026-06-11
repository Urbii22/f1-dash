"use client";

import { useMemo } from "react";

import { formatLapTimeMs } from "@/lib/lapHistory";
import { useDataStore } from "@/stores/useDataStore";
import { useLapHistoryStore } from "@/stores/useLapHistoryStore";

export const COMPOUND_COLORS: Record<string, string> = {
	SOFT: "#ef4444",
	MEDIUM: "#fbbf24",
	HARD: "#e4e4e7",
	INTERMEDIATE: "#22c55e",
	WET: "#3b82f6",
};

export function compoundColor(compound: string | null | undefined): string {
	return COMPOUND_COLORS[compound?.toUpperCase() ?? ""] ?? "#71717a";
}

export default function StintTimeline() {
	const stints = useLapHistoryStore((state) => state.stints);
	const laps = useLapHistoryStore((state) => state.laps);
	const drivers = useDataStore((state) => state.state?.DriverList);
	const timing = useDataStore((state) => state.state?.TimingData?.Lines);

	const rows = useMemo(() => {
		const numbers = Object.keys(stints).filter((nr) => (laps[nr]?.length ?? 0) > 0);
		return numbers
			.map((nr) => ({
				nr,
				driver: drivers?.[nr],
				position: Number(timing?.[nr]?.Position) || 99,
				stints: stints[nr] ?? [],
			}))
			.sort((a, b) => a.position - b.position);
	}, [stints, laps, drivers, timing]);

	const maxLap = useMemo(
		() => Math.max(1, ...rows.flatMap((row) => row.stints.map((stint) => stint.endLap))),
		[rows],
	);

	if (rows.length === 0) {
		return (
			<p className="p-6 text-center text-sm text-zinc-500">
				Stint history builds up as drivers complete laps on track.
			</p>
		);
	}

	return (
		<div className="flex flex-col gap-1.5">
			{rows.map((row) => (
				<div key={row.nr} className="flex items-center gap-2">
					<div className="w-14 shrink-0 text-right">
						<span
							className="border-l-2 pr-1 pl-1.5 font-mono text-xs font-bold"
							style={{ borderColor: `#${row.driver?.TeamColour ?? "71717a"}` }}
						>
							{row.driver?.Tla ?? `#${row.nr}`}
						</span>
					</div>

					<div className="relative h-6 flex-1 overflow-hidden rounded-sm bg-black/40">
						{row.stints.map((stint) => {
							const left = ((stint.startLap - 1) / maxLap) * 100;
							const width = Math.max(0.5, ((stint.endLap - stint.startLap + 1) / maxLap) * 100);
							const color = compoundColor(stint.compound);
							const deg = stint.degMsPerLap !== null ? `${(stint.degMsPerLap / 1000).toFixed(2)}s/lap` : "n/a";

							return (
								<div
									key={`${row.nr}.${stint.stint}`}
									className="absolute top-0 flex h-full items-center justify-center overflow-hidden border-r border-black/60"
									style={{ left: `${left}%`, width: `${width}%`, backgroundColor: `${color}33` }}
									title={`${stint.compound ?? "Unknown"} · L${stint.startLap}–L${stint.endLap} · best ${formatLapTimeMs(stint.bestMs)} · deg ${deg}`}
								>
									<div className="absolute inset-x-0 top-0 h-0.5" style={{ backgroundColor: color }} />
									<span className="px-1 font-mono text-[0.6rem] whitespace-nowrap text-zinc-300">
										{(stint.compound ?? "?").slice(0, 1)} · {stint.endLap - stint.startLap + 1}
										{stint.degMsPerLap !== null && stint.endLap - stint.startLap >= 5 && (
											<span className={stint.degMsPerLap > 80 ? "text-rose-300" : "text-emerald-300"}>
												{" "}
												{stint.degMsPerLap >= 0 ? "+" : ""}
												{(stint.degMsPerLap / 1000).toFixed(2)}s
											</span>
										)}
									</span>
								</div>
							);
						})}
					</div>
				</div>
			))}

			<div className="mt-2 flex flex-wrap items-center gap-3 font-mono text-[0.65rem] text-zinc-500">
				{Object.entries(COMPOUND_COLORS).map(([compound, color]) => (
					<span key={compound} className="flex items-center gap-1">
						<span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
						{compound.toLowerCase()}
					</span>
				))}
				<span>· bar label: compound · laps · degradation per lap (est)</span>
			</div>
		</div>
	);
}
