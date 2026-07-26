"use client";

import type { ReactNode } from "react";

import {
	layoutStorageKey,
	normalizeDashboardLayout,
	type DashboardLayout,
	type DetailedPreset,
} from "@/lib/detailedLayout";
import { useDetailedLayoutStore } from "@/stores/useDetailedLayoutStore";
import WorkspaceSplitter from "@/components/new-ui/layout/WorkspaceSplitter";

export type ResizableWorkspaceProps = {
	route: string;
	preset: DetailedPreset;
	primary: ReactNode;
	secondaryTop: ReactNode;
	secondaryBottom: ReactNode;
	bottomLeft: ReactNode;
	bottomRight: ReactNode;
};

// Clamp bounds mirror normalizeDashboardLayout so the splitter and the store agree.
const BOUNDS: Record<keyof DashboardLayout, { min: number; max: number }> = {
	primary: { min: 32, max: 62 },
	secondaryTop: { min: 30, max: 70 },
	bottomLeft: { min: 35, max: 70 },
	topRow: { min: 35, max: 75 },
};

function Slot({ children }: { children: ReactNode }) {
	return <div className="min-h-0 min-w-0 overflow-hidden">{children}</div>;
}

// Fixed-topology pit-wall workspace. The left column stacks the main timing
// board over its companion panel so the timing board can keep a real scroll
// area while the user tunes that split independently from the right column.
export default function ResizableWorkspace({
	route,
	preset,
	primary,
	secondaryTop,
	secondaryBottom,
	bottomLeft,
	bottomRight,
}: ResizableWorkspaceProps) {
	const stored = useDetailedLayoutStore((state) => state.layouts[layoutStorageKey(route, preset)]);
	const setLayoutValue = useDetailedLayoutStore((state) => state.setLayoutValue);
	const layout = normalizeDashboardLayout(stored, preset);

	const cols = (left: number) => `minmax(0, ${left}fr) 0.75rem minmax(0, ${100 - left}fr)`;
	const rows = (top: number) => `minmax(0, ${top}fr) 0.75rem minmax(0, ${100 - top}fr)`;

	return (
		<div
			data-testid="resizable-workspace"
			className="grid h-full min-h-0 overflow-hidden"
			style={{ gridTemplateColumns: cols(layout.primary) }}
		>
			<div
				data-testid="workspace-left-column"
				className="grid min-h-0 min-w-0"
				style={{ gridTemplateRows: rows(layout.topRow) }}
			>
				<Slot>{primary}</Slot>
				<WorkspaceSplitter
					label="Resize left panels"
					orientation="horizontal"
					value={layout.topRow}
					min={BOUNDS.topRow.min}
					max={BOUNDS.topRow.max}
					onChange={(value) => setLayoutValue(route, preset, "topRow", value)}
				/>
				<Slot>{bottomLeft}</Slot>
			</div>

			<WorkspaceSplitter
				label="Resize workspace columns"
				orientation="vertical"
				value={layout.primary}
				min={BOUNDS.primary.min}
				max={BOUNDS.primary.max}
				onChange={(value) => setLayoutValue(route, preset, "primary", value)}
			/>

			<div
				data-testid="workspace-right-column"
				className="grid min-h-0 min-w-0"
				style={{ gridTemplateRows: rows(layout.bottomLeft) }}
			>
				<div
					data-testid="workspace-context-col"
					className="grid min-h-0 min-w-0"
					style={{ gridTemplateRows: rows(layout.secondaryTop) }}
				>
					<Slot>{secondaryTop}</Slot>
					<WorkspaceSplitter
						label="Resize context panels"
						orientation="horizontal"
						value={layout.secondaryTop}
						min={BOUNDS.secondaryTop.min}
						max={BOUNDS.secondaryTop.max}
						onChange={(value) => setLayoutValue(route, preset, "secondaryTop", value)}
					/>
					<Slot>{secondaryBottom}</Slot>
				</div>
				<WorkspaceSplitter
					label="Resize right panels"
					orientation="horizontal"
					value={layout.bottomLeft}
					min={BOUNDS.bottomLeft.min}
					max={BOUNDS.bottomLeft.max}
					onChange={(value) => setLayoutValue(route, preset, "bottomLeft", value)}
				/>
				<Slot>{bottomRight}</Slot>
			</div>
		</div>
	);
}
