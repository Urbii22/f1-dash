import { beforeEach, expect, test } from "vitest";
import { useUiPreferencesStore } from "@/stores/useUiPreferencesStore";

beforeEach(() => {
	localStorage.clear();
	useUiPreferencesStore.getState().reset();
});

test("changes generation and density without touching either other value", () => {
	useUiPreferencesStore.getState().setGeneration("new");
	expect(useUiPreferencesStore.getState()).toMatchObject({ generation: "new", density: "simple" });
	useUiPreferencesStore.getState().setDensity("detailed");
	expect(useUiPreferencesStore.getState()).toMatchObject({ generation: "new", density: "detailed" });
});
