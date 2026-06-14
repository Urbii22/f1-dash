"use client";

import clsx from "clsx";
import { useMemo, useState } from "react";

import { useDataStore } from "@/stores/useDataStore";
import { useLapHistoryStore } from "@/stores/useLapHistoryStore";
import { useSettingsStore } from "@/stores/useSettingsStore";

import DriverToggles from "@/components/analysis/DriverToggles";
import InsightsPanel from "@/components/analysis/InsightsPanel";
import PositionChart from "@/components/analysis/PositionChart";
import QualiInsights from "@/components/analysis/QualiInsights";
import RacePaceChart from "@/components/analysis/RacePaceChart";
import SpeedScatter from "@/components/analysis/SpeedScatter";
import StintTimeline from "@/components/analysis/StintTimeline";
import StrategyView from "@/components/analysis/StrategyView";
import {
	buildBestSectors,
	buildPotentialLaps,
	buildTopSpeeds,
} from "@/lib/sessionInsights";

const BASE_TABS = [
	{ id: "pace", name: "Race Pace" },
	{ id: "positions", name: "Positions" },
	{ id: "stints", name: "Stints" },
	{ id: "strategy", name: "Strategy" },
	{ id: "insights", name: "Insights" },
	{ id: "speed", name: "Speed" },
] as const;

const QUALI_TAB = { id: "quali", name: "Quali" } as const;

type TabId = (typeof BASE_TABS)[number]["id"] | typeof QUALI_TAB.id;

function isQualifying(type: string | undefined): boolean {
	const t = (type ?? "").toLowerCase();
	return t.includes("qual") || t.includes("shootout");
}

export default function AnalysisPage() {
	const [tab, setTab] = useState<TabId>("pace");
	// null = user has not customized the selection yet, fall back to the default
	const [userSelected, setUserSelected] = useState<string[] | null>(null);

	const drivers = useDataStore((state) => state.state?.DriverList);
	const timing = useDataStore((state) => state.state?.TimingData?.Lines);
	const stats = useDataStore((state) => state.state?.TimingStats?.Lines);
	const sessionType = useDataStore((state) => state.state?.SessionInfo?.Type);
	const laps = useLapHistoryStore((state) => state.laps);
	const stints = useLapHistoryStore((state) => state.stints);
	const favoriteDrivers = useSettingsStore((state) => state.favoriteDrivers);

	const quali = isQualifying(sessionType);
	const tabs = useMemo(() => (quali ? [...BASE_TABS, QUALI_TAB] : [...BASE_TABS]), [quali]);

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

	const potential = useMemo(() => buildPotentialLaps(stats, drivers), [stats, drivers]);
	const topSpeeds = useMemo(() => buildTopSpeeds(stats, drivers), [stats, drivers]);
	const sectors = useMemo(() => buildBestSectors(stats, drivers), [stats, drivers]);

	const toggleDriver = (nr: string) =>
		setUserSelected(selected.includes(nr) ? selected.filter((item) => item !== nr) : [...selected, nr]);

	const showToggles = tab === "pace" || tab === "positions" || tab === "speed" || tab === "quali";

	return (
		<div className="flex w-full flex-col gap-3 p-3">
			<div className="telemetry-panel rounded-lg p-3">
				<div className="flex flex-wrap items-center justify-between gap-2 border-b border-cyan-300/10 pb-3">
					<div>
						<p className="panel-title">Session intelligence</p>
						<h2 className="text-xl font-black text-white">Analysis</h2>
					</div>

					<div className="flex flex-wrap items-center gap-1">
						{tabs.map((item) => (
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
					{tab === "insights" && (
						<InsightsPanel
							potential={potential}
							topSpeeds={topSpeeds}
							sectors={sectors}
							stints={stints}
							drivers={drivers}
						/>
					)}
					{tab === "speed" && <SpeedScatter laps={laps} selected={selected} drivers={drivers} />}
					{tab === "quali" && quali && (
						<QualiInsights potential={potential} laps={laps} selected={selected} drivers={drivers} />
					)}
				</div>
			</div>
		</div>
	);
}
