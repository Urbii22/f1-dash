"use client";

import { useMemo } from "react";

import { useDataStore } from "@/stores/useDataStore";
import { useAlertStore } from "@/stores/useAlertStore";
import { useStrategy } from "@/hooks/useStrategy";
import { estimatePitWindow } from "@/lib/strategy";
import { buildRaceStory, type RaceStoryItem, type RaceStrategySignal } from "@/lib/view-models/raceStory";
import type { Driver, TimingData } from "@/types/state.type";

function code(drivers: Record<string, Driver> | undefined, number: string): string {
	return drivers?.[number]?.Tla ?? `#${number}`;
}

// A closing battle is a non-leader within a small interval that the feed marks as
// catching. Detail uses plain language, e.g. "NOR closing on VER, 0.7s gap".
function buildBattleSignals(
	timing: TimingData | undefined,
	drivers: Record<string, Driver> | undefined,
): RaceStrategySignal[] {
	const lines = timing?.Lines;
	if (!lines) return [];

	const byPosition = Object.values(lines)
		.filter((line) => Number.isFinite(Number.parseInt(line.Position, 10)))
		.sort((a, b) => Number.parseInt(a.Position, 10) - Number.parseInt(b.Position, 10));

	const signals: RaceStrategySignal[] = [];
	for (let index = 1; index < byPosition.length; index++) {
		const chaser = byPosition[index];
		const ahead = byPosition[index - 1];
		const interval = chaser.IntervalToPositionAhead;
		if (!interval?.Catching) continue;

		const gap = interval.Value?.trim();
		if (!gap) continue;
		const seconds = Number.parseFloat(gap.replace(/^\+/, ""));
		if (!Number.isFinite(seconds) || seconds > 1.5) continue;

		const chaserCode = code(drivers, chaser.RacingNumber);
		const aheadCode = code(drivers, ahead.RacingNumber);
		signals.push({
			id: `battle:${chaser.RacingNumber}:${ahead.RacingNumber}`,
			driverNumber: chaser.RacingNumber,
			title: `${chaserCode} closing on ${aheadCode}`,
			detail: `${chaserCode} closing on ${aheadCode}, ${seconds.toFixed(1)}s gap`,
			priority: seconds < 0.8 ? 1 : 2,
		});
	}
	return signals.slice(0, 3);
}

export function useConnectedRaceStory(): RaceStoryItem[] {
	const state = useDataStore((store) => store.state ?? null);
	const drivers = useDataStore((store) => store.state?.DriverList);
	const timing = useDataStore((store) => store.state?.TimingData);
	const alerts = useAlertStore((store) => store.alerts);
	const strategy = useStrategy();

	const strategySignals = useMemo<RaceStrategySignal[]>(() => {
		const battles = buildBattleSignals(timing, drivers);

		const pitWindows: RaceStrategySignal[] = [];
		if (strategy.ready) {
			for (const model of Object.values(strategy.models)) {
				const window = estimatePitWindow(model, strategy.pitLossMs, strategy.currentLap, strategy.totalLaps);
				if (!window) continue;
				// only surface windows that are open now or imminent
				if (window.fromLap > strategy.currentLap + 3) continue;
				const driverCode = code(drivers, model.racingNumber);
				pitWindows.push({
					id: `pit-window:${model.racingNumber}`,
					driverNumber: model.racingNumber,
					title: `${driverCode} pit window`,
					detail: `${driverCode} in pit window, laps ${window.fromLap}-${window.toLap}`,
					priority: 3,
				});
			}
		}

		return [...battles, ...pitWindows.slice(0, 3)];
	}, [timing, drivers, strategy]);

	return useMemo(
		() => buildRaceStory({ state, alerts, strategySignals }),
		[state, alerts, strategySignals],
	);
}
