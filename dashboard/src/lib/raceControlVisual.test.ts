import { describe, expect, it } from "vitest";

import { classifyRaceControlMessage } from "@/lib/raceControlVisual";

describe("classifyRaceControlMessage", () => {
	it("distinguishes penalties, investigations and track-limit deletions", () => {
		expect(classifyRaceControlMessage({ Message: "CAR 5 TIME PENALTY 5 SECONDS", Category: "Other" }).kind).toBe(
			"penalty",
		);
		expect(classifyRaceControlMessage({ Message: "CAR 16 INCIDENT NOTED - IMPEDING", Category: "Other" }).kind).toBe(
			"investigation",
		);
		expect(
			classifyRaceControlMessage({ Message: "CAR 6 LAP TIME DELETED - TRACK LIMITS AT TURN 2", Category: "Other" })
				.kind,
		).toBe("track-limits");
	});

	it("uses FIA flag, safety car and DRS metadata", () => {
		expect(classifyRaceControlMessage({ Message: "YELLOW IN TRACK SECTOR 8", Category: "Flag", Flag: "YELLOW" })).toMatchObject({
			kind: "flag-yellow",
			label: "Yellow flag",
		});
		expect(classifyRaceControlMessage({ Message: "SAFETY CAR DEPLOYED", Category: "SafetyCar" }).kind).toBe("safety-car");
		expect(classifyRaceControlMessage({ Message: "DRS ENABLED", Category: "Drs" }).kind).toBe("drs");
	});
});
