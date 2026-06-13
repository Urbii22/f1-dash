"use client";

import clsx from "clsx";
import Image from "next/image";
import { motion } from "motion/react";

import DriverTag from "@/components/driver/DriverTag";
import { parseLapTime } from "@/lib/quali";
import type { Driver, PersonalBestLapTime, TimingAppDataDriver, TimingDataDriver } from "@/types/state.type";

type Props = {
	driver: Driver;
	timingDriver: TimingDataDriver;
	appTimingDriver: TimingAppDataDriver | undefined;
	benchmarkName: string | undefined;
	benchmarkTime: string | undefined;
	benchmarkSectors: PersonalBestLapTime[] | undefined;
};

const projectedDelta = (driver: TimingDataDriver, benchmarkSectors: PersonalBestLapTime[] | undefined) => {
	let driverTotal = 0;
	let benchmarkTotal = 0;
	let completed = 0;

	for (let index = 0; index < Math.min(driver.Sectors?.length ?? 0, benchmarkSectors?.length ?? 0); index += 1) {
		const driverSector = parseLapTime(driver.Sectors[index]?.Value);
		const benchmarkSector = parseLapTime(benchmarkSectors?.[index]?.Value);
		if (driverSector === undefined || benchmarkSector === undefined) break;
		driverTotal += driverSector;
		benchmarkTotal += benchmarkSector;
		completed += 1;
	}

	return completed > 0 ? driverTotal - benchmarkTotal : undefined;
};

const formatDelta = (delta: number | undefined) => {
	if (delta === undefined) return "--.---";
	return `${delta >= 0 ? "+" : "-"}${(Math.abs(delta) / 1000).toFixed(3)}`;
};

export default function HotLapCard({
	driver,
	timingDriver,
	appTimingDriver,
	benchmarkName,
	benchmarkTime,
	benchmarkSectors,
}: Props) {
	const stints = appTimingDriver?.Stints ?? [];
	const currentStint = stints.at(-1);
	const compound = currentStint?.Compound?.toLowerCase();
	const knownCompound = compound && ["soft", "medium", "hard", "intermediate", "wet"].includes(compound);
	const lastSector = [...(timingDriver.Sectors ?? [])].reverse().find((sector) => sector.Value)?.Value;
	const delta = projectedDelta(timingDriver, benchmarkSectors);

	return (
		<motion.article
			layout
			exit={{ opacity: 0, y: -8 }}
			animate={{ opacity: 1, y: 0 }}
			initial={{ opacity: 0, y: 8 }}
			className="data-chip min-w-72 rounded-lg p-3"
		>
			<div className="flex items-center justify-between">
				<DriverTag
					position={Number.parseInt(timingDriver.Position, 10)}
					teamColor={driver.TeamColour}
					short={driver.Tla}
				/>
				{currentStint ? (
					<Image
						src={`/tires/${knownCompound ? compound : "unknown"}.svg`}
						width={32}
						height={32}
						alt={currentStint.Compound ?? "unknown"}
					/>
				) : (
					<div className="h-8 w-8 animate-pulse rounded-full bg-cyan-950/60" />
				)}
			</div>

			<div className="mt-3 flex items-end justify-between gap-3">
				<div>
					<p className="panel-title">Latest sector</p>
					<p className="font-mono text-3xl font-black tabular-nums">{lastSector ?? "--.---"}</p>
				</div>
				<div className="text-right">
					<p
						className={clsx(
							"font-mono text-lg font-black tabular-nums",
							delta !== undefined && delta <= 0 ? "text-emerald-400" : "text-rose-400",
						)}
					>
						{formatDelta(delta)}
					</p>
					<p className="text-xs text-zinc-500">projected vs {benchmarkName ?? "cutoff"}</p>
					<p className="font-mono text-xs text-zinc-400">{benchmarkTime ?? "--:--.---"}</p>
				</div>
			</div>

			<div className="mt-3 grid grid-cols-3 gap-1">
				{[0, 1, 2].map((index) => {
					const sector = timingDriver.Sectors?.[index];
					return (
						<div key={index} className="rounded-md bg-black/30 p-2 text-center">
							<div
								className={clsx("mb-1 h-1 rounded-full bg-zinc-700", {
									"bg-violet-500": sector?.OverallFastest,
									"bg-emerald-500": sector?.PersonalFastest && !sector?.OverallFastest,
									"bg-amber-400": sector?.Value && !sector.OverallFastest && !sector.PersonalFastest,
								})}
							/>
							<p className="font-mono text-sm font-bold tabular-nums">
								{sector?.Value || sector?.PreviousValue || "--.---"}
							</p>
							<p className="text-[0.6rem] text-zinc-500 uppercase">Sector {index + 1}</p>
						</div>
					);
				})}
			</div>
		</motion.article>
	);
}
