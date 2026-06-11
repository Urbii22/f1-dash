import type { State } from "@/types/state.type";

import { createRules } from "@/lib/alerts/rules";
import type { AlertEvent, AlertRule } from "@/lib/alerts/types";

/**
 * Edge-triggered alert engine. Rules keep their own closure state (hysteresis,
 * baselines), so resetting means recreating them. Lives outside React, fed by
 * the data engine tick alongside the lap history tracker.
 */
export class AlertEngine {
	private rules: AlertRule[];

	constructor() {
		this.rules = createRules();
	}

	evaluate(prev: State | null, next: State): AlertEvent[] {
		const events: AlertEvent[] = [];

		for (const rule of this.rules) {
			try {
				events.push(...rule.evaluate({ prev, next }));
			} catch {
				// a malformed feed frame must never break the data pipeline
			}
		}

		return events;
	}

	reset() {
		this.rules = createRules();
	}
}

export const alertEngine = new AlertEngine();
