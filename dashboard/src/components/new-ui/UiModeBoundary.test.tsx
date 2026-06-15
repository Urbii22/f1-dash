import { render, screen } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";
import UiModeBoundary from "@/components/new-ui/UiModeBoundary";
import NewUiCompatibilityBoundary from "@/components/new-ui/NewUiCompatibilityBoundary";
import { useUiPreferencesStore } from "@/stores/useUiPreferencesStore";

afterEach(() => useUiPreferencesStore.getState().reset());

test.each([
	["legacy", "simple", "Legacy content"],
	["new", "simple", "Simple content"],
	["new", "detailed", "Detailed content"],
] as const)("renders %s/%s branch", (generation, density, expected) => {
	useUiPreferencesStore.setState({ generation, density, hydrated: true });
	render(
		<UiModeBoundary
			legacy={<>Legacy content</>}
			simple={<>Simple content</>}
			detailed={<>Detailed content</>}
		/>,
	);
	expect(screen.getByText(expected)).toBeVisible();
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

test("compatibility frame names the route and explains the fallback", () => {
	render(
		<NewUiCompatibilityBoundary routeName="Settings">
			<p>Legacy settings</p>
		</NewUiCompatibilityBoundary>,
	);
	expect(screen.getByText("Settings")).toBeVisible();
	expect(
		screen.getByText("This route is still using the Legacy layout inside New UI."),
	).toBeVisible();
	expect(screen.getByText("Legacy settings")).toBeVisible();
});
