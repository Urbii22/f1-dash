"use client";

import { useDataStore } from "@/stores/useDataStore";
import { useDriverSelectionStore } from "@/stores/useDriverSelectionStore";

export default function DriverComparisonPanel() {
	const comparedDrivers = useDriverSelectionStore((state) => state.comparedDrivers);
	const clearComparedDrivers = useDriverSelectionStore((state) => state.clearComparedDrivers);
	const drivers = useDataStore((state) => state.state?.DriverList);
	const timing = useDataStore((state) => state.state?.TimingData?.Lines);

	return (
		<section className="telemetry-panel rounded-lg p-3">
			<div className="flex items-center justify-between border-b border-cyan-300/10 pb-3">
				<div>
					<p className="panel-title">Head to Head</p>
					<h2 className="text-xl font-black text-white">Driver Compare</h2>
				</div>
				<button className="data-chip rounded-md px-2 py-1 text-xs text-cyan-200" onClick={clearComparedDrivers}>
					Clear
				</button>
			</div>
			<div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-3">
				{comparedDrivers.length === 0 && <p className="text-sm text-zinc-400">Double-click drivers on the map to compare.</p>}
				{comparedDrivers.map((driverNumber) => {
					const driver = drivers?.[driverNumber];
					const line = timing?.[driverNumber];

					return (
						<div key={driverNumber} className="data-chip rounded-md p-3">
							<p className="text-lg font-black text-white">{driver?.Tla ?? driverNumber}</p>
							<p className="font-mono text-xs text-cyan-200">P{line?.Position ?? "-"}</p>
							<p className="mt-2 text-sm text-zinc-300">{line?.GapToLeader ?? "-"}</p>
							<p className="text-sm text-zinc-400">{line?.LastLapTime?.Value ?? "-"}</p>
						</div>
					);
				})}
			</div>
		</section>
	);
}
