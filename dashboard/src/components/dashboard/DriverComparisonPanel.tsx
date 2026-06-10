"use client";

import clsx from "clsx";

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
	const carsData = useDataStore((store) => store.carsData);

	const compared = comparedDrivers
		.map((number) =>
			buildDriverComparison(number, {
				driver: state?.DriverList?.[number],
				timing: state?.TimingData?.Lines?.[number],
				stats: state?.TimingStats?.Lines?.[number],
				app: state?.TimingAppData?.Lines?.[number],
				car: carsData?.[number]?.Channels,
			}),
		)
		.filter((driver): driver is DriverComparisonModel => driver !== null);

	return (
		<section data-testid="head-to-head-panel" className="telemetry-panel min-w-0 rounded-lg p-3">
			<div className="flex items-center justify-between border-b border-cyan-300/10 pb-3">
				<div>
					<p className="panel-title">Head to Head</p>
					<h2 className="text-xl font-black text-white">Live Driver Compare</h2>
				</div>
				<button className="data-chip rounded-md px-2 py-1 text-xs text-cyan-200" onClick={clearComparedDrivers}>
					Clear
				</button>
			</div>

			{compared.length === 0 && <EmptyState text="Double-click two driver rows or map markers to compare them live." />}
			{compared.length === 1 && <SingleDriverState driver={compared[0]} />}
			{compared.length === 2 && (
				<ComparisonMatrix
					first={compared[0]}
					second={compared[1]}
					firstTiming={state?.TimingData?.Lines?.[compared[0].number]}
					secondTiming={state?.TimingData?.Lines?.[compared[1].number]}
				/>
			)}
		</section>
	);
}

function ComparisonMatrix({
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
	const leading = gap.leaderNumber === first.number ? first : second;
	const trailing = gap.trailingNumber === first.number ? first : second;
	const lapAdvantage = compareLower(first.lastLap, second.lastLap);
	const bestLapAdvantage = compareLower(first.bestLap, second.bestLap);

	return (
		<div className="tech-scrollbar mt-3 overflow-x-auto">
			<div className="min-w-[46rem] overflow-hidden rounded-md border border-cyan-300/10 bg-black/20">
				<div className="grid grid-cols-[minmax(0,1fr)_10rem_minmax(0,1fr)] border-b border-cyan-300/10">
					<DriverHeading driver={first} />
					<div className="border-x border-cyan-300/10 bg-black/30 px-3 py-2 text-center">
						<p className="font-mono text-[0.6rem] font-bold text-zinc-500 uppercase">Real gap</p>
						<p className="mt-1 font-mono text-2xl font-black text-white">{gap.value}</p>
						<p className="mt-1 font-mono text-[0.62rem] text-cyan-300">
							{leading.tla} ahead{gap.catching ? ` · ${trailing.tla} closing` : ""}
						</p>
					</div>
					<DriverHeading driver={second} align="right" />
				</div>

				<CompareRow
					label="Position / lap"
					first={{ value: `P${first.position} · LAP ${first.laps}`, detail: first.status }}
					second={{ value: `P${second.position} · LAP ${second.laps}`, detail: second.status }}
				/>
				<CompareRow
					label="Tyre / stint"
					first={{ value: `${first.stint.compound} · ${first.stint.age} laps`, detail: `${first.stint.stops} stops` }}
					second={{ value: `${second.stint.compound} · ${second.stint.age} laps`, detail: `${second.stint.stops} stops` }}
				/>
				<CompareRow
					label="Last lap"
					delta={timingDelta(first.lastLap, second.lastLap, first.tla, second.tla)}
					first={{ value: first.lastLap, detail: `Best ${first.bestLap}`, accent: lapAdvantage === "first" }}
					second={{ value: second.lastLap, detail: `Best ${second.bestLap}`, accent: lapAdvantage === "second" }}
				/>
				<CompareRow
					label="Personal best"
					delta={timingDelta(first.bestLap, second.bestLap, first.tla, second.tla)}
					first={{ value: first.bestLap, detail: `Last ${first.lastLap}`, accent: bestLapAdvantage === "first" }}
					second={{ value: second.bestLap, detail: `Last ${second.lastLap}`, accent: bestLapAdvantage === "second" }}
				/>
				<CompareRow
					label="Race reference"
					first={{ value: first.gapToLeader, detail: `Interval ${first.interval}` }}
					second={{ value: second.gapToLeader, detail: `Interval ${second.interval}` }}
				/>
				<CompareRow
					label="Speed traps"
					first={{ value: speedTrapText(first), detail: "I1 · I2 · FL · ST" }}
					second={{ value: speedTrapText(second), detail: "I1 · I2 · FL · ST" }}
				/>
				<CompareRow
					label="Speed / gear / DRS"
					first={{ value: telemetryDriveText(first), detail: telemetryPedalText(first) }}
					second={{ value: telemetryDriveText(second), detail: telemetryPedalText(second) }}
				/>
				<CompareRow
					label="Engine"
					first={{ value: formatChannel(first.telemetry.rpm, "rpm"), detail: `Brake ${formatBrake(first.telemetry.brake)}` }}
					second={{ value: formatChannel(second.telemetry.rpm, "rpm"), detail: `Brake ${formatBrake(second.telemetry.brake)}` }}
				/>

				<div className="p-3">
					<div className="mb-2 flex items-center justify-between gap-3">
						<div>
							<p className="font-mono text-[0.62rem] font-bold text-cyan-300 uppercase">Current lap</p>
							<h3 className="text-sm font-black text-white">Sectors and microsectors</h3>
						</div>
						<p className="font-mono text-[0.58rem] text-zinc-500">LIVE STATUS · NO PROJECTION</p>
					</div>
					<div className="grid grid-cols-3 gap-2">
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
		</div>
	);
}

function DriverHeading({ driver, align = "left" }: { driver: DriverComparisonModel; align?: "left" | "right" }) {
	return (
		<div className={clsx("px-4 py-3", align === "right" && "text-right")}>
			<div className={clsx("flex items-center gap-3", align === "right" && "flex-row-reverse")}>
				<span className="h-9 w-1 rounded-sm" style={{ backgroundColor: `#${driver.teamColour}` }} />
				<div>
					<p className="text-xl font-black text-white">{driver.tla}</p>
					<p className="text-xs text-zinc-500">{driver.fullName}</p>
				</div>
			</div>
		</div>
	);
}

type ComparisonValue = { value: string; detail: string; accent?: boolean };

function CompareRow({
	label,
	delta,
	first,
	second,
}: {
	label: string;
	delta?: string;
	first: ComparisonValue;
	second: ComparisonValue;
}) {
	return (
		<div className="grid grid-cols-[minmax(0,1fr)_10rem_minmax(0,1fr)] border-b border-cyan-300/10 last:border-b-0">
			<ComparisonCell {...first} align="right" />
			<div className="flex min-h-14 flex-col items-center justify-center border-x border-cyan-300/10 bg-black/25 px-2 text-center">
				<p className="font-mono text-[0.58rem] font-bold text-zinc-500 uppercase">{label}</p>
				{delta && <p className="mt-1 font-mono text-[0.62rem] font-bold text-emerald-400">{delta}</p>}
			</div>
			<ComparisonCell {...second} />
		</div>
	);
}

function ComparisonCell({ value, detail, accent, align = "left" }: ComparisonValue & { align?: "left" | "right" }) {
	return (
		<div className={clsx("flex min-h-14 items-center px-4 py-2", align === "right" && "justify-end text-right")}>
			<div>
				<p className={clsx("font-mono text-sm font-black", accent ? "text-emerald-400" : "text-white")}>{value}</p>
				<p className="mt-1 font-mono text-[0.62rem] text-zinc-500">{detail}</p>
			</div>
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
		<div className="min-w-0 rounded-md border border-cyan-300/10 bg-cyan-950/10 p-2">
			<div className="flex items-center justify-between gap-2 font-mono text-[0.62rem] font-bold">
				<span className="text-white">S{index + 1}</span>
				<span className={delta === "--" ? "text-zinc-600" : "text-emerald-400"}>{delta}</span>
			</div>
			<div className="tech-scrollbar mt-2 overflow-x-auto pb-1">
				<div className="grid min-w-32 gap-1" style={{ gridTemplateColumns: `repeat(${segmentCount}, minmax(0, 1fr))` }}>
					{Array.from({ length: segmentCount }, (_, segmentIndex) => (
						<div key={segmentIndex} className="flex flex-col gap-1">
							<MicroSector status={first.segments[segmentIndex] ?? 0} />
							<MicroSector status={second.segments[segmentIndex] ?? 0} />
						</div>
					))}
				</div>
			</div>
			<div className="mt-2 flex items-center justify-between font-mono text-[0.62rem]">
				<span className="text-white">{first.value}</span>
				<span className="text-zinc-500">{second.value}</span>
			</div>
			<div className="mt-1 flex justify-between font-mono text-[0.52rem] text-zinc-600">
				<span>{firstTla}</span>
				<span>{secondTla}</span>
			</div>
		</div>
	);
}

function MicroSector({ status }: { status: number }) {
	return (
		<span
			className={clsx("h-1.5 min-w-2 rounded-[2px]", {
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
			<p className="text-xl font-black text-white">{driver.tla}</p>
			<p className="text-sm text-zinc-400">{driver.fullName}</p>
			<p className="mt-3 text-sm text-cyan-200">Double-click another driver to start the live comparison.</p>
		</div>
	);
}

function EmptyState({ text }: { text: string }) {
	return <p className="mt-3 rounded-md border border-cyan-300/10 bg-black/20 p-4 text-sm text-zinc-400">{text}</p>;
}

function timingDelta(first: string, second: string, firstTla: string, secondTla: string): string | undefined {
	const firstSeconds = parseTimingSeconds(first);
	const secondSeconds = parseTimingSeconds(second);
	if (firstSeconds === null || secondSeconds === null) return undefined;
	const difference = Math.abs(firstSeconds - secondSeconds);
	return `${firstSeconds <= secondSeconds ? firstTla : secondTla} -${difference.toFixed(3)}`;
}

function compareLower(first: string, second: string): "first" | "second" | null {
	const firstValue = parseTimingSeconds(first);
	const secondValue = parseTimingSeconds(second);
	if (firstValue === null || secondValue === null || firstValue === secondValue) return null;
	return firstValue < secondValue ? "first" : "second";
}

function speedTrapText(driver: DriverComparisonModel): string {
	return driver.speedTraps.map((trap) => trap.value).join(" · ");
}

function telemetryDriveText(driver: DriverComparisonModel): string {
	return `${formatChannel(driver.telemetry.speed, "km/h")} · G${driver.telemetry.gear ?? "--"} · ${formatDrs(driver.telemetry.drs)}`;
}

function telemetryPedalText(driver: DriverComparisonModel): string {
	return `Throttle ${formatChannel(driver.telemetry.throttle, "%")} · Brake ${formatBrake(driver.telemetry.brake)}`;
}

function formatChannel(value: number | null, unit: string): string {
	return value === null ? "--" : `${Math.round(value)} ${unit}`;
}

function formatBrake(value: number | null): string {
	if (value === null) return "--";
	if (value <= 1) return value > 0 ? "ON" : "OFF";
	return `${Math.round(value)}%`;
}

function formatDrs(value: number | null): string {
	if (value === null) return "DRS --";
	if (value === 8) return "DRS READY";
	return value > 0 ? "DRS ON" : "DRS OFF";
}
