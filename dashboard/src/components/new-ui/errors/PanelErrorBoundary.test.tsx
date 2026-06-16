import { render, screen, fireEvent } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import PanelErrorBoundary from "./PanelErrorBoundary";

function ThrowOnMount() {
	throw new Error("panel crash");
}

function HealthyPanel() {
	return <div data-testid="healthy">Healthy content</div>;
}

test("shows fallback when child throws", () => {
	const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
	render(
		<PanelErrorBoundary label="Test Panel">
			<ThrowOnMount />
		</PanelErrorBoundary>,
	);
	expect(screen.getByText("Panel unavailable")).toBeVisible();
	expect(screen.getByRole("button", { name: "Retry" })).toBeVisible();
	consoleSpy.mockRestore();
});

test("healthy sibling panel unaffected by throwing panel", () => {
	const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
	render(
		<div>
			<PanelErrorBoundary label="Broken">
				<ThrowOnMount />
			</PanelErrorBoundary>
			<PanelErrorBoundary label="Healthy">
				<HealthyPanel />
			</PanelErrorBoundary>
		</div>,
	);
	expect(screen.getByText("Panel unavailable")).toBeVisible();
	expect(screen.getByTestId("healthy")).toBeVisible();
	consoleSpy.mockRestore();
});

test("retry button remounts the failed panel", () => {
	const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
	let shouldThrow = true;
	function MaybeThrow() {
		if (shouldThrow) throw new Error("crash");
		return <div data-testid="recovered">Recovered</div>;
	}
	render(
		<PanelErrorBoundary label="Retry Panel">
			<MaybeThrow />
		</PanelErrorBoundary>,
	);
	expect(screen.getByText("Panel unavailable")).toBeVisible();
	shouldThrow = false;
	fireEvent.click(screen.getByRole("button", { name: "Retry" }));
	expect(screen.getByTestId("recovered")).toBeVisible();
	consoleSpy.mockRestore();
});
