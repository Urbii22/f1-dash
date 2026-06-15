import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
	defaultUiPreferences,
	normalizeUiPreferences,
	type InterfaceGeneration,
	type UiDensity,
} from "@/lib/uiPreferences";

type UiPreferencesStore = {
	generation: InterfaceGeneration;
	density: UiDensity;
	hydrated: boolean;
	setGeneration: (generation: InterfaceGeneration) => void;
	setDensity: (density: UiDensity) => void;
	setHydrated: (hydrated: boolean) => void;
	reset: () => void;
};

export const useUiPreferencesStore = create<UiPreferencesStore>()(
	persist(
		(set) => ({
			...defaultUiPreferences,
			hydrated: false,
			setGeneration: (generation) => set({ generation }),
			setDensity: (density) => set({ density }),
			setHydrated: (hydrated) => set({ hydrated }),
			reset: () => set({ ...defaultUiPreferences, hydrated: true }),
		}),
		{
			name: "ui-preferences-v1",
			storage: createJSONStorage(() => localStorage),
			partialize: ({ generation, density }) => ({ generation, density }),
			merge: (persisted, current) => ({ ...current, ...normalizeUiPreferences(persisted), hydrated: true }),
			onRehydrateStorage: () => (state) => state?.setHydrated(true),
		},
	),
);
