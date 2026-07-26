import { render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";

vi.mock("@/components/archive/ArchiveAnalysis", () => ({
	default: () => <div data-testid="archive-analysis">Archive analysis mock</div>,
}));

import {
	SimpleArchiveListView,
	DetailedArchiveListView,
	SimpleArchiveSessionView,
	DetailedArchiveSessionView,
} from "@/components/new-ui/archive/ArchiveViews";
import type { ArchiveSession, ArchiveSessionDetail } from "@/types/archive.type";

const mockSession: ArchiveSession = {
	id: 1,
	path: "/test",
	year: 2026,
	meeting: "British Grand Prix",
	country: "Great Britain",
	kind: "Race",
	name: "British Grand Prix – Race",
	startUtc: "2026-07-06T14:00:00Z",
	complete: true,
	totalLaps: 52,
};

const mockSessionDetail: ArchiveSessionDetail = {
	...mockSession,
	drivers: [
		{ racingNumber: "1", tla: "VER", fullName: "Max Verstappen", teamName: "Red Bull", teamColour: "3671C6" },
		{ racingNumber: "4", tla: "NOR", fullName: "Lando Norris", teamName: "McLaren", teamColour: "FF8000" },
	],
	weatherSummary: { airTemp: 22, trackTemp: 38 },
};

test("SimpleArchiveListView shows route header and session cards", () => {
	render(<SimpleArchiveListView sessions={[mockSession]} />);
	expect(screen.getByRole("heading", { name: "Recorded history" })).toBeVisible();
	expect(screen.getByText("British Grand Prix – Race")).toBeVisible();
});

test("SimpleArchiveListView shows empty state with no sessions", () => {
	render(<SimpleArchiveListView sessions={[]} />);
	expect(screen.getByText(/No archived sessions/i)).toBeVisible();
});

test("DetailedArchiveListView shows KPI tiles when sessions present", () => {
	render(<DetailedArchiveListView sessions={[mockSession]} />);
	expect(screen.getByText("Total sessions")).toBeVisible();
	expect(screen.getAllByText("Complete").length).toBeGreaterThan(0);
});

test("SimpleArchiveSessionView shows session name and drivers", () => {
	render(<SimpleArchiveSessionView session={mockSessionDetail} laps={{}} stints={{}} events={[]} />);
	expect(screen.getByRole("heading", { name: "British Grand Prix – Race" })).toBeVisible();
	expect(screen.getByText("VER")).toBeVisible();
	expect(screen.getByText("NOR")).toBeVisible();
});

test("DetailedArchiveSessionView renders ArchiveAnalysis", () => {
	render(<DetailedArchiveSessionView session={mockSessionDetail} laps={{}} stints={{}} events={[]} />);
	expect(screen.getByTestId("archive-analysis")).toBeVisible();
});
