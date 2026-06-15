"use client";

import { useMemo, useRef } from "react";

import { useDataStore } from "@/stores/useDataStore";
import { useDriverSelectionStore } from "@/stores/useDriverSelectionStore";
import { buildCompactTimingRows } from "@/lib/view-models/liveTiming";
import Panel from "@/components/new-ui/primitives/Panel";
import ViewState from "@/components/new-ui/primitives/ViewState";
import CompactTimingRow from "@/components/new-ui/live/CompactTimingRow";

const SKELETON_ROWS = 22;

export default function CompactTimingBoard() {
	const drivers = useDataStore((store) => store.state?.DriverList);
	const timing = useDataStore((store) => store.state?.TimingData);
	const appTiming = useDataStore((store) => store.state?.TimingAppData);
	const selectedDriver = useDriverSelectionStore((store) => store.selectedDriver);
	const setSelectedDriver = useDriverSelectionStore((store) => store.setSelectedDriver);

	// Remember the previous classification order so we can show position deltas
	// without a dedicated store. Updated after each derivation.
	const previousPositionsRef = useRef<Record<string, number>>({});

	const rows = useMemo(
		() =>
			buildCompactTimingRows({
				drivers,
				timing,
				appTiming,
				previousPositions: previousPositionsRef.current,
			}),
		[drivers, timing, appTiming],
	);

	const nextPositions = useMemo(() => {
		const map: Record<string, number> = {};
		for (const row of rows) {
			if (row.position !== null) map[row.driverNumber] = row.position;
		}
		return map;
	}, [rows]);
	previousPositionsRef.current = nextPositions;

	const hasTiming = Boolean(timing?.Lines && Object.keys(timing.Lines).length > 0);
	const loading = !drivers || !timing;

	return (
		<Panel title="Classification" eyebrow="Live timing" level="primary" className="flex min-h-0 flex-col">
			<div className="grid grid-cols-[3rem_minmax(8rem,1.2fr)_5.5rem_6.5rem_5rem] gap-2 border-b border-[var(--ui-border)] px-2 pb-1 text-[0.62rem] tracking-wide text-[var(--ui-subtle)] uppercase">
				<span>Pos</span>
				<span>Driver</span>
				<span>Tyre</span>
				<span className="text-right">Gap</span>
				<span className="text-right">Status</span>
			</div>

			<div className="tech-scrollbar min-h-0 flex-1 overflow-y-auto px-2 pt-1">
				{loading ? (
					<div aria-busy="true" aria-label="Loading classification">
						{Array.from({ length: SKELETON_ROWS }).map((_, index) => (
							<div key={index} className="my-1 h-8 animate-pulse rounded-md bg-white/5" />
						))}
					</div>
				) : !hasTiming ? (
					<ViewState
						state="empty"
						title="No timing yet"
						description="Classification will appear once the session sends timing data."
					/>
				) : (
					rows.map((row) => (
						<CompactTimingRow
							key={row.driverNumber}
							row={row}
							selected={selectedDriver === row.driverNumber}
							onSelect={setSelectedDriver}
						/>
					))
				)}
			</div>
		</Panel>
	);
}
