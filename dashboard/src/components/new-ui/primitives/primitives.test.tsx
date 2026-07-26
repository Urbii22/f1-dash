import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import Panel from "@/components/new-ui/primitives/Panel";
import Kpi from "@/components/new-ui/primitives/Kpi";
import StatusBadge from "@/components/new-ui/primitives/StatusBadge";
import ViewState from "@/components/new-ui/primitives/ViewState";

test("panel is labelled by its title", () => {
	render(<Panel title="Classification">content</Panel>);
	expect(screen.getByRole("region", { name: "Classification" })).toBeVisible();
});

test("kpi renders value, unit, and context", () => {
	render(<Kpi label="Gap" value="1.234" unit="s" context="to leader" />);
	expect(screen.getByText("1.234")).toBeVisible();
	expect(screen.getByText("s")).toBeVisible();
	expect(screen.getByText("to leader")).toBeVisible();
});

test("status badge includes visible text alongside tone", () => {
	render(<StatusBadge tone="green" label="Track Clear" />);
	expect(screen.getByText("Track Clear")).toBeVisible();
});

test.each(["loading", "empty", "unavailable", "error"] as const)("view state %s is explicit", (state) => {
	render(<ViewState state={state} title={`${state} title`} />);
	expect(screen.getByText(`${state} title`)).toBeVisible();
});

test("unavailable state is explicit", () => {
	render(<ViewState state="unavailable" title="Telemetry unavailable" />);
	expect(screen.getByText("Telemetry unavailable")).toBeVisible();
});
