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
};

function Slot({ children }: { children: ReactNode }) {
	return <div className="min-h-0 min-w-0 overflow-hidden">{children}</div>;
}

// Fixed-topology pit-wall workspace: a top row (primary | context column) over a
// bottom row (two panels). Three persisted proportions drive the grid templates;
// the top/bottom division itself is fixed. No drag-and-drop, only resizable splitters.
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
		<div className="flex h-full min-h-0 flex-col gap-2 overflow-hidden">
			<div
				data-testid="workspace-top-row"
				className="grid min-h-0 flex-1"
				style={{ gridTemplateColumns: cols(layout.primary) }}
			>
				<Slot>{primary}</Slot>
				<WorkspaceSplitter
					label="Resize classification"
					orientation="vertical"
					value={layout.primary}
					min={BOUNDS.primary.min}
					max={BOUNDS.primary.max}
					onChange={(value) => setLayoutValue(route, preset, "primary", value)}
				/>
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
			</div>

			<div
				data-testid="workspace-bottom-row"
				className="grid min-h-0 flex-1"
				style={{ gridTemplateColumns: cols(layout.bottomLeft) }}
			>
				<Slot>{bottomLeft}</Slot>
				<WorkspaceSplitter
					label="Resize lower panels"
					orientation="vertical"
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
