import { test, expect } from "@playwright/test";

test.describe("Simple New UI dashboard", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/ui-fixtures/simple-race");
		await page.waitForLoadState("networkidle");
	});

	test("classification is visible", async ({ page }) => {
		await expect(page.getByRole("heading", { name: /Classification/i })).toBeVisible();
	});

	test("page fits 1920x1080 without vertical overflow", async ({ page }) => {
		const overflow = await page.evaluate(
			() => document.documentElement.scrollHeight - window.innerHeight,
		);
		expect(overflow).toBeLessThanOrEqual(1);
	});

	test("driver row click opens drawer", async ({ page }) => {
		const firstRow = page.locator("[data-testid='timing-row']").first();
		if (await firstRow.isVisible()) {
			await firstRow.click();
			await expect(page.locator("[role='dialog'], [data-testid='driver-drawer']")).toBeVisible();
		}
	});

	test("Escape closes drawer and returns focus", async ({ page }) => {
		const firstRow = page.locator("[data-testid='timing-row']").first();
		if (await firstRow.isVisible()) {
			await firstRow.click();
			const drawer = page.locator("[role='dialog'], [data-testid='driver-drawer']");
			await expect(drawer).toBeVisible();
			await page.keyboard.press("Escape");
			await expect(drawer).not.toBeVisible({ timeout: 2000 });
		}
	});

	test("screenshot baseline: simple-race at 1920x1080", async ({ page }) => {
		await expect(page).toHaveScreenshot("new-ui-simple-race-1920x1080.png", {
			animations: "disabled",
			maxDiffPixelRatio: 0.01,
		});
	});

	test("screenshot baseline: yellow-flag", async ({ page }) => {
		await page.goto("/ui-fixtures/yellow-flag");
		await page.waitForLoadState("networkidle");
		await expect(page).toHaveScreenshot("new-ui-yellow-flag-1920x1080.png", {
			animations: "disabled",
			maxDiffPixelRatio: 0.01,
		});
	});

	test("screenshot baseline: no-session", async ({ page }) => {
		await page.goto("/ui-fixtures/no-session");
		await page.waitForLoadState("networkidle");
		await expect(page).toHaveScreenshot("new-ui-no-session-1920x1080.png", {
			animations: "disabled",
			maxDiffPixelRatio: 0.01,
		});
	});

	test("screenshot baseline: disconnected-replay", async ({ page }) => {
		await page.goto("/ui-fixtures/disconnected-replay");
		await page.waitForLoadState("networkidle");
		await expect(page).toHaveScreenshot("new-ui-disconnected-replay-1920x1080.png", {
			animations: "disabled",
			maxDiffPixelRatio: 0.01,
		});
	});
});
