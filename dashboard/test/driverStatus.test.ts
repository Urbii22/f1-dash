import assert from "node:assert/strict";
import test from "node:test";

import { getDriverStatus, getSessionYear } from "../src/lib/driverStatus.ts";

test("session year uses the ISO start date first", () => {
	assert.equal(getSessionYear({ StartDate: "2026-03-08T04:00:00Z", Path: "2025/Australian_GP/Race" }), 2026);
});

test("session year falls back to the session path", () => {
	assert.equal(getSessionYear({ StartDate: "", Path: "2025/Monaco_GP/Race" }), 2025);
});

test("session year remains unknown without trustworthy metadata", () => {
	assert.equal(getSessionYear(undefined), null);
	assert.equal(getSessionYear({ StartDate: "invalid", Path: "Monaco_GP/Race" }), null);
});

test("pit state takes precedence over legacy telemetry", () => {
	assert.deepEqual(getDriverStatus({ year: 2026, inPit: true, pitOut: true, legacyChannel: 12 }), {
		kind: "pit",
		label: "PIT",
	});
});

test("pit out is distinct from being in the pit", () => {
	assert.deepEqual(getDriverStatus({ year: 2026, inPit: false, pitOut: true, legacyChannel: 12 }), {
		kind: "pit-out",
		label: "PIT OUT",
	});
});

test("2026 and unknown sessions hide the unspecified legacy channel", () => {
	assert.deepEqual(getDriverStatus({ year: 2026, inPit: false, pitOut: false, legacyChannel: 12 }), {
		kind: "none",
		label: "",
	});
	assert.deepEqual(getDriverStatus({ year: null, inPit: false, pitOut: false, legacyChannel: 12 }), {
		kind: "none",
		label: "",
	});
});

test("known pre-2026 sessions preserve real legacy DRS states", () => {
	assert.deepEqual(getDriverStatus({ year: 2025, inPit: false, pitOut: false, legacyChannel: 12 }), {
		kind: "drs-active",
		label: "DRS",
	});
	assert.deepEqual(getDriverStatus({ year: 2025, inPit: false, pitOut: false, legacyChannel: 8 }), {
		kind: "drs-ready",
		label: "DRS",
	});
	assert.deepEqual(getDriverStatus({ year: 2025, inPit: false, pitOut: false, legacyChannel: 0 }), {
		kind: "drs-off",
		label: "DRS",
	});
});
