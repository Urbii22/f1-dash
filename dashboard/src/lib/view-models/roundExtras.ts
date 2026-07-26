import type { PitStop, RaceLap, SprintResult } from "@/lib/f1data";

// Extra per-round data (sprint, pit stops, lap chart) shared by every results UI variant.
export type RoundExtras = {
	sprint: SprintResult | null;
	pitStops: PitStop[];
	laps: RaceLap[];
	// driverId → short label, for components that only carry driver ids (pit stops, laps).
	labels: Record<string, string>;
	// finishers in classification order, for the lap-chart selector.
	lapDrivers: { id: string; label: string }[];
};
