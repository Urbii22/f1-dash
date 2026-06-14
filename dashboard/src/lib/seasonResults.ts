import type { RaceResult, SeasonRound } from "@/lib/f1data";
import type { ArchiveSession } from "@/types/archive.type";

export type RoundState = "done" | "live" | "upcoming";

export type RoundWithResult = {
	round: SeasonRound;
	result: RaceResult | null;
};

export function classifyRound(
	round: SeasonRound,
	now: Date,
	hasResult: boolean,
	liveRound?: number | null,
): RoundState {
	if (hasResult) return "done";
	if (round.round != null && round.round === liveRound) return "live";

	const start = raceStart(round);
	if (start && start.getTime() <= now.getTime() && now.getTime() - start.getTime() < 6 * 60 * 60 * 1000) {
		return "live";
	}
	return "upcoming";
}

export function latestCompletedRound(rounds: RoundWithResult[]): RoundWithResult | null {
	return (
		[...rounds]
			.filter((item) => item.result != null)
			.sort((a, b) => (b.round.round ?? -1) - (a.round.round ?? -1))[0] ?? null
	);
}

export function findArchiveSession(round: SeasonRound, sessions: ArchiveSession[]): ArchiveSession | null {
	const season = Number(round.season);
	const raceKey = meetingKey(round.raceName);
	const countryKey = meetingKey(round.country);

	const candidates = sessions.filter((session) => session.year === season);
	const raceTime = round.date ? Date.parse(`${round.date}T${round.time ?? "00:00:00Z"}`) : Number.NaN;
	if (Number.isFinite(raceTime)) {
		const dated = candidates
			.filter((session) => session.startUtc && Number.isFinite(Date.parse(session.startUtc)))
			.map((session) => ({ session, distance: Math.abs(Date.parse(session.startUtc!) - raceTime) }))
			.filter(({ distance }) => distance <= 7 * 24 * 60 * 60 * 1000)
			.sort((a, b) => a.distance - b.distance);
		if (dated[0]) return dated[0].session;
	}

	const exact = candidates.find((session) => meetingKey(session.meeting) === raceKey);
	if (exact) return exact;

	const countryMatches = candidates.filter(
		(session) =>
			Boolean(countryKey) &&
			(meetingKey(session.country) === countryKey || meetingKey(session.meeting).includes(countryKey)),
	);
	return countryMatches.length === 1 ? countryMatches[0] : null;
}

function raceStart(round: SeasonRound): Date | null {
	if (!round.date) return null;
	const value = new Date(`${round.date}T${round.time ?? "00:00:00Z"}`);
	return Number.isNaN(value.getTime()) ? null : value;
}

function meetingKey(value: string | null | undefined): string {
	return (value ?? "")
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase()
		.replace(/\bformula\s*1\b/g, " ")
		.replace(/\bgrand prix\b|\bgp\b/g, " ")
		.replace(/\b(19|20)\d{2}\b/g, " ")
		.replace(/[^a-z0-9]+/g, " ")
		.trim();
}
