"use client";

import Panel from "@/components/new-ui/primitives/Panel";
import ViewState from "@/components/new-ui/primitives/ViewState";
import { buildChampionshipSwing, type SwingRow } from "@/lib/view-models/championshipSwing";
import { useDataStore } from "@/stores/useDataStore";

function Delta({ row }: { row: SwingRow }) {
	if (row.positionDelta > 0) return <span className="text-emerald-300">▲{row.positionDelta}</span>;
	if (row.positionDelta < 0) return <span className="text-rose-300">▼{Math.abs(row.positionDelta)}</span>;
	return <span className="text-[var(--ui-subtle)]">—</span>;
}

export default function TechnicalChampionshipPanel() {
	const prediction = useDataStore((store) => store.state?.ChampionshipPrediction);
	const drivers = useDataStore((store) => store.state?.DriverList);
	const { rows, biggestMover } = buildChampionshipSwing(prediction, drivers);

	return (
		<Panel title="Championship" eyebrow="Predicted if race ends now">
			{rows.length === 0 ? (
				<ViewState
					state="unavailable"
					title="No live prediction"
					description="The feed carries a predicted championship only during a race."
				/>
			) : (
				<>
					{biggestMover && biggestMover.positionDelta !== 0 && (
						<p className="mb-2 text-sm text-[var(--ui-muted)]">
							Biggest move: <strong className="text-[var(--ui-text)]">{biggestMover.tla}</strong>{" "}
							<Delta row={biggestMover} /> places
						</p>
					)}
					<div className="overflow-x-auto">
						<table className="w-full text-left text-sm">
							<thead className="text-xs uppercase tracking-wide text-[var(--ui-subtle)]">
								<tr className="border-b border-[var(--ui-border)]">
									<th className="py-1 pr-3">Pred</th>
									<th className="py-1 pr-3">Driver</th>
									<th className="py-1 pr-3">Move</th>
									<th className="py-1 text-right">Pts</th>
								</tr>
							</thead>
							<tbody>
								{rows.slice(0, 10).map((row) => (
									<tr key={row.nr} className="border-b border-[var(--ui-border)] last:border-b-0">
										<td className="new-ui-number py-1.5 pr-3 font-bold text-[var(--ui-accent)]">
											{row.predictedPosition}
										</td>
										<td className="py-1.5 pr-3 font-mono font-semibold text-[var(--ui-text)]">{row.tla}</td>
										<td className="new-ui-number py-1.5 pr-3 font-mono">
											<Delta row={row} />
										</td>
										<td className="new-ui-number py-1.5 text-right">{row.predictedPoints}</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</>
			)}
		</Panel>
	);
}
