import { getDriverSeason, getDriverStandings } from "@/lib/f1data";
import { summarizeDriverSeason } from "@/lib/seasonH2H";
import UiModeBoundary from "@/components/new-ui/UiModeBoundary";
import { SimpleDriverView, DetailedDriverView } from "@/components/new-ui/driver/DriverViews";
import LegacyDriverPage from "@/components/driver/LegacyDriverPage";

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
	const standing = standingsData?.standings.find((row) => row.driver.driverId === driverId) ?? null;
	const teamMate =
		standingsData?.standings.find(
			(row) => row.constructorId && row.constructorId === standing?.constructorId && row.driver.driverId !== driverId,
		) ?? null;
	const rounds = seasonData?.rounds ?? [];
	const summary = summarizeDriverSeason(rounds);

	if (!standing && rounds.length === 0) {
		return (
			<div className="telemetry-panel rounded-lg p-8 text-center">
				<h1 className="text-2xl font-black">Driver not found</h1>
				<p className="mt-2 text-zinc-500">No official data is available for {season}.</p>
			</div>
		);
	}

	return (
		<UiModeBoundary
			legacy={<LegacyDriverPage standing={standing} rounds={rounds} summary={summary} teamMate={teamMate} season={season} />}
			simple={<SimpleDriverView standing={standing} rounds={rounds} summary={summary} teamMate={teamMate} season={season} />}
			detailed={<DetailedDriverView standing={standing} rounds={rounds} summary={summary} teamMate={teamMate} season={season} />}
		/>
	);
}
