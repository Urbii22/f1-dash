"use client";

import { useDataStore } from "@/stores/useDataStore";
import { useDriverSelectionStore } from "@/stores/useDriverSelectionStore";

export default function TelemetryPanel() {
	const selectedDriver = useDriverSelectionStore((state) => state.selectedDriver);
	const driver = useDataStore((state) => (selectedDriver ? state.state?.DriverList?.[selectedDriver] : undefined));
	const car = useDataStore((state) => (selectedDriver ? state.carsData?.[selectedDriver] : undefined));
	const channels = car?.Channels;

	return (
		<section className="telemetry-panel rounded-lg p-3">
			<p className="panel-title">Telemetry Stream</p>
			<h2 className="text-xl font-black text-white">{driver?.Tla ?? "No driver selected"}</h2>
			<div className="mt-3 grid grid-cols-2 gap-2">
				<TelemetryBar label="Throttle" value={Number(channels?.["4"] ?? 0)} max={100} />
				<TelemetryBar label="Brake" value={Number(channels?.["5"] ?? 0)} max={100} />
				<TelemetryBar label="Speed" value={Number(channels?.["2"] ?? 0)} max={360} />
				<TelemetryBar label="DRS" value={Number(channels?.["45"] ?? 0) * 100} max={100} />
			</div>
		</section>
	);
}

function TelemetryBar({ label, value, max }: { label: string; value: number; max: number }) {
	const percent = Math.min(100, Math.max(0, (value / max) * 100));

	return (
		<div className="data-chip rounded-md p-2">
			<div className="flex justify-between font-mono text-xs text-cyan-200">
				<span>{label}</span>
				<span>{Math.round(value)}</span>
			</div>
			<div className="mt-2 h-2 rounded-full bg-black/50">
				<div className="h-full rounded-full bg-cyan-300" style={{ width: `${percent}%` }} />
			</div>
		</div>
	);
}
