import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const read = (relativePath: string) => fs.readFileSync(path.resolve(__dirname, "../src", relativePath), "utf8");

describe("qualifying page integration", () => {
	it("registers the qualifying route in the live timing sidebar", () => {
		expect(read("components/Sidebar.tsx")).toContain('href: "/dashboard/qualifying"');
	});

	it("preserves Legacy qualifying and wires both New UI densities", () => {
		const source = read("app/dashboard/qualifying/page.tsx");

		expect(source).toContain("UiModeBoundary");
		expect(source).toContain("LegacyQualifyingPage");
		expect(source).toContain("SimpleQualifyingView");
		expect(source).toContain("DetailedQualifyingView");
		expect(source).not.toContain("NewUiCompatibilityBoundary");
		expect(source).toContain("isQualifyingSession");
		expect(source).toContain("qualifying view unavailable");
		expect(source).toContain("only available during qualifying sessions");
		for (const component of [
			"QualiHeader",
			"HotLaps",
			"QualiBoard",
			"CutoffPanel",
			"DeletedLaps",
			"SpeedTrap",
			"QualiProgression",
		]) {
			expect(source).toContain(component);
		}
	});

	it("provides qualifying-specific display settings", () => {
		const store = read("stores/useSettingsStore.ts");
		const page = read("app/dashboard/settings/page.tsx");
		const toggle = read("components/ui/Toggle.tsx");

		expect(store).toContain("qualiShowTheoreticalBest: false");
		expect(store).toContain("qualiShowSpeedTrap: true");
		expect(page).toContain("Show Theoretical Best Lap in Qualifying");
		expect(page).toContain("Show Speed Trap in Qualifying");
		expect(toggle).toContain("aria-label={label}");
	});

	it("uses the shared live session clock in both session headers", () => {
		expect(read("components/SessionInfo.tsx")).toContain("useSessionClock");
		expect(read("components/qualifying/QualiHeader.tsx")).toContain("useSessionClock");
	});

	it("falls back to qualifying stats when race gaps are empty strings", () => {
		const source = read("components/driver/DriverGap.tsx");
		expect(source).toContain("timingDriver.GapToLeader ||");
		expect(source).toContain("timingDriver.IntervalToPositionAhead?.Value ||");
	});

	it("labels qualifying tire usage as sets rather than pit stops", () => {
		expect(read("components/driver/DriverTire.tsx")).toContain("secondaryLabel");
		expect(read("components/qualifying/QualiDriverRow.tsx")).toContain(
			"secondaryLabel={`SETS ${appTimingDriver?.Stints?.length ?? 0}`}",
		);
	});
});
