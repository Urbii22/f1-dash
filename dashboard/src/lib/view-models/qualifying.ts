import type { Insight } from "@/components/new-ui/routes/InsightSummary";
import { deltaToCutoff, getCutoffPosition, isOnFlyingLap, isQualifyingSession } from "@/lib/quali";
import { filterDeletedLapMessages, getQualiDriverStatus, getQualiPrefix } from "@/lib/qualiView";
import type { State } from "@/types/state.type";

export type QualifyingSummaryModel = {
	phaseLabel: "Q1" | "Q2" | "Q3" | "SQ1" | "SQ2" | "SQ3";
	cutoffPosition: number | null;
	cutoffTime: string | null;
	atRisk: { driverNumber: string; code: string; delta: string; state: string }[];
	hotLaps: { driverNumber: string; code: string; sector: number | null }[];
	deletedLaps: { driverNumber: string | null; message: string; timestamp: string }[];
	insights: Insight[];
};

function formatDelta(delta: number | undefined): string {
	if (delta === undefined) return "--.---";
	return `${delta >= 0 ? "+" : "-"}${(Math.abs(delta) / 1000).toFixed(3)}`;
}

function phaseNumber(value: number | undefined): 1 | 2 | 3 {
	return value === 2 || value === 3 ? value : 1;
}

export function buildQualifyingSummary(state: State | null): QualifyingSummaryModel | null {
	const sessionInfo = state?.SessionInfo;
	const timing = state?.TimingData;
	if (!sessionInfo || !timing || !isQualifyingSession(sessionInfo)) return null;

	const part = phaseNumber(timing.SessionPart);
	const phaseLabel = `${getQualiPrefix(sessionInfo.Name)}${part}` as QualifyingSummaryModel["phaseLabel"];
	const cutoffPosition = getCutoffPosition(part) ?? null;
	const ordered = Object.values(timing.Lines ?? {}).sort(
		(a, b) => Number.parseInt(a.Position, 10) - Number.parseInt(b.Position, 10),
	);
	const cutoffDriver = cutoffPosition
		? ordered.find((driver) => Number.parseInt(driver.Position, 10) === cutoffPosition)
		: undefined;
	const cutoffTime = cutoffDriver?.BestLapTime?.Value || null;

	const atRisk = cutoffPosition
		? ordered
				.filter((driver) => {
					const position = Number.parseInt(driver.Position, 10);
					return !driver.KnockedOut && position >= cutoffPosition - 3 && position <= cutoffPosition + 5;
				})
				.map((driver) => ({
					driverNumber: driver.RacingNumber,
					code: state.DriverList?.[driver.RacingNumber]?.Tla ?? driver.RacingNumber,
					delta: formatDelta(cutoffTime ? deltaToCutoff(driver.BestLapTime?.Value, cutoffTime) : undefined),
					state: getQualiDriverStatus(driver, isOnFlyingLap(driver)),
				}))
		: [];

	const hotLaps = ordered.filter(isOnFlyingLap).map((driver) => ({
		driverNumber: driver.RacingNumber,
		code: state.DriverList?.[driver.RacingNumber]?.Tla ?? driver.RacingNumber,
		sector: driver.Sectors.findIndex((sector) => sector.PersonalFastest) + 1 || null,
	}));

	const deletedLaps = filterDeletedLapMessages(state.RaceControlMessages?.Messages).map((message) => ({
		driverNumber: /\bCAR\s+(\d+)\b/i.exec(message.Message)?.[1] ?? null,
		message: message.Message,
		timestamp: message.Utc,
	}));

	const insights: Insight[] = [
		{
			id: "phase",
			label: "Phase",
			value: phaseLabel,
			explanation: cutoffPosition ? `Elimination line at P${cutoffPosition}.` : "Final pole-position shootout.",
			tone: "neutral",
		},
	];

	if (cutoffPosition) {
		insights.push({
			id: "cutoff",
			label: "Cutoff",
			value: cutoffTime ?? "No time",
			explanation: `${atRisk.length} drivers are inside the current threat window.`,
			tone: "warning",
		});
	}
	if (hotLaps.length > 0) {
		insights.push({
			id: "hot-laps",
			label: "Hot laps",
			value: String(hotLaps.length),
			explanation: "Drivers currently improving through a sector.",
			tone: "positive",
		});
	}
	if (deletedLaps.length > 0) {
		insights.push({
			id: "deleted-laps",
			label: "Deleted laps",
			value: String(deletedLaps.length),
			explanation: "Recent FIA track-limit or lap-deletion decisions.",
			tone: "critical",
		});
	}

	return { phaseLabel, cutoffPosition, cutoffTime, atRisk, hotLaps, deletedLaps, insights };
}
