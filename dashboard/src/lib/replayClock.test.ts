import { describe, expect, it } from "vitest";

import { advancePlayhead } from "@/lib/replayClock";

const BASE = 1_000_000;

describe("advancePlayhead", () => {
	it("advances by real elapsed time at 1x", () => {
		const next = advancePlayhead({
			current: BASE,
			realElapsedMs: 200,
			speed: 1,
			pendingSeekMs: null,
			oldest: BASE - 10_000,
			latest: BASE + 10_000,
		});
		expect(next).toBe(BASE + 200);
	});

	it("advances twice as fast at 2x and half as fast at 0.5x", () => {
		const fast = advancePlayhead({
			current: BASE,
			realElapsedMs: 200,
			speed: 2,
			pendingSeekMs: null,
			oldest: null,
			latest: BASE + 10_000,
		});
		expect(fast).toBe(BASE + 400);

		const slow = advancePlayhead({
			current: BASE,
			realElapsedMs: 200,
			speed: 0.5,
			pendingSeekMs: null,
			oldest: null,
			latest: BASE + 10_000,
		});
		expect(slow).toBe(BASE + 100);
	});

	it("clamps to the live edge (latest) when speed would overshoot", () => {
		const next = advancePlayhead({
			current: BASE,
			realElapsedMs: 10_000,
			speed: 5,
			pendingSeekMs: null,
			oldest: BASE - 1000,
			latest: BASE + 2000,
		});
		expect(next).toBe(BASE + 2000);
	});

	it("clamps to the oldest available frame", () => {
		const next = advancePlayhead({
			current: BASE,
			realElapsedMs: 0,
			speed: 1,
			pendingSeekMs: BASE - 999_999, // seek far before the buffer
			oldest: BASE - 5000,
			latest: BASE + 5000,
		});
		expect(next).toBe(BASE - 5000);
	});

	it("honours an explicit seek target over organic advancement", () => {
		const target = BASE + 1234;
		const next = advancePlayhead({
			current: BASE,
			realElapsedMs: 200,
			speed: 5,
			pendingSeekMs: target,
			oldest: BASE - 10_000,
			latest: BASE + 10_000,
		});
		expect(next).toBe(target);
	});

	it("freezes organic advancement while paused but still honours an explicit seek", () => {
		const frozen = advancePlayhead({
			current: BASE,
			realElapsedMs: 500,
			speed: 2,
			pendingSeekMs: null,
			oldest: BASE - 10_000,
			latest: BASE + 10_000,
			paused: true,
		});
		expect(frozen).toBe(BASE);

		const target = BASE - 2500;
		const sought = advancePlayhead({
			current: BASE,
			realElapsedMs: 500,
			speed: 2,
			pendingSeekMs: target,
			oldest: BASE - 10_000,
			latest: BASE + 10_000,
			paused: true,
		});
		expect(sought).toBe(target);
	});

	it("never moves backwards on a negative elapsed (clock skew)", () => {
		const next = advancePlayhead({
			current: BASE,
			realElapsedMs: -500,
			speed: 1,
			pendingSeekMs: null,
			oldest: null,
			latest: null,
		});
		expect(next).toBe(BASE);
	});
});
