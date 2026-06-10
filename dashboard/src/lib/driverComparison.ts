import type {
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
	sectors: ComparisonSector[];
};

type ComparisonSource = {
	driver?: Driver;
	timing?: TimingDataDriver;
	stats?: TimingStatsDriver;
	app?: TimingAppDataDriver;
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
		age: current?.TotalLaps ?? "--",
		stops: Math.max(0, (stints?.length ?? 0) - 1),
		isNew: current?.New?.toLowerCase() === "true",
	};
}

export function normalizeSectors(
	sectors: TimingDataDriver["Sectors"] | Record<string, Sector> | undefined,
): ComparisonSector[] {
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
	if (!timing) return "NO DATA";
	if (timing.Retired) return "RETIRED";
	if (timing.Stopped) return "STOPPED";
	if (timing.InPit) return "PIT";
	if (timing.PitOut) return "PIT OUT";
	return "ON TRACK";
}

export function buildDriverComparison(number: string, source: ComparisonSource): DriverComparisonModel | null {
	if (!source.driver || !source.timing) return null;

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
		sectors: normalizeSectors(source.timing.Sectors),
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
