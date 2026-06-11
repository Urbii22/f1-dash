"use client";

import clsx from "clsx";
import { X } from "lucide-react";
import { useState } from "react";

import type { AlertSeverity } from "@/lib/alerts/types";
import { useAlertStore } from "@/stores/useAlertStore";
import { useDriverSelectionStore } from "@/stores/useDriverSelectionStore";
import { useSettingsStore } from "@/stores/useSettingsStore";

const SEVERITY_FILTERS: Array<{ id: AlertSeverity | "all"; label: string }> = [
	{ id: "all", label: "All" },
	{ id: "info", label: "Info" },
	{ id: "warning", label: "Warn" },
	{ id: "critical", label: "Crit" },
];

const SEVERITY_COLORS: Record<AlertSeverity, string> = {
	info: "text-cyan-300",
	warning: "text-amber-300",
	critical: "text-rose-400",
};

export default function SmartAlerts() {
	const [severityFilter, setSeverityFilter] = useState<AlertSeverity | "all">("all");

	const alerts = useAlertStore((store) => store.alerts);
	const dismiss = useAlertStore((store) => store.dismiss);
	const clearAll = useAlertStore((store) => store.clearAll);
	const favoritesOnly = useAlertStore((store) => store.favoritesOnly);
	const favoriteDrivers = useSettingsStore((store) => store.favoriteDrivers);
	const setSelectedDriver = useDriverSelectionStore((store) => store.setSelectedDriver);

	const visible = alerts
		.filter((alert) => severityFilter === "all" || alert.severity === severityFilter)
		.filter(
			(alert) =>
				!favoritesOnly ||
				!alert.driverNumber ||
				favoriteDrivers.length === 0 ||
				favoriteDrivers.includes(alert.driverNumber),
		)
		.slice()
		.reverse();

	return (
		<section className="telemetry-panel tech-scrollbar h-[30rem] overflow-y-auto rounded-lg p-3">
			<div className="flex items-start justify-between gap-2">
				<div>
					<p className="panel-title">Race Intelligence</p>
					<h2 className="text-xl font-black text-white">Smart Alerts</h2>
				</div>
				{alerts.length > 0 && (
					<button className="data-chip rounded-md px-2 py-1 font-mono text-xs text-zinc-400 hover:text-white" onClick={clearAll}>
						Clear
					</button>
				)}
			</div>

			<div className="mt-2 flex items-center gap-1">
				{SEVERITY_FILTERS.map((filter) => (
					<button
						key={filter.id}
						className={clsx(
							"rounded-md px-2 py-1 font-mono text-[0.65rem] uppercase",
							severityFilter === filter.id ? "bg-cyan-300 text-black" : "data-chip text-zinc-400 hover:text-white",
						)}
						onClick={() => setSeverityFilter(filter.id)}
					>
						{filter.label}
					</button>
				))}
			</div>

			<div className="mt-3 flex flex-col gap-2">
				{visible.length === 0 && <p className="text-sm text-zinc-400">No tactical alerts yet.</p>}
				{visible.map((alert) => (
					<div key={alert.id} className="data-chip group relative rounded-md p-3 text-left">
						<button
							aria-label="Dismiss alert"
							className="absolute top-2 right-2 hidden text-zinc-500 group-hover:block hover:text-white"
							onClick={() => dismiss(alert.id)}
						>
							<X size={12} />
						</button>
						<button
							className="block w-full text-left"
							onClick={() => alert.driverNumber && setSelectedDriver(alert.driverNumber)}
						>
							<p className={clsx("font-mono text-xs uppercase", SEVERITY_COLORS[alert.severity])}>{alert.severity}</p>
							<p className="mt-1 font-bold text-white">{alert.title}</p>
							<p className="text-sm text-zinc-400">{alert.body}</p>
						</button>
					</div>
				))}
			</div>
		</section>
	);
}
