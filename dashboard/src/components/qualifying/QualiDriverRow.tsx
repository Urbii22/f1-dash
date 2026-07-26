"use client";

import clsx from "clsx";
import { motion } from "motion/react";

import DriverGap from "@/components/driver/DriverGap";
import DriverMiniSectors from "@/components/driver/DriverMiniSectors";
import DriverTag from "@/components/driver/DriverTag";
import DriverTire from "@/components/driver/DriverTire";
import { deltaToCutoff, formatLapTime, inEliminationZone, isOnFlyingLap, theoreticalBest } from "@/lib/quali";
import { getQualiDriverStatus, shouldShowCutoffDelta } from "@/lib/qualiView";
import type { Driver, TimingAppDataDriver, TimingDataDriver, TimingStatsDriver } from "@/types/state.type";

type Props = {
	driver: Driver;
	timingDriver: TimingDataDriver;
	timingStatsDriver: TimingStatsDriver | undefined;
	appTimingDriver: TimingAppDataDriver | undefined;
	sessionPart: number | undefined;
	cutoffTime: string | undefined;
	showTheoretical: boolean;
	favorite: boolean;
	showEliminationDivider: boolean;
};

const formatDelta = (delta: number | undefined) => {
	if (delta === undefined) return "--.---";
	return `${delta >= 0 ? "+" : "-"}${(Math.abs(delta) / 1000).toFixed(3)}`;
};

export default function QualiDriverRow({
	driver,
	timingDriver,
	timingStatsDriver,
	appTimingDriver,
	sessionPart,
	cutoffTime,
	showTheoretical,
	favorite,
	showEliminationDivider,
}: Props) {
	const position = Number.parseInt(timingDriver.Position, 10);
	const flying = isOnFlyingLap(timingDriver);
	const hasFastest = timingStatsDriver?.PersonalBestLapTime?.Position === 1;
	const eliminated = Boolean(timingDriver.KnockedOut);
	const showCutoffDelta = !eliminated && shouldShowCutoffDelta(position, sessionPart);
	const delta = showCutoffDelta && cutoffTime ? deltaToCutoff(timingDriver.BestLapTime?.Value, cutoffTime) : undefined;
	const ideal = theoreticalBest(timingStatsDriver?.BestSectors);
	const status = getQualiDriverStatus(timingDriver, flying);

	return (
		<div>
			{showEliminationDivider && (
				<div className="relative my-2 border-t-2 border-rose-500">
					<span className="absolute -top-3 right-3 bg-[#07111b] px-2 font-mono text-[0.62rem] font-black tracking-widest text-rose-300 uppercase">
						Elimination
					</span>
				</div>
			)}
			<motion.div
				layout="position"
				className={clsx("data-chip rounded-md p-1.5", {
					"opacity-50": eliminated,
					"border-rose-400/50! bg-rose-500/15!": !eliminated && inEliminationZone(position, sessionPart),
					"border-fuchsia-300/50! bg-fuchsia-500/15!": hasFastest,
					"border-cyan-300/60! bg-cyan-300/15!": favorite,
				})}
			>
				<div
					className="grid min-w-max items-center gap-2"
					style={{
						gridTemplateColumns: showTheoretical
							? "5.5rem 4.5rem 5.5rem 6rem 5rem 5rem 6rem minmax(18rem,1fr) 6rem 3rem"
							: "5.5rem 4.5rem 5.5rem 6rem 5rem 5rem 6rem minmax(18rem,1fr) 3rem",
					}}
				>
					<DriverTag className="min-w-full!" short={driver.Tla} teamColor={driver.TeamColour} position={position} />
					<span
						className={clsx("w-fit rounded px-2 py-1 font-mono text-[0.62rem] font-black", {
							"bg-emerald-400/15 text-emerald-300": status === "FLYING" || status === "TRACK",
							"bg-blue-400/15 text-blue-300": status === "OUT LAP",
							"bg-zinc-500/15 text-zinc-400": status === "PIT" || status === "NO TIME",
							"bg-rose-400/15 text-rose-300": status === "STOPPED",
						})}
					>
						{status}
					</span>
					<DriverTire
						stints={appTimingDriver?.Stints}
						secondaryLabel={`SETS ${appTimingDriver?.Stints?.length ?? 0}`}
					/>
					<p className={clsx("font-mono text-lg font-black tabular-nums", hasFastest && "text-violet-400")}>
						{timingDriver.BestLapTime?.Value || "--:--.---"}
					</p>
					{eliminated ? (
						<p className="text-zinc-600">--.---</p>
					) : (
						<DriverGap timingDriver={timingDriver} sessionPart={sessionPart} />
					)}
					<p
						className={clsx("font-mono font-black tabular-nums", {
							"text-emerald-400": delta !== undefined && delta <= 0,
							"text-rose-400": delta !== undefined && delta > 0,
							"text-zinc-600": !showCutoffDelta || delta === undefined,
						})}
					>
						{showCutoffDelta ? formatDelta(delta) : "--.---"}
					</p>
					<p
						className={clsx("font-mono font-bold tabular-nums", {
							"text-violet-400": timingDriver.LastLapTime?.OverallFastest,
							"text-emerald-400": timingDriver.LastLapTime?.PersonalFastest,
							"text-zinc-500": !timingDriver.LastLapTime?.Value,
						})}
					>
						{timingDriver.LastLapTime?.Value || "--:--.---"}
					</p>
					<DriverMiniSectors sectors={timingDriver.Sectors ?? []} bestSectors={timingStatsDriver?.BestSectors} />
					{showTheoretical && (
						<p className="font-mono font-bold text-cyan-100 tabular-nums">
							{ideal === undefined ? "--:--.---" : formatLapTime(ideal)}
						</p>
					)}
					<p className="text-center font-mono font-bold">{timingDriver.NumberOfLaps ?? 0}</p>
				</div>
			</motion.div>
		</div>
	);
}
