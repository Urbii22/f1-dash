import { render, screen } from "@testing-library/react";
import fs from "node:fs";
import path from "node:path";
import { beforeEach, expect, test } from "vitest";

import UiModeBoundary from "@/components/new-ui/UiModeBoundary";
import { useDriverSelectionStore } from "@/stores/useDriverSelectionStore";
import { useReplayControlStore } from "@/stores/useReplayControlStore";
import { useUiPreferencesStore } from "@/stores/useUiPreferencesStore";

beforeEach(() => {
	localStorage.clear();
	useUiPreferencesStore.setState({ generation: "new", density: "simple", hydrated: true });
	useDriverSelectionStore.setState({ selectedDriver: "4", comparedDrivers: ["1", "81"] });
	useReplayControlStore.setState({ speed: 2 });
});

test("keeps dashboard context while forcing the legacy branch", () => {
	render(
		<UiModeBoundary
			legacy={<div>Legacy</div>}
			simple={<div>Simple dashboard</div>}
			detailed={<div>Detailed dashboard</div>}
		/>,
	);

	expect(screen.getByText("Legacy")).toBeVisible();
	expect(useDriverSelectionStore.getState()).toMatchObject({
		selectedDriver: "4",
		comparedDrivers: ["1", "81"],
	});
	expect(useReplayControlStore.getState().speed).toBe(2);
});

test("dashboard route still keeps the legacy live runtime as the active shell", () => {
	const source = fs.readFileSync(path.resolve(process.cwd(), "src/app/dashboard/page.tsx"), "utf8");

	expect(source).toContain("return <LegacyDashboardPage />");
	expect(source).toContain("LegacyDashboard");
	expect(source).not.toContain("LiveDashboardState");
	expect(source).not.toContain("NewUiCompatibilityBoundary");
});
