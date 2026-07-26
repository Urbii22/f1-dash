import { test, expect } from "@playwright/test";

test.describe("UI preference persistence", () => {
	test("restores New UI after reload", async ({ page }) => {
		await page.goto("/ui-fixtures/simple-race");
		await page.locator("[data-ui-ready='true']").waitFor({ state: "attached" });
		// fixture seeds New UI — verify body attribute present
		await expect(page.locator("body[data-ui-generation='new']")).toBeVisible();
		await page.reload();
		await page.locator("[data-ui-ready='true']").waitFor({ state: "attached" });
		await expect(page.locator("body[data-ui-generation='new']")).toBeVisible();
	});

	test("corrupted preference storage falls back without crash", async ({ page }) => {
		await page.goto("/ui-fixtures/simple-race");
		await page.locator("[data-ui-ready='true']").waitFor({ state: "attached" });
		// corrupt the stored preference key
		await page.evaluate(() => {
			localStorage.setItem("ui-preferences-v1", "{corrupted_json!!!");
		});
		await page.reload();
		// page must not show error boundary or blank
		await expect(page.locator("body")).not.toContainText("Application error");
	});

	test("density switch preserves URL", async ({ page }) => {
		await page.goto("/ui-fixtures/simple-race");
		await page.locator("[data-ui-ready='true']").waitFor({ state: "attached" });
		const urlBefore = page.url();
		// toggle density if toggle exists
		const densityToggle = page.getByRole("button", { name: /Detailed|Simple/i }).first();
		if (await densityToggle.isVisible()) {
			await densityToggle.click();
		}
		expect(page.url()).toBe(urlBefore);
	});
});
