export type InterfaceGeneration = "legacy" | "new";
export type UiDensity = "simple" | "detailed";

export type UiPreferences = {
	generation: InterfaceGeneration;
	density: UiDensity;
};

export const defaultUiPreferences: UiPreferences = {
	generation: "legacy",
	density: "simple",
};

export function normalizeUiPreferences(value: unknown): UiPreferences {
	const candidate = value as Partial<Record<keyof UiPreferences, unknown>> | null | undefined;
	return {
		generation: candidate?.generation === "new" ? "new" : "legacy",
		density: candidate?.density === "detailed" ? "detailed" : "simple",
	};
}
