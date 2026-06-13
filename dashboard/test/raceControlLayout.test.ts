import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

describe("dashboard race control layout", () => {
	const getCircuitColumn = (source: string) =>
		source.split("function CircuitColumn()")[1]?.split("function PanelHeader")[0] ?? "";

	it("places the FIA feed in the circuit column below the map without duplicating it", () => {
		const source = fs.readFileSync(path.resolve(__dirname, "../src/app/dashboard/page.tsx"), "utf8");
		const circuitColumn = getCircuitColumn(source);

		expect(source).toContain("<CircuitColumn />");
		expect(circuitColumn).toContain("<Map />");
		expect(circuitColumn).toContain("<RaceControl />");
		expect(circuitColumn.indexOf("<Map />")).toBeLessThan(circuitColumn.indexOf("<RaceControl />"));
		expect(source.match(/<RaceControl \/>/g)).toHaveLength(1);
	});

	it("stretches race control to the bottom of the live classification row", () => {
		const source = fs.readFileSync(path.resolve(__dirname, "../src/app/dashboard/page.tsx"), "utf8");
		const circuitColumn = getCircuitColumn(source);

		expect(source).toContain("2xl:items-stretch");
		expect(circuitColumn).toContain('className="min-w-0 2xl:relative 2xl:min-h-0"');
		expect(circuitColumn).toContain('className="flex min-w-0 flex-col gap-3 2xl:absolute 2xl:inset-0"');
		expect(circuitColumn).toContain('className="telemetry-panel flex min-h-0 flex-1 flex-col rounded-lg p-3"');
		expect(circuitColumn).toContain('className="tech-scrollbar min-h-0 flex-1 overflow-y-auto pr-1"');
	});
});
