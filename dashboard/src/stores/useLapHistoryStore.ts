import { create } from "zustand";

import { buildStints, type CompletedLap, type LapRecord, type StintRecord } from "@/lib/lapHistory";

type LapHistoryStore = {
	laps: Record<string, LapRecord[]>;
	stints: Record<string, StintRecord[]>;
	recordLaps: (completed: CompletedLap[]) => void;
	reset: () => void;
};

export const useLapHistoryStore = create<LapHistoryStore>((set) => ({
	laps: {},
	stints: {},

	recordLaps: (completed) =>
		set((state) => {
			const laps = { ...state.laps };
			const stints = { ...state.stints };
			let changed = false;

			for (const { racingNumber, record } of completed) {
				const existing = laps[racingNumber] ?? [];
				const lastLap = existing[existing.length - 1]?.lap ?? 0;
				// idempotency guard: replays, StrictMode or duplicate flanks must not double-record
				if (record.lap <= lastLap) continue;

				laps[racingNumber] = [...existing, record];
				stints[racingNumber] = buildStints(laps[racingNumber]);
				changed = true;
			}

			return changed ? { laps, stints } : state;
		}),

	reset: () => set({ laps: {}, stints: {} }),
}));
