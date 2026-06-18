"use client";

import { useState } from "react";

import LineChart, { type ChartSeries } from "@/components/analysis/LineChart";
import { lapChartSeries, type RaceLap } from "@/lib/f1data";

// Jolpica gives no team colours, so we colour lines from a fixed palette by the
// driver's finishing order.
const PALETTE = [
	"#22d3ee",
	"#f472b6",
	"#a3e635",
	"#fbbf24",
	"#60a5fa",
	"#f87171",
	"#c084fc",
	"#34d399",
	"#fb923c",
	"#e879f9",
];

export default function RaceLapChart({
	laps,
	drivers,
}: {
	laps: RaceLap[];
	drivers: { id: string; label: string }[];
}) {
	const [selected, setSelected] = useState<string[]>(() => drivers.slice(0, 5).map((d) => d.id));

	if (laps.length === 0 || drivers.length === 0) return null;

	const orderOf = new Map(drivers.map((d, index) => [d.id, index] as const));
	const labelOf = new Map(drivers.map((d) => [d.id, d.label] as const));
	const colorOf = (id: string) => PALETTE[(orderOf.get(id) ?? 0) % PALETTE.length];

	const series: ChartSeries[] = lapChartSeries(laps)
		.filter((line) => selected.includes(line.driverId))
		.map((line) => ({
			id: line.driverId,
			label: labelOf.get(line.driverId) ?? line.driverId,
			color: colorOf(line.driverId),
			points: line.points,
		}));

	const toggle = (id: string) =>
		setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

	return (
		<section className="rounded-lg border border-white/10 bg-white/[0.03] p-4" data-testid="race-lap-chart">
			<p className="text-xs font-semibold tracking-widest text-cyan-300 uppercase">Lap chart</p>
			<p className="mt-1 text-sm text-zinc-400">Position by lap. Toggle drivers to compare.</p>

			<div className="mt-3 flex flex-wrap gap-1">
				{drivers.map((driver) => {
					const on = selected.includes(driver.id);
					return (
						<button
							key={driver.id}
							type="button"
							onClick={() => toggle(driver.id)}
							className={`rounded-md border px-2 py-1 font-mono text-xs ${on ? "bg-white/5" : "border-white/10 text-zinc-500"}`}
							style={on ? { borderColor: colorOf(driver.id), color: colorOf(driver.id) } : undefined}
						>
							{driver.label}
						</button>
					);
				})}
			</div>

			<div className="mt-3">
				<LineChart
					series={series}
					yInverted
					integerY
					yFormatter={(value) => `P${Math.round(value)}`}
					xFormatter={(value) => `L${value}`}
				/>
			</div>
		</section>
	);
}
