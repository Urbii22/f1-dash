import type { PersonalBestLapTime, SessionInfo, TimingDataDriver } from "@/types/state.type";

export const getCutoffPosition = (sessionPart: number | undefined): number | undefined => {
	if (sessionPart === 1) return 15;
	if (sessionPart === 2) return 10;

	return undefined;
};

export const parseLapTime = (time: string | undefined): number | undefined => {
	if (!time) return undefined;

	const match = /^(?:(\d+):([0-5]\d)|(\d{1,2}))\.(\d{3})$/.exec(time);
	if (!match) return undefined;

	const minutes = match[1] ? Number(match[1]) : 0;
	const seconds = Number(match[2] ?? match[3]);
	const milliseconds = Number(match[4]);

	return (minutes * 60 + seconds) * 1000 + milliseconds;
};

export const formatLapTime = (ms: number): string => {
	if (!Number.isFinite(ms) || ms < 0) return "";

	const roundedMs = Math.round(ms);
	const minutes = Math.floor(roundedMs / 60_000);
	const seconds = Math.floor((roundedMs % 60_000) / 1000);
	const milliseconds = roundedMs % 1000;

	return `${minutes}:${seconds.toString().padStart(2, "0")}.${milliseconds.toString().padStart(3, "0")}`;
};

export const deltaToCutoff = (driverBest: string, cutoffBest: string): number | undefined => {
	const driverMs = parseLapTime(driverBest);
	const cutoffMs = parseLapTime(cutoffBest);

	if (driverMs === undefined || cutoffMs === undefined) return undefined;

	return driverMs - cutoffMs;
};

export const isOnFlyingLap = (driver: TimingDataDriver): boolean => {
	if (driver.PitOut || driver.InPit || driver.KnockedOut || driver.Stopped) return false;
	if (!Array.isArray(driver.Sectors) || driver.Sectors.length === 0) return false;

	const hasPitSegment = driver.Sectors.some((sector) =>
		Array.isArray(sector.Segments) ? sector.Segments.some((segment) => segment.Status === 2064) : false,
	);

	return !hasPitSegment && driver.Sectors.some((sector) => sector.PersonalFastest);
};

export const inEliminationZone = (position: number, sessionPart: number | undefined): boolean => {
	const cutoff = getCutoffPosition(sessionPart);

	return cutoff !== undefined && Number.isFinite(position) && position > 0 && position > cutoff;
};

export const theoreticalBest = (bestSectors: PersonalBestLapTime[] | undefined): number | undefined => {
	if (bestSectors?.length !== 3) return undefined;

	const sectorTimes = bestSectors.map((sector) => parseLapTime(sector.Value));
	if (sectorTimes.some((sector) => sector === undefined)) return undefined;

	return sectorTimes.reduce<number>((total, sector) => total + (sector ?? 0), 0);
};

export const isQualifyingSession = (sessionInfo: SessionInfo | undefined): boolean => {
	if (!sessionInfo) return false;

	const type = sessionInfo.Type.trim().toLowerCase();
	const name = sessionInfo.Name.trim().toLowerCase();

	// covers "Qualifying", "Sprint Qualifying" (2024+) and "Sprint Shootout" (2023)
	return type.includes("qualifying") || name.includes("qualifying") || name.includes("shootout");
};
