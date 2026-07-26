"use client";

import clsx from "clsx";

import { useUiPreferencesStore } from "@/stores/useUiPreferencesStore";
import type { UiDensity } from "@/lib/uiPreferences";

const options: { value: UiDensity; label: string }[] = [
	{ value: "simple", label: "Simple" },
	{ value: "detailed", label: "Detailed" },
];

export default function DensityToggle({ className }: { className?: string }) {
	const generation = useUiPreferencesStore((state) => state.generation);
	const density = useUiPreferencesStore((state) => state.density);
	const setDensity = useUiPreferencesStore((state) => state.setDensity);

	// Density only exists inside New UI; hide it entirely in Legacy.
	if (generation === "legacy") return null;

	return (
		<div role="radiogroup" aria-label="UI density" className={clsx("new-ui-density-toggle", className)}>
			{options.map((option) => (
				<button
					key={option.value}
					type="button"
					role="radio"
					aria-checked={density === option.value}
					onClick={() => setDensity(option.value)}
					className="new-ui-density-toggle__option"
					data-active={density === option.value}
				>
					{option.label}
				</button>
			))}
		</div>
	);
}
