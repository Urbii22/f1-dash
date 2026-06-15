"use client";

import { useEffect } from "react";
import { useUiPreferencesStore } from "@/stores/useUiPreferencesStore";

export default function UiPreferenceSync() {
	const generation = useUiPreferencesStore((state) => state.generation);
	const density = useUiPreferencesStore((state) => state.density);
	const hydrated = useUiPreferencesStore((state) => state.hydrated);

	useEffect(() => {
		document.body.dataset.uiGeneration = generation;
		document.body.dataset.uiDensity = density;
		document.body.dataset.uiHydrated = String(hydrated);
	}, [density, generation, hydrated]);

	return null;
}
