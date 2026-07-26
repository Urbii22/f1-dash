import { describe, expect, it } from "vitest";

import { buildBattles } from "@/lib/view-models/battles";
import type { State, TimingDataDriver } from "@/types/state.type";

const line = (partial: Partial<TimingDataDriver>): TimingDataDriver =>
	({
		Position: "1",
		InPit: false,
		PitOut: false,
		Retired: false,
		Stopped: false,
		...partial,
	}) as TimingDataDriver;

const state = (lines: Record<string, TimingDataDriver>, drivers?: Record<string, { Tla: string }>): State =>
	({
		TimingData: { Lines: lines },
		DriverList: drivers,
	}) as unknown as State;

describe("buildBattles", () => {
	it("finds cars within the threshold of the car ahead, ordered by gap", () => {
		const s = state(
			{
				"1": line({ Position: "1" }),
				"44": line({ Position: "2", IntervalToPositionAhead: { Value: "0.6", Catching: true } }),
				"16": line({ Position: "3", IntervalToPositionAhead: { Value: "2.5", Catching: false } }),
				"63": line({ Position: "4", IntervalToPositionAhead: { Value: "0.3", Catching: false } }),
			},
			{ "1": { Tla: "VER" }, "44": { Tla: "HAM" }, "16": { Tla: "LEC" }, "63": { Tla: "RUS" } },
		);
		const battles = buildBattles(s);
		// 0.3 (RUS→LEC) closer than 0.6 (HAM→VER); LEC at 2.5 excluded
		expect(battles.map((b) => b.attackerTla)).toEqual(["RUS", "HAM"]);
		expect(battles[0]).toMatchObject({ attackerTla: "RUS", defenderTla: "LEC", position: 3, gapSeconds: 0.3 });
		expect(battles[1]).toMatchObject({ attackerTla: "HAM", defenderTla: "VER", catching: true });
	});

	it("skips cars in a pit cycle on either side", () => {
		const s = state({
			"1": line({ Position: "1" }),
			"44": line({ Position: "2", InPit: true, IntervalToPositionAhead: { Value: "0.5", Catching: true } }),
			"16": line({ Position: "3", IntervalToPositionAhead: { Value: "0.4", Catching: true } }),
		});
		// 44 (in pit) excluded; 16 chases 44 but 44 is in pit → excluded too
		expect(buildBattles(s)).toEqual([]);
	});

	it("returns empty without timing data", () => {
		expect(buildBattles(null)).toEqual([]);
		expect(buildBattles({} as State)).toEqual([]);
	});
});
