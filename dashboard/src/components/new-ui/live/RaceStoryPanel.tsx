"use client";

import clsx from "clsx";

import type { RaceStoryItem, RaceStoryKind } from "@/lib/view-models/raceStory";
import { useDriverSelectionStore } from "@/stores/useDriverSelectionStore";
import Panel from "@/components/new-ui/primitives/Panel";
import ViewState from "@/components/new-ui/primitives/ViewState";
import { useConnectedRaceStory } from "@/components/new-ui/live/useRaceStoryData";

const MAX_CARDS = 3;

const KIND_LABEL: Record<RaceStoryKind, string> = {
	flag: "Flag",
	penalty: "Penalty",
	pit: "Pit",
	battle: "Battle",
	strategy: "Strategy",
	weather: "Weather",
	radio: "Radio",
};

const KIND_TONE: Record<RaceStoryKind, string> = {
	flag: "text-amber-300",
	penalty: "text-rose-300",
	pit: "text-sky-300",
	battle: "text-emerald-300",
	strategy: "text-[var(--ui-muted)]",
	weather: "text-cyan-300",
	radio: "text-violet-300",
};

export function RaceStoryCard({ item }: { item: RaceStoryItem }) {
	const setSelectedDriver = useDriverSelectionStore((store) => store.setSelectedDriver);
	const interactive = Boolean(item.driverNumber);

	const content = (
		<>
			<p className={clsx("text-[0.62rem] font-semibold tracking-wide uppercase", KIND_TONE[item.kind])}>
				{KIND_LABEL[item.kind]}
			</p>
			<p data-testid="race-story-title" className="mt-0.5 font-semibold text-[var(--ui-text)]">
				{item.title}
			</p>
			<p className="mt-0.5 text-sm text-[var(--ui-muted)]">{item.detail}</p>
		</>
	);

	if (interactive) {
		return (
			<button
				type="button"
				data-testid="race-story-card"
				onClick={() => item.driverNumber && setSelectedDriver(item.driverNumber)}
				className="w-full rounded-md border border-[var(--ui-border)] bg-[var(--ui-surface-2)] p-3 text-left transition-colors hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-[var(--ui-focus)] focus-visible:outline-none"
			>
				{content}
			</button>
		);
	}

	return (
		<div
			data-testid="race-story-card"
			className="rounded-md border border-[var(--ui-border)] bg-[var(--ui-surface-2)] p-3"
		>
			{content}
		</div>
	);
}

export function RaceStoryPanel({ items }: { items: RaceStoryItem[] }) {
	const cards = items.slice(0, MAX_CARDS);

	return (
		<Panel title="Race story" eyebrow="What's happening" level="secondary" className="flex min-h-0 flex-col">
			{cards.length === 0 ? (
				<ViewState state="empty" title="Quiet out there" description="Key moments will appear here as the race develops." />
			) : (
				<div className="flex flex-col gap-2">
					{cards.map((item) => (
						<RaceStoryCard key={item.id} item={item} />
					))}
				</div>
			)}
		</Panel>
	);
}

export default function ConnectedRaceStoryPanel() {
	const story = useConnectedRaceStory();
	return <RaceStoryPanel items={story} />;
}
