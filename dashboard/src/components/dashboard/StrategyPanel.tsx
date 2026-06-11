"use client";

import Link from "next/link";

import { formatLapTimeMs } from "@/lib/lapHistory";
import { estimatePitWindow } from "@/lib/strategy";
import { useStrategy } from "@/hooks/useStrategy";
import { useDataStore } from "@/stores/useDataStore";
import { useDriverSelectionStore } from "@/stores/useDriverSelectionStore";

import { DegLabel } from "@/components/analysis/StrategyView";
import { compoundColor } from "@/components/analysis/StintTimeline";

export default function StrategyPanel() {
	const strategy = useStrategy();
	const drivers = useDataStore((state) => state.state?.DriverList);
	const timing = useDataStore((state) => state.state?.TimingData?.Lines);
	const toggleComparedDriver = useDriverSelectionStore((state) => state.toggleComparedDriver);

	if (!strategy.isRace) return null;

	const rows = Object.values(strategy.models)
		.map((model) => ({
			model,
			driver: drivers?.[model.racingNumber],
			position: Number(timing?.[model.racingNumber]?.Position) || 99,
			window: estimatePitWindow(model, strategy.pitLossMs, strategy.currentLap, strategy.totalLaps),
		}))
		.sort((a, b) => a.position - b.position);

	return (
		<div className="telemetry-panel tech-scrollbar h-[30rem] overflow-y-auto rounded-lg p-3">
			<div className="flex items-center justify-between gap-2">
				<div>
					<p className="panel-title">Pit intelligence</p>
					<h2 className="text-xl font-black text-white">Strategy</h2>
				</div>
				<span className="data-chip rounded-md px-2 py-1 font-mono text-xs text-amber-300/80" title="Heuristic estimates derived from live timing, not FIA data">
					EST
				</span>
			</div>

			{!strategy.ready && (
				<p className="mt-3 text-sm text-zinc-400">
					Strategy estimates appear after a few laps of racing.
				</p>
			)}

			{strategy.ready && (
				<>
					<p className="mt-2 font-mono text-xs text-zinc-500">
						Pit loss ~{(strategy.pitLossMs / 1000).toFixed(1)}s · tap a driver to compare ·{" "}
						<Link className="text-cyan-300 hover:underline" href="/dashboard/analysis">
							full analysis
						</Link>
					</p>

					<table className="mt-2 w-full text-left font-mono text-xs">
						<thead>
							<tr className="border-b border-cyan-300/10 text-zinc-500 uppercase">
								<th className="py-1 pr-2">Pos</th>
								<th className="py-1 pr-2">Drv</th>
								<th className="py-1 pr-2">Tyre</th>
								<th className="py-1 pr-2">Deg</th>
								<th className="py-1 pr-2">Window</th>
							</tr>
						</thead>
						<tbody>
							{rows.map(({ model, driver, position, window }) => (
								<tr
									key={model.racingNumber}
									className="cursor-pointer border-b border-white/5 hover:bg-cyan-300/5"
									title={`Baseline ${formatLapTimeMs(Math.round(model.baselineMs))} · click to compare`}
									onClick={() => toggleComparedDriver(model.racingNumber)}
								>
									<td className="py-1 pr-2 text-zinc-400">{position === 99 ? "--" : position}</td>
									<td className="py-1 pr-2">
										<span
											className="border-l-2 pl-1 font-bold"
											style={{ borderColor: `#${driver?.TeamColour ?? "71717a"}` }}
										>
											{driver?.Tla ?? `#${model.racingNumber}`}
										</span>
									</td>
									<td className="py-1 pr-2">
										<span style={{ color: compoundColor(model.compound) }}>
											{(model.compound ?? "?").slice(0, 1)}
										</span>{" "}
										<span className="text-zinc-500">{model.tyreAge}L</span>
									</td>
									<td className="py-1 pr-2">
										<DegLabel degMsPerLap={model.degMsPerLap} />
									</td>
									<td className="py-1 pr-2 text-zinc-300">
										{window ? `L${window.fromLap}–${window.toLap}` : <span className="text-zinc-600">open</span>}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</>
			)}
		</div>
	);
}
