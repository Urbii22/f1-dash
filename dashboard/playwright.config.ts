import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
	testDir: "./e2e",
	fullyParallel: false,
	retries: 0,
	use: {
		baseURL: "http://127.0.0.1:3100",
		trace: "retain-on-failure",
		screenshot: "only-on-failure",
		viewport: { width: 1920, height: 1080 },
		colorScheme: "dark",
		...devices["Desktop Chrome"],
	},
	webServer: {
		command: "corepack yarn dev --port 3100",
		url: "http://127.0.0.1:3100/ui-fixtures/simple-race",
		reuseExistingServer: false,
		env: {
			UI_FIXTURES: "1",
			API_URL: "http://127.0.0.1:4001",
			NEXT_PUBLIC_LIVE_URL: "http://127.0.0.1:4000",
		},
	},
});
