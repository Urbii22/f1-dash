"use client";

import clsx from "clsx";
import { X } from "lucide-react";
import Image from "next/image";

import {
	buildDriverComparison,
	calculateDriverGap,
	calculateSectorDelta,
	parseTimingSeconds,
	type ComparisonSector,
	type DriverComparisonModel,
} from "@/lib/driverComparison";
import { useDataStore } from "@/stores/useDataStore";
import { useDriverSelectionStore } from "@/stores/useDriverSelectionStore";
import type { TimingDataDriver } from "@/types/state.type";

export default function DriverComparisonPanel() {
	const comparedDrivers = useDriverSelectionStore((state) => state.comparedDrivers);
	const clearComparedDrivers = useDriverSelectionStore((state) => state.clearComparedDrivers);
	const state = useDataStore((store) => store.state);

	const compared = comparedDrivers
		.map((number) =>
			buildDriverComparison(number, {
				driver: state?.DriverList?.[number],
				timing: state?.TimingData?.Lines?.[number],
				stats: state?.TimingStats?.Lines?.[number],
				app: state?.TimingAppData?.Lines?.[number],
			}),
		)
		.filter((driver): driver is DriverComparisonModel => driver !== null);

	return (
		<section data-testid="head-to-head-panel" className="telemetry-panel min-w-0 rounded-lg p-4 xl:min-h-[34rem]">
			<div className="flex items-center justify-between border-b border-cyan-300/10 pb-3">
				<p className="panel-title">Head to Head</p>
				{compared.length > 0 && (
					<button
						aria-label="Clear driver comparison"
						className="data-chip rounded-md p-1.5 text-zinc-400 transition-colors hover:text-white"
						onClick={clearComparedDrivers}
					>
						<X size={14} />
					</button>
				)}
			</div>

			{compared.length === 0 && (
				<EmptyState text="Select two drivers from the leaderboard or track map to compare them." />
			)}
			{compared.length === 1 && <SingleDriverState driver={compared[0]} />}
			{compared.length === 2 && (
				<Comparison
					first={compared[0]}
					second={compared[1]}
					firstTiming={state?.TimingData?.Lines?.[compared[0].number]}
					secondTiming={state?.TimingData?.Lines?.[compared[1].number]}
				/>
			)}
		</section>
	);
}

function Comparison({
	first,
	second,
	firstTiming,
	secondTiming,
}: {
	first: DriverComparisonModel;
	second: DriverComparisonModel;
	firstTiming: TimingDataDriver | undefined;
	secondTiming: TimingDataDriver | undefined;
}) {
	if (!firstTiming || !secondTiming) return <EmptyState text="Waiting for live timing data." />;

	const gap = calculateDriverGap(firstTiming, secondTiming);
	const leader = gap.leaderNumber === first.number ? first : second;
	const trailer = gap.trailingNumber === first.number ? first : second;

	return (
		<div className="mt-3 flex min-h-0 flex-col gap-3">
			<div className="grid grid-cols-[minmax(0,1fr)_11rem_minmax(0,1fr)] items-center rounded-md border border-cyan-300/10 bg-black/20 max-sm:grid-cols-[minmax(0,1fr)_8rem_minmax(0,1fr)]">
				<DriverIdentity driver={first} />
				<div className="border-x border-cyan-300/10 bg-black/30 px-3 py-3 text-center">
					<p className="font-mono text-xs font-bold tracking-wider text-zinc-500 uppercase">Real gap</p>
					<p className="mt-1 font-mono text-3xl font-black text-white">{gap.value}</p>
					<p className="mt-1 truncate font-mono text-xs font-bold text-cyan-300">
						{leader.tla} ahead{gap.catching ? ` · ${trailer.tla} closing` : ""}
					</p>
				</div>
				<DriverIdentity driver={second} align="right" />
			</div>

			<div className="grid grid-cols-2 gap-2">
				<StrategyCard driver={first} align="left" />
				<StrategyCard driver={second} align="right" />
			</div>

			<LapTimes first={first} second={second} />

			<div className="min-h-0 flex-1">
				<div className="mb-2 flex items-end justify-between gap-3">
					<div>
						<p className="font-mono text-xs font-bold text-cyan-300 uppercase">Current lap</p>
						<h3 className="text-lg font-black text-white">Sectors and microsectors</h3>
					</div>
					<p className="font-mono text-[0.68rem] text-zinc-500">MEASURED TIMING ONLY</p>
				</div>
				<div className="grid gap-2 md:grid-cols-3">
					{[0, 1, 2].map((index) => (
						<SectorComparison
							key={index}
							index={index}
							first={first.sectors[index]}
							second={second.sectors[index]}
							firstTla={first.tla}
							secondTla={second.tla}
						/>
					))}
				</div>
			</div>
		</div>
	);
}

function DriverIdentity({ driver, align = "left" }: { driver: DriverComparisonModel; align?: "left" | "right" }) {
	return (
		<div className={clsx("min-w-0 px-4 py-3", align === "right" && "text-right")}>
			<div className={clsx("flex items-center gap-3", align === "right" && "flex-row-reverse")}>
				<span className="h-12 w-1.5 shrink-0 rounded-sm" style={{ backgroundColor: `#${driver.teamColour}` }} />
				<div className="min-w-0">
					<p className="text-2xl leading-none font-black text-white">{driver.tla}</p>
					<p className="mt-1.5 truncate text-sm text-zinc-400">{driver.fullName}</p>
				</div>
			</div>
		</div>
	);
}

function StrategyCard({ driver, align }: { driver: DriverComparisonModel; align: "left" | "right" }) {
	const activeStatus = driver.status !== "ON TRACK";
	const compound = driver.stint.compound.toLowerCase();
	const tireAsset = ["soft", "medium", "hard", "intermediate", "wet"].includes(compound) ? compound : null;
	return (
		<div className={clsx("rounded-md border border-cyan-300/10 bg-cyan-950/10 p-3", align === "right" && "text-right")}>
			<div className={clsx("flex flex-wrap items-center gap-2", align === "right" && "flex-row-reverse")}>
				<span className="font-mono text-lg font-black text-white">P{driver.position}</span>
				<span className="font-mono text-sm text-zinc-400">LAP {driver.laps}</span>
				<span
					className={clsx(
						"rounded px-2 py-1 font-mono text-xs font-black",
						activeStatus ? "bg-amber-400/15 text-amber-300" : "bg-emerald-400/10 text-emerald-400",
					)}
				>
					{driver.status}
				</span>
			</div>
			<div className={clsx("mt-3 flex flex-wrap items-center gap-3", align === "right" && "flex-row-reverse")}>
				{tireAsset ? (
					<Image src={`/tires/${tireAsset}.svg`} width={40} height={40} alt={driver.stint.compound} />
				) : (
					<span className="flex h-10 w-10 items-center justify-center font-mono text-xl font-black text-white">--</span>
				)}
				<span className="font-mono text-sm text-zinc-300">
					{driver.stint.age === "--" ? "--" : `${driver.stint.age} laps`}
				</span>
				<span className="font-mono text-sm text-zinc-400">
					{driver.stint.stops} {driver.stint.stops === 1 ? "stop" : "stops"}
				</span>
			</div>
		</div>
	);
}

function LapTimes({ first, second }: { first: DriverComparisonModel; second: DriverComparisonModel }) {
	const lastWinner = compareLower(first.lastLap, second.lastLap);
	const bestWinner = compareLower(first.bestLap, second.bestLap);

	return (
		<div className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-cyan-300/10 bg-cyan-300/10 sm:grid-cols-4">
			<LapValue label={`${first.tla} last`} value={first.lastLap} accent={lastWinner === "first"} />
			<LapValue label={`${second.tla} last`} value={second.lastLap} accent={lastWinner === "second"} />
			<LapValue label={`${first.tla} best`} value={first.bestLap} accent={bestWinner === "first"} />
			<LapValue label={`${second.tla} best`} value={second.bestLap} accent={bestWinner === "second"} />
		</div>
	);
}

function LapValue({ label, value, accent }: { label: string; value: string; accent: boolean }) {
	return (
		<div className="bg-black/35 px-3 py-2.5 text-center">
			<p className="font-mono text-xs font-bold text-zinc-500 uppercase">{label}</p>
			<p className={clsx("mt-1 font-mono text-base font-bold", accent ? "text-emerald-400" : "text-zinc-200")}>
				{value}
			</p>
		</div>
	);
}

function SectorComparison({
	index,
	first,
	second,
	firstTla,
	secondTla,
}: {
	index: number;
	first: ComparisonSector;
	second: ComparisonSector;
	firstTla: string;
	secondTla: string;
}) {
	const delta = calculateSectorDelta(first, second).replace(/^A /, `${firstTla} `).replace(/^B /, `${secondTla} `);
	const segmentCount = Math.max(first.segments.length, second.segments.length, 1);

	return (
		<div className="min-w-0 rounded-md border border-cyan-300/10 bg-black/20 p-3">
			<div className="flex items-center justify-between gap-2">
				<span className="font-mono text-lg font-black text-white">S{index + 1}</span>
				<span className={clsx("font-mono text-sm font-bold", delta === "--" ? "text-zinc-600" : "text-emerald-400")}>
					{delta}
				</span>
			</div>
			<div className="mt-3 grid grid-cols-[3rem_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-3">
				<SectorTime tla={firstTla} sector={first} />
				<MicroSectorRow statuses={first.segments} segmentCount={segmentCount} />
				<span className="font-mono text-sm font-bold text-white">{first.value}</span>
				<SectorTime tla={secondTla} sector={second} />
				<MicroSectorRow statuses={second.segments} segmentCount={segmentCount} />
				<span className="font-mono text-sm font-bold text-white">{second.value}</span>
			</div>
		</div>
	);
}

function SectorTime({ tla, sector }: { tla: string; sector: ComparisonSector }) {
	return (
		<span
			className={clsx("font-mono text-xs font-bold", {
				"text-violet-400": sector.overallFastest,
				"text-emerald-400": !sector.overallFastest && sector.personalFastest,
				"text-zinc-500": !sector.overallFastest && !sector.personalFastest,
			})}
		>
			{tla}
		</span>
	);
}

function MicroSectorRow({ statuses, segmentCount }: { statuses: number[]; segmentCount: number }) {
	return (
		<div className="tech-scrollbar overflow-x-auto pb-0.5">
			<div className="grid min-w-max gap-1.5" style={{ gridTemplateColumns: `repeat(${segmentCount}, 1rem)` }}>
				{Array.from({ length: segmentCount }, (_, index) => (
					<MicroSector key={index} status={statuses[index] ?? 0} />
				))}
			</div>
		</div>
	);
}

function MicroSector({ status }: { status: number }) {
	return (
		<span
			className={clsx("h-3 w-4 rounded-[3px]", {
				"bg-zinc-800": status === 0,
				"bg-amber-400": status === 2048 || status === 2052,
				"bg-emerald-500": status === 2049,
				"bg-violet-500": status === 2051,
				"bg-blue-500": status === 2064,
			})}
		/>
	);
}

function SingleDriverState({ driver }: { driver: DriverComparisonModel }) {
	return (
		<div className="mt-3 rounded-md border border-cyan-300/10 bg-black/20 p-4">
			<div className="flex items-center gap-3">
				<span className="h-10 w-1 rounded-sm" style={{ backgroundColor: `#${driver.teamColour}` }} />
				<div>
					<p className="text-xl font-black text-white">{driver.tla}</p>
					<p className="text-sm text-zinc-400">{driver.fullName}</p>
				</div>
			</div>
			<p className="mt-3 text-sm text-cyan-200">Select a rival from the leaderboard or track map.</p>
		</div>
	);
}

function EmptyState({ text }: { text: string }) {
	return <p className="mt-3 rounded-md border border-cyan-300/10 bg-black/20 p-4 text-sm text-zinc-400">{text}</p>;
}

function compareLower(first: string, second: string): "first" | "second" | null {
	const firstValue = parseTimingSeconds(first);
	const secondValue = parseTimingSeconds(second);
	if (firstValue === null || secondValue === null || firstValue === secondValue) return null;
	return firstValue < secondValue ? "first" : "second";
}
