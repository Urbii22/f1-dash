import { getCutoffPosition } from "@/lib/quali";
import { sortUtc } from "@/lib/sorting";

type QualiStatusDriver = {
	InPit?: boolean;
	PitOut?: boolean;
	Stopped?: boolean;
	KnockedOut?: boolean;
	BestLapTime?: { Value?: string };
};

type RaceControlMessageLike = {
	Utc: string;
	Message: string;
	Lap?: number;
};

type SpeedValue = { Value?: string };

type SpeedStatsLine = {
	BestSpeeds?: {
		St?: SpeedValue;
		Fl?: SpeedValue;
	};
};

type DriverMeta = {
	Tla?: string;
	TeamColour?: string;
};

type ProgressionLine = {
	RacingNumber: string;
	Position: string;
	KnockedOut?: boolean;
	BestLapTime?: { Value?: string };
};

export type SpeedTrapEntry = {
	racingNumber: string;
	tla: string;
	teamColour: string;
	speed: number;
	source: "ST" | "FL";
};

export type QualiProgressionEntry = {
	racingNumber: string;
	position: number;
	bestLap: string;
};

export type QualiProgressionGroups = {
	q1: QualiProgressionEntry[];
	q2: QualiProgressionEntry[];
	q3: QualiProgressionEntry[];
};

export const getQualiPrefix = (sessionName: string | undefined) => {
	const name = sessionName?.toLowerCase() ?? "";
	return name.includes("sprint") || name.includes("shootout") ? "SQ" : "Q";
};

export const getQualiDriverStatus = (driver: QualiStatusDriver, flying: boolean) => {
	if (driver.Stopped) return "STOPPED";
	if (driver.InPit) return "PIT";
	if (driver.PitOut) return "OUT LAP";
	if (flying) return "FLYING";
	if (!driver.BestLapTime?.Value) return "NO TIME";
	return "TRACK";
};

export const shouldShowCutoffDelta = (position: number, sessionPart: number | undefined) => {
	const cutoff = getCutoffPosition(sessionPart);
	return cutoff !== undefined && Number.isFinite(position) && position >= cutoff - 3;
};

export const getProgressionVisibility = (sessionPart: number | undefined, sessionStatus: string | undefined) => {
	const roundEnded = sessionStatus === "Finished" || sessionStatus === "Finalised" || sessionStatus === "Ends";

	return {
		q1: sessionPart !== undefined && (sessionPart > 1 || (sessionPart === 1 && roundEnded)),
		q2: sessionPart !== undefined && (sessionPart > 2 || (sessionPart === 2 && roundEnded)),
		q3: sessionPart === 3 && roundEnded,
	};
};

export const filterDeletedLapMessages = <T extends RaceControlMessageLike>(messages: T[] | undefined): T[] =>
	[...(messages ?? [])]
		.filter((message) => {
			const text = message.Message.toUpperCase();
			return text.includes("DELETED") || text.includes("TRACK LIMITS");
		})
		.sort(sortUtc);

const parseSpeed = (value: string | undefined) => {
	const speed = Number.parseFloat(value ?? "");
	return Number.isFinite(speed) ? speed : undefined;
};

export const rankSpeedTrap = (
	lines: Record<string, SpeedStatsLine> | undefined,
	drivers: Record<string, DriverMeta> | undefined,
): SpeedTrapEntry[] =>
	Object.entries(lines ?? {})
		.flatMap(([racingNumber, line]) => {
			const speedTrap = parseSpeed(line.BestSpeeds?.St?.Value);
			const finishLine = parseSpeed(line.BestSpeeds?.Fl?.Value);
			const speed = speedTrap ?? finishLine;
			const driver = drivers?.[racingNumber];
			if (speed === undefined || !driver?.Tla) return [];

			return [
				{
					racingNumber,
					tla: driver.Tla,
					teamColour: driver.TeamColour ?? "00e5ff",
					speed,
					source: speedTrap === undefined ? ("FL" as const) : ("ST" as const),
				},
			];
		})
		.sort((a, b) => b.speed - a.speed)
		.slice(0, 20);

const toProgressionEntry = (line: ProgressionLine): QualiProgressionEntry => ({
	racingNumber: line.RacingNumber,
	position: Number.parseInt(line.Position, 10),
	bestLap: line.BestLapTime?.Value ?? "",
});

export const buildProgressionGroups = (lines: Record<string, ProgressionLine> | undefined): QualiProgressionGroups => {
	const ordered = Object.values(lines ?? {})
		.map(toProgressionEntry)
		.filter((entry) => Number.isFinite(entry.position))
		.sort((a, b) => a.position - b.position);

	return {
		q1: ordered.filter((entry) => entry.position >= 17 && entry.position <= 22),
		q2: ordered.filter((entry) => entry.position >= 11 && entry.position <= 16),
		q3: ordered.filter((entry) => entry.position >= 1 && entry.position <= 10),
	};
};
