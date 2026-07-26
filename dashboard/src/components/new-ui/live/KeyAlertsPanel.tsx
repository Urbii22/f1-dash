"use client";

import clsx from "clsx";

import type { RaceStoryItem, RaceStoryKind } from "@/lib/view-models/raceStory";
import { useDriverSelectionStore } from "@/stores/useDriverSelectionStore";
import Panel from "@/components/new-ui/primitives/Panel";
import ViewState from "@/components/new-ui/primitives/ViewState";
import { useConnectedRaceStory } from "@/components/new-ui/live/useRaceStoryData";

const MAX_ALERTS = 6;

const KIND_LABEL: Record<RaceStoryKind, string> = {
	flag: "Flag",
	penalty: "Penalty",
	pit: "Pit",
	battle: "Battle",
	strategy: "Strategy",
	weather: "Weather",
	radio: "Radio",
};

const PRIORITY_TONE: Record<1 | 2 | 3, string> = {
	1: "text-rose-300",
	2: "text-amber-300",
	3: "text-[var(--ui-muted)]",
};

export function KeyAlertItem({ item }: { item: RaceStoryItem }) {
	const setSelectedDriver = useDriverSelectionStore((store) => store.setSelectedDriver);
	const interactive = Boolean(item.driverNumber);

	const body = (
		<>
			<div className="flex items-center justify-between gap-2">
				<span className={clsx("text-[0.62rem] font-semibold tracking-wide uppercase", PRIORITY_TONE[item.priority])}>
					{KIND_LABEL[item.kind]}
				</span>
			</div>
			<p className="mt-0.5 text-sm font-semibold text-[var(--ui-text)]">{item.title}</p>
			<p className="text-xs text-[var(--ui-muted)]">{item.detail}</p>
		</>
	);

	return (
		<li>
			{interactive ? (
				<button
					type="button"
					data-testid="key-alert-card"
					onClick={() => item.driverNumber && setSelectedDriver(item.driverNumber)}
					className="w-full rounded-md border border-[var(--ui-border)] bg-[var(--ui-surface-2)] p-2 text-left transition-colors hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-[var(--ui-focus)] focus-visible:outline-none"
				>
					{body}
				</button>
			) : (
				<div
					data-testid="key-alert-card"
					className="rounded-md border border-[var(--ui-border)] bg-[var(--ui-surface-2)] p-2"
				>
					{body}
				</div>
			)}
		</li>
	);
}

export function KeyAlertsPanel({ items }: { items: RaceStoryItem[] }) {
	const visible = items.slice(0, MAX_ALERTS);

	return (
		<Panel title="Key alerts" eyebrow="Ordered by urgency" level="secondary" className="flex min-h-0 flex-col">
			{visible.length === 0 ? (
				<ViewState state="empty" title="No key alerts" description="Penalties, flags, and incidents will surface here." />
			) : (
				<ul className="tech-scrollbar flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-1">
					{visible.map((item) => (
						<KeyAlertItem key={item.id} item={item} />
					))}
				</ul>
			)}
		</Panel>
	);
}

export default function ConnectedKeyAlertsPanel() {
	const story = useConnectedRaceStory();
	return <KeyAlertsPanel items={story} />;
}
