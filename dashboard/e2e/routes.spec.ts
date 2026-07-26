import { test, expect } from "@playwright/test";

const PUBLIC_ROUTES = [
	"/",
	"/schedule",
	"/results",
	"/h2h",
	"/archive",
	"/help",
];

const DASHBOARD_ROUTES = [
	"/dashboard",
	"/dashboard/qualifying",
	"/dashboard/analysis",
	"/dashboard/standings",
	"/dashboard/weather",
	"/dashboard/track-map",
	"/dashboard/settings",
];

test.describe("Route coverage: no uncaught errors and no horizontal overflow", () => {
	for (const route of [...PUBLIC_ROUTES, ...DASHBOARD_ROUTES]) {
		test(`${route} loads without error`, async ({ page }) => {
			const errors: string[] = [];
			page.on("pageerror", (err) => errors.push(err.message));
			await page.goto(route);
			await page.waitForLoadState("networkidle");
			expect(errors).toHaveLength(0);
		});

		test(`${route} has no horizontal overflow at 1920px`, async ({ page }) => {
			await page.goto(route);
			await page.waitForLoadState("networkidle");
			const overflow = await page.evaluate(
				() => document.documentElement.scrollWidth - document.documentElement.clientWidth,
			);
			expect(overflow).toBe(0);
		});
	}
});

test.describe("Route screenshots: New UI Simple", () => {
	for (const route of [...PUBLIC_ROUTES, ...DASHBOARD_ROUTES]) {
		test(`simple ${route}`, async ({ page }) => {
			await page.goto(route);
			await page.waitForLoadState("networkidle");
			const safeName = route.replace(/\//g, "_").replace(/^_/, "") || "home";
			await expect(page).toHaveScreenshot(`route-simple-${safeName}.png`, {
				animations: "disabled",
				maxDiffPixelRatio: 0.02,
			});
		});
	}
});

test.describe("Route screenshots: Legacy", () => {
	for (const route of ["/", "/dashboard", "/results", "/archive"]) {
		test(`legacy ${route}`, async ({ page }) => {
			// Force legacy via localStorage before navigation
			await page.goto("/");
			await page.evaluate(() => {
				localStorage.setItem("ui-preferences-v1", JSON.stringify({ generation: "legacy", density: "simple" }));
			});
			await page.goto(route);
			await page.waitForLoadState("networkidle");
			const safeName = route.replace(/\//g, "_").replace(/^_/, "") || "home";
			await expect(page).toHaveScreenshot(`route-legacy-${safeName}.png`, {
				animations: "disabled",
				maxDiffPixelRatio: 0.02,
			});
		});
	}
});
