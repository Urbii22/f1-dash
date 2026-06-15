"use client";

import { useUiPreferencesStore } from "@/stores/useUiPreferencesStore";

export default function InterfaceGenerationToggle() {
	const generation = useUiPreferencesStore((state) => state.generation);
	const setGeneration = useUiPreferencesStore((state) => state.setGeneration);
	const next = generation === "legacy" ? "new" : "legacy";
	return (
		<button
			type="button"
			aria-pressed={generation === "new"}
			aria-label={next === "new" ? "Use New UI" : "Use Legacy UI"}
			onClick={() => setGeneration(next)}
			className="ui-generation-toggle"
		>
			{generation === "legacy" ? "Legacy" : "New UI"}
		</button>
	);
}
