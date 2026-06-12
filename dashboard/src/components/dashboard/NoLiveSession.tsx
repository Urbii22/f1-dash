"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { useReducedMotion } from "motion/react";

import { useNextSession } from "@/hooks/useNextSession";
import { useCountdown } from "@/hooks/useCountdown";

type Props = {
	onOpenDashboard: () => void;
};

export default function NoLiveSession({ onOpenDashboard }: Props) {
	const { round, nextSession, nextRace, loading } = useNextSession();

	const raceIsDistinct = nextRace && nextSession && nextRace.start !== nextSession.start;

	return (
		<div className="flex min-h-[60vh] items-center justify-center p-6">
			<div className="telemetry-panel w-full max-w-2xl rounded-xl p-8">
				<p className="panel-title mb-2">Live timing</p>
				<h1 className="text-3xl font-black tracking-tight text-white">No session live</h1>
				<p className="mt-1 text-sm text-zinc-400">The timing feed is connected — no active session is broadcasting.</p>

				<div className="mt-6 border-t border-cyan-300/10 pt-6">
					{loading ? (
						<div className="h-20 w-64 animate-pulse rounded-md bg-zinc-800/60" />
					) : !round || !nextSession ? (
						<p className="text-zinc-500">Next session unavailable — schedule data could not be loaded.</p>
					) : (
						<>
							<div className="mb-4 flex flex-wrap items-center gap-2">
								<span className="data-chip rounded-md px-2 py-1 font-mono text-[0.68rem] text-cyan-200 uppercase">
									{round.countryName}
								</span>
								<span className="text-lg font-bold text-white">{round.name}</span>
							</div>

							<p className="mb-3 text-sm text-zinc-400">
								Next: <span className="font-semibold text-cyan-200">{nextSession.kind}</span>
							</p>

							<CountdownDisplay isoStart={nextSession.start} />

							{raceIsDistinct && (
								<div className="mt-6 border-t border-cyan-300/10 pt-4">
									<p className="mb-2 text-xs tracking-widest text-zinc-500 uppercase">Race</p>
									<CountdownDisplay isoStart={nextRace!.start} secondary />
								</div>
							)}
						</>
					)}
				</div>

				<div className="mt-8 flex flex-wrap gap-3 border-t border-cyan-300/10 pt-6">
					<button
						type="button"
						onClick={onOpenDashboard}
						className="rounded-md border border-cyan-300/40 bg-cyan-300/15 px-3 py-2 text-sm font-bold text-cyan-100 transition-colors hover:bg-cyan-300/25"
					>
						Open dashboard anyway
					</button>
					<Link
						href="/schedule"
						className="data-chip rounded-md px-3 py-2 text-sm text-cyan-200 transition-opacity hover:opacity-80"
					>
						Full schedule →
					</Link>
					<Link
						href="/dashboard/standings"
						className="data-chip rounded-md px-3 py-2 text-sm text-cyan-200 transition-opacity hover:opacity-80"
					>
						Standings →
					</Link>
				</div>
			</div>
		</div>
	);
}

function CountdownDisplay({ isoStart, secondary = false }: { isoStart: string; secondary?: boolean }) {
	const reduced = useReducedMotion();
	const [days, hours, minutes, seconds] = useCountdown(isoStart);

	const numClass = secondary
		? "text-2xl font-black tabular-nums text-zinc-200"
		: "text-4xl font-black tabular-nums text-cyan-200";
	const labelClass = "text-xs text-zinc-500 mt-0.5";

	const units: [number | null, string][] = [
		[days, "days"],
		[hours, "hrs"],
		[minutes, "min"],
		[seconds, "sec"],
	];

	return (
		<div className="flex gap-4">
			{units.map(([val, unit]) => (
				<div key={unit} className="flex flex-col items-center">
					{val == null ? (
						<div className="mb-1 h-10 w-10 animate-pulse rounded bg-zinc-800" />
					) : reduced ? (
						<span className={numClass}>{val.toString().padStart(2, "0")}</span>
					) : (
						<AnimatePresence mode="popLayout">
							<motion.span
								key={val}
								className={numClass}
								initial={{ y: -8, opacity: 0 }}
								animate={{ y: 0, opacity: 1 }}
								exit={{ y: 8, opacity: 0 }}
								transition={{ duration: 0.15 }}
							>
								{val.toString().padStart(2, "0")}
							</motion.span>
						</AnimatePresence>
					)}
					<p className={labelClass}>{unit}</p>
				</div>
			))}
		</div>
	);
}
