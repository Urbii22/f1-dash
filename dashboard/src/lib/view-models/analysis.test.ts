import { describe, expect, test } from "vitest";

import { buildAnalysisConclusions } from "@/lib/view-models/analysis";
import type { LapRecord, StintRecord } from "@/lib/lapHistory";

function lap(lapNumber: number, lapTimeMs: number, position: number, speedTrapKph: number, sectors: [number, number, number]): LapRecord {
	return {
		lap: lapNumber,
		lapTimeMs,
		sectorsMs: sectors,
		position,
		gapToLeaderMs: null,
		compound: "MEDIUM",
		tyreAge: lapNumber,
		pitted: false,
		speedTrapKph,
		utc: `2026-06-15T12:0${lapNumber}:00Z`,
	};
}

const laps = {
	"1": [
		lap(1, 81_000, 1, 326, [25_500, 30_500, 25_000]),
		lap(2, 81_100, 2, 327, [25_400, 30_400, 24_900]),
		lap(3, 81_200, 3, 328, [25_300, 30_300, 24_800]),
	],
	"4": [
		lap(1, 79_000, 5, 329, [25_000, 30_000, 24_000]),
		lap(2, 80_000, 3, 331, [24_900, 29_500, 23_900]),
		lap(3, 82_000, 2, 330, [25_100, 30_200, 24_200]),
	],
};

const stints: Record<string, StintRecord[]> = {
	"1": [{ stint: 1, compound: "MEDIUM", startLap: 1, endLap: 6, lapCount: 6, bestMs: 81_000, avgMs: 81_100, degMsPerLap: 100 }],
	"4": [{ stint: 1, compound: "MEDIUM", startLap: 1, endLap: 7, lapCount: 7, bestMs: 79_000, avgMs: 80_333, degMsPerLap: 1_500 }],
};

describe("buildAnalysisConclusions", () => {
	test("derives readable winners with metrics and sample context", () => {
		const conclusions = buildAnalysisConclusions({
			laps,
			stints,
			drivers: { "1": { Tla: "VER" }, "4": { Tla: "NOR" } },
			sessionType: "Qualifying",
		});

		expect(conclusions.map((item) => item.label)).toEqual([
			"Race pace",
			"Degradation",
			"Position gain",
			"Position loss",
			"Longest stint",
			"Top speed",
			"Qualifying potential",
		]);
		expect(conclusions[0]).toMatchObject({ driverNumbers: ["4"], metric: "1:20.000", sampleSize: 3 });
		expect(conclusions.find((item) => item.label === "Top speed")?.metric).toBe("331.0 km/h");
		for (const conclusion of conclusions) {
			expect(conclusion.metric).not.toBe("");
			expect(conclusion.sampleSize).toBeGreaterThan(0);
			expect(conclusion.explanation).toMatch(/sample|lap|stint/i);
		}
	});

	test("does not claim pace, degradation, or position movement from insufficient samples", () => {
		const conclusions = buildAnalysisConclusions({
			laps: { "4": [lap(1, 80_000, 3, 330, [25_000, 30_000, 25_000])] },
			stints: {},
			drivers: { "4": { Tla: "NOR" } },
			sessionType: "Race",
		});

		const labels = conclusions.map((item) => item.label);
		expect(labels).not.toContain("Race pace");
		expect(labels).not.toContain("Degradation");
		expect(labels).not.toContain("Position gain");
		expect(labels).not.toContain("Position loss");
		expect(labels).not.toContain("Qualifying potential");
	});
});
