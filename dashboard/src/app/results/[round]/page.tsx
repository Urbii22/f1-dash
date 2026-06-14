import Link from "next/link";

import GridList from "@/components/results/GridList";
import QualiResultTable from "@/components/results/QualiResultTable";
import RaceResultTable from "@/components/results/RaceResultTable";
import { getArchiveSessions } from "@/lib/archive";
import { driverFullName, getQualifying, getResults } from "@/lib/f1data";
import { findArchiveSession } from "@/lib/seasonResults";

export default async function RoundPage({
	params,
	searchParams,
}: {
	params: Promise<{ round: string }>;
	searchParams: Promise<{ season?: string }>;
}) {
	const [{ round: roundParam }, query] = await Promise.all([params, searchParams]);
	const round = Number(roundParam);
	const season = Number(query.season) || new Date().getFullYear();
	const [race, qualifying, sessions] = await Promise.all([
		getResults(round, season),
		getQualifying(round, season),
		getArchiveSessions(season),
	]);
	if (!race)
		return (
			<div className="telemetry-panel rounded-lg p-8 text-center">
				<h1 className="text-2xl font-black">Result unavailable</h1>
				<Link href={`/results?season=${season}`} className="mt-3 inline-block text-cyan-300">
					Back to season
				</Link>
			</div>
		);
	const recording = findArchiveSession(race, sessions);
	const fastest = race.results.find((row) => row.fastestLapRank === "1");
	return (
		<div className="flex flex-col gap-4">
			<section className="telemetry-panel rounded-lg p-5">
				<p className="panel-title">
					Round {race.round} · {season}
				</p>
				<div className="flex flex-wrap items-start justify-between gap-3">
					<div>
						<h1 className="text-3xl font-black">{race.raceName}</h1>
						<p className="text-zinc-400">
							{race.circuitName} · {race.locality}, {race.country}
						</p>
					</div>
					{recording && (
						<Link
							href={`/archive/${recording.id}`}
							className="rounded-md border border-cyan-300/40 bg-cyan-300/10 px-3 py-2 text-sm font-bold text-cyan-200"
						>
							Post-session analysis →
						</Link>
					)}
				</div>
				{fastest && (
					<div className="data-chip mt-4 inline-flex rounded-md px-3 py-2 text-sm">
						<span className="mr-2 text-fuchsia-300">Fastest lap</span>
						<strong>{driverFullName(fastest.driver)}</strong>
						<span className="ml-2 font-mono text-zinc-400">{fastest.fastestLapTime ?? "-"}</span>
					</div>
				)}
			</section>
			<Section title="Race result">
				<RaceResultTable rows={race.results} season={season} />
			</Section>
			<Section title="Starting grid">
				<GridList rows={race.results} />
			</Section>
			<Section title="Qualifying">
				{qualifying?.results.length ? (
					<QualiResultTable rows={qualifying.results} />
				) : (
					<p className="text-zinc-500">Qualifying result unavailable.</p>
				)}
			</Section>
		</div>
	);
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
	return (
		<section className="telemetry-panel rounded-lg p-4">
			<h2 className="mb-3 text-xl font-black">{title}</h2>
			{children}
		</section>
	);
}
