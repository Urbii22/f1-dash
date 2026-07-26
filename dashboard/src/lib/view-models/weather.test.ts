import { describe, expect, test } from "vitest";

import { buildWeatherImpact } from "@/lib/view-models/weather";
import type { WeatherData } from "@/types/state.type";

function weather(overrides: Partial<WeatherData> = {}): WeatherData {
	return { AirTemp: "24.0", TrackTemp: "36.0", Humidity: "55", Pressure: "1012", Rainfall: "0", WindDirection: "180", WindSpeed: "4.0", ...overrides };
}

describe("buildWeatherImpact", () => {
	test("reports current rainfall as wet without relying on radar", () => {
		const model = buildWeatherImpact({ current: weather({ Rainfall: "1" }), radarFrames: null, speedUnit: "metric" });
		expect(model.condition).toBe("wet");
		expect(model.rainRiskLabel).toMatch(/observed now/i);
		expect(model.confidence).toBe("medium");
	});

	test("does not turn unavailable radar into zero rain risk", () => {
		const model = buildWeatherImpact({ current: weather(), radarFrames: null, speedUnit: "metric" });
		expect(model.condition).toBe("dry");
		expect(model.rainRiskLabel).toMatch(/radar outlook unavailable/i);
		expect(model.rainRiskLabel).not.toMatch(/zero|0%/i);
	});

	test("describes high wind and a cooling track", () => {
		const model = buildWeatherImpact({
			current: weather({ TrackTemp: "31", WindSpeed: "12" }),
			previous: weather({ TrackTemp: "36", WindSpeed: "8" }),
			radarFrames: { past: 6, nowcast: 3 },
			speedUnit: "metric",
		});
		expect(model.trackEvolution).toMatch(/cooling/i);
		expect(model.windImpact).toMatch(/high wind/i);
		expect(model.confidence).toBe("high");
	});

	test("formats configured units and rejects malformed numeric strings", () => {
		const imperial = buildWeatherImpact({ current: weather({ WindSpeed: "10" }), radarFrames: undefined, speedUnit: "imperial" });
		expect(imperial.metrics.wind).toBe("22.4 mph");

		const malformed = buildWeatherImpact({ current: weather({ AirTemp: "hot", TrackTemp: "?", Humidity: "many", WindSpeed: "fast" }), radarFrames: undefined, speedUnit: "metric" });
		expect(malformed.condition).toBe("unknown");
		expect(malformed.metrics).toEqual({ air: "--", track: "--", humidity: "--", wind: "--" });
		expect(malformed.confidence).toBe("low");
	});
});
