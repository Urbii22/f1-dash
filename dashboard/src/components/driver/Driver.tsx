"use client";

import clsx from "clsx";
import { motion } from "motion/react";

import type { Driver, TimingDataDriver } from "@/types/state.type";

import { useSettingsStore } from "@/stores/useSettingsStore";
import { useDataStore } from "@/stores/useDataStore";
import { useDriverSelectionStore } from "@/stores/useDriverSelectionStore";

import DriverTag from "./DriverTag";
import DriverDRS from "./DriverDRS";
import DriverGap from "./DriverGap";
import DriverTire from "./DriverTire";
import DriverMiniSectors from "./DriverMiniSectors";
import DriverLapTime from "./DriverLapTime";
import DriverInfo from "./DriverInfo";
import DriverCarMetrics from "./DriverCarMetrics";

type Props = {
	position: number;
	driver: Driver;
	timingDriver: TimingDataDriver;
};

const hasDRS = (drs: number) => drs > 9;

const possibleDRS = (drs: number) => drs === 8;

const inDangerZone = (position: number, sessionPart: number) => {
	switch (sessionPart) {
		case 1:
			return position > 15;
		case 2:
			return position > 10;
		case 3:
		default:
			return false;
	}
};

export default function Driver({ driver, timingDriver, position }: Props) {
	const sessionPart = useDataStore((state) => state.state?.TimingData?.SessionPart);
	const timingStatsDriver = useDataStore((state) => state.state?.TimingStats?.Lines[driver.RacingNumber]);
	const appTimingDriver = useDataStore((state) => state.state?.TimingAppData?.Lines[driver.RacingNumber]);
	const carData = useDataStore((state) => state.carsData?.[driver.RacingNumber]?.Channels);

	const hasFastest = timingStatsDriver?.PersonalBestLapTime.Position == 1;

	const carMetrics = useSettingsStore((state) => state.carMetrics);

	const favoriteDriver = useSettingsStore((state) => state.favoriteDrivers.includes(driver.RacingNumber));
	const selectedDriver = useDriverSelectionStore((state) => state.selectedDriver);
	const comparedDrivers = useDriverSelectionStore((state) => state.comparedDrivers);
	const setSelectedDriver = useDriverSelectionStore((state) => state.setSelectedDriver);
	const toggleComparedDriver = useDriverSelectionStore((state) => state.toggleComparedDriver);
	const selected = selectedDriver === driver.RacingNumber;
	const compared = comparedDrivers.includes(driver.RacingNumber);
	const teamColour = `#${driver.TeamColour || "00e5ff"}`;

	return (
		<motion.div
			layout="position"
			data-driver-number={driver.RacingNumber}
			data-head-to-head={compared ? "true" : "false"}
			role="button"
			tabIndex={0}
			title="Click for telemetry. Double-click to compare."
			onClick={() => setSelectedDriver(driver.RacingNumber)}
			onDoubleClick={() => toggleComparedDriver(driver.RacingNumber)}
			onKeyDown={(event) => {
				if (event.key === "Enter") setSelectedDriver(driver.RacingNumber);
				if (event.key === " ") {
					event.preventDefault();
					toggleComparedDriver(driver.RacingNumber);
				}
			}}
			style={
				compared
					? {
							borderColor: teamColour,
							background: `linear-gradient(90deg, ${teamColour}2e 0%, rgba(5, 12, 17, 0.96) 58%)`,
							boxShadow: selected
								? `0 0 0 1px rgba(255,255,255,0.8), inset 4px 0 ${teamColour}, 0 0 18px ${teamColour}24`
								: `inset 4px 0 ${teamColour}, 0 0 18px ${teamColour}24`,
						}
					: undefined
			}
			className={clsx(
				"data-chip relative flex cursor-pointer flex-col gap-1 rounded-md p-1.5 transition select-none hover:border-cyan-300/45 hover:bg-cyan-300/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300",
				{
					"opacity-50": timingDriver.KnockedOut || timingDriver.Retired || timingDriver.Stopped,
					"border-white/70! bg-white/10!": selected,
					"border-cyan-300/60! bg-cyan-300/15! shadow-[0_0_30px_rgba(0,229,255,0.16)]": favoriteDriver,
					"border-fuchsia-300/50! bg-fuchsia-500/15!": hasFastest,
					"border-rose-400/50! bg-rose-500/15!": sessionPart != undefined && inDangerZone(position, sessionPart),
				},
			)}
		>
			{compared && (
				<span
					className="absolute top-1 right-1 z-10 font-mono text-[0.55rem] font-black tracking-normal"
					style={{ color: teamColour }}
				>
					H2H
				</span>
			)}
			<div
				className="grid items-center gap-2"
				style={{
					gridTemplateColumns: carMetrics
						? "5.5rem 3.5rem 5.5rem 4rem 5rem 5.5rem auto 10.5rem"
						: "5.5rem 3.5rem 5.5rem 4rem 5rem 5.5rem auto",
				}}
			>
				<DriverTag className="min-w-full!" short={driver.Tla} teamColor={driver.TeamColour} position={position} />
				<DriverDRS
					on={carData ? hasDRS(carData[45]) : false}
					possible={carData ? possibleDRS(carData[45]) : false}
					inPit={timingDriver.InPit}
					pitOut={timingDriver.PitOut}
				/>
				<DriverTire stints={appTimingDriver?.Stints} />
				<DriverInfo timingDriver={timingDriver} gridPos={appTimingDriver ? parseInt(appTimingDriver.GridPos) : 0} />
				<DriverGap timingDriver={timingDriver} sessionPart={sessionPart} />
				<DriverLapTime last={timingDriver.LastLapTime} best={timingDriver.BestLapTime} hasFastest={hasFastest} />
				<DriverMiniSectors sectors={timingDriver.Sectors} bestSectors={timingStatsDriver?.BestSectors} />

				{carMetrics && carData && <DriverCarMetrics carData={carData} />}
			</div>
		</motion.div>
	);
}
