import { describe, expect, it } from "vitest";
import { defaultUiPreferences, normalizeUiPreferences } from "@/lib/uiPreferences";

describe("UI preferences", () => {
	it("defaults new users to Legacy and Simple", () => {
		expect(normalizeUiPreferences(undefined)).toEqual(defaultUiPreferences);
	});

	it("forces stored New UI preferences back to Legacy", () => {
		expect(normalizeUiPreferences({ generation: "new", density: "detailed" })).toEqual({
			generation: "legacy",
			density: "detailed",
		});
	});

	it("repairs invalid storage independently", () => {
		expect(normalizeUiPreferences({ generation: "broken", density: "detailed" })).toEqual({
			generation: "legacy",
			density: "detailed",
		});
	});
});
