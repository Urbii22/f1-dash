import type { Insight } from "@/components/new-ui/routes/InsightSummary";
import { lapsToPositionSeries, type AnalysisDrivers, type LapsByDriver } from "@/lib/analysisSeries";
import { formatLapTimeMs, type StintRecord } from "@/lib/lapHistory";
import {
	buildLongStints,
	buildPotentialLapsFromLaps,
	buildTopSpeedsFromLaps,
} from "@/lib/sessionInsights";
import { buildPaceModel } from "@/lib/strategy";

export type AnalysisConclusion = Insight & {
	driverNumbers: string[];
	metric: string;
	sampleSize: number;
};

type AnalysisInput = {
	laps: LapsByDriver;
	stints: Record<string, StintRecord[]>;
	drivers?: AnalysisDrivers;
	sessionType?: string;
};

function conclusion(input: Omit<AnalysisConclusion, "id"> & { id: string }): AnalysisConclusion {
	return input;
}

export function buildAnalysisConclusions({ laps, stints, drivers, sessionType }: AnalysisInput): AnalysisConclusion[] {
	const results: AnalysisConclusion[] = [];
	const paceModels = Object.entries(laps).flatMap(([nr, records]) => {
		const model = buildPaceModel(nr, records, stints[nr] ?? []);
		return model ? [model] : [];
	});

	const fastest = [...paceModels].sort((a, b) => a.baselineMs - b.baselineMs)[0];
	if (fastest) {
		const label = drivers?.[fastest.racingNumber]?.Tla ?? `#${fastest.racingNumber}`;
		results.push(conclusion({
			id: "race-pace",
			label: "Race pace",
			value: label,
			explanation: `Fastest median baseline from a ${fastest.sampleSize}-clean-lap sample.`,
			tone: "positive",
			driverNumbers: [fastest.racingNumber],
			metric: formatLapTimeMs(fastest.baselineMs),
			sampleSize: fastest.sampleSize,
		}));
	}

	const degradation = [...paceModels].filter((model) => model.degMsPerLap > 0).sort((a, b) => b.degMsPerLap - a.degMsPerLap)[0];
	if (degradation) {
		const label = drivers?.[degradation.racingNumber]?.Tla ?? `#${degradation.racingNumber}`;
		results.push(conclusion({
			id: "degradation",
			label: "Degradation",
			value: label,
			explanation: `Strongest positive regression across ${degradation.sampleSize} clean laps.`,
			tone: "warning",
			driverNumbers: [degradation.racingNumber],
			metric: `${Math.round(degradation.degMsPerLap)} ms/lap`,
			sampleSize: degradation.sampleSize,
		}));
	}

	const positionSeries = lapsToPositionSeries(laps, Object.keys(laps), drivers)
		.filter((series) => series.points.length >= 2)
		.map((series) => {
			const first = series.points[0].y;
			const last = series.points[series.points.length - 1].y;
			return { nr: series.id, label: series.label, sampleSize: series.points.length, movement: first - last };
		});
	const gain = [...positionSeries].filter((item) => item.movement > 0).sort((a, b) => b.movement - a.movement)[0];
	const loss = [...positionSeries].filter((item) => item.movement < 0).sort((a, b) => a.movement - b.movement)[0];
	if (gain) results.push(conclusion({ id: "position-gain", label: "Position gain", value: gain.label, explanation: `Largest gain across ${gain.sampleSize} recorded laps.`, tone: "positive", driverNumbers: [gain.nr], metric: `+${gain.movement} positions`, sampleSize: gain.sampleSize }));
	if (loss) results.push(conclusion({ id: "position-loss", label: "Position loss", value: loss.label, explanation: `Largest loss across ${loss.sampleSize} recorded laps.`, tone: "critical", driverNumbers: [loss.nr], metric: `${loss.movement} positions`, sampleSize: loss.sampleSize }));

	const longest = buildLongStints(stints, drivers, 6).sort((a, b) => b.laps - a.laps)[0];
	if (longest) results.push(conclusion({ id: "longest-stint", label: "Longest stint", value: longest.label, explanation: `Longest viable stint in the current sample on ${longest.compound ?? "unknown"} tyres.`, tone: "neutral", driverNumbers: [longest.nr], metric: `${longest.laps} laps`, sampleSize: longest.laps }));

	const topSpeed = buildTopSpeedsFromLaps(laps, drivers)[0];
	if (topSpeed) {
		const sampleSize = (laps[topSpeed.nr] ?? []).filter((item) => item.speedTrapKph != null).length;
		results.push(conclusion({ id: "top-speed", label: "Top speed", value: topSpeed.label, explanation: `Peak speed from ${sampleSize} lap samples.`, tone: "neutral", driverNumbers: [topSpeed.nr], metric: `${topSpeed.kph.toFixed(1)} km/h`, sampleSize }));
	}

	const qualifying = (sessionType ?? "").toLowerCase().includes("qual") || (sessionType ?? "").toLowerCase().includes("shootout");
	if (qualifying) {
		const potential = buildPotentialLapsFromLaps(laps, drivers)
			.filter((row) => row.deltaMs !== null && row.deltaMs > 0)
			.sort((a, b) => (b.deltaMs ?? 0) - (a.deltaMs ?? 0))[0];
		if (potential) {
			const sampleSize = laps[potential.nr]?.length ?? 0;
			results.push(conclusion({ id: "qualifying-potential", label: "Qualifying potential", value: potential.label, explanation: `Best sectors compared with the best recorded lap from ${sampleSize} samples.`, tone: "warning", driverNumbers: [potential.nr], metric: `${((potential.deltaMs ?? 0) / 1000).toFixed(3)}s`, sampleSize }));
		}
	}

	return results;
}
