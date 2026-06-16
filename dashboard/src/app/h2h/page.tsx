import {
	getDriverStandings,
	getQualifying,
	getRoundResults,
	getSeason,
	type QualiResult,
	type RaceResult,
} from "@/lib/f1data";
import { buildSeasonH2H } from "@/lib/seasonH2H";
import UiModeBoundary from "@/components/new-ui/UiModeBoundary";
import { SimpleH2HView, DetailedH2HView } from "@/components/new-ui/h2h/H2HViews";
import LegacyH2HPage from "@/components/h2h/LegacyH2HPage";

export default async function H2HPage({
	searchParams,
}: {
	searchParams: Promise<{ season?: string; a?: string; b?: string }>;
}) {
	const query = await searchParams;
	const season = Number(query.season) || new Date().getFullYear();
	const [standingsData, seasonData] = await Promise.all([getDriverStandings(season), getSeason(season)]);
	const standings = standingsData?.standings ?? [];
	const driverA = standings.find((row) => row.driver.driverId === query.a) ?? standings[0];
	const driverB =
		standings.find((row) => row.driver.driverId === query.b) ??
		standings.find((row) => row.driver.driverId !== driverA?.driver.driverId);
	const resultItems = await getRoundResults(seasonData?.rounds ?? [], season);
	const races = resultItems.map((item) => item.result).filter((item): item is RaceResult => item != null);
	const qualifying: QualiResult[] = [];
	for (const race of races) {
		if (race.round != null) {
			const result = await getQualifying(race.round, season);
			if (result) qualifying.push(result);
		}
	}

	const comparison =
		driverA && driverB
			? buildSeasonH2H(driverA.driver.driverId!, driverB.driver.driverId!, races, qualifying)
			: null;

	return (
		<UiModeBoundary
			legacy={<LegacyH2HPage driverA={driverA ?? null} driverB={driverB ?? null} comparison={comparison} season={season} standings={standings} />}
			simple={<SimpleH2HView driverA={driverA ?? null} driverB={driverB ?? null} comparison={comparison} season={season} />}
			detailed={<DetailedH2HView driverA={driverA ?? null} driverB={driverB ?? null} comparison={comparison} season={season} standings={standings} />}
		/>
	);
}
