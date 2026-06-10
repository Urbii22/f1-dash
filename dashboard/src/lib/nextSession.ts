import type { Round, Session } from "@/types/schedule.type";

export type NextTargets = {
	nextSession: Session | null;
	nextRace: Session | null;
};

export function selectNextTargets(round: Round | null, now: Date): NextTargets {
	if (!round || !Array.isArray(round.sessions)) {
		return { nextSession: null, nextRace: null };
	}
	const nowMs = now.getTime();
	const future = round.sessions
		.filter((s) => Number.isFinite(Date.parse(s.start)) && Date.parse(s.start) > nowMs)
		.sort((a, b) => Date.parse(a.start) - Date.parse(b.start));

	const nextSession = future.find((s) => s.kind.toLowerCase() !== "race") ?? null;
	const nextRace = future.find((s) => s.kind.toLowerCase() === "race") ?? null;
	return { nextSession, nextRace };
}
