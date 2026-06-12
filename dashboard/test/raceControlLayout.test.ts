import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

describe("dashboard race control layout", () => {
	it("places the FIA feed in the circuit column below the map without duplicating it", () => {
		const source = fs.readFileSync(path.resolve(__dirname, "../src/app/dashboard/page.tsx"), "utf8");
		const circuitColumn = source.match(/function CircuitColumn\(\)[\s\S]*?\n}\n/);

		expect(source).toContain("<CircuitColumn />");
		expect(circuitColumn?.[0]).toContain("<Map />");
		expect(circuitColumn?.[0]).toContain("<RaceControl />");
		expect(circuitColumn?.[0].indexOf("<Map />")).toBeLessThan(circuitColumn?.[0].indexOf("<RaceControl />") ?? -1);
		expect(source.match(/<RaceControl \/>/g)).toHaveLength(1);
	});

	it("stretches race control to the bottom of the live classification row", () => {
		const source = fs.readFileSync(path.resolve(__dirname, "../src/app/dashboard/page.tsx"), "utf8");
		const circuitColumn = source.match(/function CircuitColumn\(\)[\s\S]*?\n}\n/)?.[0] ?? "";

		expect(source).toContain("2xl:items-stretch");
		expect(circuitColumn).toContain('className="min-w-0 2xl:relative 2xl:min-h-0"');
		expect(circuitColumn).toContain('className="flex min-w-0 flex-col gap-3 2xl:absolute 2xl:inset-0"');
		expect(circuitColumn).toContain('className="telemetry-panel flex min-h-0 flex-1 flex-col rounded-lg p-3"');
		expect(circuitColumn).toContain('className="tech-scrollbar min-h-0 flex-1 overflow-y-auto pr-1"');
	});
});
