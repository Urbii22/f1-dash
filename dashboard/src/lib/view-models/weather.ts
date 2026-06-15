import type { Insight } from "@/components/new-ui/routes/InsightSummary";
import type { WeatherData } from "@/types/state.type";

type SpeedUnit = "metric" | "imperial";

type WeatherImpactInput = {
	current: WeatherData | undefined;
	previous?: WeatherData;
	radarFrames?: { past: number; nowcast: number } | null;
	speedUnit: SpeedUnit;
};

export type WeatherImpactModel = {
	condition: "dry" | "mixed" | "wet" | "unknown";
	rainRiskLabel: string;
	trackEvolution: string;
	windImpact: string;
	confidence: "low" | "medium" | "high";
	metrics: { air: string; track: string; humidity: string; wind: string };
	insights: Insight[];
};

function numeric(value: string | undefined): number | null {
	const parsed = Number.parseFloat(value ?? "");
	return Number.isFinite(parsed) ? parsed : null;
}

function temperature(value: number | null): string {
	return value === null ? "--" : `${value.toFixed(1)} C`;
}

export function buildWeatherImpact({ current, previous, radarFrames, speedUnit }: WeatherImpactInput): WeatherImpactModel {
	const air = numeric(current?.AirTemp);
	const track = numeric(current?.TrackTemp);
	const humidity = numeric(current?.Humidity);
	const windMs = numeric(current?.WindSpeed);
	const rainfall = numeric(current?.Rainfall);
	const validMetrics = [air, track, humidity, windMs].filter((value) => value !== null).length;

	const previousRain = numeric(previous?.Rainfall);
	const condition = rainfall === null || validMetrics < 3
		? "unknown"
		: previousRain !== null && (rainfall > 0) !== (previousRain > 0)
			? "mixed"
			: rainfall > 0
				? "wet"
				: "dry";

	const radarAvailable = Boolean(radarFrames && radarFrames.past + radarFrames.nowcast > 0);
	const rainRiskLabel = rainfall !== null && rainfall > 0
		? "Rain is being observed now."
		: radarAvailable
			? "No rain observed; radar frames are available for monitoring."
			: "No rain observed; radar outlook unavailable.";

	const previousTrack = numeric(previous?.TrackTemp);
	const trackDelta = track !== null && previousTrack !== null ? track - previousTrack : null;
	const trackEvolution = trackDelta === null
		? "Track evolution unavailable."
		: trackDelta <= -2
			? `Track is cooling (${Math.abs(trackDelta).toFixed(1)} C lower).`
			: trackDelta >= 2
				? `Track is heating (${trackDelta.toFixed(1)} C higher).`
				: "Track temperature is broadly stable.";

	const windImpact = windMs === null
		? "Wind impact unavailable."
		: windMs >= 10
			? "High wind may affect braking stability and tow strength."
			: windMs >= 5
				? "Moderate wind may influence exposed corners."
				: "Low wind impact expected from the current observation.";

	const confidence: WeatherImpactModel["confidence"] = validMetrics < 3
		? "low"
		: radarAvailable
			? "high"
			: "medium";
	const wind = windMs === null ? "--" : speedUnit === "imperial" ? `${(windMs * 2.23694).toFixed(1)} mph` : `${windMs.toFixed(1)} m/s`;
	const metrics = {
		air: temperature(air),
		track: temperature(track),
		humidity: humidity === null ? "--" : `${humidity.toFixed(0)}%`,
		wind,
	};

	const insights: Insight[] = [
		{ id: "condition", label: "Condition", value: condition, explanation: rainRiskLabel, tone: condition === "wet" ? "critical" : condition === "mixed" ? "warning" : "neutral" },
		{ id: "track", label: "Track evolution", value: metrics.track, explanation: trackEvolution, tone: trackDelta !== null && Math.abs(trackDelta) >= 2 ? "warning" : "neutral" },
		{ id: "wind", label: "Wind", value: metrics.wind, explanation: windImpact, tone: windMs !== null && windMs >= 10 ? "warning" : "neutral" },
		{ id: "confidence", label: "Confidence", value: confidence, explanation: radarAvailable ? "Observation and radar frame metadata are available." : "Based on live observation without radar outlook.", tone: confidence === "low" ? "critical" : "neutral" },
	];

	return { condition, rainRiskLabel, trackEvolution, windImpact, confidence, metrics, insights };
}
