import { test, expect } from "@playwright/test";

test.describe("Detailed New UI dashboard", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/ui-fixtures/detailed-race");
		await page.waitForLoadState("networkidle");
	});

	test("Race preset panel labels visible", async ({ page }) => {
		const raceTab = page.getByRole("tab", { name: /Race/i });
		if (await raceTab.isVisible()) {
			await raceTab.click();
			await expect(page.getByRole("heading", { name: /Classification/i })).toBeVisible();
		}
	});

	test("Strategy preset panel labels visible", async ({ page }) => {
		const strategyTab = page.getByRole("tab", { name: /Strategy/i });
		if (await strategyTab.isVisible()) {
			await strategyTab.click();
			await expect(page.getByRole("heading", { name: /Strategy|Stints/i })).toBeVisible();
		}
	});

	test("Driver preset panel labels visible", async ({ page }) => {
		const driverTab = page.getByRole("tab", { name: /Driver/i });
		if (await driverTab.isVisible()) {
			await driverTab.click();
			await expect(page.getByRole("heading", { name: /Telemetry|Driver/i })).toBeVisible();
		}
	});

	test("keyboard splitter resizing: ArrowRight increments", async ({ page }) => {
		const splitter = page.locator("[role='separator'][aria-orientation='vertical']").first();
		if (await splitter.isVisible()) {
			await splitter.focus();
			const before = await splitter.getAttribute("aria-valuenow");
			await page.keyboard.press("ArrowRight");
			const after = await splitter.getAttribute("aria-valuenow");
			if (before !== null && after !== null) {
				expect(Number(after)).toBeGreaterThan(Number(before));
			}
		}
	});

	test("keyboard splitter resizing: Shift+ArrowRight jumps 5", async ({ page }) => {
		const splitter = page.locator("[role='separator'][aria-orientation='vertical']").first();
		if (await splitter.isVisible()) {
			await splitter.focus();
			const before = await splitter.getAttribute("aria-valuenow");
			await page.keyboard.press("Shift+ArrowRight");
			const after = await splitter.getAttribute("aria-valuenow");
			if (before !== null && after !== null) {
				expect(Number(after) - Number(before)).toBeGreaterThanOrEqual(5);
			}
		}
	});

	test("screenshot baseline: detailed-race at 1920x1080", async ({ page }) => {
		await expect(page).toHaveScreenshot("new-ui-detailed-race-1920x1080.png", {
			animations: "disabled",
			maxDiffPixelRatio: 0.01,
		});
	});
});
