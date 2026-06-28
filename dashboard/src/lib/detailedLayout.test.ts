import { describe, expect, test } from "vitest";

import {
	dashboardLayoutBounds,
	dashboardPresetDefaults,
	layoutStorageKey,
	normalizeDashboardLayout,
	updateDashboardLayout,
	type DashboardLayout,
} from "@/lib/detailedLayout";

describe("normalizeDashboardLayout", () => {
	test("returns preset defaults for a fully valid layout", () => {
		const value: DashboardLayout = { primary: 50, secondaryTop: 50, bottomLeft: 50, topRow: 50 };
		expect(normalizeDashboardLayout(value, "race")).toEqual(value);
	});

	test("uses preset defaults when value is not an object", () => {
		expect(normalizeDashboardLayout(null, "race")).toEqual(dashboardPresetDefaults.race);
		expect(normalizeDashboardLayout(undefined, "strategy")).toEqual(dashboardPresetDefaults.strategy);
		expect(normalizeDashboardLayout("nope", "driver")).toEqual(dashboardPresetDefaults.driver);
	});

	test("clamps primary into 32..62", () => {
		expect(normalizeDashboardLayout({ primary: 10, secondaryTop: 50, bottomLeft: 50 }, "race").primary).toBe(32);
		expect(normalizeDashboardLayout({ primary: 90, secondaryTop: 50, bottomLeft: 50 }, "race").primary).toBe(62);
	});

	test("clamps secondaryTop into 30..70", () => {
		expect(normalizeDashboardLayout({ primary: 50, secondaryTop: 5, bottomLeft: 50 }, "race").secondaryTop).toBe(30);
		expect(normalizeDashboardLayout({ primary: 50, secondaryTop: 95, bottomLeft: 50 }, "race").secondaryTop).toBe(70);
	});

	test("clamps bottomLeft into 35..70", () => {
		expect(normalizeDashboardLayout({ primary: 50, secondaryTop: 50, bottomLeft: 5 }, "race").bottomLeft).toBe(35);
		expect(normalizeDashboardLayout({ primary: 50, secondaryTop: 50, bottomLeft: 95 }, "race").bottomLeft).toBe(70);
	});

	test("clamps topRow into 35..75", () => {
		expect(normalizeDashboardLayout({ primary: 50, secondaryTop: 50, bottomLeft: 50, topRow: 10 }, "race").topRow).toBe(35);
		expect(normalizeDashboardLayout({ primary: 50, secondaryTop: 50, bottomLeft: 50, topRow: 95 }, "race").topRow).toBe(75);
	});

	test("resets only the malformed field to the preset default", () => {
		const result = normalizeDashboardLayout(
			{ primary: "bad", secondaryTop: 40, bottomLeft: Number.NaN },
			"strategy",
		);
		expect(result.primary).toBe(dashboardPresetDefaults.strategy.primary);
		expect(result.secondaryTop).toBe(40);
		expect(result.bottomLeft).toBe(dashboardPresetDefaults.strategy.bottomLeft);
		expect(result.topRow).toBe(dashboardPresetDefaults.strategy.topRow);
	});

	test("bounds expose the clamp ranges", () => {
		expect(dashboardLayoutBounds.primary).toEqual({ min: 32, max: 62 });
		expect(dashboardLayoutBounds.secondaryTop).toEqual({ min: 30, max: 70 });
		expect(dashboardLayoutBounds.bottomLeft).toEqual({ min: 35, max: 70 });
		expect(dashboardLayoutBounds.topRow).toEqual({ min: 35, max: 75 });
	});
});

describe("updateDashboardLayout", () => {
	test("updates and clamps a single field, leaving others untouched", () => {
		const layout: DashboardLayout = { primary: 50, secondaryTop: 50, bottomLeft: 50, topRow: 50 };
		const next = updateDashboardLayout(layout, "primary", 100);
		expect(next).toEqual({ primary: 62, secondaryTop: 50, bottomLeft: 50, topRow: 50 });
		// pure: original unchanged
		expect(layout.primary).toBe(50);
	});

	test("ignores a non-finite update value", () => {
		const layout: DashboardLayout = { primary: 50, secondaryTop: 50, bottomLeft: 50, topRow: 50 };
		expect(updateDashboardLayout(layout, "secondaryTop", Number.NaN)).toEqual(layout);
	});
});

describe("layoutStorageKey", () => {
	test("joins route and preset", () => {
		expect(layoutStorageKey("dashboard", "race")).toBe("dashboard:race");
		expect(layoutStorageKey("track-map", "driver")).toBe("track-map:driver");
	});
});
