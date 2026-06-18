import type { ArchiveEvent } from "@/types/archive.type";

// Turns the flat archived race-control events into a classified, lap-aligned
// chronological timeline with a per-category summary. Pure + unit-tested.

export type RcCategory = "flag" | "safety-car" | "penalty" | "track-limits" | "chequered" | "other";
export type RcSeverity = "info" | "warning" | "critical";

export type RcItem = {
	utc: string;
	time: string; // hh:mm:ss
	lap: number | null;
	kind: string;
	category: RcCategory;
	severity: RcSeverity;
	driverNr: string | null;
	message: string | null;
};

export type RcSummaryEntry = { category: RcCategory; label: string; count: number };

export type RaceControlTimelineModel = {
	items: RcItem[];
	summary: RcSummaryEntry[];
};

const CATEGORY_OF: Record<string, RcCategory> = {
	green: "flag",
	yellow: "flag",
	red: "flag",
	sc: "safety-car",
	vsc: "safety-car",
	penalty: "penalty",
	"track-limits": "track-limits",
	chequered: "chequered",
};

const SEVERITY_OF: Record<string, RcSeverity> = {
	red: "critical",
	sc: "critical",
	vsc: "warning",
	yellow: "warning",
	penalty: "warning",
	"track-limits": "warning",
	green: "info",
	chequered: "info",
};

// Display order + labels for the summary header.
const SUMMARY_ORDER: { category: RcCategory; label: string }[] = [
	{ category: "safety-car", label: "Safety car" },
	{ category: "flag", label: "Flags" },
	{ category: "penalty", label: "Penalties" },
	{ category: "track-limits", label: "Track limits" },
	{ category: "chequered", label: "Chequered" },
	{ category: "other", label: "Other" },
];

export function categorize(kind: string): RcCategory {
	return CATEGORY_OF[kind.toLowerCase()] ?? "other";
}

export function severityOf(kind: string): RcSeverity {
	return SEVERITY_OF[kind.toLowerCase()] ?? "info";
}

export function buildRaceControlTimeline(events: ArchiveEvent[]): RaceControlTimelineModel {
	const items: RcItem[] = [...events]
		.sort((a, b) => a.utc.localeCompare(b.utc))
		.map((event) => ({
			utc: event.utc,
			time: event.utc.slice(11, 19),
			lap: event.lap,
			kind: event.kind,
			category: categorize(event.kind),
			severity: severityOf(event.kind),
			driverNr: event.driverNr,
			message: event.message,
		}));

	const counts = new Map<RcCategory, number>();
	for (const item of items) counts.set(item.category, (counts.get(item.category) ?? 0) + 1);

	const summary = SUMMARY_ORDER.filter((entry) => (counts.get(entry.category) ?? 0) > 0).map((entry) => ({
		...entry,
		count: counts.get(entry.category) ?? 0,
	}));

	return { items, summary };
}
