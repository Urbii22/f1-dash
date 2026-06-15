import type { Message, State } from "@/types/state.type";
import type { StoredAlert } from "@/stores/useAlertStore";
import { classifyRaceControlMessage, type RaceControlVisualKind } from "@/lib/raceControlVisual";

export type RaceStoryKind = "flag" | "penalty" | "pit" | "battle" | "strategy" | "weather" | "radio";

export type RaceStoryItem = {
	id: string;
	kind: RaceStoryKind;
	priority: 1 | 2 | 3;
	title: string;
	detail: string;
	timestamp: string | null;
	driverNumber: string | null;
};

export type RaceStrategySignal = {
	id: string;
	driverNumber: string | null;
	title: string;
	detail: string;
	priority: 1 | 2 | 3;
};

const MAX_ITEMS = 6;

// Severity is the urgency dimension of the alert feed; map it onto the three
// story priority bands. Critical events lead, info supports.
function severityToPriority(severity: StoredAlert["severity"]): 1 | 2 | 3 {
	if (severity === "critical") return 1;
	if (severity === "warning") return 2;
	return 3;
}

// The alert rule already encodes detection intent; reuse it instead of
// re-detecting categories inside components.
function ruleToKind(rule: StoredAlert["rule"]): RaceStoryKind {
	switch (rule) {
		case "flag-change":
			return "flag";
		case "penalty":
			return "penalty";
		case "track-limits":
			// track limits are warnings, not penalties
			return "strategy";
		case "pit":
			return "pit";
		case "weather-shift":
			return "weather";
		case "closing-in":
		case "overtake":
			return "battle";
		case "retirement":
			return "strategy";
		case "fastest-lap":
			return "strategy";
		default:
			return "strategy";
	}
}

function visualKindToStory(kind: RaceControlVisualKind): RaceStoryKind {
	// A confirmed penalty is the only race-control kind that becomes a penalty
	// story. Track limits and investigations are warnings, not penalties, so they
	// stay as general (strategy) notes to keep that distinction truthful.
	if (kind === "penalty") return "penalty";
	if (kind.startsWith("flag") || kind === "safety-car") return "flag";
	return "strategy";
}

function visualKindToPriority(kind: RaceControlVisualKind): 1 | 2 | 3 {
	if (kind === "flag-red" || kind === "safety-car" || kind === "penalty") return 1;
	if (kind === "flag-yellow" || kind === "investigation" || kind === "track-limits") return 2;
	return 3;
}

// Pull the racing number out of a "CAR 4 (NOR) ..." style race-control message.
function extractDriverNumber(message: string): string | null {
	const match = /CAR (\d+)/i.exec(message);
	return match ? match[1] : null;
}

function alertToStory(alert: StoredAlert): RaceStoryItem {
	return {
		id: alert.id,
		kind: ruleToKind(alert.rule),
		priority: severityToPriority(alert.severity),
		title: alert.title,
		detail: alert.body,
		timestamp: alert.utc ?? null,
		driverNumber: alert.driverNumber ?? null,
	};
}

function messageToStory(message: Message, index: number): RaceStoryItem {
	const visual = classifyRaceControlMessage(message);
	return {
		id: `rc:${message.Utc ?? ""}:${index}`,
		kind: visualKindToStory(visual.kind),
		priority: visualKindToPriority(visual.kind),
		title: visual.label,
		detail: message.Message,
		timestamp: message.Utc ?? null,
		driverNumber: extractDriverNumber(message.Message),
	};
}

function signalToStory(signal: RaceStrategySignal): RaceStoryItem {
	return {
		id: signal.id,
		kind: signal.driverNumber ? "battle" : "strategy",
		priority: signal.priority,
		title: signal.title,
		detail: signal.detail,
		timestamp: null,
		driverNumber: signal.driverNumber,
	};
}

function recencyKey(item: RaceStoryItem): number {
	if (!item.timestamp) return Number.POSITIVE_INFINITY; // signals/derived items are "now"
	const parsed = Date.parse(item.timestamp);
	return Number.isFinite(parsed) ? parsed : 0;
}

export function buildRaceStory(input: {
	state: State | null;
	alerts: StoredAlert[];
	strategySignals: RaceStrategySignal[];
}): RaceStoryItem[] {
	const fromAlerts = input.alerts.map(alertToStory);
	const fromMessages = (input.state?.RaceControlMessages?.Messages ?? []).map(messageToStory);
	const fromSignals = input.strategySignals.map(signalToStory);

	const all = [...fromSignals, ...fromAlerts, ...fromMessages];

	// Deduplicate by stable id, keeping the first occurrence.
	const seen = new Set<string>();
	const unique: RaceStoryItem[] = [];
	for (const item of all) {
		if (seen.has(item.id)) continue;
		seen.add(item.id);
		unique.push(item);
	}

	unique.sort((a, b) => {
		if (a.priority !== b.priority) return a.priority - b.priority;
		return recencyKey(b) - recencyKey(a);
	});

	return unique.slice(0, MAX_ITEMS);
}
