"use client";

import { useMemo } from "react";

import type { DriverList, TimingData } from "@/types/state.type";

import { formatLapTimeMs } from "@/lib/lapHistory";
import { estimatePitWindow, formatStrategyGap, projectUndercut } from "@/lib/strategy";
import { parseTimingSeconds } from "@/lib/driverComparison";
import { STRATEGY_MIN_LAP, useStrategy } from "@/hooks/useStrategy";
import { useDataStore } from "@/stores/useDataStore";
import { useDriverSelectionStore } from "@/stores/useDriverSelectionStore";

import LineChart, { type ChartSeries } from "@/components/analysis/LineChart";
import { compoundColor } from "@/components/analysis/StintTimeline";

export default function StrategyView() {
	const strategy = useStrategy();
	const drivers = useDataStore((state) => state.state?.DriverList);
	const timing = useDataStore((state) => state.state?.TimingData?.Lines);
	const comparedDrivers = useDriverSelectionStore((state) => state.comparedDrivers);

	if (!strategy.isRace) {
		return (
			<p className="p-6 text-center text-sm text-zinc-500">
				Strategy estimates are only available during a race session.
			</p>
		);
	}

	if (!strategy.ready) {
		return (
			<p className="p-6 text-center text-sm text-zinc-500">
				Strategy estimates need at least {STRATEGY_MIN_LAP} laps of history. Current lap: {strategy.currentLap}.
			</p>
		);
	}

	const rows = Object.values(strategy.models)
		.map((model) => ({
			model,
			driver: drivers?.[model.racingNumber],
			position: Number(timing?.[model.racingNumber]?.Position) || 99,
			window: estimatePitWindow(model, strategy.pitLossMs, strategy.currentLap, strategy.totalLaps),
		}))
		.sort((a, b) => a.position - b.position);

	return (
		<div className="flex flex-col gap-4">
			<div className="flex flex-wrap items-center gap-2 font-mono text-xs text-zinc-400">
				<span className="data-chip rounded-md px-2 py-1">
					Pit loss <span className="text-cyan-200">~{(strategy.pitLossMs / 1000).toFixed(1)}s</span>
				</span>
				<span className="data-chip rounded-md px-2 py-1 text-amber-300/80">
					EST · heuristic estimates, not FIA data
				</span>
			</div>

			<div className="tech-scrollbar overflow-x-auto">
				<table className="w-full min-w-[36rem] text-left font-mono text-xs">
					<thead>
						<tr className="border-b border-cyan-300/10 text-zinc-500 uppercase">
							<th className="py-1.5 pr-2">Pos</th>
							<th className="py-1.5 pr-2">Driver</th>
							<th className="py-1.5 pr-2">Tyre</th>
							<th className="py-1.5 pr-2">Baseline</th>
							<th className="py-1.5 pr-2">Deg / lap</th>
							<th className="py-1.5 pr-2">Pit window (est)</th>
						</tr>
					</thead>
					<tbody>
						{rows.map(({ model, driver, position, window }) => (
							<tr key={model.racingNumber} className="border-b border-white/5">
								<td className="py-1.5 pr-2 text-zinc-400">{position === 99 ? "--" : `P${position}`}</td>
								<td className="py-1.5 pr-2">
									<span
										className="border-l-2 pl-1.5 font-bold"
										style={{ borderColor: `#${driver?.TeamColour ?? "71717a"}` }}
									>
										{driver?.Tla ?? `#${model.racingNumber}`}
									</span>
								</td>
								<td className="py-1.5 pr-2">
									<span style={{ color: compoundColor(model.compound) }}>{(model.compound ?? "?").slice(0, 1)}</span>{" "}
									<span className="text-zinc-400">{model.tyreAge}L</span>
								</td>
								<td className="py-1.5 pr-2 text-zinc-300">{formatLapTimeMs(Math.round(model.baselineMs))}</td>
								<td className="py-1.5 pr-2">
									<DegLabel degMsPerLap={model.degMsPerLap} />
								</td>
								<td className="py-1.5 pr-2 text-zinc-300">
									{window ? `L${window.fromLap}–L${window.toLap}` : <span className="text-zinc-600">open</span>}
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>

			<UndercutProjectionSection
				comparedDrivers={comparedDrivers}
				strategy={strategy}
				drivers={drivers}
				timing={timing}
			/>
		</div>
	);
}

export function DegLabel({ degMsPerLap }: { degMsPerLap: number }) {
	const perLap = degMsPerLap / 1000;
	const color = degMsPerLap > 120 ? "text-rose-300" : degMsPerLap > 50 ? "text-amber-300" : "text-emerald-300";
	return (
		<span className={color}>
			{perLap >= 0 ? "+" : ""}
			{perLap.toFixed(2)}s
		</span>
	);
}

type SectionProps = {
	comparedDrivers: string[];
	strategy: ReturnType<typeof useStrategy>;
	drivers: DriverList | undefined;
	timing: TimingData["Lines"] | undefined;
};

function UndercutProjectionSection({ comparedDrivers, strategy, drivers, timing }: SectionProps) {
	const projection = useMemo(() => {
		if (comparedDrivers.length !== 2) return null;
		const [aNr, bNr] = comparedDrivers;
		const a = strategy.models[aNr];
		const b = strategy.models[bNr];
		if (!a || !b) return null;

		const gapMs = liveGapMs(aNr, bNr, timing);
		if (gapMs === null) return null;

		// project the attacker = the driver currently behind
		const attackerNr = gapMs < 0 ? aNr : bNr;
		const defenderNr = attackerNr === aNr ? bNr : aNr;
		const attacker = strategy.models[attackerNr];
		const defender = strategy.models[defenderNr];
		const attackerGap = attackerNr === aNr ? gapMs : -gapMs;

		const result = projectUndercut(attacker, defender, attackerGap, strategy.pitLossMs);

		// rebuild the per-lap gap series for the chart
		const points: { x: number; y: number }[] = [];
		const freshGain = Math.max(0, attacker.degMsPerLap) * attacker.tyreAge + 600;
		const paceA = attacker.baselineMs - freshGain;
		let gap = attackerGap - strategy.pitLossMs;
		points.push({ x: 0, y: gap / 1000 });
		for (let lap = 1; lap <= result.horizonLaps; lap++) {
			const lapA = paceA + Math.max(0, attacker.degMsPerLap) * lap;
			const lapB = defender.baselineMs + Math.max(0, defender.degMsPerLap) * lap;
			gap += lapB - lapA;
			points.push({ x: lap, y: gap / 1000 });
		}

		return { attackerNr, defenderNr, result, points };
	}, [comparedDrivers, strategy, timing]);

	if (comparedDrivers.length !== 2) {
		return (
			<p className="rounded-md border border-cyan-300/10 bg-black/30 p-3 font-mono text-xs text-zinc-500">
				Select two drivers on the leaderboard to project an undercut between them.
			</p>
		);
	}

	if (!projection) {
		return (
			<p className="rounded-md border border-cyan-300/10 bg-black/30 p-3 font-mono text-xs text-zinc-500">
				Not enough clean laps yet to project an undercut between the selected drivers.
			</p>
		);
	}

	const attacker = drivers?.[projection.attackerNr]?.Tla ?? `#${projection.attackerNr}`;
	const defender = drivers?.[projection.defenderNr]?.Tla ?? `#${projection.defenderNr}`;

	const series: ChartSeries[] = [
		{
			id: "undercut",
			label: `${attacker} vs ${defender}`,
			color: projection.result.works ? "#34d399" : "#fb7185",
			points: projection.points,
		},
	];

	return (
		<div className="rounded-md border border-cyan-300/10 bg-black/30 p-3">
			<div className="flex flex-wrap items-center justify-between gap-2">
				<p className="panel-title">
					Undercut projection · {attacker} pits now vs {defender}
				</p>
				<span
					className={`rounded-md px-2 py-1 font-mono text-xs ${projection.result.works ? "bg-emerald-400/15 text-emerald-300" : "bg-rose-400/15 text-rose-300"}`}
				>
					{projection.result.works
						? `WORKS · ahead in ~${projection.result.crossoverLap} laps`
						: `DOESN'T WORK · ${formatStrategyGap(projection.result.gapAfterStop)} after ${projection.result.horizonLaps} laps`}
				</span>
			</div>
			<div className="mt-2">
				<LineChart
					series={series}
					yFormatter={(value) => `${value.toFixed(1)}s`}
					xFormatter={(value) => `+${value}L`}
				/>
			</div>
			<p className="mt-1 font-mono text-[0.65rem] text-zinc-500">
				Projected gap of {attacker} over {defender} after pitting now (EST) · above 0s = ahead
			</p>
		</div>
	);
}

export function liveGapMs(aNr: string, bNr: string, timing: TimingData["Lines"] | undefined): number | null {
	const a = timing?.[aNr];
	const b = timing?.[bNr];
	if (!a || !b) return null;

	const gapA = Number(a.Position) === 1 ? 0 : parseTimingSeconds(a.GapToLeader);
	const gapB = Number(b.Position) === 1 ? 0 : parseTimingSeconds(b.GapToLeader);
	if (gapA === null || gapB === null) return null;

	// positive = A ahead of B
	return Math.round((gapB - gapA) * 1000);
}
