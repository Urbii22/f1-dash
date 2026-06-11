"use client";

import { useMemo } from "react";

import { buildPaceModel, estimatePitLoss, type PaceModel } from "@/lib/strategy";
import { useDataStore } from "@/stores/useDataStore";
import { useLapHistoryStore } from "@/stores/useLapHistoryStore";

export const STRATEGY_MIN_LAP = 5;

export type StrategyData = {
	isRace: boolean;
	ready: boolean;
	currentLap: number;
	totalLaps: number | null;
	pitLossMs: number;
	models: Record<string, PaceModel>;
};

export function useStrategy(): StrategyData {
	const laps = useLapHistoryStore((state) => state.laps);
	const stints = useLapHistoryStore((state) => state.stints);
	const isRace = useDataStore((state) => state.state?.SessionInfo?.Type === "Race");
	const currentLap = useDataStore((state) => state.state?.LapCount?.CurrentLap ?? 0);
	const totalLaps = useDataStore((state) => state.state?.LapCount?.TotalLaps ?? null);

	const pitLossMs = useMemo(() => estimatePitLoss(laps), [laps]);

	const models = useMemo(() => {
		const result: Record<string, PaceModel> = {};
		for (const [nr, driverLaps] of Object.entries(laps)) {
			const model = buildPaceModel(nr, driverLaps, stints[nr] ?? []);
			if (model) result[nr] = model;
		}
		return result;
	}, [laps, stints]);

	return {
		isRace,
		ready: isRace && currentLap >= STRATEGY_MIN_LAP && Object.keys(models).length > 0,
		currentLap,
		totalLaps,
		pitLossMs,
		models,
	};
}
