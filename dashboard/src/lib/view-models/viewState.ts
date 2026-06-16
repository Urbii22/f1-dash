export type ViewStateResult = "loading" | "error" | "unavailable" | "empty" | "ready";

export function resolveViewState(input: {
	loading: boolean;
	error?: unknown;
	available: boolean;
	empty: boolean;
}): ViewStateResult {
	if (input.loading) return "loading";
	if (input.error !== undefined && input.error !== null) return "error";
	if (!input.available) return "unavailable";
	if (input.empty) return "empty";
	return "ready";
}
