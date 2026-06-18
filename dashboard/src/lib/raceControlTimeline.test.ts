import { describe, expect, it } from "vitest";

import { buildRaceControlTimeline, categorize, severityOf } from "@/lib/raceControlTimeline";
import type { ArchiveEvent } from "@/types/archive.type";

const event = (partial: Partial<ArchiveEvent>): ArchiveEvent => ({
	utc: "2026-03-15T14:00:00Z",
	kind: "other",
	driverNr: null,
	lap: null,
	message: null,
	...partial,
});

describe("categorize / severityOf", () => {
	it("maps kinds to categories and severities", () => {
		expect(categorize("sc")).toBe("safety-car");
		expect(categorize("VSC")).toBe("safety-car");
		expect(categorize("yellow")).toBe("flag");
		expect(categorize("track-limits")).toBe("track-limits");
		expect(categorize("weird")).toBe("other");
		expect(severityOf("red")).toBe("critical");
		expect(severityOf("penalty")).toBe("warning");
		expect(severityOf("green")).toBe("info");
	});
});

describe("buildRaceControlTimeline", () => {
	it("sorts by utc, derives time/lap, and counts categories", () => {
		const events = [
			event({ utc: "2026-03-15T14:10:00Z", kind: "penalty", lap: 12, driverNr: "44", message: "5s penalty" }),
			event({ utc: "2026-03-15T14:05:00Z", kind: "sc", lap: 8, message: "Safety car deployed" }),
			event({ utc: "2026-03-15T14:20:00Z", kind: "track-limits", lap: 20, driverNr: "1" }),
			event({ utc: "2026-03-15T14:25:00Z", kind: "track-limits", lap: 22, driverNr: "16" }),
		];
		const model = buildRaceControlTimeline(events);

		expect(model.items.map((i) => i.kind)).toEqual(["sc", "penalty", "track-limits", "track-limits"]);
		expect(model.items[0]).toMatchObject({ time: "14:05:00", lap: 8, category: "safety-car", severity: "critical" });

		// summary in fixed display order, only non-empty categories
		expect(model.summary).toEqual([
			{ category: "safety-car", label: "Safety car", count: 1 },
			{ category: "penalty", label: "Penalties", count: 1 },
			{ category: "track-limits", label: "Track limits", count: 2 },
		]);
	});

	it("handles an empty event list", () => {
		const model = buildRaceControlTimeline([]);
		expect(model.items).toEqual([]);
		expect(model.summary).toEqual([]);
	});
});
