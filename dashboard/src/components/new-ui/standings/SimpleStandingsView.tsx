"use client";

import SeasonSelect from "@/components/standings/SeasonSelect";
import Panel from "@/components/new-ui/primitives/Panel";
import RouteHeader from "@/components/new-ui/routes/RouteHeader";
import { buildStandingsStory } from "@/lib/view-models/standings";
import type { ConstructorStandingRow, DriverStandingRow } from "@/lib/f1data";
import { useDataStore } from "@/stores/useDataStore";

export default function SimpleStandingsView(props: { drivers: DriverStandingRow[]; constructors: ConstructorStandingRow[]; season: number }) {
	const { drivers, season } = props;
	const prediction = useDataStore((state) => state.state?.ChampionshipPrediction);
	const model = buildStandingsStory(drivers, prediction);

	return (
		<div className="new-ui-route-scroll flex h-full min-h-0 flex-col gap-4 overflow-y-auto p-4">
			<RouteHeader eyebrow={`${season} season`} title="Championship standings" description="The leaders, closest fight, and live predicted movement." actions={<SeasonSelect selected={season} variant="new" />} />
			<div data-testid="standings-podium" className="grid gap-3 md:grid-cols-3">
				{model.topThree.map((row) => <Panel key={row.code} title={row.code} eyebrow={`P${row.position ?? "-"}`} level="primary"><p className="text-sm text-[var(--ui-muted)]">{row.name}</p><p className="new-ui-number mt-2 text-3xl font-bold">{row.points ?? "-"} pts</p><p className="mt-1 text-xs text-[var(--ui-subtle)]">{row.constructor ?? "Team unavailable"}</p></Panel>)}
			</div>
			<div className="grid gap-3 lg:grid-cols-3">
				<Story title="Leader margin" value={model.leaderMargin == null ? "Unavailable" : `${model.leaderMargin} pts`} detail="Points between first and second." />
				<Story title="Closest battle" value={model.closestBattle ? `${model.closestBattle.driverCodes.join(" / ")}` : "Unavailable"} detail={model.closestBattle ? `${model.closestBattle.points} point gap.` : "Points data missing."} />
				<Story title="Biggest predicted change" value={model.biggestPredictedChange?.code ?? "Unavailable"} detail={model.biggestPredictedChange ? `${model.biggestPredictedChange.positions > 0 ? "+" : ""}${model.biggestPredictedChange.positions} positions if the race ended now.` : "No live prediction."} />
			</div>
		</div>
	);
}

function Story({ title, value, detail }: { title: string; value: string; detail: string }) {
	return <Panel title={title}><p className="text-xl font-bold">{value}</p><p className="mt-2 text-sm text-[var(--ui-muted)]">{detail}</p></Panel>;
}
