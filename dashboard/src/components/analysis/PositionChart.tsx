"use client";

import { useMemo } from "react";

import { useDataStore } from "@/stores/useDataStore";
import { useLapHistoryStore } from "@/stores/useLapHistoryStore";
import { lapsToPositionSeries, type AnalysisDrivers, type LapsByDriver } from "@/lib/analysisSeries";

import LineChart, { type ChartSeries } from "@/components/analysis/LineChart";

type Props = {
	selected: string[];
	laps?: LapsByDriver;
	drivers?: AnalysisDrivers;
};

export default function PositionChart({ selected, laps: lapsProp, drivers: driversProp }: Props) {
	const storeLaps = useLapHistoryStore((state) => state.laps);
	const storeDrivers = useDataStore((state) => state.state?.DriverList);
	const laps = lapsProp ?? storeLaps;
	const drivers = driversProp ?? storeDrivers;

	const series = useMemo<ChartSeries[]>(
		() => lapsToPositionSeries(laps, selected, drivers),
		[laps, selected, drivers],
	);

	if (series.length === 0) {
		return (
			<p className="p-6 text-center text-sm text-zinc-500">
				Position history builds up as drivers complete laps. Select drivers above and let the session run.
			</p>
		);
	}

	return (
		<LineChart
			series={series}
			yInverted
			integerY
			yFormatter={(value) => `P${Math.round(value)}`}
			xFormatter={(value) => `L${value}`}
		/>
	);
}
