import Link from "next/link";

import SeasonSelect from "@/components/standings/SeasonSelect";
import { driverFullName, getDriverSeason, getDriverStandings } from "@/lib/f1data";
import { summarizeDriverSeason } from "@/lib/seasonH2H";

export default async function DriverPage({
	params,
	searchParams,
}: {
	params: Promise<{ driverId: string }>;
	searchParams: Promise<{ season?: string }>;
}) {
	const [{ driverId }, query] = await Promise.all([params, searchParams]);
	const season = Number(query.season) || new Date().getFullYear();
	const [standingsData, seasonData] = await Promise.all([
		getDriverStandings(season),
		getDriverSeason(driverId, season),
	]);
	const standing = standingsData?.standings.find((row) => row.driver.driverId === driverId);
	const teamMate = standingsData?.standings.find(
		(row) => row.constructorId && row.constructorId === standing?.constructorId && row.driver.driverId !== driverId,
	);
	const rounds = seasonData?.rounds ?? [];
	const summary = summarizeDriverSeason(rounds);
	if (!standing && rounds.length === 0)
		return (
			<div className="telemetry-panel rounded-lg p-8 text-center">
				<h1 className="text-2xl font-black">Driver not found</h1>
				<p className="mt-2 text-zinc-500">No official data is available for {season}.</p>
			</div>
		);
	return (
		<div className="flex flex-col gap-4">
			<section className="telemetry-panel rounded-lg p-5">
				<div className="flex flex-wrap items-start justify-between gap-4">
					<div>
						<p className="panel-title">{season} driver profile</p>
						<h1 className="text-4xl font-black">{standing ? driverFullName(standing.driver) : driverId}</h1>
						<p className="mt-1 text-zinc-400">
							{standing?.constructor ?? "Team unavailable"} · {standing?.driver.nationality ?? ""}
						</p>
					</div>
					<SeasonSelect selected={season} />
				</div>
				<div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
					<Stat label="Championship" value={standing?.position ? `P${standing.position}` : "-"} />
					<Stat label="Points" value={standing?.points ?? summary.points} />
					<Stat label="Wins" value={summary.wins} />
					<Stat label="Podiums" value={summary.podiums} />
					<Stat label="Best result" value={summary.best ? `P${summary.best}` : "-"} />
				</div>
				{teamMate?.driver.driverId && (
					<Link
						href={`/h2h?season=${season}&a=${driverId}&b=${teamMate.driver.driverId}`}
						className="mt-4 inline-block text-sm text-cyan-300"
					>
						Compare with team-mate {driverFullName(teamMate.driver)} →
					</Link>
				)}
			</section>
			<section className="telemetry-panel rounded-lg p-4">
				<p className="panel-title">Grand Prix log</p>
				<h2 className="mb-3 text-2xl font-black">Season results</h2>
				<div className="tech-scrollbar overflow-x-auto">
					<table className="w-full min-w-[620px] text-left text-sm">
						<thead className="font-mono text-[0.65rem] text-zinc-500 uppercase">
							<tr>
								<th className="p-2">Round</th>
								<th>Grand Prix</th>
								<th>Grid</th>
								<th>Finish</th>
								<th>Status</th>
								<th className="text-right">Pts</th>
							</tr>
						</thead>
						<tbody>
							{rounds.map((round) => (
								<tr key={round.round} className="border-t border-cyan-300/10">
									<td className="p-2 font-mono text-cyan-300">{round.round}</td>
									<td>
										<Link className="font-bold hover:text-cyan-200" href={`/results/${round.round}?season=${season}`}>
											{round.raceName}
										</Link>
									</td>
									<td className="font-mono">{round.grid === 0 ? "PIT" : (round.grid ?? "-")}</td>
									<td className="font-mono">{round.position ? `P${round.position}` : "-"}</td>
									<td className="text-zinc-400">{round.status ?? "-"}</td>
									<td className="text-right font-mono">{round.points ?? 0}</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</section>
		</div>
	);
}

function Stat({ label, value }: { label: string; value: string | number }) {
	return (
		<div className="data-chip rounded-md p-3">
			<p className="font-mono text-2xl font-black text-cyan-200">{value}</p>
			<p className="text-xs text-zinc-500 uppercase">{label}</p>
		</div>
	);
}
