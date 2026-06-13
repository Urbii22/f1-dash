import { describe, expect, it } from "vitest";

import { clampDashboardSplit, dashboardSplitFromPointer } from "@/lib/dashboardSplit";

describe("dashboard split layout", () => {
	it("keeps both dashboard columns within usable limits", () => {
		expect(clampDashboardSplit(20)).toBe(38);
		expect(clampDashboardSplit(55)).toBe(55);
		expect(clampDashboardSplit(90)).toBe(70);
	});

	it("converts a pointer position into a clamped left-column percentage", () => {
		expect(dashboardSplitFromPointer({ pointerX: 650, containerLeft: 100, containerWidth: 1000 })).toBe(55);
		expect(dashboardSplitFromPointer({ pointerX: 150, containerLeft: 100, containerWidth: 1000 })).toBe(38);
	});
});
