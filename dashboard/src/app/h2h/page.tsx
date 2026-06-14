import SeasonH2HView from "@/components/h2h/SeasonH2HView";
import SeasonSelect from "@/components/standings/SeasonSelect";
import {
	getDriverStandings,
	getQualifying,
	getRoundResults,
	getSeason,
	type QualiResult,
	type RaceResult,
} from "@/lib/f1data";
import { buildSeasonH2H } from "@/lib/seasonH2H";

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
	return (
		<div className="flex flex-col gap-4">
			<section className="telemetry-panel rounded-lg p-5">
				<div className="flex flex-wrap items-start justify-between gap-3">
					<div>
						<p className="panel-title">Season comparison</p>
						<h1 className="text-3xl font-black">Driver head-to-head</h1>
						<p className="mt-1 text-zinc-400">Official race and qualifying results across {season}.</p>
					</div>
					<SeasonSelect selected={season} />
				</div>
				<form className="mt-5 grid gap-3 border-t border-cyan-300/10 pt-4 sm:grid-cols-[1fr_1fr_auto]">
					<input type="hidden" name="season" value={season} />
					<DriverSelect name="a" value={driverA?.driver.driverId ?? ""} standings={standings} />
					<DriverSelect name="b" value={driverB?.driver.driverId ?? ""} standings={standings} />
					<button className="rounded-md bg-cyan-300 px-4 py-2 font-bold text-black">Compare</button>
				</form>
			</section>
			{driverA && driverB ? (
				<SeasonH2HView
					driverA={driverA}
					driverB={driverB}
					comparison={buildSeasonH2H(driverA.driver.driverId!, driverB.driver.driverId!, races, qualifying)}
					season={season}
				/>
			) : (
				<div className="telemetry-panel rounded-lg p-8 text-center text-zinc-500">
					Driver data is unavailable for this season.
				</div>
			)}
		</div>
	);
}

function DriverSelect({
	name,
	value,
	standings,
}: {
	name: string;
	value: string;
	standings: NonNullable<Awaited<ReturnType<typeof getDriverStandings>>>["standings"];
}) {
	return (
		<select name={name} defaultValue={value} className="data-chip rounded-md px-3 py-2 text-white">
			{standings.map((row) => (
				<option key={row.driver.driverId} value={row.driver.driverId ?? ""}>
					{row.driver.code} · {row.driver.givenName} {row.driver.familyName}
				</option>
			))}
		</select>
	);
}
