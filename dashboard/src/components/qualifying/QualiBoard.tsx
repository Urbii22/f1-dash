"use client";

import clsx from "clsx";
import { AnimatePresence, LayoutGroup } from "motion/react";

import QualiDriverRow from "@/components/qualifying/QualiDriverRow";
import { getCutoffPosition } from "@/lib/quali";
import { sortPos } from "@/lib/sorting";
import { useDataStore } from "@/stores/useDataStore";
import { useSettingsStore } from "@/stores/useSettingsStore";

export default function QualiBoard() {
	const timingData = useDataStore((state) => state.state?.TimingData);
	const timingStats = useDataStore((state) => state.state?.TimingStats);
	const appData = useDataStore((state) => state.state?.TimingAppData);
	const drivers = useDataStore((state) => state.state?.DriverList);
	const favorites = useSettingsStore((state) => state.favoriteDrivers);
	const showTheoretical = useSettingsStore((state) => state.qualiShowTheoreticalBest);
	const cutoffPosition = getCutoffPosition(timingData?.SessionPart);
	const ordered = Object.values(timingData?.Lines ?? {}).sort(sortPos);
	const cutoffTime = cutoffPosition
		? ordered.find((driver) => Number.parseInt(driver.Position, 10) === cutoffPosition)?.BestLapTime?.Value
		: undefined;

	return (
		<section className="telemetry-panel min-w-0 rounded-lg p-3">
			<div className="flex items-center justify-between border-b border-cyan-300/10 pb-3">
				<div>
					<p className="panel-title">Timing matrix</p>
					<h2 className="text-xl font-black">Qualifying Board</h2>
				</div>
				<span className="data-chip rounded-md px-2 py-1 font-mono text-xs text-cyan-200">
					{ordered.length || "--"} CARS
				</span>
			</div>

			<div className="tech-scrollbar mt-3 overflow-x-auto pb-2">
				<div className="min-w-max">
					<div
						className="grid gap-2 border-b border-cyan-300/10 px-2 pb-2 font-mono text-[0.62rem] font-black tracking-wider text-cyan-300/70 uppercase"
						style={{
							gridTemplateColumns: showTheoretical
								? "5.5rem 4.5rem 5.5rem 6rem 5rem 5rem 6rem minmax(18rem,1fr) 6rem 3rem"
								: "5.5rem 4.5rem 5.5rem 6rem 5rem 5rem 6rem minmax(18rem,1fr) 3rem",
						}}
					>
						<span>Driver</span>
						<span>Status</span>
						<span>Tire</span>
						<span>Best</span>
						<span>Gap</span>
						<span>Cutoff</span>
						<span>Last</span>
						<span>Sectors</span>
						{showTheoretical && <span>Ideal</span>}
						<span>Laps</span>
					</div>

					{(!drivers || !timingData) &&
						Array.from({ length: 20 }, (_, index) => <BoardSkeleton key={index} showTheoretical={showTheoretical} />)}
					<LayoutGroup id="qualifying-board">
						<AnimatePresence mode="popLayout">
							{drivers &&
								timingData &&
								ordered.map((timingDriver) => {
									const driver = drivers[timingDriver.RacingNumber];
									if (!driver) return null;
									const position = Number.parseInt(timingDriver.Position, 10);
									return (
										<QualiDriverRow
											key={timingDriver.RacingNumber}
											driver={driver}
											timingDriver={timingDriver}
											timingStatsDriver={timingStats?.Lines?.[timingDriver.RacingNumber]}
											appTimingDriver={appData?.Lines?.[timingDriver.RacingNumber]}
											sessionPart={timingData.SessionPart}
											cutoffTime={cutoffTime}
											showTheoretical={showTheoretical}
											favorite={favorites.includes(timingDriver.RacingNumber)}
											showEliminationDivider={cutoffPosition !== undefined && position === cutoffPosition + 1}
										/>
									);
								})}
						</AnimatePresence>
					</LayoutGroup>
				</div>
			</div>
		</section>
	);
}

function BoardSkeleton({ showTheoretical }: { showTheoretical: boolean }) {
	return (
		<div
			className="data-chip mt-1 grid gap-2 rounded-md p-2"
			style={{
				gridTemplateColumns: showTheoretical
					? "5.5rem 4.5rem 5.5rem 6rem 5rem 5rem 6rem 18rem 6rem 3rem"
					: "5.5rem 4.5rem 5.5rem 6rem 5rem 5rem 6rem 18rem 3rem",
			}}
		>
			{Array.from({ length: showTheoretical ? 10 : 9 }, (_, index) => (
				<div key={index} className={clsx("h-8 animate-pulse rounded-md bg-cyan-950/60", index === 7 && "w-full")} />
			))}
		</div>
	);
}
