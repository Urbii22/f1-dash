import { titlePicture, type RemainingEvents } from "@/lib/championshipScenarios";
import { driverFullName, type DriverStandingRow } from "@/lib/f1data";

export type TitleRowVM = {
	id: string;
	code: string;
	name: string;
	points: number;
	pointsBehind: number;
	canStillWin: boolean;
	isLeader: boolean;
};

export type ChampionshipPictureVM = {
	headline: string;
	subline: string;
	clinched: boolean;
	seasonOver: boolean;
	rows: TitleRowVM[];
};

/**
 * Display-ready drivers' title picture: a headline (leader / clinch state), a subline
 * (how many drivers are still mathematically alive), and per-driver rows. Returns null
 * when there is no usable standings data. Constructors are intentionally out of scope —
 * their max-points-remaining differs (two cars score), so they need separate maths.
 */
export function buildChampionshipPicture(
	drivers: DriverStandingRow[],
	remaining: RemainingEvents,
): ChampionshipPictureVM | null {
	const usable = drivers.filter((row) => row.driver.driverId != null && row.points != null);
	if (usable.length === 0) return null;

	const labels = new Map<string, { code: string; name: string }>();
	const contenders = usable.map((row) => {
		const id = row.driver.driverId as string;
		labels.set(id, { code: row.driver.code ?? id.toUpperCase().slice(0, 3), name: driverFullName(row.driver) });
		return { id, points: row.points as number, wins: row.wins ?? 0 };
	});

	const picture = titlePicture(contenders, remaining);
	const seasonOver = remaining.races === 0 && remaining.sprints === 0;

	const rows: TitleRowVM[] = picture.contenders.map((contender) => {
		const label = labels.get(contender.id);
		return {
			id: contender.id,
			code: label?.code ?? contender.id,
			name: label?.name ?? contender.id,
			points: contender.points,
			pointsBehind: contender.pointsBehind,
			canStillWin: contender.canStillWin,
			isLeader: contender.id === picture.leaderId,
		};
	});

	const leader = rows.find((row) => row.isLeader) ?? null;
	const stillAlive = rows.filter((row) => row.canStillWin).length;
	const margin = rows.find((row) => !row.isLeader)?.pointsBehind ?? null;

	let headline: string;
	let subline: string;

	if (!leader) {
		headline = "Championship picture unavailable";
		subline = "No standings data.";
	} else if (picture.clinched) {
		headline = seasonOver ? `${leader.name} is the champion` : `${leader.name} has clinched the title`;
		subline = `Mathematically out of reach with ${picture.maxRemaining} points still on the table.`;
	} else {
		headline = margin == null ? `${leader.name} leads the championship` : `${leader.name} leads by ${margin}`;
		subline =
			stillAlive <= 1
				? "Only the leader can still take the title."
				: `${stillAlive} drivers still mathematically in contention · ${picture.maxRemaining} points remaining.`;
	}

	return { headline, subline, clinched: picture.clinched, seasonOver, rows };
}
