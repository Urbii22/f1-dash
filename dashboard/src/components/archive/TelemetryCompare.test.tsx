import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import TelemetryCompare from "@/components/archive/TelemetryCompare";
import type { LapRecord } from "@/lib/lapHistory";
import type { ArchiveLaps } from "@/types/archive.type";

function lap(n: number, ms: number | null, pitted = false): LapRecord {
	return {
		lap: n,
		lapTimeMs: ms,
		sectorsMs: [null, null, null],
		position: null,
		gapToLeaderMs: null,
		compound: null,
		tyreAge: null,
		pitted,
		utc: "2026-07-05T13:00:00Z",
	};
}

const drivers = {
	"1": { Tla: "VER", TeamColour: "3671C6" },
	"4": { Tla: "NOR", TeamColour: "FF8000" },
};

const laps: ArchiveLaps = {
	// best (non-pitted) lap is lap 3 at 90.0s; lap 1 is a slow out-lap, lap 2 is a pit lap
	"1": [lap(1, 95000), lap(2, 120000, true), lap(3, 90000)],
	"4": [lap(1, 96000), lap(2, 91000)],
};

beforeEach(() => {
	vi.stubGlobal(
		"fetch",
		vi.fn(async () => ({
			json: async () => ({
				samples: [
					{ tMs: 0, lap: 3, speed: 100, rpm: 9000, gear: 3, throttle: 100, brake: 0 },
					{ tMs: 1000, lap: 3, speed: 300, rpm: 12000, gear: 7, throttle: 100, brake: 0 },
				],
			}),
		})),
	);
});

afterEach(() => {
	vi.unstubAllGlobals();
});

test("defaults each driver to their fastest non-pitted lap", () => {
	render(<TelemetryCompare sessionId={1} drivers={drivers} laps={laps} />);
	// VER's best timed lap is 3 (90.0s), not the pitted lap 2 nor the slow lap 1
	expect(screen.getByLabelText("Lap for VER")).toHaveValue("3");
	expect(screen.getByLabelText("Lap for NOR")).toHaveValue("2");
});

test("shows empty state when no timed laps with telemetry exist", () => {
	render(<TelemetryCompare sessionId={1} drivers={drivers} laps={{ "1": [lap(1, null), lap(2, 120000, true)] }} />);
	expect(screen.getByText(/No timed laps with telemetry/i)).toBeVisible();
});

test("Compare fetches telemetry and renders channel charts", async () => {
	render(<TelemetryCompare sessionId={1} drivers={drivers} laps={laps} />);
	fireEvent.click(screen.getByRole("button", { name: /Compare best laps/i }));
	await waitFor(() => expect(screen.getByText("Speed")).toBeVisible());
	expect(screen.getByText("Throttle")).toBeVisible();
	expect(screen.getByText("Brake")).toBeVisible();
	expect(screen.getByText("Gear")).toBeVisible();
	expect(fetch).toHaveBeenCalled();
});
