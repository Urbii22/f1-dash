"use client";

import { useMemo } from "react";

import { useDataStore } from "@/stores/useDataStore";
import { useLapHistoryStore } from "@/stores/useLapHistoryStore";

import LineChart, { type ChartSeries } from "@/components/analysis/LineChart";

type Props = {
	selected: string[];
};

export default function PositionChart({ selected }: Props) {
	const laps = useLapHistoryStore((state) => state.laps);
	const drivers = useDataStore((state) => state.state?.DriverList);

	const series = useMemo<ChartSeries[]>(
		() =>
			selected
				.map((nr) => {
					const driver = drivers?.[nr];
					return {
						id: nr,
						label: driver?.Tla ?? `#${nr}`,
						color: driver?.TeamColour ? `#${driver.TeamColour}` : "#22d3ee",
						points: (laps[nr] ?? [])
							.filter((lap) => lap.position !== null)
							.map((lap) => ({ x: lap.lap, y: lap.position as number })),
					};
				})
				.filter((s) => s.points.length > 0),
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
