import { render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";

vi.mock("@/components/schedule/Countdown", () => ({
	default: ({ type }: { type: string }) => <div data-testid={`countdown-${type}`}>countdown</div>,
}));

import { SimpleScheduleView } from "@/components/new-ui/schedule/ScheduleViews";
import { DetailedScheduleView } from "@/components/new-ui/schedule/ScheduleViews";
import type { Round } from "@/types/schedule.type";

const futureDate = new Date(Date.now() + 86400000 * 10).toISOString();
const pastDate = new Date(Date.now() - 86400000).toISOString();

const mockNext: Round = {
	name: "British Grand Prix",
	countryName: "Great Britain",
	start: futureDate,
	end: new Date(Date.now() + 86400000 * 12).toISOString(),
	over: false,
	sessions: [
		{ kind: "Practice 1", start: futureDate, end: new Date(Date.now() + 86400000 * 10 + 3600000).toISOString() },
		{ kind: "Race", start: new Date(Date.now() + 86400000 * 12).toISOString(), end: new Date(Date.now() + 86400000 * 12 + 7200000).toISOString() },
	],
};

const mockSchedule: Round[] = [
	{ ...mockNext },
	{ name: "Bahrain Grand Prix", countryName: "Bahrain", start: pastDate, end: pastDate, over: true, sessions: [] },
];

test("Simple shows Schedule route header and next event", () => {
	render(<SimpleScheduleView next={mockNext} schedule={mockSchedule} />);
	expect(screen.getByRole("heading", { name: "Schedule" })).toBeVisible();
	expect(screen.getByRole("heading", { name: "Great Britain" })).toBeVisible();
});

test("Simple shows countdown for non-race session", () => {
	render(<SimpleScheduleView next={mockNext} schedule={mockSchedule} />);
	expect(screen.getByTestId("countdown-other")).toBeVisible();
	expect(screen.getByTestId("countdown-race")).toBeVisible();
});

test("Simple shows empty state when no next round", () => {
	render(<SimpleScheduleView next={null} schedule={null} />);
	expect(screen.getByText(/No upcoming event/i)).toBeVisible();
});

test("Detailed shows all rounds from schedule", () => {
	render(<DetailedScheduleView next={mockNext} schedule={mockSchedule} />);
	expect(screen.getAllByText("Great Britain").length).toBeGreaterThan(0);
	expect(screen.getAllByText("Bahrain").length).toBeGreaterThan(0);
});

test("Detailed shows unavailable state when schedule is null", () => {
	render(<DetailedScheduleView next={null} schedule={null} />);
	expect(screen.getByText(/Schedule unavailable/i)).toBeVisible();
});
