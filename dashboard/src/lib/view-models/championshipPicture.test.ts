import { describe, expect, it } from "vitest";

import { buildChampionshipPicture } from "@/lib/view-models/championshipPicture";
import type { DriverStandingRow } from "@/lib/f1data";

const driver = (id: string, code: string, points: number, wins = 0): DriverStandingRow => ({
	position: null,
	points,
	wins,
	driver: { driverId: id, code, permanentNumber: null, givenName: code, familyName: id, nationality: null },
	constructorId: null,
	constructor: null,
});

describe("buildChampionshipPicture", () => {
	const field = [driver("norris", "NOR", 200, 6), driver("piastri", "PIA", 180, 4), driver("verstappen", "VER", 120, 2)];

	it("returns null without usable rows", () => {
		expect(buildChampionshipPicture([], { races: 1, sprints: 0 })).toBeNull();
	});

	it("describes an open fight with the leader margin and live contenders", () => {
		const vm = buildChampionshipPicture(field, { races: 2, sprints: 0 });
		expect(vm?.clinched).toBe(false);
		expect(vm?.headline).toContain("leads by 20");
		// 2 races = 50 pts: norris(alive), piastri 180+50>=200 alive, verstappen 120+50=170<200 dead → 2 alive
		expect(vm?.subline).toContain("2 drivers");
		expect(vm?.rows.find((r) => r.id === "verstappen")?.canStillWin).toBe(false);
		expect(vm?.rows.find((r) => r.isLeader)?.id).toBe("norris");
	});

	it("announces a clinch once the gap is out of reach", () => {
		const vm = buildChampionshipPicture(field, { races: 0, sprints: 0 });
		expect(vm?.clinched).toBe(true);
		expect(vm?.seasonOver).toBe(true);
		expect(vm?.headline).toContain("is the champion");
	});

	it("says clinched (not season over) when mathematically decided mid-season", () => {
		const blowout = [driver("norris", "NOR", 300, 10), driver("piastri", "PIA", 200, 3)];
		const vm = buildChampionshipPicture(blowout, { races: 1, sprints: 0 }); // gap 100 > 25
		expect(vm?.clinched).toBe(true);
		expect(vm?.seasonOver).toBe(false);
		expect(vm?.headline).toContain("has clinched");
	});
});
