import SeasonResultsList from "@/components/results/SeasonResultsList";
import SeasonSelect from "@/components/standings/SeasonSelect";
import { getRoundResults, getSeason } from "@/lib/f1data";
import UiModeBoundary from "@/components/new-ui/UiModeBoundary";
import { SimpleResultsListView, DetailedResultsListView } from "@/components/new-ui/results/ResultsViews";

export default async function ResultsPage({ searchParams }: { searchParams: Promise<{ season?: string }> }) {
	const query = await searchParams;
	const season = Number(query.season) || new Date().getFullYear();
	const data = await getSeason(season);
	const items = await getRoundResults(data?.rounds ?? [], season);

	return (
		<UiModeBoundary
			legacy={<LegacyResultsContent items={items} season={season} data={data} />}
			simple={<SimpleResultsListView items={items} season={season} />}
			detailed={<DetailedResultsListView items={items} season={season} />}
		/>
	);
}

function LegacyResultsContent({
	items,
	season,
	data,
}: {
	items: Awaited<ReturnType<typeof getRoundResults>>;
	season: number;
	data: Awaited<ReturnType<typeof getSeason>>;
}) {
	return (
		<div className="flex flex-col gap-4">
			<div className="telemetry-panel flex flex-wrap items-end justify-between gap-3 rounded-lg p-5">
				<div>
					<p className="panel-title">Official history</p>
					<h1 className="text-3xl font-black">{season} Grand Prix results</h1>
					<p className="mt-1 text-zinc-400">Podiums, classifications and recorded analysis for every round.</p>
				</div>
				<SeasonSelect selected={season} />
			</div>
			{data ? <SeasonResultsList items={items} season={season} /> : <div className="telemetry-panel rounded-lg p-8 text-center text-zinc-400">Season data is unavailable.</div>}
		</div>
	);
}
