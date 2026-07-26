import type { Message, State, TimingDataDriver } from "@/types/state.type";

import type { AlertEvent, AlertRule, AlertRuleContext } from "@/lib/alerts/types";

function stateUtc(state: State): string {
	return state.Heartbeat?.Utc ?? new Date().toISOString();
}

function driverLabel(state: State, racingNumber: string): string {
	return state.DriverList?.[racingNumber]?.Tla ?? `#${racingNumber}`;
}

function timingLines(state: State | null): Record<string, TimingDataDriver> {
	return state?.TimingData?.Lines ?? {};
}

function normalizeMessages(messages: Message[] | Record<string, Message> | undefined): Message[] {
	if (!messages) return [];
	return Array.isArray(messages) ? messages : Object.values(messages);
}

/** Race control messages that are present in `next` but not in `prev`. */
function newMessages(ctx: AlertRuleContext): Message[] {
	const prevCount = normalizeMessages(ctx.prev?.RaceControlMessages?.Messages).length;
	const next = normalizeMessages(ctx.next.RaceControlMessages?.Messages);
	if (next.length <= prevCount) return [];
	return next.slice(prevCount);
}

function parseSeconds(value: string | undefined): number | null {
	if (!value) return null;
	const normalized = value.trim().replace(/^\+/, "");
	if (!/^\d+(?:\.\d+)?$/.test(normalized)) return null;
	const parsed = Number(normalized);
	return Number.isFinite(parsed) ? parsed : null;
}

const TRACK_STATUS_ALERTS: Record<string, { label: string; severity: AlertEvent["severity"] }> = {
	"1": { label: "Track clear", severity: "info" },
	"2": { label: "Yellow flag", severity: "warning" },
	"4": { label: "Safety Car deployed", severity: "critical" },
	"5": { label: "Red flag", severity: "critical" },
	"6": { label: "Virtual Safety Car deployed", severity: "critical" },
	"7": { label: "Virtual Safety Car ending", severity: "warning" },
};

export function createTrackStatusRule(): AlertRule {
	return {
		id: "flag-change",
		evaluate: ({ prev, next }) => {
			const prevStatus = prev?.TrackStatus?.Status;
			const nextStatus = next.TrackStatus?.Status;
			if (!nextStatus || !prevStatus || prevStatus === nextStatus) return [];

			const info = TRACK_STATUS_ALERTS[nextStatus];
			if (!info) return [];

			const utc = stateUtc(next);
			return [
				{
					id: `flag-change.${nextStatus}.${utc}`,
					rule: "flag-change",
					severity: info.severity,
					title: info.label,
					body: next.TrackStatus?.Message || info.label,
					utc,
				},
			];
		},
	};
}

export function createPitRule(): AlertRule {
	return {
		id: "pit",
		evaluate: ({ prev, next }) => {
			const events: AlertEvent[] = [];
			const prevLines = timingLines(prev);
			const utc = stateUtc(next);

			for (const [nr, line] of Object.entries(timingLines(next))) {
				const prevLine = prevLines[nr];
				if (!prevLine) continue;

				const lap = line.NumberOfLaps ?? 0;
				if (!prevLine.InPit && line.InPit) {
					events.push({
						id: `pit.in.${nr}.${lap}`,
						rule: "pit",
						severity: "info",
						title: `${driverLabel(next, nr)} pits`,
						body: `${driverLabel(next, nr)} enters the pit lane on lap ${lap}.`,
						driverNumber: nr,
						utc,
					});
				}
				if (prevLine.InPit && !line.InPit && !line.Retired && !line.Stopped) {
					events.push({
						id: `pit.out.${nr}.${lap}`,
						rule: "pit",
						severity: "info",
						title: `${driverLabel(next, nr)} rejoins`,
						body: `${driverLabel(next, nr)} leaves the pits.`,
						driverNumber: nr,
						utc,
					});
				}
			}

			return events;
		},
	};
}

function inPitCycle(line: TimingDataDriver | undefined): boolean {
	return !!line && (line.InPit || line.PitOut || line.Retired || line.Stopped);
}

export function createOvertakeRule(): AlertRule {
	return {
		id: "overtake",
		evaluate: ({ prev, next }) => {
			const events: AlertEvent[] = [];
			const prevLines = timingLines(prev);
			const nextLines = timingLines(next);
			const utc = stateUtc(next);

			for (const [nr, line] of Object.entries(nextLines)) {
				const prevLine = prevLines[nr];
				if (!prevLine) continue;

				const prevPos = Number(prevLine.Position);
				const nextPos = Number(line.Position);
				if (!prevPos || !nextPos || nextPos >= prevPos) continue;
				if (inPitCycle(line)) continue;

				// the driver that previously held the gained position; skip pit-cycle swaps
				const displaced = Object.entries(prevLines).find(([, l]) => Number(l.Position) === nextPos)?.[0];
				if (displaced && inPitCycle(nextLines[displaced])) continue;

				events.push({
					id: `overtake.${nr}.${nextPos}.${line.NumberOfLaps ?? 0}`,
					rule: "overtake",
					severity: "info",
					title: `${driverLabel(next, nr)} up to P${nextPos}`,
					body: displaced
						? `${driverLabel(next, nr)} passes ${driverLabel(next, displaced)} for P${nextPos}.`
						: `${driverLabel(next, nr)} gains position, now P${nextPos}.`,
					driverNumber: nr,
					utc,
				});
			}

			return events;
		},
	};
}

function fastestLapHolder(state: State | null): { nr: string; value: string } | null {
	const lines = state?.TimingStats?.Lines;
	if (!lines) return null;
	for (const [nr, line] of Object.entries(lines)) {
		if (line.PersonalBestLapTime?.Position === 1 && line.PersonalBestLapTime.Value) {
			return { nr, value: line.PersonalBestLapTime.Value };
		}
	}
	return null;
}

export function createFastestLapRule(): AlertRule {
	return {
		id: "fastest-lap",
		evaluate: ({ prev, next }) => {
			const prevHolder = fastestLapHolder(prev);
			const holder = fastestLapHolder(next);
			if (!holder || !prevHolder) return [];
			if (holder.nr === prevHolder.nr && holder.value === prevHolder.value) return [];

			return [
				{
					id: `fastest-lap.${holder.nr}.${holder.value}`,
					rule: "fastest-lap",
					severity: "info",
					title: `Fastest lap: ${driverLabel(next, holder.nr)}`,
					body: `${driverLabel(next, holder.nr)} sets the fastest lap, ${holder.value}.`,
					driverNumber: holder.nr,
					utc: stateUtc(next),
				},
			];
		},
	};
}

export function createPenaltyRule(): AlertRule {
	return {
		id: "penalty",
		evaluate: (ctx) => {
			const events: AlertEvent[] = [];

			for (const msg of newMessages(ctx)) {
				const text = msg.Message?.toUpperCase() ?? "";
				if (!text) continue;

				if (text.includes("PENALTY")) {
					events.push({
						id: `penalty.${msg.Utc}.${text.slice(0, 24)}`,
						rule: "penalty",
						severity: "critical",
						title: "Penalty",
						body: msg.Message,
						utc: msg.Utc,
					});
				} else if (text.includes("INVESTIGATION") || text.includes("NOTED")) {
					events.push({
						id: `penalty.note.${msg.Utc}.${text.slice(0, 24)}`,
						rule: "penalty",
						severity: "warning",
						title: "Under investigation",
						body: msg.Message,
						utc: msg.Utc,
					});
				}
			}

			return events;
		},
	};
}

export function createTrackLimitsRule(): AlertRule {
	return {
		id: "track-limits",
		evaluate: (ctx) => {
			const events: AlertEvent[] = [];

			for (const msg of newMessages(ctx)) {
				const text = msg.Message?.toUpperCase() ?? "";
				// penalties mentioning track limits belong to the penalty rule
				if (!text.includes("TRACK LIMITS") || text.includes("PENALTY")) continue;

				events.push({
					id: `track-limits.${msg.Utc}.${text.slice(0, 24)}`,
					rule: "track-limits",
					severity: "warning",
					title: "Track limits",
					body: msg.Message,
					utc: msg.Utc,
				});
			}

			return events;
		},
	};
}

const TRACK_TEMP_SHIFT_C = 5;

export function createWeatherRule(): AlertRule {
	let baselineTrackTemp: number | null = null;

	return {
		id: "weather-shift",
		evaluate: ({ prev, next }) => {
			const events: AlertEvent[] = [];
			const weather = next.WeatherData;
			if (!weather) return events;

			const utc = stateUtc(next);

			const prevRain = Number(prev?.WeatherData?.Rainfall ?? 0);
			const rain = Number(weather.Rainfall ?? 0);
			if (prevRain === 0 && rain > 0) {
				events.push({
					id: `weather-shift.rain.${utc}`,
					rule: "weather-shift",
					severity: "warning",
					title: "Rain detected",
					body: "Rainfall has been detected on track.",
					utc,
				});
			}

			const trackTemp = Number(weather.TrackTemp);
			if (Number.isFinite(trackTemp) && trackTemp !== 0) {
				if (baselineTrackTemp === null) {
					baselineTrackTemp = trackTemp;
				} else if (Math.abs(trackTemp - baselineTrackTemp) >= TRACK_TEMP_SHIFT_C) {
					const direction = trackTemp > baselineTrackTemp ? "up" : "down";
					events.push({
						id: `weather-shift.temp.${trackTemp}.${utc}`,
						rule: "weather-shift",
						severity: "info",
						title: `Track temperature ${direction}`,
						body: `Track temperature moved from ${baselineTrackTemp}°C to ${trackTemp}°C.`,
						utc,
					});
					baselineTrackTemp = trackTemp;
				}
			}

			return events;
		},
	};
}

const CLOSING_THRESHOLD_S = 1.0;
const CLOSING_REARM_S = 1.5;
const CLOSING_CONSECUTIVE = 3;

export function createClosingInRule(): AlertRule {
	const memory: Record<string, { lastInterval: number; decreasing: number; armed: boolean }> = {};

	return {
		id: "closing-in",
		evaluate: ({ next }) => {
			const events: AlertEvent[] = [];
			const utc = stateUtc(next);

			for (const [nr, line] of Object.entries(timingLines(next))) {
				const interval = parseSeconds(line.IntervalToPositionAhead?.Value);
				if (interval === null) continue;

				const entry = (memory[nr] ??= { lastInterval: interval, decreasing: 0, armed: true });

				if (interval === entry.lastInterval) continue;

				if (interval < entry.lastInterval && interval < CLOSING_THRESHOLD_S) {
					entry.decreasing += 1;
				} else {
					entry.decreasing = 0;
				}

				if (interval > CLOSING_REARM_S) entry.armed = true;

				if (entry.armed && entry.decreasing >= CLOSING_CONSECUTIVE && !inPitCycle(line)) {
					entry.armed = false;
					entry.decreasing = 0;
					events.push({
						id: `closing-in.${nr}.${line.NumberOfLaps ?? 0}.${interval.toFixed(3)}`,
						rule: "closing-in",
						severity: "info",
						title: `${driverLabel(next, nr)} closing in`,
						body: `${driverLabel(next, nr)} is within ${interval.toFixed(3)}s of the car ahead and closing.`,
						driverNumber: nr,
						utc,
					});
				}

				entry.lastInterval = interval;
			}

			return events;
		},
	};
}

export function createRetirementRule(): AlertRule {
	return {
		id: "retirement",
		evaluate: ({ prev, next }) => {
			const events: AlertEvent[] = [];
			const prevLines = timingLines(prev);
			const utc = stateUtc(next);

			for (const [nr, line] of Object.entries(timingLines(next))) {
				const prevLine = prevLines[nr];
				if (!prevLine) continue;

				if (!prevLine.Retired && line.Retired) {
					events.push({
						id: `retirement.${nr}`,
						rule: "retirement",
						severity: "warning",
						title: `${driverLabel(next, nr)} retires`,
						body: `${driverLabel(next, nr)} has retired from the session.`,
						driverNumber: nr,
						utc,
					});
				} else if (!prevLine.Stopped && line.Stopped) {
					events.push({
						id: `retirement.stopped.${nr}.${line.NumberOfLaps ?? 0}`,
						rule: "retirement",
						severity: "warning",
						title: `${driverLabel(next, nr)} stopped`,
						body: `${driverLabel(next, nr)} has stopped on track.`,
						driverNumber: nr,
						utc,
					});
				}
			}

			return events;
		},
	};
}

export function createRules(): AlertRule[] {
	return [
		createTrackStatusRule(),
		createPitRule(),
		createOvertakeRule(),
		createFastestLapRule(),
		createPenaltyRule(),
		createTrackLimitsRule(),
		createWeatherRule(),
		createClosingInRule(),
		createRetirementRule(),
	];
}
