import { render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";

vi.mock("@/components/hub/HubCountdown", () => ({
	default: ({ target }: { target: string }) => <div data-testid="hub-countdown">{target}</div>,
}));

import { SimpleHomeView, DetailedHomeView } from "@/components/new-ui/home/HomeViews";
import type { DriverStandingRow, ConstructorStandingRow } from "@/lib/f1data";

const baseProps = {
	season: 2026,
	hubMeeting: { meeting: { name: "British Grand Prix", countryName: "Great Britain", start: "", end: "", over: false, sessions: [] }, live: false },
	nextSession: { kind: "Race", start: new Date(Date.now() + 86400000).toISOString() },
	drivers: {
		standings: [
			{ position: 1, points: 200, wins: 8, driver: { driverId: "ver", code: "VER", permanentNumber: "1", givenName: "Max", familyName: "Verstappen", nationality: null }, constructorId: "red-bull", constructor: "Red Bull" } as DriverStandingRow,
		],
	},
	constructors: {
		standings: [
			{ position: 1, points: 320, wins: 10, constructorId: "red-bull", name: "Red Bull", nationality: "Austrian" } as ConstructorStandingRow,
		],
	},
	roundResults: [
		{ round: { round: 10, raceName: "British Grand Prix", date: "2026-07-05" }, result: null },
	],
	latest: null,
	meetingRecordings: [],
	liveRound: null,
};

test("Simple shows route header and next event panel", () => {
	render(<SimpleHomeView {...baseProps} />);
	expect(screen.getByRole("heading", { name: "The season, live and between races." })).toBeVisible();
	expect(screen.getByRole("heading", { name: "Next event" })).toBeVisible();
	expect(screen.getByText("British Grand Prix")).toBeVisible();
});

test("Simple shows countdown for next session", () => {
	render(<SimpleHomeView {...baseProps} />);
	expect(screen.getByTestId("hub-countdown")).toBeVisible();
});

test("Simple shows championship leaders", () => {
	render(<SimpleHomeView {...baseProps} />);
	expect(screen.getByRole("heading", { name: "Drivers" })).toBeVisible();
	expect(screen.getByText("Max Verstappen")).toBeVisible();
	expect(screen.getByRole("heading", { name: "Constructors" })).toBeVisible();
	expect(screen.getByText("Red Bull")).toBeVisible();
});

test("Simple shows live banner when meeting is live", () => {
	render(<SimpleHomeView {...baseProps} hubMeeting={{ meeting: baseProps.hubMeeting.meeting, live: true }} />);
	expect(screen.getByText(/Weekend live/i)).toBeVisible();
});

test("Detailed shows season calendar", () => {
	render(<DetailedHomeView {...baseProps} />);
	expect(screen.getByRole("heading", { name: "2026 calendar" })).toBeVisible();
	expect(screen.getAllByText("British Grand Prix").length).toBeGreaterThan(0);
});
