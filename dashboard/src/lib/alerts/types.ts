import type { State } from "@/types/state.type";

export type AlertSeverity = "info" | "warning" | "critical";

export const ALERT_RULE_IDS = [
	"flag-change",
	"pit",
	"overtake",
	"fastest-lap",
	"penalty",
	"track-limits",
	"weather-shift",
	"closing-in",
	"retirement",
] as const;

export type AlertRuleId = (typeof ALERT_RULE_IDS)[number];

export const ALERT_RULE_LABELS: Record<AlertRuleId, string> = {
	"flag-change": "Flags, Safety Car & VSC",
	pit: "Pit stops",
	overtake: "Overtakes",
	"fastest-lap": "Fastest lap",
	penalty: "Penalties & investigations",
	"track-limits": "Track limits",
	"weather-shift": "Weather changes",
	"closing-in": "Driver closing in",
	retirement: "Retirements",
};

export type AlertEvent = {
	id: string;
	rule: AlertRuleId;
	severity: AlertSeverity;
	title: string;
	body: string;
	driverNumber?: string;
	utc: string;
};

export type AlertRuleContext = {
	prev: State | null;
	next: State;
};

export type AlertRule = {
	id: AlertRuleId;
	evaluate: (ctx: AlertRuleContext) => AlertEvent[];
};
