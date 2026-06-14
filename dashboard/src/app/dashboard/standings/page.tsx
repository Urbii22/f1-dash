import LivePredictionBanner from "@/components/standings/LivePredictionBanner";
import SeasonSelect from "@/components/standings/SeasonSelect";
import StandingsView from "@/components/standings/StandingsView";
import { getConstructorStandings, getDriverStandings } from "@/lib/f1data";

export default async function StandingsPage({ searchParams }: { searchParams: Promise<{ season?: string }> }) {
	const { season: seasonParam } = await searchParams;
	const season = seasonParam ? Number(seasonParam) : undefined;

	const [driverData, constructorData] = await Promise.all([
		getDriverStandings(season),
		getConstructorStandings(season),
	]);

	const resolvedSeason = Number(driverData?.season ?? constructorData?.season ?? season ?? new Date().getFullYear());

	return (
		<div className="flex w-full flex-col gap-3 p-3">
			<div className="flex flex-wrap items-center justify-between gap-2">
				<div>
					<p className="panel-title">Championship</p>
					<h1 className="text-2xl font-black text-white">Standings · {resolvedSeason}</h1>
				</div>
				<SeasonSelect selected={resolvedSeason} />
			</div>

			<LivePredictionBanner />

			{!driverData && !constructorData ? (
				<div className="telemetry-panel rounded-lg p-8 text-center">
					<h2 className="text-xl font-bold">Standings unavailable</h2>
					<p className="mt-2 text-zinc-400">Could not reach the results service. Try again shortly.</p>
				</div>
			) : (
				<StandingsView
					drivers={driverData?.standings ?? []}
					constructors={constructorData?.standings ?? []}
					season={resolvedSeason}
				/>
			)}
		</div>
	);
}
