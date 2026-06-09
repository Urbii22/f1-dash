import type { Message, State } from "@/types/state.type";

export type SmartAlert = {
	id: string;
	severity: "info" | "warning" | "critical";
	title: string;
	body: string;
	driverNumber?: string;
};

export function buildSmartAlerts(state: State | null): SmartAlert[] {
	const timing = state?.TimingData?.Lines;
	const drivers = state?.DriverList;
	const messages = state?.RaceControlMessages?.Messages;
	if (!timing || !drivers) return [];

	const alerts: SmartAlert[] = [];

	for (const line of Object.values(timing)) {
		if (line.IntervalToPositionAhead?.Catching) {
			const driver = drivers[line.RacingNumber];
			alerts.push({
				id: `catching.${line.RacingNumber}`,
				severity: "info",
				title: `${driver?.Tla ?? line.RacingNumber} is closing`,
				body: `Interval to the car ahead is ${line.IntervalToPositionAhead.Value || "shrinking"}.`,
				driverNumber: line.RacingNumber,
			});
		}
	}

	const recentMessages = normalizeMessages(messages);
	recentMessages.slice(-5).forEach((msg, index) => {
		if (msg.Message?.toLowerCase().includes("track limits")) {
			alerts.push({
				id: `track-limits.${index}.${msg.Utc}`,
				severity: "warning",
				title: "Track limits",
				body: msg.Message,
			});
		}
	});

	return alerts.slice(-8).reverse();
}

function normalizeMessages(messages: Message[] | Record<string, Message> | undefined): Message[] {
	if (!messages) return [];
	return Array.isArray(messages) ? messages : Object.values(messages);
}
