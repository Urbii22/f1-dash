"use client";

import { Gauge } from "lucide-react";

import { rankSpeedTrap } from "@/lib/qualiView";
import { useDataStore } from "@/stores/useDataStore";
import { useSettingsStore } from "@/stores/useSettingsStore";

export default function SpeedTrap() {
	const timingStats = useDataStore((state) => state.state?.TimingStats?.Lines);
	const drivers = useDataStore((state) => state.state?.DriverList);
	const visible = useSettingsStore((state) => state.qualiShowSpeedTrap);
	const ranking = rankSpeedTrap(timingStats, drivers);

	if (!visible) return null;

	return (
		<details open className="telemetry-panel rounded-lg p-3">
			<summary className="flex cursor-pointer list-none items-center justify-between border-b border-cyan-300/10 pb-3">
				<div>
					<p className="panel-title">Straight-line audit</p>
					<h2 className="flex items-center gap-2 text-xl font-black">
						<Gauge size={20} /> Speed Trap
					</h2>
				</div>
				<span className="data-chip rounded-md px-2 py-1 font-mono text-xs text-cyan-200">KM/H</span>
			</summary>
			<div className="mt-3 space-y-1">
				{ranking.length === 0 && <p className="py-6 text-center text-sm text-zinc-500">No speed data yet.</p>}
				{ranking.map((entry, index) => (
					<div
						key={entry.racingNumber}
						className="data-chip grid grid-cols-[2rem_3rem_1fr_auto] items-center gap-2 rounded-md px-2 py-1.5"
					>
						<span className="font-mono text-xs text-zinc-500">{index + 1}</span>
						<span className="font-black" style={{ color: `#${entry.teamColour}` }}>
							{entry.tla}
						</span>
						<div className="h-1.5 rounded-full bg-cyan-950">
							<div
								className="h-full rounded-full bg-cyan-400"
								style={{ width: `${Math.min(100, (entry.speed / Math.max(ranking[0]?.speed ?? 1, 1)) * 100)}%` }}
							/>
						</div>
						<span className="font-mono font-black tabular-nums">
							{entry.speed.toFixed(1)} <small className="text-zinc-500">{entry.source}</small>
						</span>
					</div>
				))}
			</div>
		</details>
	);
}
