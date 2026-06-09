"use client";

import clsx from "clsx";

import { buildSmartAlerts } from "@/lib/driverInsights";
import { useDataStore } from "@/stores/useDataStore";
import { useDriverSelectionStore } from "@/stores/useDriverSelectionStore";

export default function SmartAlerts() {
	const state = useDataStore((store) => store.state);
	const setSelectedDriver = useDriverSelectionStore((store) => store.setSelectedDriver);
	const alerts = buildSmartAlerts(state);

	return (
		<section className="telemetry-panel tech-scrollbar h-[30rem] overflow-y-auto rounded-lg p-3">
			<p className="panel-title">Race Intelligence</p>
			<h2 className="text-xl font-black text-white">Smart Alerts</h2>
			<div className="mt-3 flex flex-col gap-2">
				{alerts.length === 0 && <p className="text-sm text-zinc-400">No tactical alerts yet.</p>}
				{alerts.map((alert) => (
					<button
						key={alert.id}
						className="data-chip rounded-md p-3 text-left"
						onClick={() => alert.driverNumber && setSelectedDriver(alert.driverNumber)}
					>
						<p
							className={clsx(
								"font-mono text-xs uppercase",
								alert.severity === "warning" ? "text-amber-300" : "text-cyan-300",
							)}
						>
							{alert.severity}
						</p>
						<p className="mt-1 font-bold text-white">{alert.title}</p>
						<p className="text-sm text-zinc-400">{alert.body}</p>
					</button>
				))}
			</div>
		</section>
	);
}
