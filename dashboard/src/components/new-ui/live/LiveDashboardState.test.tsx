import { render, screen } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";

vi.mock("@/components/dashboard/Map", () => ({
	default: () => <div data-testid="map" />,
}));

import LiveDashboardState, { resolveLiveDashboardMode } from "@/components/new-ui/live/LiveDashboardState";
import type { State } from "@/types/state.type";
import { useConnectionStore } from "@/stores/useConnectionStore";
import { useDataStore } from "@/stores/useDataStore";

beforeEach(() => {
	useConnectionStore.setState({ connected: false });
	useDataStore.setState({ state: null, carsData: null });
});

test("disconnected with retained data is replay, not connecting", () => {
	expect(resolveLiveDashboardMode({ connected: false, hasData: true, hasSessionInfo: true, ended: false })).toBe(
		"replay",
	);
});

test("disconnected with no data is connecting", () => {
	expect(resolveLiveDashboardMode({ connected: false, hasData: false, hasSessionInfo: false, ended: false })).toBe(
		"connecting",
	);
});

test("connected without session info is no-session", () => {
	expect(resolveLiveDashboardMode({ connected: true, hasData: true, hasSessionInfo: false, ended: false })).toBe(
		"no-session",
	);
});

test("ended session wins over connection", () => {
	expect(resolveLiveDashboardMode({ connected: true, hasData: true, hasSessionInfo: true, ended: true })).toBe(
		"ended",
	);
});

test("error wins over everything", () => {
	expect(
		resolveLiveDashboardMode({ connected: true, hasData: true, hasSessionInfo: true, ended: false, error: true }),
	).toBe("error");
});

test("connected with session info is live", () => {
	expect(resolveLiveDashboardMode({ connected: true, hasData: true, hasSessionInfo: true, ended: false })).toBe(
		"live",
	);
});

test("renders connecting state by default", () => {
	render(<LiveDashboardState density="simple" />);
	expect(screen.getByText("Connecting to live timing")).toBeVisible();
});

test("renders the Simple dashboard when live", () => {
	useConnectionStore.setState({ connected: true });
	useDataStore.setState({
		state: { SessionInfo: { Name: "Race" } } as unknown as State,
		carsData: null,
	});
	render(<LiveDashboardState density="simple" />);
	expect(screen.getByTestId("simple-dashboard")).toBeVisible();
});

test("renders ended state when the session has finished", () => {
	useConnectionStore.setState({ connected: true });
	useDataStore.setState({
		state: { SessionInfo: { Name: "Race" }, SessionStatus: { Status: "Ends" } } as unknown as State,
		carsData: null,
	});
	render(<LiveDashboardState density="simple" />);
	expect(screen.getByText("Session ended")).toBeVisible();
});
