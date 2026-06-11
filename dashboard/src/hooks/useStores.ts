import type { CarsData, Positions, State } from "@/types/state.type";

import { alertEngine } from "@/lib/alerts/engine";
import { notifyAlert } from "@/lib/alerts/notifications";
import { lapHistoryTracker } from "@/lib/lapHistory";

import { useAlertStore } from "@/stores/useAlertStore";
import { useDataStore } from "@/stores/useDataStore";
import { useLapHistoryStore } from "@/stores/useLapHistoryStore";

type Fns = {
	updateState: (state: State) => void;
	updatePosition: (pos: Positions) => void;
	updateCarData: (car: CarsData) => void;
};

/**
 * Single ingestion point for merged state frames. Besides updating the main
 * data store, it feeds the lap history tracker and the alert engine with the
 * previous/next merged states so they can detect edges (completed laps,
 * overtakes, flags...). Both live outside React and are idempotent, so the
 * 200ms engine tick and StrictMode double-invocations are safe.
 */
const ingestStateFrame = (partial: State) => {
	const prev = useDataStore.getState().state;
	useDataStore.getState().setState(partial);
	const next = useDataStore.getState().state;
	if (!next) return;

	const { completed, sessionChanged } = lapHistoryTracker.ingest(next);

	if (sessionChanged) {
		useLapHistoryStore.getState().reset();
		useAlertStore.getState().clearAll();
		alertEngine.reset();
	}

	if (completed.length > 0) {
		useLapHistoryStore.getState().recordLaps(completed);
	}

	const alertStore = useAlertStore.getState();
	const events = alertEngine.evaluate(prev, next).filter((event) => alertStore.enabledRules[event.rule] !== false);

	if (events.length > 0) {
		alertStore.addEvents(events);

		if (alertStore.browserNotifications) {
			for (const event of events) notifyAlert(event);
		}
	}
};

export const useStores = (): Fns => {
	const dataStore = useDataStore();

	return {
		updateState: ingestStateFrame,
		updatePosition: (v) => dataStore.setPositions(v),
		updateCarData: (v) => dataStore.setCarsData(v),
	};
};
