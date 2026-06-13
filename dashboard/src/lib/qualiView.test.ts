import { describe, expect, it } from "vitest";

import {
	buildProgressionGroups,
	filterDeletedLapMessages,
	getQualiDriverStatus,
	getQualiPrefix,
	getProgressionVisibility,
	rankSpeedTrap,
	shouldShowCutoffDelta,
} from "@/lib/qualiView";

describe("qualifying view helpers", () => {
	it("uses sprint prefixes only for sprint qualifying", () => {
		expect(getQualiPrefix("Qualifying")).toBe("Q");
		expect(getQualiPrefix("Sprint Qualifying")).toBe("SQ");
		expect(getQualiPrefix("Race")).toBe("Q");
	});

	it("prioritizes explicit driver states and detects flying laps", () => {
		const base = {
			InPit: false,
			PitOut: false,
			Stopped: false,
			KnockedOut: false,
			BestLapTime: { Value: "1:20.000" },
		};

		expect(getQualiDriverStatus({ ...base, InPit: true }, false)).toBe("PIT");
		expect(getQualiDriverStatus({ ...base, PitOut: true }, false)).toBe("OUT LAP");
		expect(getQualiDriverStatus({ ...base, Stopped: true }, false)).toBe("STOPPED");
		expect(getQualiDriverStatus({ ...base, BestLapTime: { Value: "" } }, false)).toBe("NO TIME");
		expect(getQualiDriverStatus({ ...base, BestLapTime: { Value: "" } }, true)).toBe("FLYING");
		expect(getQualiDriverStatus(base, true)).toBe("FLYING");
		expect(getQualiDriverStatus(base, false)).toBe("TRACK");
	});

	it("only exposes cutoff deltas inside the threat window", () => {
		expect(shouldShowCutoffDelta(1, 1)).toBe(false);
		expect(shouldShowCutoffDelta(12, 1)).toBe(true);
		expect(shouldShowCutoffDelta(16, 1)).toBe(true);
		expect(shouldShowCutoffDelta(7, 2)).toBe(true);
		expect(shouldShowCutoffDelta(10, 2)).toBe(true);
		expect(shouldShowCutoffDelta(1, 3)).toBe(false);
	});

	it("filters track-limit deletions and sorts newest first", () => {
		const messages = [
			{ Utc: "2026-06-13T12:00:00Z", Message: "CAR 4 LAP TIME DELETED", Lap: 2 },
			{ Utc: "2026-06-13T12:02:00Z", Message: "TRACK LIMITS AT TURN 4", Lap: 3 },
			{ Utc: "2026-06-13T12:03:00Z", Message: "DRS ENABLED", Lap: 3 },
		];

		expect(filterDeletedLapMessages(messages).map((message) => message.Lap)).toEqual([3, 2]);
	});

	it("ranks speed traps by ST and falls back to finish-line speed", () => {
		const ranked = rankSpeedTrap(
			{
				"1": { BestSpeeds: { St: { Value: "331.4" }, Fl: { Value: "320.1" } } },
				"4": { BestSpeeds: { St: { Value: "" }, Fl: { Value: "329.8" } } },
				"16": { BestSpeeds: { St: { Value: "not-a-number" }, Fl: { Value: "" } } },
			},
			{
				"1": { Tla: "VER", TeamColour: "3671C6" },
				"4": { Tla: "NOR", TeamColour: "FF8000" },
				"16": { Tla: "LEC", TeamColour: "E8002D" },
			},
		);

		expect(ranked).toEqual([
			{ racingNumber: "1", tla: "VER", teamColour: "3671C6", speed: 331.4, source: "ST" },
			{ racingNumber: "4", tla: "NOR", teamColour: "FF8000", speed: 329.8, source: "FL" },
		]);
	});

	it("reconstructs Q1, Q2 and Q3 groups from final positions", () => {
		const lines = Object.fromEntries(
			Array.from({ length: 20 }, (_, index) => {
				const position = index + 1;
				return [
					String(position),
					{
						RacingNumber: String(position),
						Position: String(position),
						KnockedOut: position > 10,
						BestLapTime: { Value: `1:2${position}.000` },
					},
				];
			}),
		);

		const groups = buildProgressionGroups(lines);

		expect(groups.q1.map((entry) => entry.position)).toEqual([16, 17, 18, 19, 20]);
		expect(groups.q2.map((entry) => entry.position)).toEqual([11, 12, 13, 14, 15]);
		expect(groups.q3.map((entry) => entry.position)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
	});

	it("reveals progression columns only after their round has ended", () => {
		expect(getProgressionVisibility(1, "Started")).toEqual({ q1: false, q2: false, q3: false });
		expect(getProgressionVisibility(1, "Finished")).toEqual({ q1: true, q2: false, q3: false });
		expect(getProgressionVisibility(2, "Started")).toEqual({ q1: true, q2: false, q3: false });
		expect(getProgressionVisibility(2, "Finished")).toEqual({ q1: true, q2: true, q3: false });
		expect(getProgressionVisibility(3, "Started")).toEqual({ q1: true, q2: true, q3: false });
		expect(getProgressionVisibility(3, "Finalised")).toEqual({ q1: true, q2: true, q3: true });
	});
});
