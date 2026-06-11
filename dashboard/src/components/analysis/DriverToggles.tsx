"use client";

import clsx from "clsx";

import { useDataStore } from "@/stores/useDataStore";

type Props = {
	selected: string[];
	onToggle: (racingNumber: string) => void;
};

export default function DriverToggles({ selected, onToggle }: Props) {
	const drivers = useDataStore((state) => state.state?.DriverList);
	const timing = useDataStore((state) => state.state?.TimingData?.Lines);

	if (!drivers) return null;

	const ordered = Object.values(drivers).sort((a, b) => {
		const posA = Number(timing?.[a.RacingNumber]?.Position) || a.Line || 99;
		const posB = Number(timing?.[b.RacingNumber]?.Position) || b.Line || 99;
		return posA - posB;
	});

	return (
		<div className="flex flex-wrap gap-1.5">
			{ordered.map((driver) => {
				const active = selected.includes(driver.RacingNumber);
				return (
					<button
						key={driver.RacingNumber}
						className={clsx(
							"data-chip rounded-md px-2 py-1 font-mono text-xs transition",
							active ? "border-cyan-300/60! bg-cyan-300/15! text-white" : "text-zinc-400 hover:text-white",
						)}
						style={active ? { borderColor: `#${driver.TeamColour}` } : undefined}
						onClick={() => onToggle(driver.RacingNumber)}
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
