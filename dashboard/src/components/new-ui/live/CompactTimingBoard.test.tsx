import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";

import CompactTimingRow from "@/components/new-ui/live/CompactTimingRow";
import type { CompactTimingRowModel } from "@/lib/view-models/liveTiming";

function row(overrides: Partial<CompactTimingRowModel> = {}): CompactTimingRowModel {
	return {
		driverNumber: "1",
		position: 1,
		positionChange: null,
		code: "VER",
		fullName: "Max VERSTAPPEN",
		teamName: "Red Bull Racing",
		teamColor: "#3671C6",
		compound: "SOFT",
		tyreAge: 4,
		primaryGap: "Leader",
		secondaryGap: null,
		trend: null,
		status: "running",
		lastLap: "1:20.500",
		bestLap: "1:20.100",
		...overrides,
	};
}

afterEach(() => vi.restoreAllMocks());

test("row accessible name includes position and driver", () => {
	render(<CompactTimingRow row={row()} selected={false} onSelect={() => {}} />);
	const item = screen.getByRole("button");
	expect(item).toHaveAccessibleName(/1/);
	expect(item).toHaveAccessibleName(/VER/);
});

test("clicking a row selects the driver", () => {
	const onSelect = vi.fn();
	render(<CompactTimingRow row={row()} selected={false} onSelect={onSelect} />);
	fireEvent.click(screen.getByRole("button"));
	expect(onSelect).toHaveBeenCalledWith("1");
});

test("pressing Enter selects the driver", () => {
	const onSelect = vi.fn();
	render(<CompactTimingRow row={row()} selected={false} onSelect={onSelect} />);
	fireEvent.keyDown(screen.getByRole("button"), { key: "Enter" });
	expect(onSelect).toHaveBeenCalledWith("1");
});

test("status is conveyed with visible text, not color alone", () => {
	render(<CompactTimingRow row={row({ status: "pit" })} selected={false} onSelect={() => {}} />);
	const item = screen.getByRole("button");
	expect(within(item).getByText(/pit/i)).toBeVisible();
});

test("compact row omits sectors and car telemetry channels", () => {
	const { container } = render(<CompactTimingRow row={row()} selected={false} onSelect={() => {}} />);
	expect(container.querySelector("[data-sectors]")).toBeNull();
	expect(container.querySelector("[data-car-channels]")).toBeNull();
});

test("selected row exposes aria-selected", () => {
	render(<CompactTimingRow row={row()} selected onSelect={() => {}} />);
	expect(screen.getByRole("button")).toHaveAttribute("aria-selected", "true");
});
