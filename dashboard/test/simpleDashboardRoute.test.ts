import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const source = fs.readFileSync(path.resolve(__dirname, "../src/app/dashboard/page.tsx"), "utf8");

describe("dashboard route boundary", () => {
	it("renders the Legacy dashboard directly", () => {
		expect(source).toContain("return <LegacyDashboardPage />");
		expect(source).not.toContain("UiModeBoundary");
	});

	it("does not import the New UI live dashboard", () => {
		expect(source).not.toContain("LiveDashboardState");
		expect(source).not.toContain("NewUiCompatibilityBoundary");
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
