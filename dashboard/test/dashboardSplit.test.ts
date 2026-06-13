import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const read = (relativePath: string) => fs.readFileSync(path.resolve(__dirname, "../src", relativePath), "utf8");

describe("dashboard panel resizing", () => {
	it("renders a draggable separator between classification and the circuit column", () => {
		const page = read("app/dashboard/page.tsx");

		expect(page).toContain('role="separator"');
		expect(page).toContain('aria-label="Resize dashboard panels"');
		expect(page).toContain("dashboardPanelSplit");
		expect(page).toContain("setDashboardPanelSplit");
	});

	it("stores the panel split instead of a lap-time column width", () => {
		const store = read("stores/useSettingsStore.ts");
		const settingsPage = read("app/dashboard/settings/page.tsx");

		expect(store).toContain("dashboardPanelSplit: 50");
		expect(store).not.toContain("lapTimeColumnWidth");
		expect(settingsPage).not.toContain("Lap Time Column Width");
	});
});
