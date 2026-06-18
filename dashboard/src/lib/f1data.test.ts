import { describe, expect, it } from "vitest";

import {
	driverFullName,
	gapToLeader,
	lapChartSeries,
	pitStopsByDriver,
	podium,
	rankPitStops,
	type DriverRef,
	type PitStop,
	type RaceLap,
} from "@/lib/f1data";

const stop = (partial: Partial<PitStop>): PitStop => ({
	driverId: null,
	lap: null,
	stop: null,
	time: null,
	durationSeconds: null,
	...partial,
});

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

describe("rankPitStops", () => {
	it("orders by stationary time and drops stops with no duration", () => {
		const stops = [
			stop({ driverId: "norris", durationSeconds: 22.3 }),
			stop({ driverId: "russell", durationSeconds: null }),
			stop({ driverId: "piastri", durationSeconds: 21.9 }),
		];
		expect(rankPitStops(stops).map((s) => s.driverId)).toEqual(["piastri", "norris"]);
	});
});

describe("pitStopsByDriver", () => {
	it("aggregates count, total and best per driver", () => {
		const stops = [
			stop({ driverId: "norris", durationSeconds: 22.0 }),
			stop({ driverId: "norris", durationSeconds: 24.0 }),
			stop({ driverId: "piastri", durationSeconds: 21.5 }),
		];
		const summary = pitStopsByDriver(stops);
		const norris = summary.find((s) => s.driverId === "norris");
		expect(norris).toMatchObject({ stops: 2, totalSeconds: 46, bestSeconds: 22 });
		expect(summary.find((s) => s.driverId === "piastri")?.stops).toBe(1);
	});
});

describe("lapChartSeries", () => {
	it("builds a position-by-lap line per driver", () => {
		const laps: RaceLap[] = [
			{ lap: 1, timings: [{ driverId: "norris", position: 1, time: null }, { driverId: "piastri", position: 2, time: null }] },
			{ lap: 2, timings: [{ driverId: "norris", position: 2, time: null }, { driverId: "piastri", position: 1, time: null }] },
		];
		const series = lapChartSeries(laps);
		const norris = series.find((s) => s.driverId === "norris");
		expect(norris?.points).toEqual([
			{ x: 1, y: 1 },
			{ x: 2, y: 2 },
		]);
		expect(series).toHaveLength(2);
	});
});
