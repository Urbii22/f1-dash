import fs from "node:fs";
import path from "node:path";

import { expect, test } from "vitest";

test("checks notification support after client mount", () => {
	const source = fs.readFileSync(
		path.resolve(__dirname, "../src/components/settings/AlertSettings.tsx"),
		"utf8",
	);

	expect(source).toContain("useSyncExternalStore");
	expect(source).toContain("notificationsSupported");
	expect(source).toContain('!notificationsAvailable && " (not supported by this browser)"');
});
