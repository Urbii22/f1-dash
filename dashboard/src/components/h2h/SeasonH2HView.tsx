import Link from "next/link";

import type { DriverStandingRow } from "@/lib/f1data";
import { driverFullName } from "@/lib/f1data";
import type { SeasonH2H } from "@/lib/seasonH2H";

export default function SeasonH2HView({
	driverA,
	driverB,
	comparison,
	season,
}: {
	driverA: DriverStandingRow;
	driverB: DriverStandingRow;
	comparison: SeasonH2H;
	season: number;
}) {
	const nameA = driverFullName(driverA.driver);
	const nameB = driverFullName(driverB.driver);
	const pointsA = driverA.points ?? comparison.a.points;
	const pointsB = driverB.points ?? comparison.b.points;
	return (
		<div className="flex flex-col gap-4">
			<div className="grid gap-3 md:grid-cols-2">
				<DriverCard row={driverA} summary={comparison.a} season={season} />
				<DriverCard row={driverB} summary={comparison.b} season={season} />
			</div>
			<Metric title="Race head-to-head" a={comparison.race.a} b={comparison.race.b} labelA={nameA} labelB={nameB} />
			<Metric
				title="Qualifying head-to-head"
				a={comparison.qualifying.a}
				b={comparison.qualifying.b}
				labelA={nameA}
				labelB={nameB}
			/>
			<Metric title="Points" a={pointsA} b={pointsB} labelA={nameA} labelB={nameB} />
			<Metric title="Podiums" a={comparison.a.podiums} b={comparison.b.podiums} labelA={nameA} labelB={nameB} />
			<div className="telemetry-panel grid gap-3 rounded-lg p-4 sm:grid-cols-2">
				<StatGroup name={nameA} best={comparison.a.best} worst={comparison.a.worst} wins={comparison.a.wins} />
				<StatGroup name={nameB} best={comparison.b.best} worst={comparison.b.worst} wins={comparison.b.wins} />
			</div>
		</div>
	);
}

function DriverCard({ row, summary, season }: { row: DriverStandingRow; summary: SeasonH2H["a"]; season: number }) {
	const points = row.points ?? summary.points;
	return (
		<Link
			href={`/driver/${row.driver.driverId}?season=${season}`}
			className="telemetry-panel rounded-lg p-4 transition hover:border-cyan-300/50"
		>
			<p className="panel-title">
				P{row.position} · {row.constructor}
			</p>
			<h2 className="text-2xl font-black">{driverFullName(row.driver)}</h2>
			<p className="mt-2 font-mono text-cyan-200">
				{points} pts · {summary.podiums} podiums
			</p>
		</Link>
	);
}

function Metric({
	title,
	a,
	b,
	labelA,
	labelB,
}: {
	title: string;
	a: number;
	b: number;
	labelA: string;
	labelB: string;
}) {
	const total = Math.max(1, a + b);
	return (
		<section className="telemetry-panel rounded-lg p-4">
			<div className="mb-3 flex items-center justify-between">
				<h3 className="font-black">{title}</h3>
				<span className="font-mono text-lg">
					<strong className="text-cyan-300">{a}</strong> - <strong className="text-rose-300">{b}</strong>
				</span>
			</div>
			<div className="flex h-3 overflow-hidden rounded-full bg-zinc-900">
				<div className="bg-cyan-300" style={{ width: `${(a / total) * 100}%` }} />
				<div className="bg-rose-400" style={{ width: `${(b / total) * 100}%` }} />
			</div>
			<div className="mt-2 flex justify-between text-xs text-zinc-500">
				<span>{labelA}</span>
				<span>{labelB}</span>
			</div>
		</section>
	);
}

function StatGroup({
	name,
	best,
	worst,
	wins,
}: {
	name: string;
	best: number | null;
	worst: number | null;
	wins: number;
}) {
	return (
		<div className="data-chip rounded-md p-3">
			<p className="font-bold">{name}</p>
			<div className="mt-2 grid grid-cols-3 gap-2 text-center">
				<Small label="Wins" value={wins} />
				<Small label="Best" value={best == null ? "-" : `P${best}`} />
				<Small label="Worst" value={worst == null ? "-" : `P${worst}`} />
			</div>
		</div>
	);
}
function Small({ label, value }: { label: string; value: string | number }) {
	return (
		<div>
			<p className="font-mono text-lg text-cyan-200">{value}</p>
			<p className="text-[0.65rem] text-zinc-500 uppercase">{label}</p>
		</div>
	);
}
