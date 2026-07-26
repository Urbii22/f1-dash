"use client";

import { useMemo } from "react";

import LineChart, { type ChartSeries } from "@/components/analysis/LineChart";
import type { AnalysisDrivers, LapsByDriver } from "@/lib/analysisSeries";
import { formatLapTimeMs } from "@/lib/lapHistory";
import { buildSpeedVsLapTime } from "@/lib/sessionInsights";

export default function SpeedScatter({
	laps,
	selected,
	drivers,
}: {
	laps: LapsByDriver;
	selected: string[];
	drivers?: AnalysisDrivers;
}) {
	const series = useMemo<ChartSeries[]>(
		() => buildSpeedVsLapTime(laps, selected, drivers),
		[laps, selected, drivers],
	);

	if (series.length === 0) {
		return (
			<p className="p-6 text-center text-sm text-zinc-500">
				No speed-trap data yet. Each point pairs a lap time with its speed-trap reading; select drivers and let
				laps accumulate.
			</p>
		);
	}

	return (
		<div>
			<LineChart
				series={series}
				variant="scatter"
				xFormatter={(value) => formatLapTimeMs(Math.round(value))}
				yFormatter={(value) => `${Math.round(value)}`}
			/>
			<p className="mt-1 font-mono text-[0.65rem] text-zinc-500">
				Speed trap (km/h, vertical) vs lap time (horizontal) · top-left = fast lap with high top speed
			</p>
		</div>
	);
}
