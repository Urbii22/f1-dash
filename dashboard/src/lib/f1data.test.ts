import { describe, expect, it } from "vitest";

import { driverFullName, gapToLeader, podium, type DriverRef } from "@/lib/f1data";

const ref = (partial: Partial<DriverRef>): DriverRef => ({
	driverId: null,
	code: null,
	permanentNumber: null,
	givenName: null,
	familyName: null,
	nationality: null,
	...partial,
});

describe("driverFullName", () => {
	it("joins given and family name", () => {
		expect(driverFullName(ref({ givenName: "Max", familyName: "Verstappen" }))).toBe("Max Verstappen");
	});
	it("falls back to code then driverId then dash", () => {
		expect(driverFullName(ref({ code: "VER" }))).toBe("VER");
		expect(driverFullName(ref({ driverId: "verstappen" }))).toBe("verstappen");
		expect(driverFullName(ref({}))).toBe("—");
	});
});

describe("gapToLeader", () => {
	it("returns the points difference, null when missing", () => {
		expect(gapToLeader(180, 180)).toBe(0);
		expect(gapToLeader(150, 180)).toBe(30);
		expect(gapToLeader(null, 180)).toBeNull();
		expect(gapToLeader(150, null)).toBeNull();
	});
});

describe("podium", () => {
	it("returns the top three sorted by position regardless of input order", () => {
		const rows = [{ position: 3 }, { position: 1 }, { position: 5 }, { position: 2 }];
		expect(podium(rows).map((r) => r.position)).toEqual([1, 2, 3]);
	});
});
