"use client";

import { useMemo } from "react";

import { formatLapTimeMs } from "@/lib/lapHistory";
import { lapsToPaceSeries, type AnalysisDrivers, type LapsByDriver } from "@/lib/analysisSeries";
import { useDataStore } from "@/stores/useDataStore";
import { useLapHistoryStore } from "@/stores/useLapHistoryStore";

import LineChart, { type ChartSeries } from "@/components/analysis/LineChart";

type Props = {
	selected: string[];
	laps?: LapsByDriver;
	drivers?: AnalysisDrivers;
};

export default function RacePaceChart({ selected, laps: lapsProp, drivers: driversProp }: Props) {
	const storeLaps = useLapHistoryStore((state) => state.laps);
	const storeDrivers = useDataStore((state) => state.state?.DriverList);
	const laps = lapsProp ?? storeLaps;
	const drivers = driversProp ?? storeDrivers;

	const series = useMemo<ChartSeries[]>(() => lapsToPaceSeries(laps, selected, drivers), [laps, selected, drivers]);

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
