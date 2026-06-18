import ChampionshipPicture from "@/components/standings/ChampionshipPicture";
import LivePredictionBanner from "@/components/standings/LivePredictionBanner";
import SeasonSelect from "@/components/standings/SeasonSelect";
import StandingsView from "@/components/standings/StandingsView";
import { getConstructorStandings, getDriverStandings, getSeason } from "@/lib/f1data";
import { getSchedule } from "@/lib/schedule";
import { remainingEvents } from "@/lib/seasonRemaining";
import { buildChampionshipPicture, type ChampionshipPictureVM } from "@/lib/view-models/championshipPicture";
import UiModeBoundary from "@/components/new-ui/UiModeBoundary";
import SimpleStandingsView from "@/components/new-ui/standings/SimpleStandingsView";
import DetailedStandingsView from "@/components/new-ui/standings/DetailedStandingsView";

export default async function StandingsPage({ searchParams }: { searchParams: Promise<{ season?: string }> }) {
	const { season: seasonParam } = await searchParams;
	const season = seasonParam ? Number(seasonParam) : undefined;

	const [driverData, constructorData, seasonData, schedule] = await Promise.all([
		getDriverStandings(season),
		getConstructorStandings(season),
		getSeason(season),
		getSchedule(),
	]);

	const resolvedSeason = Number(driverData?.season ?? constructorData?.season ?? season ?? new Date().getFullYear());
	const drivers = driverData?.standings ?? [];
	const constructors = constructorData?.standings ?? [];

	// Title picture only makes sense for the current season (remaining events drive it).
	const currentSeason = resolvedSeason === new Date().getFullYear();
	const picture = currentSeason
		? buildChampionshipPicture(drivers, remainingEvents(seasonData?.rounds ?? [], schedule, new Date()))
		: null;

	return (
		<UiModeBoundary
			legacy={<LegacyStandingsPage drivers={drivers} constructors={constructors} season={resolvedSeason} picture={picture} unavailable={!driverData && !constructorData} />}
			simple={<SimpleStandingsView drivers={drivers} constructors={constructors} season={resolvedSeason} picture={picture} />}
			detailed={<DetailedStandingsView drivers={drivers} constructors={constructors} season={resolvedSeason} picture={picture} />}
		/>
	);
}

function LegacyStandingsPage({ drivers, constructors, season: resolvedSeason, picture, unavailable }: { drivers: NonNullable<Awaited<ReturnType<typeof getDriverStandings>>>["standings"]; constructors: NonNullable<Awaited<ReturnType<typeof getConstructorStandings>>>["standings"]; season: number; picture: ChampionshipPictureVM | null; unavailable: boolean }) {
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

			<ChampionshipPicture picture={picture} />

			{unavailable ? (
				<div className="telemetry-panel rounded-lg p-8 text-center">
					<h2 className="text-xl font-bold">Standings unavailable</h2>
					<p className="mt-2 text-zinc-400">Could not reach the results service. Try again shortly.</p>
				</div>
			) : (
				<StandingsView
					drivers={drivers}
					constructors={constructors}
					season={resolvedSeason}
				/>
			)}
		</div>
	);
}
