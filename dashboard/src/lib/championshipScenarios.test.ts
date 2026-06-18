import { describe, expect, it } from "vitest";

import {
	maxPointsRemaining,
	pointsToClinchAgainst,
	titlePicture,
	type Contender,
} from "@/lib/championshipScenarios";

describe("maxPointsRemaining", () => {
	it("sums race and sprint maxima, clamps negatives", () => {
		expect(maxPointsRemaining({ races: 3, sprints: 1 })).toBe(3 * 25 + 8);
		expect(maxPointsRemaining({ races: 0, sprints: 0 })).toBe(0);
		expect(maxPointsRemaining({ races: -2, sprints: -1 })).toBe(0);
	});
});

describe("titlePicture", () => {
	const field: Contender[] = [
		{ id: "norris", points: 200, wins: 6 },
		{ id: "piastri", points: 180, wins: 4 },
		{ id: "verstappen", points: 120, wins: 2 },
	];

	it("identifies the leader and orders by points then wins", () => {
		const tie: Contender[] = [
			{ id: "a", points: 100, wins: 2 },
			{ id: "b", points: 100, wins: 5 },
		];
		const picture = titlePicture(tie, { races: 1, sprints: 0 });
		expect(picture.leaderId).toBe("b");
		expect(picture.contenders[0].id).toBe("b");
	});

	it("marks contenders out of reach as eliminated", () => {
		// 1 race left = 25 max. Verstappen (120) maxReachable 145 < 200 → eliminated.
		const picture = titlePicture(field, { races: 1, sprints: 0 });
		const ver = picture.contenders.find((c) => c.id === "verstappen");
		const pia = picture.contenders.find((c) => c.id === "piastri");
		expect(ver?.canStillWin).toBe(false);
		expect(pia?.canStillWin).toBe(true); // 180 + 25 = 205 >= 200
		expect(pia?.pointsBehind).toBe(20);
	});

	it("clinches only when the gap exceeds everything remaining", () => {
		// gap leader→second = 20. 1 race (25) left → not clinched (second can still tie/pass).
		expect(titlePicture(field, { races: 1, sprints: 0 }).clinched).toBe(false);
		// no events left → 20 > 0 → clinched.
		expect(titlePicture(field, { races: 0, sprints: 0 }).clinched).toBe(true);
	});

	it("a single contender is trivially the clinched leader", () => {
		const picture = titlePicture([{ id: "solo", points: 10, wins: 1 }], { races: 2, sprints: 0 });
		expect(picture.leaderId).toBe("solo");
		expect(picture.clinched).toBe(true);
	});

	it("handles an empty field", () => {
		const picture = titlePicture([], { races: 1, sprints: 0 });
		expect(picture.leaderId).toBeNull();
		expect(picture.clinched).toBe(false);
		expect(picture.contenders).toHaveLength(0);
	});
});

describe("pointsToClinchAgainst", () => {
	it("is positive while the rival is a live threat and <= 0 once beaten", () => {
		const leader: Contender = { id: "norris", points: 200, wins: 6 };
		const liveRival: Contender = { id: "piastri", points: 180, wins: 4 };
		const deadRival: Contender = { id: "verstappen", points: 120, wins: 2 };
		// 1 race left (25): 180 + 25 - 200 + 1 = 6 → leader must out-score by 6.
		expect(pointsToClinchAgainst(leader, liveRival, { races: 1, sprints: 0 })).toBe(6);
		// 120 + 25 - 200 + 1 = -54 → already beaten.
		expect(pointsToClinchAgainst(leader, deadRival, { races: 1, sprints: 0 })).toBeLessThanOrEqual(0);
	});
});
