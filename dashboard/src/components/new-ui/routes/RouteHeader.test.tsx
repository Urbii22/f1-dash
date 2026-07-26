import { render, screen } from "@testing-library/react";
import { beforeEach, expect, test } from "vitest";

import InsightSummary, { type Insight } from "@/components/new-ui/routes/InsightSummary";
import RouteHeader from "@/components/new-ui/routes/RouteHeader";
import { useUiPreferencesStore } from "@/stores/useUiPreferencesStore";

beforeEach(() => {
	useUiPreferencesStore.setState({ generation: "new", density: "simple", hydrated: true });
});

test("route header renders context, status, and actions", () => {
	render(
		<RouteHeader
			eyebrow="Session analysis"
			title="Race pace"
			description="Clean-lap comparison across the field."
			status={<span>Live data</span>}
			actions={<button type="button">Export</button>}
		/>,
	);

	expect(screen.getByRole("heading", { name: "Race pace" })).toBeVisible();
	expect(screen.getByText("Session analysis")).toBeVisible();
	expect(screen.getByText("Clean-lap comparison across the field.")).toBeVisible();
	expect(screen.getByText("Live data")).toBeVisible();
	expect(screen.getByRole("button", { name: "Export" })).toBeVisible();
});

test("insight summary renders at most four conclusions in input order", () => {
	const insights: Insight[] = [
		{ id: "pace", label: "Pace", value: "NOR", explanation: "Fastest clean pace", tone: "positive" },
		{ id: "risk", label: "Risk", value: "Turn 4", explanation: "Track limits hotspot", tone: "warning" },
		{ id: "weather", label: "Weather", value: "Dry", explanation: "No rain observed", tone: "neutral" },
		{ id: "penalty", label: "Penalty", value: "+5s", explanation: "Unsafe release", tone: "critical" },
		{ id: "extra", label: "Extra", value: "Hidden", explanation: "Must not render", tone: "neutral" },
	];

	render(<InsightSummary insights={insights} />);

	const items = screen.getAllByRole("listitem");
	expect(items).toHaveLength(4);
	expect(items.map((item) => item.getAttribute("data-insight-id"))).toEqual(["pace", "risk", "weather", "penalty"]);
	for (const label of ["Pace", "Risk", "Weather", "Penalty"]) {
		expect(screen.getByText(label)).toBeVisible();
	}
	expect(screen.queryByText("Extra")).not.toBeInTheDocument();
});
