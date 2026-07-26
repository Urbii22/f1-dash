export type DetailedPreset = "race" | "strategy" | "driver";

export type DashboardLayout = {
	primary: number;
	secondaryTop: number;
	bottomLeft: number;
	topRow: number;
};

// Tested clamp ranges. Each splitter field keeps both panes usable; values
// outside the range are clamped rather than rejected so a stale persisted layout
// still resolves to something readable.
export const dashboardLayoutBounds: Record<keyof DashboardLayout, { min: number; max: number }> = {
	primary: { min: 32, max: 62 },
	secondaryTop: { min: 30, max: 70 },
	bottomLeft: { min: 35, max: 70 },
	topRow: { min: 35, max: 75 },
};

export const dashboardPresetDefaults: Record<DetailedPreset, DashboardLayout> = {
	race: { primary: 48, secondaryTop: 58, bottomLeft: 55, topRow: 58 },
	strategy: { primary: 42, secondaryTop: 45, bottomLeft: 62, topRow: 54 },
	driver: { primary: 38, secondaryTop: 52, bottomLeft: 46, topRow: 62 },
};

function clamp(value: number, key: keyof DashboardLayout): number {
	const { min, max } = dashboardLayoutBounds[key];
	if (value < min) return min;
	if (value > max) return max;
	return value;
}

function isObject(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

// Normalize a persisted/unknown layout: each field falls back to the preset
// default independently, so one malformed value never discards the others.
export function normalizeDashboardLayout(value: unknown, preset: DetailedPreset): DashboardLayout {
	const defaults = dashboardPresetDefaults[preset];
	if (!isObject(value)) return { ...defaults };

	const keys: (keyof DashboardLayout)[] = ["primary", "secondaryTop", "bottomLeft", "topRow"];
	const result = { ...defaults };
	for (const key of keys) {
		const raw = value[key];
		if (typeof raw === "number" && Number.isFinite(raw)) {
			result[key] = clamp(raw, key);
		}
	}
	return result;
}

// Pure single-field update with clamping. A non-finite value is ignored so a
// transient pointer/keyboard calculation never corrupts the layout.
export function updateDashboardLayout(
	layout: DashboardLayout,
	key: keyof DashboardLayout,
	value: number,
): DashboardLayout {
	if (!Number.isFinite(value)) return layout;
	return { ...layout, [key]: clamp(value, key) };
}

export function layoutStorageKey(route: string, preset: DetailedPreset): string {
	return `${route}:${preset}`;
}
