"use client";

import { useState } from "react";
import Link from "next/link";

import SeasonSelect from "@/components/standings/SeasonSelect";
import Panel from "@/components/new-ui/primitives/Panel";
import RouteHeader from "@/components/new-ui/routes/RouteHeader";
import { buildStandingsStory, sortStandingsRows, type StandingsSortKey } from "@/lib/view-models/standings";
import type { ConstructorStandingRow, DriverStandingRow } from "@/lib/f1data";
import { useDataStore } from "@/stores/useDataStore";

export default function DetailedStandingsView({ drivers, constructors, season }: { drivers: DriverStandingRow[]; constructors: ConstructorStandingRow[]; season: number }) {
	const prediction = useDataStore((state) => state.state?.ChampionshipPrediction);
	const [sortKey, setSortKey] = useState<StandingsSortKey>("position");
	const model = buildStandingsStory(drivers, prediction);
	const rows = sortStandingsRows(model.rows, sortKey);

	return (
		<div className="new-ui-route-scroll flex h-full min-h-0 flex-col gap-4 overflow-y-auto p-4">
			<RouteHeader eyebrow={`${season} season`} title="Detailed championship standings" description="Official classification with optional live-race prediction columns." actions={<SeasonSelect selected={season} variant="new" />} />
			<Panel title="Drivers" eyebrow="Official and predicted" level="primary">
				<div className="overflow-x-auto">
					<table className="w-full min-w-[52rem] text-left text-sm">
						<thead><tr className="border-b border-[var(--ui-border)] text-[var(--ui-subtle)]"><th><SortButton label="Position" onClick={() => setSortKey("position")} /></th><th>Driver</th><th>Team</th><th className="text-right"><SortButton label="Points" onClick={() => setSortKey("points")} /></th><th className="text-right">Wins</th><th className="text-right"><SortButton label="Predicted" onClick={() => setSortKey("predictedPosition")} /></th><th className="text-right">Predicted pts</th></tr></thead>
						<tbody>{rows.map((row) => <tr key={row.driverId ?? row.code} className="border-b border-[var(--ui-border)]"><td className="new-ui-number py-2">{row.position ?? "-"}</td><td>{row.driverId ? <Link href={`/driver/${row.driverId}?season=${season}`}><strong data-testid="standing-code">{row.code}</strong> {row.name}</Link> : <><strong data-testid="standing-code">{row.code}</strong> {row.name}</>}</td><td>{row.constructor ?? "-"}</td><td className="new-ui-number text-right">{row.points ?? "-"}</td><td className="new-ui-number text-right">{row.wins ?? "-"}</td><td className="new-ui-number text-right">{row.predictedPosition ?? "Unavailable"}</td><td className="new-ui-number text-right">{row.predictedPoints ?? "Unavailable"}</td></tr>)}</tbody>
					</table>
				</div>
			</Panel>
			<Panel title="Constructors" eyebrow="Official standings">
				{constructors.length === 0 ? <p className="text-sm text-[var(--ui-muted)]">Constructor standings unavailable.</p> : <ol className="grid gap-2 md:grid-cols-2">{constructors.map((row) => <li key={row.constructorId ?? row.position} className="flex justify-between rounded-md border border-[var(--ui-border)] p-3"><span><strong>P{row.position ?? "-"}</strong> {row.name ?? "Unknown"}</span><span className="new-ui-number">{row.points ?? "-"} pts</span></li>)}</ol>}
			</Panel>
		</div>
	);
}

function SortButton({ label, onClick }: { label: string; onClick: () => void }) {
	return <button type="button" onClick={onClick} className="py-2 font-semibold">{label}</button>;
}
