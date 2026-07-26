import { describe, expect, test } from "vitest";

import {
	estimateTrackVelocity,
	getTelemetryTrackVelocity,
	getTrackPoint,
	stepTrackMotion,
	stepTrackProgress,
	updateTelemetryCalibration,
} from "@/lib/mapMotion";

describe("map motion", () => {
	test("moves part of the distance toward a fresh timing sample", () => {
		const next = stepTrackProgress(10, 30, 100, 250);

		expect(next).toBeGreaterThan(10);
		expect(next).toBeLessThan(30);
	});

	test("crosses the finish line using the short forward distance", () => {
		const next = stepTrackProgress(98, 2, 100, 250);

		expect(next).toBeGreaterThan(98);
		expect(next).toBeLessThan(100);
	});

	test("does not move a stopped car", () => {
		expect(stepTrackProgress(10, 30, 100, 250, true)).toBe(10);
	});

	test("estimates a continuous speed from consecutive timing samples", () => {
		expect(estimateTrackVelocity(10, 14, 100, 1000)).toBe(4);
	});

	test("keeps coasting between timing samples instead of stopping at each target", () => {
		const next = stepTrackMotion(
			{ progress: 10, velocity: 4 },
			10,
			4,
			100,
			250,
		);

		expect(next.progress).toBeGreaterThan(10);
		expect(next.velocity).toBeCloseTo(4);
	});

	test("changes velocity progressively when a new sample implies a different speed", () => {
		const next = stepTrackMotion(
			{ progress: 10, velocity: 8 },
			12,
			2,
			100,
			100,
		);

		expect(next.velocity).toBeLessThan(8);
		expect(next.velocity).toBeGreaterThan(2);
	});

	test("converts car speed into circuit progress using its calibration", () => {
		const velocity = getTelemetryTrackVelocity(
			{ speedKph: 200, throttle: 100, braking: false },
			0.02,
		);

		expect(velocity).toBeCloseTo(4);
	});

	test("anticipates braking without instantly stopping the car", () => {
		const cruising = getTelemetryTrackVelocity(
			{ speedKph: 200, throttle: 50, braking: false },
			0.02,
		);
		const braking = getTelemetryTrackVelocity(
			{ speedKph: 200, throttle: 0, braking: true },
			0.02,
		);

		expect(braking).toBeGreaterThan(0);
		expect(braking).toBeLessThan(cruising);
	});

	test("learns the circuit conversion gradually from position samples", () => {
		const calibration = updateTelemetryCalibration(0.01, 4, 200);

		expect(calibration).toBeGreaterThan(0.01);
		expect(calibration).toBeLessThan(0.02);
	});

	test("interpolates between adjacent circuit points", () => {
		const point = getTrackPoint(1.5, [
			{ x: 0, y: 0 },
			{ x: 10, y: 0 },
			{ x: 10, y: 10 },
		]);

		expect(point).toEqual({ x: 10, y: 5 });
	});
});
