import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const source = fs.readFileSync(path.resolve(__dirname, "../src/app/dashboard/page.tsx"), "utf8");

describe("dashboard route boundary", () => {
	it("switches presentation through UiModeBoundary", () => {
		expect(source).toContain("UiModeBoundary");
		expect(source).toContain("legacy={<LegacyDashboardPage />}");
	});

	it("renders the Simple New UI dashboard in the simple branch", () => {
		expect(source).toContain('simple={<LiveDashboardState density="simple" />}');
	});

	it("keeps the Detailed branch as an explicit compatibility fallback", () => {
		const detailedIndex = source.indexOf("detailed={");
		expect(detailedIndex).toBeGreaterThan(-1);
		const detailedBranch = source.slice(detailedIndex, detailedIndex + 200);
		expect(detailedBranch).toContain('NewUiCompatibilityBoundary routeName="Detailed dashboard"');
		expect(detailedBranch).toContain("<LegacyDashboardPage />");
	});

	it("keeps the Legacy dashboard components inside LegacyDashboardPage", () => {
		const legacyIndex = source.indexOf("export function LegacyDashboardPage()");
		expect(legacyIndex).toBeGreaterThan(-1);
		const legacyBody = source.slice(legacyIndex);
		for (const component of ["<RegularDashboard", "<NoLiveSession", "<PresentationMode"]) {
			expect(legacyBody, `${component} must live in LegacyDashboardPage`).toContain(component);
		}
	});
});
