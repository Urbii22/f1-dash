import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { ALERT_RULE_IDS, type AlertEvent, type AlertRuleId } from "@/lib/alerts/types";

const MAX_ALERTS = 100;

export type StoredAlert = AlertEvent & {
	receivedAt: number;
};

type AlertStore = {
	alerts: StoredAlert[];
	addEvents: (events: AlertEvent[]) => void;
	dismiss: (id: string) => void;
	clearAll: () => void;

	// persisted preferences
	enabledRules: Record<AlertRuleId, boolean>;
	setRuleEnabled: (rule: AlertRuleId, enabled: boolean) => void;
	favoritesOnly: boolean;
	setFavoritesOnly: (favoritesOnly: boolean) => void;
	browserNotifications: boolean;
	setBrowserNotifications: (browserNotifications: boolean) => void;
};

const defaultEnabledRules = Object.fromEntries(ALERT_RULE_IDS.map((id) => [id, true])) as Record<AlertRuleId, boolean>;

export const useAlertStore = create<AlertStore>()(
	persist(
		(set) => ({
			alerts: [],

			addEvents: (events) =>
				set((state) => {
					const known = new Set(state.alerts.map((alert) => alert.id));
					const fresh = events.filter((event) => !known.has(event.id));
					if (fresh.length === 0) return state;

					const receivedAt = Date.now();
					const alerts = [...state.alerts, ...fresh.map((event) => ({ ...event, receivedAt }))];
					return { alerts: alerts.slice(-MAX_ALERTS) };
				}),

			dismiss: (id) => set((state) => ({ alerts: state.alerts.filter((alert) => alert.id !== id) })),
			clearAll: () => set({ alerts: [] }),

			enabledRules: defaultEnabledRules,
			setRuleEnabled: (rule, enabled) =>
				set((state) => ({ enabledRules: { ...state.enabledRules, [rule]: enabled } })),

			favoritesOnly: false,
			setFavoritesOnly: (favoritesOnly) => set({ favoritesOnly }),

			browserNotifications: false,
			setBrowserNotifications: (browserNotifications) => set({ browserNotifications }),
		}),
		{
			name: "alert-settings-storage",
			storage: createJSONStorage(() => localStorage),
			partialize: (state) => ({
				enabledRules: state.enabledRules,
				favoritesOnly: state.favoritesOnly,
				browserNotifications: state.browserNotifications,
			}),
			merge: (persisted, current) => ({
				...current,
				...(persisted as Partial<AlertStore>),
				enabledRules: {
					...defaultEnabledRules,
					...((persisted as Partial<AlertStore>)?.enabledRules ?? {}),
				},
			}),
		},
	),
);
