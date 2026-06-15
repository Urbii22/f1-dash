import type { CarsData, State, TimingDataDriver } from "@/types/state.type";
import type { LapRecord } from "@/lib/lapHistory";
import { formatLapTimeMs, getBestLap } from "@/lib/lapHistory";
import { getCurrentStint } from "@/lib/driverComparison";
import { getDriverStatus, getSessionYear } from "@/lib/driverStatus";
import type { RaceStoryItem } from "@/lib/view-models/raceStory";

export type DriverDrawerModel = {
	driverNumber: string;
	code: string;
	fullName: string;
	teamName: string;
	teamColor: string;
	positionLabel: string;
	gapLabel: string;
	lastLap: string | null;
	bestLap: string | null;
	stint: { compound: string; age: number | null; stops: number } | null;
	laps: { lap: number; time: string; deltaToBest: string | null }[];
	paceDirection: "gaining" | "losing" | "steady" | null;
	telemetry: {
		speed: string | null;
		gear: string | null;
		throttle: number | null;
		brake: boolean | null;
		drs: string | null;
	};
	strategySummary: string | null;
	alerts: RaceStoryItem[];
};

const FALLBACK_TEAM_COLOR = "#6d7680";
const RECENT_LAPS = 5;

function gapLabelFor(line: TimingDataDriver): string {
	if (Number.parseInt(line.Position, 10) === 1) return "Leader";
	const gap = line.GapToLeader?.trim();
	return gap ? gap : "-";
}

function deltaLabel(ms: number | null, bestMs: number | null): string | null {
	if (ms === null || bestMs === null) return null;
	const delta = ms - bestMs;
	if (delta === 0) return "=";
	const sign = delta > 0 ? "+" : "-";
	return `${sign}${(Math.abs(delta) / 1000).toFixed(3)}`;
}

function paceDirectionFrom(laps: LapRecord[]): DriverDrawerModel["paceDirection"] {
	const timed = laps.filter((lap) => lap.lapTimeMs !== null && !lap.pitted).slice(-3);
	if (timed.length < 2) return null;
	const first = timed[0].lapTimeMs as number;
	const last = timed[timed.length - 1].lapTimeMs as number;
	const delta = last - first;
	if (Math.abs(delta) < 150) return "steady";
	return delta < 0 ? "gaining" : "losing";
}

export function buildDriverDrawerModel(input: {
	driverNumber: string | null;
	state: State | null;
	carsData: CarsData | null;
	laps: LapRecord[];
	story: RaceStoryItem[];
}): DriverDrawerModel | null {
	const { driverNumber, state, carsData, laps, story } = input;
	if (!driverNumber) return null;

	const driver = state?.DriverList?.[driverNumber];
	const line = state?.TimingData?.Lines?.[driverNumber];
	if (!driver || !line) return null;

	const app = state?.TimingAppData?.Lines?.[driverNumber];
	const stintInfo = getCurrentStint(app?.Stints);
	const stint =
		stintInfo.compound === "--"
			? null
			: {
					compound: stintInfo.compound,
					age: typeof stintInfo.age === "number" ? stintInfo.age : null,
					stops: stintInfo.stops,
				};

	const sortedLaps = laps.slice().sort((a, b) => a.lap - b.lap);
	const best = getBestLap(sortedLaps);
	const recent = sortedLaps.slice(-RECENT_LAPS).map((lap) => ({
		lap: lap.lap,
		time: formatLapTimeMs(lap.lapTimeMs),
		deltaToBest: deltaLabel(lap.lapTimeMs, best?.lapTimeMs ?? null),
	}));

	const channels = carsData?.[driverNumber]?.Channels;
	const year = getSessionYear(state?.SessionInfo);
	const status = getDriverStatus({
		year,
		inPit: line.InPit,
		pitOut: line.PitOut,
		legacyChannel: channels?.[45] ?? null,
	});
	// DRS is only trustworthy when the status policy reports a DRS state; for 2026
	// (and unknown years) the policy returns a non-DRS kind, so we leave it null
	// rather than inferring from an unsupported channel.
	const drs = status.kind.startsWith("drs")
		? status.kind === "drs-active"
			? "Active"
			: status.kind === "drs-ready"
				? "Ready"
				: "Off"
		: null;

	const speedValue = channels?.[2];
	const gearValue = channels?.[3];
	const throttleValue = channels?.[4];
	const brakeValue = channels?.[5];

	const lastLap = line.LastLapTime?.Value?.trim();
	const bestLap = line.BestLapTime?.Value?.trim() ?? (best ? formatLapTimeMs(best.lapTimeMs) : undefined);
	const strategySummary = stint
		? `${stint.compound} tyre, ${stint.age ?? "-"} laps · ${stint.stops} stop${stint.stops === 1 ? "" : "s"}`
		: null;

	const rawColor = driver.TeamColour?.trim();

	return {
		driverNumber,
		code: driver.Tla,
		fullName: driver.FullName,
		teamName: driver.TeamName,
		teamColor: rawColor ? `#${rawColor}` : FALLBACK_TEAM_COLOR,
		positionLabel: line.Position ? `P${line.Position}` : "-",
		gapLabel: gapLabelFor(line),
		lastLap: lastLap ? lastLap : null,
		bestLap: bestLap ? bestLap : null,
		stint,
		laps: recent,
		paceDirection: paceDirectionFrom(sortedLaps),
		telemetry: {
			speed: typeof speedValue === "number" ? `${speedValue} km/h` : null,
			gear: typeof gearValue === "number" ? String(gearValue) : null,
			throttle: typeof throttleValue === "number" ? throttleValue : null,
			brake: typeof brakeValue === "number" ? Boolean(brakeValue) : null,
			drs,
		},
		strategySummary,
		// related alerts are the story items already attributed to this driver
		alerts: story.filter((item) => item.driverNumber === driverNumber),
	};
}
