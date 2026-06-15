"use client";

import clsx from "clsx";
import { RotateCcw } from "lucide-react";

import { useDetailedLayoutStore } from "@/stores/useDetailedLayoutStore";
import type { DetailedPreset } from "@/lib/detailedLayout";

const PRESETS: { key: DetailedPreset; label: string; hint: string }[] = [
	{ key: "race", label: "Race", hint: "Classification, incidents and Race Control" },
	{ key: "strategy", label: "Strategy", hint: "Stints, tyre life, pit windows and weather" },
	{ key: "driver", label: "Driver", hint: "Selected-driver telemetry and comparison" },
];

export type PresetSelectorProps = {
	route: string;
	preset: DetailedPreset;
	className?: string;
};

// Segmented radiogroup plus a reset action. Changing the preset only swaps the
// active layout key; it never clears stored proportions for other presets, and
// reset is scoped to the active route/preset.
export default function PresetSelector({ route, preset, className }: PresetSelectorProps) {
	const setPreset = useDetailedLayoutStore((state) => state.setPreset);
	const resetLayout = useDetailedLayoutStore((state) => state.resetLayout);

	return (
		<div className={clsx("flex items-center gap-3", className)}>
			<div
				role="radiogroup"
				aria-label="Workspace preset"
				className="flex items-center gap-1 rounded-lg border border-[var(--ui-border)] bg-[var(--ui-surface-1)] p-1"
			>
				{PRESETS.map(({ key, label, hint }) => {
					const active = key === preset;
					return (
						<button
							key={key}
							type="button"
							role="radio"
							aria-checked={active}
							title={hint}
							onClick={() => setPreset(route, key)}
							className={clsx(
								"rounded-md px-3 py-1.5 text-sm font-semibold transition-colors outline-none",
								"focus-visible:ring-2 focus-visible:ring-[var(--ui-focus)]",
								active
									? "bg-[var(--ui-surface-3)] text-[var(--ui-text)]"
									: "text-[var(--ui-muted)] hover:text-[var(--ui-text)]",
							)}
						>
							{label}
						</button>
					);
				})}
			</div>

			<button
				type="button"
				onClick={() => resetLayout(route, preset)}
				className={clsx(
					"flex items-center gap-1.5 rounded-md border border-[var(--ui-border)] px-2.5 py-1.5",
					"text-xs font-semibold text-[var(--ui-muted)] transition-colors",
					"hover:text-[var(--ui-text)] focus-visible:ring-2 focus-visible:ring-[var(--ui-focus)] focus-visible:outline-none",
				)}
			>
				<RotateCcw aria-hidden className="h-3.5 w-3.5" />
				Reset layout
			</button>
		</div>
	);
}
