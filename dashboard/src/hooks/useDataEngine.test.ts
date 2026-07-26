import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

describe("useDataEngine state buffers", () => {
	it("buffers Heartbeat so replayed frames expose the displayed event time", () => {
		const source = fs.readFileSync(path.resolve(__dirname, "useDataEngine.ts"), "utf8");

		expect(source).toMatch(/Heartbeat:\s*useStatefulBuffer\(\)/);
	});
});
