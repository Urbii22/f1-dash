"use client";

import { useMemo } from "react";

import { formatLapTimeMs } from "@/lib/lapHistory";
import { useDataStore } from "@/stores/useDataStore";
import { useLapHistoryStore } from "@/stores/useLapHistoryStore";

import LineChart, { type ChartSeries } from "@/components/analysis/LineChart";

type Props = {
	selected: string[];
};

export default function RacePaceChart({ selected }: Props) {
	const laps = useLapHistoryStore((state) => state.laps);
	const drivers = useDataStore((state) => state.state?.DriverList);

	const series = useMemo<ChartSeries[]>(() => {
		const timed = selected.flatMap((nr) => (laps[nr] ?? []).filter((lap) => lap.lapTimeMs !== null));
		if (timed.length === 0) return [];

		// clip outliers (pit laps, SC laps) at median + 5s so they don't flatten the chart
		const sorted = timed.map((lap) => lap.lapTimeMs as number).sort((a, b) => a - b);
		const median = sorted[Math.floor(sorted.length / 2)];
		const clipMax = median + 5000;

		return selected
			.map((nr) => {
				const driver = drivers?.[nr];
				return {
					id: nr,
					label: driver?.Tla ?? `#${nr}`,
					color: driver?.TeamColour ? `#${driver.TeamColour}` : "#22d3ee",
					points: (laps[nr] ?? [])
						.filter((lap) => lap.lapTimeMs !== null)
						.map((lap) => ({
							x: lap.lap,
							y: Math.min(lap.lapTimeMs as number, clipMax),
							clipped: (lap.lapTimeMs as number) > clipMax || lap.pitted,
						})),
				};
			})
			.filter((s) => s.points.length > 0);
	}, [laps, selected, drivers]);

	if (series.length === 0) {
		return (
			<p className="p-6 text-center text-sm text-zinc-500">
				Lap times build up as drivers complete laps. Select drivers above and let the session run.
			</p>
		);
	}

	return (
		<div>
			<LineChart
				series={series}
				yInverted
				yFormatter={(value) => formatLapTimeMs(Math.round(value))}
				xFormatter={(value) => `L${value}`}
			/>
			<p className="mt-1 font-mono text-[0.65rem] text-zinc-500">
				Faster laps plotted higher · hollow markers = pit or clipped outlier laps
			</p>
		</div>
	);
}
