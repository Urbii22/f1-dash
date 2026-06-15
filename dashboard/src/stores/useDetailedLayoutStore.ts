import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import {
	dashboardPresetDefaults,
	layoutStorageKey,
	normalizeDashboardLayout,
	updateDashboardLayout,
	type DashboardLayout,
	type DetailedPreset,
} from "@/lib/detailedLayout";

type DetailedLayoutStore = {
	activePresetByRoute: Record<string, DetailedPreset>;
	layouts: Record<string, DashboardLayout>;
	setPreset: (route: string, preset: DetailedPreset) => void;
	setLayoutValue: (
		route: string,
		preset: DetailedPreset,
		key: keyof DashboardLayout,
		value: number,
	) => void;
	resetLayout: (route: string, preset: DetailedPreset) => void;
	getLayout: (route: string, preset: DetailedPreset) => DashboardLayout;
};

export const useDetailedLayoutStore = create<DetailedLayoutStore>()(
	persist(
		(set, get) => ({
			activePresetByRoute: {},
			layouts: {},

			setPreset: (route, preset) =>
				set((state) => ({
					activePresetByRoute: { ...state.activePresetByRoute, [route]: preset },
				})),

			setLayoutValue: (route, preset, key, value) =>
				set((state) => {
					const storageKey = layoutStorageKey(route, preset);
					const current = normalizeDashboardLayout(state.layouts[storageKey], preset);
					return {
						layouts: {
							...state.layouts,
							[storageKey]: updateDashboardLayout(current, key, value),
						},
					};
				}),

			// Reset deletes only this route/preset key so other presets survive.
			resetLayout: (route, preset) =>
				set((state) => {
					const storageKey = layoutStorageKey(route, preset);
					const next = { ...state.layouts };
					delete next[storageKey];
					return { layouts: next };
				}),

			// Always returns a normalized layout, falling back to preset defaults.
			getLayout: (route, preset) =>
				normalizeDashboardLayout(get().layouts[layoutStorageKey(route, preset)], preset),
		}),
		{
			name: "detailed-layouts-v1",
			storage: createJSONStorage(() => localStorage),
			partialize: ({ activePresetByRoute, layouts }) => ({ activePresetByRoute, layouts }),
		},
	),
);

export { dashboardPresetDefaults };
