import type { SeasonRound } from "@/lib/f1data";
import type { RemainingEvents } from "@/lib/championshipScenarios";
import type { Round } from "@/types/schedule.type";

// Counts the events still to run, for the championship "what-if" maths. Races come
// from the Jolpica season calendar (reliable dates); sprints from the iCal schedule
// (Jolpica only lists sprints once they have results, so it can't tell us future ones).

function roundIsUpcoming(round: SeasonRound, now: Date): boolean {
	if (!round.date) return false;
	return Date.parse(`${round.date}T${round.time ?? "00:00:00Z"}`) > now.getTime();
}

export function remainingRaceCount(rounds: SeasonRound[], now: Date): number {
	return rounds.filter((round) => roundIsUpcoming(round, now)).length;
}

/** Sprint *races* still to run (the kind is "Sprint"; "Sprint Qualifying" is excluded). */
export function remainingSprintCount(schedule: Round[], now: Date): number {
	return schedule
		.filter((round) => !round.over)
		.flatMap((round) => round.sessions)
		.filter((session) => {
			const kind = session.kind.toLowerCase();
			return (
				Date.parse(session.start) > now.getTime() && kind.includes("sprint") && !kind.includes("qualifying")
			);
		}).length;
}

export function remainingEvents(rounds: SeasonRound[], schedule: Round[], now: Date): RemainingEvents {
	return {
		races: remainingRaceCount(rounds, now),
		sprints: remainingSprintCount(schedule, now),
	};
}
