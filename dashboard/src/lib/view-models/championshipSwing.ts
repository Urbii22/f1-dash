import type { ChampionshipPrediction, DriverList } from "@/types/state.type";

// During a race the feed carries a predicted end-of-race championship. This turns
// it into the live "swing": where each driver sits now vs where they'd finish the
// championship if the race ended as predicted. Pure.

export type SwingRow = {
	nr: string;
	tla: string;
	currentPosition: number;
	predictedPosition: number;
	/** Places gained in the championship (+ = moving up, i.e. lower position number). */
	positionDelta: number;
	currentPoints: number;
	predictedPoints: number;
	pointsDelta: number;
};

export type ChampionshipSwingModel = {
	rows: SwingRow[];
	biggestMover: SwingRow | null;
};

export function buildChampionshipSwing(
	prediction: ChampionshipPrediction | undefined,
	drivers: DriverList | undefined,
): ChampionshipSwingModel {
	const entries = prediction?.Drivers;
	if (!entries) return { rows: [], biggestMover: null };

	const rows: SwingRow[] = Object.values(entries).map((driver) => {
		const nr = driver.RacingNumber;
		return {
			nr,
			tla: drivers?.[nr]?.Tla ?? `#${nr}`,
			currentPosition: driver.CurrentPosition,
			predictedPosition: driver.PredictedPosition,
			positionDelta: driver.CurrentPosition - driver.PredictedPosition,
			currentPoints: driver.CurrentPoints,
			predictedPoints: driver.PredictedPoints,
			pointsDelta: driver.PredictedPoints - driver.CurrentPoints,
		};
	});

	rows.sort((a, b) => a.predictedPosition - b.predictedPosition);

	const biggestMover =
		rows.length === 0
			? null
			: [...rows].sort(
					(a, b) => Math.abs(b.positionDelta) - Math.abs(a.positionDelta) || b.pointsDelta - a.pointsDelta,
				)[0];

	return { rows, biggestMover };
}
