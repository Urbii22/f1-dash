"use client";

import clsx from "clsx";
import { X } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

import {
	buildDriverComparison,
	buildFeedBestLap,
	calculateDriverGap,
	calculateSectorDelta,
	parseTimingSeconds,
	type ComparisonSector,
	type DriverComparisonModel,
} from "@/lib/driverComparison";
import { formatLapTimeMs, getBestLap, type LapRecord } from "@/lib/lapHistory";
import { formatStrategyGap, projectUndercut } from "@/lib/strategy";
import { liveGapMs } from "@/components/analysis/StrategyView";
import { useStrategy } from "@/hooks/useStrategy";
import { useDataStore } from "@/stores/useDataStore";
import { useDriverSelectionStore } from "@/stores/useDriverSelectionStore";
import { useLapHistoryStore } from "@/stores/useLapHistoryStore";
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
	const [lapView, setLapView] = useState<"live" | "best">("live");
	const firstLaps = useLapHistoryStore((store) => store.laps[first.number]);
	const secondLaps = useLapHistoryStore((store) => store.laps[second.number]);
	const firstBest = getBestLap(firstLaps);
	const secondBest = getBestLap(secondLaps);
	const firstFeedBest = buildFeedBestLap(useDataStore((store) => store.state?.TimingStats?.Lines?.[first.number]));
	const secondFeedBest = buildFeedBestLap(useDataStore((store) => store.state?.TimingStats?.Lines?.[second.number]));

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

			<div className="grid grid-cols-2 gap-2">
				<PaceSparkline driver={first} />
				<PaceSparkline driver={second} align="right" />
			</div>

			<UndercutCard first={first} second={second} />

			<div className="min-h-0 flex-1">
				<div className="mb-2 flex items-end justify-between gap-3">
					<div>
						<p className="font-mono text-xs font-bold text-cyan-300 uppercase">
							{lapView === "live" ? "Current lap" : "Fastest recorded laps"}
						</p>
						<h3 className="text-lg font-black text-white">
							{lapView === "live" ? "Sectors and microsectors" : "Best lap comparison"}
						</h3>
					</div>
					<div className="flex rounded-md border border-cyan-300/10 bg-black/30 p-1">
						<LapViewButton active={lapView === "live"} onClick={() => setLapView("live")}>
							LIVE LAP
						</LapViewButton>
						<LapViewButton active={lapView === "best"} onClick={() => setLapView("best")}>
							BEST LAPS
						</LapViewButton>
					</div>
				</div>
				{lapView === "live" ? (
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
				) : (
					<BestLapsComparison
						first={first}
						second={second}
						firstLap={firstBest}
						secondLap={secondBest}
						firstFeed={firstFeedBest}
						secondFeed={secondFeedBest}
					/>
				)}
			</div>
		</div>
	);
}

function LapViewButton({
	active,
	onClick,
	children,
}: {
	active: boolean;
	onClick: () => void;
	children: React.ReactNode;
}) {
	return (
		<button
			type="button"
			aria-pressed={active}
			onClick={onClick}
			className={clsx(
				"rounded px-2.5 py-1.5 font-mono text-[0.68rem] font-bold transition-colors",
				active ? "bg-cyan-300 text-cyan-950" : "text-zinc-500 hover:text-cyan-200",
			)}
		>
			{children}
		</button>
	);
}

function BestLapsComparison({
	first,
	second,
	firstLap,
	secondLap,
	firstFeed,
	secondFeed,
}: {
	first: DriverComparisonModel;
	second: DriverComparisonModel;
	firstLap: LapRecord | null;
	secondLap: LapRecord | null;
	firstFeed: ReturnType<typeof buildFeedBestLap>;
	secondFeed: ReturnType<typeof buildFeedBestLap>;
}) {
	const firstData = firstLap ?? firstFeed;
	const secondData = secondLap ?? secondFeed;
	if (!firstData || !secondData) {
		const pending = [!firstData ? first.tla : null, !secondData ? second.tla : null].filter(Boolean).join(" and ");
		return <EmptyState text={`Waiting for a valid completed lap from ${pending}.`} />;
	}

	const deltaMs = Math.abs((firstData.lapTimeMs as number) - (secondData.lapTimeMs as number));
	const faster = (firstData.lapTimeMs as number) <= (secondData.lapTimeMs as number) ? first.tla : second.tla;
	const exactSectors = Boolean(firstLap && secondLap);

	return (
		<div className="space-y-2">
			<div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-stretch overflow-hidden rounded-md border border-cyan-300/10 bg-black/25">
				<BestLapSummary driver={first} lap={firstLap} feed={firstFeed} />
				<div className="flex min-w-28 flex-col items-center justify-center border-x border-cyan-300/10 bg-black/30 px-3 text-center">
					<p className="font-mono text-[0.65rem] font-bold text-zinc-500 uppercase">Delta</p>
					<p className="mt-1 font-mono text-lg font-black text-emerald-400">{formatLapTimeMs(deltaMs)}</p>
					<p className="font-mono text-[0.65rem] text-cyan-300">{faster} faster</p>
				</div>
				<BestLapSummary driver={second} lap={secondLap} feed={secondFeed} align="right" />
			</div>
			<p className="font-mono text-[0.65rem] text-zinc-500 uppercase">
				{exactSectors ? "Sectors from each recorded best lap" : "Best individual sectors from official timing"}
			</p>
			<div className="grid gap-2 md:grid-cols-3">
				{[0, 1, 2].map((index) => (
					<BestSectorComparison
						key={index}
						index={index}
						firstTla={first.tla}
						secondTla={second.tla}
						firstMs={firstData.sectorsMs[index]}
						secondMs={secondData.sectorsMs[index]}
					/>
				))}
			</div>
		</div>
	);
}

function BestLapSummary({
	driver,
	lap,
	feed,
	align = "left",
}: {
	driver: DriverComparisonModel;
	lap: LapRecord | null;
	feed: ReturnType<typeof buildFeedBestLap>;
	align?: "left" | "right";
}) {
	return (
		<div className={clsx("min-w-0 p-3", align === "right" && "text-right")}>
			<p className="font-mono text-xs font-bold text-zinc-500">{driver.tla}{lap ? ` · LAP ${lap.lap}` : " · OFFICIAL BEST"}</p>
			<p className="mt-1 font-mono text-xl font-black text-white">
				{formatLapTimeMs(lap?.lapTimeMs ?? feed?.lapTimeMs)}
			</p>
			<p className="mt-1 font-mono text-xs text-zinc-400">
				{lap ? `${lap.compound ?? "UNKNOWN"} · tyre ${lap.tyreAge ?? "--"} laps` : "Session timing feed"}
			</p>
		</div>
	);
}

function BestSectorComparison({
	index,
	firstTla,
	secondTla,
	firstMs,
	secondMs,
}: {
	index: number;
	firstTla: string;
	secondTla: string;
	firstMs: number | null;
	secondMs: number | null;
}) {
	const available = firstMs !== null && secondMs !== null;
	const delta = available ? Math.abs(firstMs - secondMs) : null;
	const faster = !available ? null : firstMs <= secondMs ? firstTla : secondTla;

	return (
		<div className="rounded-md border border-cyan-300/10 bg-black/20 p-3">
			<div className="flex items-center justify-between">
				<span className="font-mono text-lg font-black text-white">S{index + 1}</span>
				<span className="font-mono text-xs font-bold text-emerald-400">
					{delta === null ? "--" : `${faster} -${formatLapTimeMs(delta)}`}
				</span>
			</div>
			<div className="mt-3 flex items-center justify-between font-mono text-sm">
				<span className="text-zinc-500">{firstTla}</span>
				<span className="font-bold text-white">{formatLapTimeMs(firstMs)}</span>
			</div>
			<div className="mt-2 flex items-center justify-between font-mono text-sm">
				<span className="text-zinc-500">{secondTla}</span>
				<span className="font-bold text-white">{formatLapTimeMs(secondMs)}</span>
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

const SPARKLINE_LAPS = 10;

function PaceSparkline({ driver, align = "left" }: { driver: DriverComparisonModel; align?: "left" | "right" }) {
	const laps = useLapHistoryStore((state) => state.laps[driver.number]);

	const recent = (laps ?? []).filter((lap) => lap.lapTimeMs !== null && !lap.pitted).slice(-SPARKLINE_LAPS);

	if (recent.length < 2) {
		return (
			<div className={clsx("rounded-md border border-cyan-300/10 bg-black/20 p-2", align === "right" && "text-right")}>
				<p className="font-mono text-[0.65rem] font-bold text-zinc-500 uppercase">{driver.tla} pace trend</p>
				<p className="mt-1 font-mono text-xs text-zinc-600">Building lap history…</p>
			</div>
		);
	}

	const times = recent.map((lap) => lap.lapTimeMs as number);
	const min = Math.min(...times);
	const max = Math.max(...times);
	const span = Math.max(1, max - min);

	const width = 120;
	const height = 28;
	const points = recent
		.map((lap, index) => {
			const x = (index / (recent.length - 1)) * width;
			// faster laps plotted higher
			const y = 2 + (((lap.lapTimeMs as number) - min) / span) * (height - 4);
			return `${x.toFixed(1)},${y.toFixed(1)}`;
		})
		.join(" ");

	const last = recent[recent.length - 1];

	return (
		<div className={clsx("rounded-md border border-cyan-300/10 bg-black/20 p-2", align === "right" && "text-right")}>
			<p className="font-mono text-[0.65rem] font-bold text-zinc-500 uppercase">
				{driver.tla} pace · last {recent.length} laps
			</p>
			<div className={clsx("mt-1 flex items-center gap-2", align === "right" && "flex-row-reverse")}>
				<svg viewBox={`0 0 ${width} ${height}`} className="h-7 w-28 shrink-0">
					<polyline
						fill="none"
						stroke={`#${driver.teamColour}`}
						strokeWidth={1.5}
						strokeLinejoin="round"
						strokeLinecap="round"
						points={points}
					/>
				</svg>
				<span className="font-mono text-xs text-zinc-300">{formatLapTimeMs(last.lapTimeMs)}</span>
			</div>
		</div>
	);
}

function UndercutCard({ first, second }: { first: DriverComparisonModel; second: DriverComparisonModel }) {
	const strategy = useStrategy();
	const timing = useDataStore((state) => state.state?.TimingData?.Lines);

	if (!strategy.ready) return null;

	const a = strategy.models[first.number];
	const b = strategy.models[second.number];
	if (!a || !b) return null;

	const gapMs = liveGapMs(first.number, second.number, timing);
	if (gapMs === null) return null;

	const attacker = gapMs < 0 ? first : second;
	const defender = attacker === first ? second : first;
	const attackerModel = strategy.models[attacker.number];
	const defenderModel = strategy.models[defender.number];
	const attackerGap = attacker === first ? gapMs : -gapMs;

	const projection = projectUndercut(attackerModel, defenderModel, attackerGap, strategy.pitLossMs);

	return (
		<div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-cyan-300/10 bg-black/20 p-3">
			<div>
				<p className="font-mono text-xs font-bold text-cyan-300 uppercase">
					Undercut · {attacker.tla} pits now <span className="text-amber-300/80">EST</span>
				</p>
				<p className="mt-0.5 font-mono text-xs text-zinc-500">
					Pit loss ~{(strategy.pitLossMs / 1000).toFixed(1)}s · vs {defender.tla}
				</p>
			</div>
			<span
				className={clsx(
					"rounded-md px-2 py-1 font-mono text-xs font-bold",
					projection.works ? "bg-emerald-400/15 text-emerald-300" : "bg-rose-400/15 text-rose-300",
				)}
			>
				{projection.works
					? `WORKS · ahead in ~${projection.crossoverLap}L`
					: `NO · ${formatStrategyGap(projection.gapAfterStop)} after ${projection.horizonLaps}L`}
			</span>
		</div>
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
