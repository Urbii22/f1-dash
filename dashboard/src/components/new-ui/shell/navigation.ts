export const newUiNavigation = [
	{ label: "Live", items: ["/dashboard", "/dashboard/qualifying", "/dashboard/track-map", "/dashboard/weather"] },
	{ label: "Analysis", items: ["/dashboard/analysis", "/dashboard/standings", "/h2h"] },
	{ label: "History", items: ["/archive", "/results", "/schedule"] },
	{ label: "System", items: ["/dashboard/settings", "/help", "/"] },
] as const;

// Routes that are prefixes of their siblings (or the root) must match exactly so
// that e.g. /dashboard does not stay active on /dashboard/qualifying.
const EXACT_MATCH_ROUTES = new Set<string>(["/", "/dashboard"]);

export function isNavItemActive(item: string, pathname: string): boolean {
	if (EXACT_MATCH_ROUTES.has(item)) return pathname === item;
	if (pathname === item) return true;
	return pathname.startsWith(`${item}/`);
}
