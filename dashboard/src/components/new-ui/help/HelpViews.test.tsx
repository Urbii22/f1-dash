import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";

import { SimpleHelpView } from "@/components/new-ui/help/HelpViews";
import { DetailedHelpView } from "@/components/new-ui/help/HelpViews";

test("Simple shows route header and core color section", () => {
	render(<SimpleHelpView />);
	expect(screen.getByRole("heading", { name: "Help & reference" })).toBeVisible();
	expect(screen.getByRole("heading", { name: "Timing colors" })).toBeVisible();
	expect(screen.getByRole("heading", { name: "Delay control" })).toBeVisible();
});

test("Simple shows pit status and driver status sections", () => {
	render(<SimpleHelpView />);
	expect(screen.getByRole("heading", { name: "Driver status indicators" })).toBeVisible();
	expect(screen.getByRole("heading", { name: "Pit status" })).toBeVisible();
});

test("Detailed shows tire compounds and telemetry sections not in Simple", () => {
	render(<DetailedHelpView />);
	expect(screen.getByRole("heading", { name: "Tire compounds" })).toBeVisible();
	expect(screen.getByRole("heading", { name: "Driver telemetry channels" })).toBeVisible();
	expect(screen.getByRole("heading", { name: "Weather indicators" })).toBeVisible();
});

test("Detailed includes stream sync tips", () => {
	render(<DetailedHelpView />);
	expect(screen.getByText(/What to sync on/i)).toBeVisible();
	expect(screen.getAllByText(/lap counter/i).length).toBeGreaterThan(0);
});
