import { render, screen } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";
import UiModeBoundary from "@/components/new-ui/UiModeBoundary";
import { useUiPreferencesStore } from "@/stores/useUiPreferencesStore";

afterEach(() => useUiPreferencesStore.getState().reset());

test.each([
	["legacy", "simple"],
	["new", "simple"],
	["new", "detailed"],
] as const)("always renders the legacy branch for %s/%s preferences", (generation, density) => {
	useUiPreferencesStore.setState({ generation, density, hydrated: true });
	render(
		<UiModeBoundary
			legacy={<>Legacy content</>}
			simple={<>Simple content</>}
			detailed={<>Detailed content</>}
		/>,
	);
	expect(screen.getByText("Legacy content")).toBeVisible();
	expect(screen.queryByText("Simple content")).not.toBeInTheDocument();
	expect(screen.queryByText("Detailed content")).not.toBeInTheDocument();
});

test("falls back to legacy before hydration", () => {
	useUiPreferencesStore.setState({ generation: "new", density: "detailed", hydrated: false });
	render(
		<UiModeBoundary
			legacy={<>Legacy content</>}
			simple={<>Simple content</>}
			detailed={<>Detailed content</>}
		/>,
	);
	expect(screen.getByText("Legacy content")).toBeVisible();
});
