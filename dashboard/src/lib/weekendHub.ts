import type { SeasonRound } from "@/lib/f1data";
import type { Round } from "@/types/schedule.type";

export type HubMeeting = { meeting: Round | null; live: boolean };

export function selectHubMeeting(schedule: Round[], now: Date): HubMeeting {
	const nowMs = now.getTime();
	const ordered = [...schedule].sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
	const active = ordered.find((round) => Date.parse(round.start) <= nowMs && Date.parse(round.end) >= nowMs);
	if (active) return { meeting: active, live: true };
	return { meeting: ordered.find((round) => Date.parse(round.start) > nowMs) ?? null, live: false };
}

export function matchMeetingToRound(meeting: Round | null, rounds: SeasonRound[]): SeasonRound | null {
	if (!meeting) return null;
	const name = eventKey(meeting.name);
	const country = eventKey(meeting.countryName);
	return (
		rounds.find((round) => eventKey(round.raceName) === name) ??
		rounds.find((round) => Boolean(country) && eventKey(round.country) === country) ??
		null
	);
}

function eventKey(value: string | null | undefined): string {
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
