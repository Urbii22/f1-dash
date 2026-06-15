import { beforeEach, expect, test } from "vitest";

import { useDetailedLayoutStore } from "@/stores/useDetailedLayoutStore";
import { dashboardPresetDefaults } from "@/lib/detailedLayout";

beforeEach(() => {
	localStorage.clear();
	useDetailedLayoutStore.setState({ activePresetByRoute: {}, layouts: {} });
});

test("active preset defaults to race for an unset route", () => {
	const preset = useDetailedLayoutStore.getState().activePresetByRoute.dashboard ?? "race";
	expect(preset).toBe("race");
});

test("setPreset stores the active preset per route", () => {
	useDetailedLayoutStore.getState().setPreset("dashboard", "strategy");
	expect(useDetailedLayoutStore.getState().activePresetByRoute.dashboard).toBe("strategy");
});

test("getLayout returns preset defaults before any edit", () => {
	expect(useDetailedLayoutStore.getState().getLayout("dashboard", "race")).toEqual(
		dashboardPresetDefaults.race,
	);
});

test("layout values are independent across presets on the same route", () => {
	useDetailedLayoutStore.getState().setLayoutValue("dashboard", "race", "primary", 55);
	useDetailedLayoutStore.getState().setLayoutValue("dashboard", "strategy", "primary", 40);

	expect(useDetailedLayoutStore.getState().getLayout("dashboard", "race").primary).toBe(55);
	expect(useDetailedLayoutStore.getState().getLayout("dashboard", "strategy").primary).toBe(40);
});

test("setLayoutValue clamps out-of-range values", () => {
	useDetailedLayoutStore.getState().setLayoutValue("dashboard", "race", "primary", 999);
	expect(useDetailedLayoutStore.getState().getLayout("dashboard", "race").primary).toBe(62);
});

test("resetLayout restores defaults for one preset without deleting others", () => {
	useDetailedLayoutStore.getState().setLayoutValue("dashboard", "race", "primary", 55);
	useDetailedLayoutStore.getState().setLayoutValue("dashboard", "strategy", "primary", 40);

	useDetailedLayoutStore.getState().resetLayout("dashboard", "race");

	expect(useDetailedLayoutStore.getState().getLayout("dashboard", "race")).toEqual(
		dashboardPresetDefaults.race,
	);
	// strategy keeps its custom value
	expect(useDetailedLayoutStore.getState().getLayout("dashboard", "strategy").primary).toBe(40);
});

test("getLayout normalizes an invalid persisted layout per field", () => {
	useDetailedLayoutStore.setState({
		layouts: {
			"dashboard:race": { primary: 999, secondaryTop: 40, bottomLeft: Number.NaN } as never,
		},
	});
	const layout = useDetailedLayoutStore.getState().getLayout("dashboard", "race");
	expect(layout.primary).toBe(62);
	expect(layout.secondaryTop).toBe(40);
	expect(layout.bottomLeft).toBe(dashboardPresetDefaults.race.bottomLeft);
});
