import { fireEvent, render, screen } from "@testing-library/react";
import fs from "node:fs";
import path from "node:path";
import { beforeEach, expect, test } from "vitest";

import DensityToggle from "@/components/new-ui/DensityToggle";
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

test("keeps dashboard context when switching from Simple to Detailed", () => {
	render(
		<>
			<DensityToggle />
			<UiModeBoundary
				legacy={<div>Legacy</div>}
				simple={<div>Simple dashboard</div>}
				detailed={<div>Detailed dashboard</div>}
			/>
		</>,
	);

	fireEvent.click(screen.getByRole("radio", { name: "Detailed" }));

	expect(screen.getByText("Detailed dashboard")).toBeVisible();
	expect(useDriverSelectionStore.getState()).toMatchObject({
		selectedDriver: "4",
		comparedDrivers: ["1", "81"],
	});
	expect(useReplayControlStore.getState().speed).toBe(2);
});

test("routes the Detailed dashboard to the New UI implementation", () => {
	const source = fs.readFileSync(path.resolve(process.cwd(), "src/app/dashboard/page.tsx"), "utf8");

	expect(source).toContain('detailed={<LiveDashboardState density="detailed" />}');
	expect(source).not.toContain("NewUiCompatibilityBoundary");
});
