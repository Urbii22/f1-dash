"use client";

import clsx from "clsx";
import { useMemo, useState } from "react";

import { useDataStore } from "@/stores/useDataStore";
import { useSettingsStore } from "@/stores/useSettingsStore";

import DriverToggles from "@/components/analysis/DriverToggles";
import PositionChart from "@/components/analysis/PositionChart";
import RacePaceChart from "@/components/analysis/RacePaceChart";
import StintTimeline from "@/components/analysis/StintTimeline";
import StrategyView from "@/components/analysis/StrategyView";

const TABS = [
	{ id: "pace", name: "Race Pace" },
	{ id: "positions", name: "Positions" },
	{ id: "stints", name: "Stints" },
	{ id: "strategy", name: "Strategy" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function AnalysisPage() {
	const [tab, setTab] = useState<TabId>("pace");
	// null = user has not customized the selection yet, fall back to the default
	const [userSelected, setUserSelected] = useState<string[] | null>(null);

	const drivers = useDataStore((state) => state.state?.DriverList);
	const timing = useDataStore((state) => state.state?.TimingData?.Lines);
	const favoriteDrivers = useSettingsStore((state) => state.favoriteDrivers);

	// default chart selection: favorite drivers, otherwise the current top 5
	const defaultSelection = useMemo(() => {
		if (!drivers) return [];

		const available = Object.keys(drivers);
		const favorites = favoriteDrivers.filter((nr) => available.includes(nr));
		if (favorites.length > 0) return favorites;

		if (!timing) return [];
		return Object.values(timing)
			.filter((line) => Number(line.Position) >= 1)
			.sort((a, b) => Number(a.Position) - Number(b.Position))
			.slice(0, 5)
			.map((line) => line.RacingNumber);
	}, [drivers, timing, favoriteDrivers]);

	const selected = userSelected ?? defaultSelection;

	const toggleDriver = (nr: string) =>
		setUserSelected(selected.includes(nr) ? selected.filter((item) => item !== nr) : [...selected, nr]);

	const showToggles = tab === "pace" || tab === "positions";

	return (
		<div className="flex w-full flex-col gap-3 p-3">
			<div className="telemetry-panel rounded-lg p-3">
				<div className="flex flex-wrap items-center justify-between gap-2 border-b border-cyan-300/10 pb-3">
					<div>
						<p className="panel-title">Session intelligence</p>
						<h2 className="text-xl font-black text-white">Analysis</h2>
					</div>

					<div className="flex items-center gap-1">
						{TABS.map((item) => (
							<button
								key={item.id}
								className={clsx(
									"rounded-md px-3 py-1.5 font-mono text-xs transition",
									tab === item.id ? "bg-cyan-300 text-black" : "data-chip text-cyan-200 hover:text-white",
								)}
								onClick={() => setTab(item.id)}
							>
								{item.name}
							</button>
						))}
					</div>
				</div>

				{showToggles && (
					<div className="mt-3">
						<DriverToggles selected={selected} onToggle={toggleDriver} />
					</div>
				)}

				<div className="mt-3">
					{tab === "pace" && <RacePaceChart selected={selected} />}
					{tab === "positions" && <PositionChart selected={selected} />}
					{tab === "stints" && <StintTimeline />}
					{tab === "strategy" && <StrategyView />}
				</div>
			</div>
		</div>
	);
}
