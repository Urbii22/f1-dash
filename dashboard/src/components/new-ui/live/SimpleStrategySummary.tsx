"use client";

import Panel from "@/components/new-ui/primitives/Panel";
import ViewState from "@/components/new-ui/primitives/ViewState";
import { useConnectedRaceStory } from "@/components/new-ui/live/useRaceStoryData";

// Compact strategy view: surfaces strategy and battle signals already derived for
// the race story, without mounting the dense Legacy StrategyPanel.
const STRATEGY_KINDS = new Set(["strategy", "pit", "battle"]);
const MAX_ITEMS = 4;

export default function SimpleStrategySummary() {
	const story = useConnectedRaceStory();
	const items = story.filter((item) => STRATEGY_KINDS.has(item.kind)).slice(0, MAX_ITEMS);

	return (
		<Panel title="Strategy" eyebrow="Pit & pace" level="secondary" className="flex min-h-0 flex-col">
			{items.length === 0 ? (
				<ViewState
					state="empty"
					title="No strategy calls yet"
					description="Pit windows and battles appear once pace data is available."
				/>
			) : (
				<ul className="tech-scrollbar flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
					{items.map((item) => (
						<li
							key={item.id}
							className="rounded-md border border-[var(--ui-border)] bg-[var(--ui-surface-2)] p-2"
						>
							<p className="font-semibold text-[var(--ui-text)]">{item.title}</p>
							<p className="text-sm text-[var(--ui-muted)]">{item.detail}</p>
						</li>
					))}
				</ul>
			)}
		</Panel>
	);
}
