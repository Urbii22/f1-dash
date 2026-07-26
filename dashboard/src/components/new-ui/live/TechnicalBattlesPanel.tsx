"use client";

import Panel from "@/components/new-ui/primitives/Panel";
import ViewState from "@/components/new-ui/primitives/ViewState";
import { buildBattles } from "@/lib/view-models/battles";
import { useDataStore } from "@/stores/useDataStore";

export default function TechnicalBattlesPanel() {
	const state = useDataStore((store) => store.state);
	const battles = buildBattles(state);

	return (
		<Panel title="Battles" eyebrow="Within 1.0s">
			{battles.length === 0 ? (
				<ViewState
					state="unavailable"
					title="No close battles"
					description="No cars within a second of the car ahead."
				/>
			) : (
				<ul className="flex flex-col gap-1.5">
					{battles.map((battle) => (
						<li
							key={battle.id}
							className="flex items-center justify-between rounded-md border border-[var(--ui-border)] px-3 py-2 text-sm"
						>
							<span className="flex items-center gap-2 font-mono">
								<span className="text-[var(--ui-subtle)]">P{battle.position}</span>
								<strong className="text-[var(--ui-text)]">{battle.attackerTla}</strong>
								<span className="text-[var(--ui-subtle)]">→</span>
								<span className="text-[var(--ui-muted)]">{battle.defenderTla}</span>
							</span>
							<span className="flex items-center gap-2 font-mono">
								{battle.catching && <span className="text-[0.6rem] text-emerald-300">▲ CATCHING</span>}
								<span className="text-[var(--ui-accent)]">{battle.gapSeconds.toFixed(1)}s</span>
							</span>
						</li>
					))}
				</ul>
			)}
		</Panel>
	);
}
