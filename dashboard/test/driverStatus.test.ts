import { expect, test } from "vitest";

import { getDriverStatus, getSessionYear } from "../src/lib/driverStatus";

test("session year uses the ISO start date first", () => {
	expect(getSessionYear({ StartDate: "2026-03-08T04:00:00Z", Path: "2025/Australian_GP/Race" })).toBe(2026);
});

test("session year falls back to the session path", () => {
	expect(getSessionYear({ StartDate: "", Path: "2025/Monaco_GP/Race" })).toBe(2025);
});

test("session year remains unknown without trustworthy metadata", () => {
	expect(getSessionYear(undefined)).toBeNull();
	expect(getSessionYear({ StartDate: "invalid", Path: "Monaco_GP/Race" })).toBeNull();
});

test("pit state takes precedence over legacy telemetry", () => {
	expect(getDriverStatus({ year: 2026, inPit: true, pitOut: true, legacyChannel: 12 })).toEqual({
		kind: "pit",
		label: "PIT",
	});
});

test("pit out is distinct from being in the pit", () => {
	expect(getDriverStatus({ year: 2026, inPit: false, pitOut: true, legacyChannel: 12 })).toEqual({
		kind: "pit-out",
		label: "PIT OUT",
	});
});

test("2026 and unknown sessions hide the unspecified legacy channel", () => {
	expect(getDriverStatus({ year: 2026, inPit: false, pitOut: false, legacyChannel: 12 })).toEqual({
		kind: "none",
		label: "",
	});
	expect(getDriverStatus({ year: null, inPit: false, pitOut: false, legacyChannel: 12 })).toEqual({
		kind: "none",
		label: "",
	});
});

test("known pre-2026 sessions preserve real legacy DRS states", () => {
	expect(getDriverStatus({ year: 2025, inPit: false, pitOut: false, legacyChannel: 12 })).toEqual({
		kind: "drs-active",
		label: "DRS",
	});
	expect(getDriverStatus({ year: 2025, inPit: false, pitOut: false, legacyChannel: 8 })).toEqual({
		kind: "drs-ready",
		label: "DRS",
	});
	expect(getDriverStatus({ year: 2025, inPit: false, pitOut: false, legacyChannel: 0 })).toEqual({
		kind: "drs-off",
		label: "DRS",
	});
});
