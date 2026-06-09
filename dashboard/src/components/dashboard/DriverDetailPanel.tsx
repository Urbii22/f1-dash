"use client";

import { useDataStore } from "@/stores/useDataStore";
import { useDriverSelectionStore } from "@/stores/useDriverSelectionStore";

export default function DriverDetailPanel() {
	const selectedDriver = useDriverSelectionStore((state) => state.selectedDriver);
	const driver = useDataStore((state) => (selectedDriver ? state.state?.DriverList?.[selectedDriver] : undefined));
	const timing = useDataStore((state) => (selectedDriver ? state.state?.TimingData?.Lines?.[selectedDriver] : undefined));
	const app = useDataStore((state) => (selectedDriver ? state.state?.TimingAppData?.Lines?.[selectedDriver] : undefined));
	const car = useDataStore((state) => (selectedDriver ? state.carsData?.[selectedDriver] : undefined));

	if (!selectedDriver || !driver || !timing) {
		return (
			<section className="telemetry-panel rounded-lg p-3">
				<p className="panel-title">Pilot Core</p>
				<p className="mt-2 text-sm text-zinc-400">Select a driver on the map.</p>
			</section>
		);
	}

	return (
		<section className="telemetry-panel rounded-lg p-3">
			<div className="flex items-start justify-between gap-3 border-b border-cyan-300/10 pb-3">
				<div>
					<p className="panel-title">Pilot Core</p>
					<h2 className="text-2xl font-black text-white">{driver.Tla}</h2>
					<p className="text-sm text-zinc-400">{driver.FullName}</p>
				</div>
				<div className="data-chip rounded-md px-2 py-1 font-mono text-xs text-cyan-200">P{timing.Position}</div>
			</div>
			<div className="mt-3 grid grid-cols-2 gap-2 text-sm">
				<Metric label="Gap" value={timing.GapToLeader || "-"} />
				<Metric label="Interval" value={timing.IntervalToPositionAhead?.Value || "-"} />
				<Metric label="Last Lap" value={timing.LastLapTime?.Value || "-"} />
				<Metric label="Tyre" value={app?.Stints?.at(-1)?.Compound || "-"} />
				<Metric label="Speed" value={car?.Channels["2"] ? `${car.Channels["2"]} km/h` : "-"} />
				<Metric label="Gear" value={car?.Channels["3"] ? String(car.Channels["3"]) : "-"} />
			</div>
		</section>
	);
}

function Metric({ label, value }: { label: string; value: string }) {
	return (
		<div className="data-chip rounded-md p-2">
			<p className="font-mono text-[0.65rem] text-cyan-300 uppercase">{label}</p>
			<p className="mt-1 font-mono text-sm text-white">{value}</p>
		</div>
	);
}
