// Pure championship "what-if" maths from current standings + remaining events.
// No new data: feeds on the already-proxied Jolpica standings and season calendar.
//
// Tie-break note: F1 settles equal points by count of wins (then better finishes).
// We model the *mathematical* picture, so:
//  - "can still win"  uses >=  (a contender that can only tie is still alive on countback)
//  - "clinched"       uses >   (the leader is guaranteed champion only when the gap to
//                               second exceeds everything still on the table, so not even
//                               a tie — and thus no countback — is possible)

export const RACE_POINTS = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];
export const SPRINT_POINTS = [8, 7, 6, 5, 4, 3, 2, 1];

export type RemainingEvents = {
	races: number;
	sprints: number;
};

export type Contender = {
	id: string;
	points: number;
	wins: number;
};

export type ContenderScenario = Contender & {
	/** Best possible final total if this contender wins every remaining event. */
	maxReachable: number;
	/** Points behind the current leader (0 for the leader). */
	pointsBehind: number;
	/** Can this contender still mathematically reach the title (>= leader on countback)? */
	canStillWin: boolean;
};

export type TitlePicture = {
	leaderId: string | null;
	maxRemaining: number;
	/** The leader is the mathematical champion already, whatever happens. */
	clinched: boolean;
	contenders: ContenderScenario[];
};

/** Maximum points a single competitor can still score across the remaining events. */
export function maxPointsRemaining(remaining: RemainingEvents): number {
	const races = Math.max(0, remaining.races);
	const sprints = Math.max(0, remaining.sprints);
	return races * RACE_POINTS[0] + sprints * SPRINT_POINTS[0];
}

/** Order by points desc, then wins desc — the F1 standings order. */
function standingsOrder(a: Contender, b: Contender): number {
	return b.points - a.points || b.wins - a.wins;
}

/**
 * Build the title picture for a championship (drivers or constructors — same maths,
 * the caller decides what a `Contender` is). Returns the leader, whether the title is
 * already clinched, and per-contender reachability.
 */
export function titlePicture(contenders: Contender[], remaining: RemainingEvents): TitlePicture {
	const maxRemaining = maxPointsRemaining(remaining);
	const ordered = [...contenders].sort(standingsOrder);

	const leader = ordered[0] ?? null;
	const second = ordered[1] ?? null;

	// Clinched only when even a maximal swing cannot let second place reach the leader's
	// current total (strict: a tie would be decided on countback, so it would not count).
	const clinched = leader != null && second != null ? leader.points - second.points > maxRemaining : leader != null;

	const scenarios: ContenderScenario[] = ordered.map((contender) => {
		const maxReachable = contender.points + maxRemaining;
		return {
			...contender,
			maxReachable,
			pointsBehind: leader ? leader.points - contender.points : 0,
			// alive if able to at least tie the leader's current points (countback then decides)
			canStillWin: leader ? maxReachable >= leader.points : false,
		};
	});

	return {
		leaderId: leader?.id ?? null,
		maxRemaining,
		clinched,
		contenders: scenarios,
	};
}

/**
 * Margin by which the leader must out-score a rival over the remaining events to be
 * guaranteed champion against *that* rival. Positive = the rival is still a threat by
 * this many points; <= 0 means the rival is already mathematically beaten.
 */
export function pointsToClinchAgainst(leader: Contender, rival: Contender, remaining: RemainingEvents): number {
	return rival.points + maxPointsRemaining(remaining) - leader.points + 1;
}
