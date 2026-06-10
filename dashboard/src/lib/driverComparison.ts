import type {
	CarDataChannels,
	Driver,
	Sector,
	Stint,
	TimingAppDataDriver,
	TimingDataDriver,
	TimingStatsDriver,
} from "@/types/state.type";

export type ComparisonSector = {
	value: string;
	segments: number[];
	overallFastest: boolean;
	personalFastest: boolean;
};

export type DriverComparisonModel = {
	number: string;
	tla: string;
	fullName: string;
	teamColour: string;
	position: string;
	laps: number;
	status: string;
	stint: ReturnType<typeof getCurrentStint>;
	lastLap: string;
	bestLap: string;
	gapToLeader: string;
	interval: string;
	catching: boolean;
	speedTraps: Array<{ label: string; value: string }>;
	sectors: ComparisonSector[];
	telemetry: {
		speed: number | null;
		gear: number | null;
		throttle: number | null;
		brake: number | null;
		rpm: number | null;
		drs: number | null;
	};
};

type ComparisonSource = {
	driver?: Driver;
	timing?: TimingDataDriver;
	stats?: TimingStatsDriver;
	app?: TimingAppDataDriver;
	car?: CarDataChannels;
};

export type DriverGap = {
	value: string;
	leaderNumber: string | null;
	trailingNumber: string | null;
	catching: boolean;
};

export function parseTimingSeconds(value: string | undefined): number | null {
	if (!value) return null;

	const normalized = value.trim().replace(/^\+/, "");
	if (/^\d+:\d+(?:\.\d+)?$/.test(normalized)) {
		const [minutes, seconds] = normalized.split(":");
		return Number(minutes) * 60 + Number(seconds);
	}

	if (!/^\d+(?:\.\d+)?$/.test(normalized)) return null;
	const parsed = Number(normalized);
	return Number.isFinite(parsed) ? parsed : null;
}

export function calculateDriverGap(first: TimingDataDriver, second: TimingDataDriver): DriverGap {
	const firstLaps = Number(first.NumberOfLaps ?? 0);
	const secondLaps = Number(second.NumberOfLaps ?? 0);

	if (firstLaps !== secondLaps) {
		const firstLeads = firstLaps > secondLaps;
		const lapDifference = Math.abs(firstLaps - secondLaps);
		return {
			value: `${lapDifference} ${lapDifference === 1 ? "LAP" : "LAPS"}`,
			leaderNumber: firstLeads ? first.RacingNumber : second.RacingNumber,
			trailingNumber: firstLeads ? second.RacingNumber : first.RacingNumber,
			catching: false,
		};
	}

	const firstPosition = Number(first.Position);
	const secondPosition = Number(second.Position);
	const firstLeads = firstPosition <= secondPosition;
	const leader = firstLeads ? first : second;
	const trailing = firstLeads ? second : first;

	if (Math.abs(firstPosition - secondPosition) === 1) {
		const directInterval = parseTimingSeconds(trailing.IntervalToPositionAhead?.Value);
		if (directInterval !== null) {
			return {
				value: formatGap(directInterval),
				leaderNumber: leader.RacingNumber,
				trailingNumber: trailing.RacingNumber,
				catching: trailing.IntervalToPositionAhead?.Catching ?? false,
			};
		}
	}

	const firstGap = gapToLeaderSeconds(first);
	const secondGap = gapToLeaderSeconds(second);
	if (firstGap === null || secondGap === null) {
		return {
			value: "--",
			leaderNumber: leader.RacingNumber,
			trailingNumber: trailing.RacingNumber,
			catching: trailing.IntervalToPositionAhead?.Catching ?? false,
		};
	}

	return {
		value: formatGap(Math.abs(firstGap - secondGap)),
		leaderNumber: leader.RacingNumber,
		trailingNumber: trailing.RacingNumber,
		catching: trailing.IntervalToPositionAhead?.Catching ?? false,
	};
}

export function getCurrentStint(stints: Stint[] | undefined) {
	const current = stints?.at(-1);
	return {
		compound: current?.Compound ?? "--",
		age: current?.TotalLaps ?? 0,
		stops: Math.max(0, (stints?.length ?? 0) - 1),
		isNew: current?.New?.toLowerCase() === "true",
	};
}

export function normalizeSectors(sectors: TimingDataDriver["Sectors"] | Record<string, Sector> | undefined): ComparisonSector[] {
	const source = sectors ?? [];
	return [0, 1, 2].map((index) => {
		const sector = Array.isArray(source) ? source[index] : source[String(index)];
		return {
			value: sector?.Value || sector?.PreviousValue || "--",
			segments: normalizeSegments(sector?.Segments),
			overallFastest: sector?.OverallFastest ?? false,
			personalFastest: sector?.PersonalFastest ?? false,
		};
	});
}

export function calculateSectorDelta(first: ComparisonSector, second: ComparisonSector): string {
	const firstSeconds = parseTimingSeconds(first.value);
	const secondSeconds = parseTimingSeconds(second.value);
	if (firstSeconds === null || secondSeconds === null) return "--";

	const difference = secondSeconds - firstSeconds;
	if (Math.abs(difference) < 0.0005) return "EVEN";
	return `${difference < 0 ? "B" : "A"} ${formatGap(Math.abs(difference))}`;
}

export function getDriverRaceStatus(timing: TimingDataDriver | undefined): string {
	if (!timing) return "No data";
	if (timing.Retired) return "Retired";
	if (timing.Stopped) return "Stopped";
	if (timing.InPit) return "In pit";
	if (timing.PitOut) return "Pit out";
	return "On track";
}

export function buildDriverComparison(number: string, source: ComparisonSource): DriverComparisonModel | null {
	if (!source.driver || !source.timing) return null;

	const speeds = source.timing.Speeds;
	return {
		number,
		tla: source.driver.Tla,
		fullName: source.driver.FullName,
		teamColour: source.driver.TeamColour,
		position: source.timing.Position || "--",
		laps: source.timing.NumberOfLaps ?? 0,
		status: getDriverRaceStatus(source.timing),
		stint: getCurrentStint(source.app?.Stints),
		lastLap: source.timing.LastLapTime?.Value || "--",
		bestLap: source.stats?.PersonalBestLapTime?.Value || source.timing.BestLapTime?.Value || "--",
		gapToLeader: source.timing.GapToLeader || "--",
		interval: source.timing.IntervalToPositionAhead?.Value || "--",
		catching: source.timing.IntervalToPositionAhead?.Catching ?? false,
		speedTraps: [
			{ label: "I1", value: speeds?.I1?.Value || "--" },
			{ label: "I2", value: speeds?.I2?.Value || "--" },
			{ label: "FL", value: speeds?.Fl?.Value || "--" },
			{ label: "ST", value: speeds?.St?.Value || "--" },
		],
		sectors: normalizeSectors(source.timing.Sectors),
		telemetry: {
			speed: channel(source.car, "2"),
			gear: channel(source.car, "3"),
			throttle: channel(source.car, "4"),
			brake: channel(source.car, "5"),
			rpm: channel(source.car, "0"),
			drs: channel(source.car, "45"),
		},
	};
}

function gapToLeaderSeconds(timing: TimingDataDriver): number | null {
	if (Number(timing.Position) === 1) return 0;
	return parseTimingSeconds(timing.GapToLeader);
}

function formatGap(value: number): string {
	return `+${value.toFixed(3)}`;
}

function normalizeSegments(segments: Sector["Segments"] | Record<string, { Status: number }> | undefined): number[] {
	if (!segments) return [];
	const values = Array.isArray(segments)
		? segments
		: Object.entries(segments)
				.sort(([a], [b]) => Number(a) - Number(b))
				.map(([, segment]) => segment);
	return values.map((segment) => segment.Status);
}

function channel(car: CarDataChannels | undefined, key: keyof CarDataChannels): number | null {
	const value = car?.[key];
	return typeof value === "number" && Number.isFinite(value) ? value : null;
}
