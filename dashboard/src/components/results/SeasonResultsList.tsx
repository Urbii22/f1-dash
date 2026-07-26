import Link from "next/link";

import { driverFullName, podium } from "@/lib/f1data";
import { classifyRound, type RoundWithResult } from "@/lib/seasonResults";

export default function SeasonResultsList({
	items,
	season,
	liveRound,
}: {
	items: RoundWithResult[];
	season: number;
	liveRound?: number | null;
}) {
	const now = new Date();
	return (
		<div className="grid gap-3 lg:grid-cols-2">
			{items.map(({ round, result }) => {
				const state = classifyRound(round, now, Boolean(result), liveRound);
				const href = round.round == null ? "#" : `/results/${round.round}?season=${season}`;
				return (
					<Link
						key={round.round ?? round.raceName}
						href={state === "upcoming" ? "#" : href}
						aria-disabled={state === "upcoming"}
						className="telemetry-panel rounded-lg p-4 transition hover:border-cyan-300/45"
					>
						<div className="flex items-start justify-between gap-3">
							<div>
								<p className="panel-title">Round {round.round ?? "-"}</p>
								<h2 className="text-lg font-black">{round.raceName ?? "Grand Prix"}</h2>
								<p className="text-sm text-zinc-400">
									{round.locality ?? round.country ?? "Location TBC"} · {round.date ?? "Date TBC"}
								</p>
							</div>
							<StateBadge state={state} />
						</div>
						{result ? (
							<ol className="mt-4 grid gap-2 sm:grid-cols-3">
								{podium(result.results).map((row) => (
									<li key={row.driver.driverId ?? row.position} className="data-chip rounded-md p-2">
										<span className="font-mono text-xs text-cyan-300">P{row.position}</span>
										<p className="truncate font-bold">{driverFullName(row.driver)}</p>
										<p className="truncate text-xs text-zinc-500">{row.constructor ?? "-"}</p>
									</li>
								))}
							</ol>
						) : (
							<p className="mt-4 text-sm text-zinc-500">Official result not available yet.</p>
						)}
					</Link>
				);
			})}
		</div>
	);
}

function StateBadge({ state }: { state: "done" | "live" | "upcoming" }) {
	const styles = state === "live" ? "border-rose-400/50 text-rose-300" : "border-cyan-300/20 text-zinc-400";
	return <span className={`rounded border px-2 py-1 font-mono text-[0.65rem] uppercase ${styles}`}>{state}</span>;
}
