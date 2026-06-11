"use client";

import clsx from "clsx";

import { useDataStore } from "@/stores/useDataStore";
import type { AnalysisDrivers } from "@/lib/analysisSeries";

type Props = {
	selected: string[];
	onToggle: (racingNumber: string) => void;
	drivers?: AnalysisDrivers;
};

export default function DriverToggles({ selected, onToggle, drivers: driversProp }: Props) {
	const storeDrivers = useDataStore((state) => state.state?.DriverList);
	const drivers = driversProp ?? storeDrivers;
	const timing = useDataStore((state) => state.state?.TimingData?.Lines);

	if (!drivers) return null;

	const ordered = Object.entries(drivers).map(([nr, driver]) => ({ nr, ...driver })).sort((a, b) => {
		const posA = Number(timing?.[a.nr]?.Position) || 99;
		const posB = Number(timing?.[b.nr]?.Position) || 99;
		return posA - posB;
	});

	return (
		<div className="flex flex-wrap gap-1.5">
			{ordered.map((driver) => {
				const active = selected.includes(driver.nr);
				return (
					<button
						key={driver.nr}
						className={clsx(
							"data-chip rounded-md px-2 py-1 font-mono text-xs transition",
							active ? "border-cyan-300/60! bg-cyan-300/15! text-white" : "text-zinc-400 hover:text-white",
						)}
						style={active ? { borderColor: `#${driver.TeamColour}` } : undefined}
						onClick={() => onToggle(driver.nr)}
					>
						<span
							className="mr-1 inline-block h-2 w-2 rounded-full align-middle"
							style={{ backgroundColor: `#${driver.TeamColour}` }}
						/>
						{driver.Tla}
					</button>
				);
			})}
		</div>
	);
}
