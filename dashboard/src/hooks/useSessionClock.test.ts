import { describe, expect, it } from "vitest";

import { calculateSessionClock } from "@/hooks/useSessionClock";

describe("calculateSessionClock", () => {
	it("returns the feed value when extrapolation is paused", () => {
		expect(
			calculateSessionClock(
				{ Remaining: "00:12:34", Extrapolating: false, Utc: "2026-06-13T12:00:00Z" },
				0,
				Date.parse("2026-06-13T12:01:00Z"),
			),
		).toBe("00:12:34");
	});

	it("subtracts elapsed wall time and adds the configured replay delay", () => {
		expect(
			calculateSessionClock(
				{ Remaining: "00:10:00", Extrapolating: true, Utc: "2026-06-13T12:00:00Z" },
				30,
				Date.parse("2026-06-13T12:01:00Z"),
			),
		).toBe("00:09:30");
	});

	it("clamps an expired clock at zero", () => {
		expect(
			calculateSessionClock(
				{ Remaining: "00:00:10", Extrapolating: true, Utc: "2026-06-13T12:00:00Z" },
				0,
				Date.parse("2026-06-13T12:01:00Z"),
			),
		).toBe("00:00:00");
	});

	it("returns undefined without a usable feed clock", () => {
		expect(calculateSessionClock(undefined, 0, Date.now())).toBeUndefined();
	});
});
