import type { CarsData, DriverList, Stint, TimingAppData, TimingData, TimingDataDriver } from "@/types/state.type";
import { sortPos } from "@/lib/sorting";

export type CompactTimingRowModel = {
	driverNumber: string;
	position: number | null;
	positionChange: number | null;
	code: string;
	fullName: string;
	teamName: string;
	teamColor: string;
	compound: string | null;
	tyreAge: number | null;
	primaryGap: string;
	secondaryGap: string | null;
	trend: "closing" | "stable" | "falling-back" | null;
	status: "running" | "pit" | "pit-out" | "retired" | "stopped";
	lastLap: string | null;
	bestLap: string | null;
};

export type TechnicalTimingRowModel = CompactTimingRowModel & {
	stops: number;
	interval: string;
	sectors: [string, string, string];
	speedTrap: string;
	telemetry: {
		speed: number;
		gear: number;
		throttle: number;
		brake: boolean;
	} | null;
};

// Reserved neutral identity color when the feed omits a driver's team colour.
// Team colour identifies drivers; falling back keeps the row legible without
// borrowing an FIA/status colour.
const FALLBACK_TEAM_COLOR = "#6d7680";

function finalStint(stints: Stint[] | undefined): Stint | null {
	if (!stints || stints.length === 0) return null;
	return stints.at(-1) ?? null;
}

function statusOf(line: TimingDataDriver): CompactTimingRowModel["status"] {
	if (line.Retired) return "retired";
	if (line.Stopped) return "stopped";
	if (line.InPit) return "pit";
	if (line.PitOut) return "pit-out";
	return "running";
}

// A gap value is unavailable when the feed leaves it blank; we render "-" rather
// than fabricating a zero. Leaders carry no gap, so they read "Leader".
function gapLabel(value: string | undefined): string {
	const trimmed = value?.trim();
	return trimmed ? trimmed : "-";
}

export function buildCompactTimingRows(input: {
	drivers: DriverList | undefined;
	timing: TimingData | undefined;
	appTiming: TimingAppData | undefined;
	previousPositions?: Record<string, number>;
}): CompactTimingRowModel[] {
	const lines = input.timing?.Lines;
	if (!lines) return [];

	const rows = Object.values(lines)
		.slice()
		.sort(sortPos)
		.map((line): CompactTimingRowModel => {
			const number = line.RacingNumber;
			const driver = input.drivers?.[number];
			const stint = finalStint(input.appTiming?.Lines?.[number]?.Stints);

			const positionValue = Number.parseInt(line.Position, 10);
			const position = Number.isFinite(positionValue) ? positionValue : null;

			const previous = input.previousPositions?.[number];
			const positionChange =
				position !== null && typeof previous === "number" ? previous - position : null;

			const isLeader = position === 1;
			const primaryGap = isLeader ? "Leader" : gapLabel(line.GapToLeader);

			const intervalValue = line.IntervalToPositionAhead?.Value?.trim();
			const secondaryGap = isLeader ? null : intervalValue ? intervalValue : null;

			let trend: CompactTimingRowModel["trend"] = null;
			if (!isLeader && line.IntervalToPositionAhead) {
				trend = line.IntervalToPositionAhead.Catching ? "closing" : "stable";
			}

			const compound = stint?.Compound ?? null;
			const tyreAge = stint?.TotalLaps ?? null;

			const lastLapValue = line.LastLapTime?.Value?.trim();
			const bestLapValue = line.BestLapTime?.Value?.trim();

			const rawColor = driver?.TeamColour?.trim();
			const teamColor = rawColor ? `#${rawColor}` : FALLBACK_TEAM_COLOR;

			return {
				driverNumber: number,
				position,
				positionChange,
				code: driver?.Tla ?? `#${number}`,
				fullName: driver?.FullName ?? `Car ${number}`,
				teamName: driver?.TeamName ?? "",
				teamColor,
				compound,
				tyreAge,
				primaryGap,
				secondaryGap,
				trend,
				status: statusOf(line),
				lastLap: lastLapValue ? lastLapValue : null,
				bestLap: bestLapValue ? bestLapValue : null,
			};
		});

	return rows;
}

export function buildTechnicalTimingRows(input: {
	drivers: DriverList | undefined;
	timing: TimingData | undefined;
	appTiming: TimingAppData | undefined;
	carsData: CarsData | undefined;
	previousPositions?: Record<string, number>;
}): TechnicalTimingRowModel[] {
	const compactRows = buildCompactTimingRows(input);
	const lines = input.timing?.Lines;
	if (!lines) return [];

	return compactRows.map((row) => {
		const line = lines[row.driverNumber];
		const stints = input.appTiming?.Lines?.[row.driverNumber]?.Stints;
		const channels = input.carsData?.[row.driverNumber]?.Channels;
		const sectors = [0, 1, 2].map((index) => gapLabel(line?.Sectors?.[index]?.Value)) as [string, string, string];

		return {
			...row,
			stops: stints ? Math.max(0, stints.length - 1) : 0,
			interval: gapLabel(line?.IntervalToPositionAhead?.Value),
			sectors,
			speedTrap: gapLabel(line?.Speeds?.ST?.Value),
			telemetry: channels
				? {
						speed: channels["2"],
						gear: channels["3"],
						throttle: channels["4"],
						brake: channels["5"] > 0,
					}
				: null,
		};
	});
}
