import { describe, expect, it } from "vitest";

import { seriesToCsv } from "@/lib/exportChart";

describe("seriesToCsv", () => {
	it("emits a header and one row per point in long format", () => {
		const csv = seriesToCsv(
			[
				{ label: "NOR", points: [{ x: 1, y: 1 }, { x: 2, y: 2 }] },
				{ label: "PIA", points: [{ x: 1, y: 2 }] },
			],
			{ series: "driver", x: "lap", y: "position" },
		);
		expect(csv).toBe(["driver,lap,position", "NOR,1,1", "NOR,2,2", "PIA,1,2"].join("\n"));
	});

	it("escapes labels containing commas or quotes", () => {
		const csv = seriesToCsv([{ label: 'Ha,m"er', points: [{ x: 0, y: 0 }] }]);
		expect(csv.split("\n")[1]).toBe('"Ha,m""er",0,0');
	});

	it("handles empty series", () => {
		expect(seriesToCsv([])).toBe("series,x,y");
	});
});
