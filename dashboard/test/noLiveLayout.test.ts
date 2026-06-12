import fs from "node:fs";
import path from "node:path";

import { expect, test } from "vitest";

test("hides replay controls when there is no live session", () => {
	const layoutSource = fs.readFileSync(
		path.resolve(__dirname, "../src/app/dashboard/layout.tsx"),
		"utf8",
	);
	const pageSource = fs.readFileSync(
		path.resolve(__dirname, "../src/app/dashboard/page.tsx"),
		"utf8",
	);

	expect(layoutSource).toContain(
		"const hasSession = useDataStore(({ state }) => state?.SessionInfo != null);",
	);
	expect(layoutSource).toMatch(/\{hasSession && <ReplayControlBar \/>\}/);
	expect(pageSource).toContain(
		"const hasSession = useDataStore(({ state }) => state?.SessionInfo != null);",
	);
});
