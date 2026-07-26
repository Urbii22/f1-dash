"use client";

import clsx from "clsx";
import { AnimatePresence } from "motion/react";

import HotLapCard from "@/components/qualifying/HotLapCard";
import { getCutoffPosition, isOnFlyingLap } from "@/lib/quali";
import { sortQuali } from "@/lib/sorting";
import { useDataStore } from "@/stores/useDataStore";

export default function HotLaps() {
	const timingData = useDataStore((state) => state.state?.TimingData);
	const timingStats = useDataStore((state) => state.state?.TimingStats);
	const appData = useDataStore((state) => state.state?.TimingAppData);
	const drivers = useDataStore((state) => state.state?.DriverList);
	const loaded = Boolean(timingData?.Lines && drivers);
	const flyingDrivers = loaded
		? Object.values(timingData?.Lines ?? {})
				.filter(isOnFlyingLap)
				.sort(sortQuali)
		: [];
	const benchmarkPosition = getCutoffPosition(timingData?.SessionPart) ?? 1;
	const benchmark = Object.values(timingData?.Lines ?? {}).find(
		(driver) => Number.parseInt(driver.Position, 10) === benchmarkPosition,
	);
	const benchmarkDriver = benchmark ? drivers?.[benchmark.RacingNumber] : undefined;

	return (
		<section className="telemetry-panel rounded-lg p-3">
			<div className="flex items-center justify-between border-b border-cyan-300/10 pb-3">
				<div>
					<p className="panel-title">Track attack</p>
					<h2 className="text-xl font-black">Hot Laps</h2>
				</div>
				<span className="data-chip rounded-md px-2 py-1 font-mono text-xs text-cyan-200">
					{flyingDrivers.length} FLYING
				</span>
			</div>

			<div className="tech-scrollbar mt-3 flex min-h-44 gap-3 overflow-x-auto pb-2">
				<AnimatePresence mode="popLayout">
					{!loaded && [0, 1, 2].map((index) => <HotLapSkeleton key={index} />)}
					{loaded && flyingDrivers.length === 0 && (
						<div className="flex min-h-40 w-full items-center justify-center text-sm text-zinc-500">
							no hay pilotos en vuelta lanzada
						</div>
					)}
					{flyingDrivers.map((timingDriver) => {
						const driver = drivers?.[timingDriver.RacingNumber];
						if (!driver) return null;
						return (
							<HotLapCard
								key={timingDriver.RacingNumber}
								driver={driver}
								timingDriver={timingDriver}
								appTimingDriver={appData?.Lines?.[timingDriver.RacingNumber]}
								benchmarkName={benchmarkDriver?.Tla}
								benchmarkTime={benchmark?.BestLapTime?.Value}
								benchmarkSectors={benchmark ? timingStats?.Lines?.[benchmark.RacingNumber]?.BestSectors : undefined}
							/>
						);
					})}
				</AnimatePresence>
			</div>
		</section>
	);
}

function HotLapSkeleton() {
	const pulse = "animate-pulse rounded-md bg-cyan-950/60";
	return (
		<div className="data-chip min-w-72 rounded-lg p-3">
			<div className="flex justify-between">
				<div className={clsx(pulse, "h-8 w-24")} />
				<div className={clsx(pulse, "h-8 w-8 rounded-full")} />
			</div>
			<div className={clsx(pulse, "mt-4 h-9 w-32")} />
			<div className="mt-4 grid grid-cols-3 gap-1">
				{[0, 1, 2].map((index) => (
					<div key={index} className={clsx(pulse, "h-14")} />
				))}
			</div>
		</div>
	);
}
