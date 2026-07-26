"use client";

import { useMemo } from "react";

import { buildBestSectors, buildPotentialLaps, buildTopSpeeds } from "@/lib/sessionInsights";
import { buildAnalysisConclusions } from "@/lib/view-models/analysis";
import { useAnalysisViewStore } from "@/stores/useAnalysisViewStore";
import { useDataStore } from "@/stores/useDataStore";
import { useLapHistoryStore } from "@/stores/useLapHistoryStore";
import { useSettingsStore } from "@/stores/useSettingsStore";

export function useAnalysisPresentationData() {
	const drivers = useDataStore((state) => state.state?.DriverList);
	const timing = useDataStore((state) => state.state?.TimingData?.Lines);
	const stats = useDataStore((state) => state.state?.TimingStats?.Lines);
	const sessionType = useDataStore((state) => state.state?.SessionInfo?.Type);
	const meetingName = useDataStore((state) => state.state?.SessionInfo?.Meeting?.Name);
	const laps = useLapHistoryStore((state) => state.laps);
	const stints = useLapHistoryStore((state) => state.stints);
	const favoriteDrivers = useSettingsStore((state) => state.favoriteDrivers);
	const selectedDrivers = useAnalysisViewStore((state) => state.selectedDrivers);
	const setSelectedDrivers = useAnalysisViewStore((state) => state.setSelectedDrivers);

	const defaultSelection = useMemo(() => {
		if (!drivers) return [];
		const available = Object.keys(drivers);
		const favorites = favoriteDrivers.filter((nr) => available.includes(nr));
		if (favorites.length > 0) return favorites;
		return Object.values(timing ?? {})
			.filter((line) => Number(line.Position) >= 1)
			.sort((a, b) => Number(a.Position) - Number(b.Position))
			.slice(0, 5)
			.map((line) => line.RacingNumber);
	}, [drivers, favoriteDrivers, timing]);

	const selected = selectedDrivers ?? defaultSelection;
	const orderedDrivers = useMemo(
		() => Object.entries(drivers ?? {}).sort(([a], [b]) => (Number(timing?.[a]?.Position) || 99) - (Number(timing?.[b]?.Position) || 99)),
		[drivers, timing],
	);
	const conclusions = useMemo(
		() => buildAnalysisConclusions({ laps, stints, drivers, sessionType }),
		[laps, stints, drivers, sessionType],
	);

	return {
		drivers,
		laps,
		stints,
		sessionType,
		meetingName,
		selected,
		orderedDrivers,
		conclusions,
		potential: buildPotentialLaps(stats, drivers),
		topSpeeds: buildTopSpeeds(stats, drivers),
		sectors: buildBestSectors(stats, drivers),
		toggleDriver: (nr: string) => setSelectedDrivers(selected.includes(nr) ? selected.filter((item) => item !== nr) : [...selected, nr]),
	};
}
