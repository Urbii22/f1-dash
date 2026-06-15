import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";

const routes = [
	{ file: "src/app/dashboard/qualifying/page.tsx", pathname: "/dashboard/qualifying", legacy: "LegacyQualifyingPage", simple: "SimpleQualifyingView", detailed: "DetailedQualifyingView" },
	{ file: "src/app/dashboard/analysis/page.tsx", pathname: "/dashboard/analysis", legacy: "LegacyAnalysisPage", simple: "SimpleAnalysisView", detailed: "DetailedAnalysisView" },
	{ file: "src/app/dashboard/standings/page.tsx", pathname: "/dashboard/standings", legacy: "LegacyStandingsPage", simple: "SimpleStandingsView", detailed: "DetailedStandingsView" },
	{ file: "src/app/dashboard/weather/page.tsx", pathname: "/dashboard/weather", legacy: "LegacyWeatherPage", simple: "SimpleWeatherView", detailed: "DetailedWeatherView" },
	{ file: "src/app/dashboard/track-map/page.tsx", pathname: "/dashboard/track-map", legacy: "LegacyTrackMap", simple: "SimpleTrackMapView", detailed: "DetailedTrackMapView" },
] as const;

function read(file: string): string {
	return readFileSync(path.resolve(process.cwd(), file), "utf8");
}

describe("New UI live route coverage", () => {
	test.each(routes)("$pathname has reversible Legacy, Simple, and Detailed branches", ({ file, legacy, simple, detailed }) => {
		const source = read(file);
		expect(source).toContain("UiModeBoundary");
		expect(source).toContain(legacy);
		expect(source).toContain(simple);
		expect(source).toContain(detailed);
		expect(source).not.toContain("NewUiCompatibilityBoundary");
	});

	test("dashboard shell marks every migrated route as native New UI", () => {
		const source = read("src/app/dashboard/layout.tsx");
		for (const route of routes) expect(source).toContain(`"${route.pathname}"`);
	});
});
