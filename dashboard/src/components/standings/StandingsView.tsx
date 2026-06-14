import {
	driverFullName,
	gapToLeader,
	type ConstructorStandingRow,
	type DriverStandingRow,
} from "@/lib/f1data";

function GapCell({ points, leader }: { points: number | null; leader: number | null }) {
	const gap = gapToLeader(points, leader);
	return <span className="font-mono text-zinc-500">{gap == null || gap === 0 ? "—" : `-${gap}`}</span>;
}

export default function StandingsView({
	drivers,
	constructors,
}: {
	drivers: DriverStandingRow[];
	constructors: ConstructorStandingRow[];
}) {
	const driverLeader = drivers[0]?.points ?? null;
	const teamLeader = constructors[0]?.points ?? null;

	return (
		<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
			<div className="telemetry-panel rounded-lg p-3">
				<p className="panel-title border-b border-cyan-300/10 pb-2">Drivers&apos; Championship</p>
				{drivers.length === 0 ? (
					<Empty />
				) : (
					<table className="mt-2 w-full text-left text-sm">
						<thead className="font-mono text-[0.65rem] text-zinc-500">
							<tr>
								<th className="p-1">P</th>
								<th>Driver</th>
								<th>Team</th>
								<th className="text-right">Pts</th>
								<th className="text-right">Wins</th>
								<th className="text-right">Gap</th>
							</tr>
						</thead>
						<tbody>
							{drivers.map((row) => (
								<tr key={row.driver.driverId ?? row.position} className="border-t border-cyan-300/10">
									<td className="p-1 font-mono text-zinc-400">{row.position}</td>
									<td className="font-bold">
										{row.driver.code ?? ""}{" "}
										<span className="font-normal text-zinc-400">{driverFullName(row.driver)}</span>
									</td>
									<td className="text-zinc-300">{row.constructor ?? "—"}</td>
									<td className="text-right font-mono text-cyan-200">{row.points ?? 0}</td>
									<td className="text-right font-mono">{row.wins ?? 0}</td>
									<td className="text-right">
										<GapCell points={row.points} leader={driverLeader} />
									</td>
								</tr>
							))}
						</tbody>
					</table>
				)}
			</div>

			<div className="telemetry-panel rounded-lg p-3">
				<p className="panel-title border-b border-cyan-300/10 pb-2">Constructors&apos; Championship</p>
				{constructors.length === 0 ? (
					<Empty />
				) : (
					<table className="mt-2 w-full text-left text-sm">
						<thead className="font-mono text-[0.65rem] text-zinc-500">
							<tr>
								<th className="p-1">P</th>
								<th>Team</th>
								<th className="text-right">Pts</th>
								<th className="text-right">Wins</th>
								<th className="text-right">Gap</th>
							</tr>
						</thead>
						<tbody>
							{constructors.map((row) => (
								<tr key={row.constructorId ?? row.position} className="border-t border-cyan-300/10">
									<td className="p-1 font-mono text-zinc-400">{row.position}</td>
									<td className="font-bold">{row.name ?? "—"}</td>
									<td className="text-right font-mono text-cyan-200">{row.points ?? 0}</td>
									<td className="text-right font-mono">{row.wins ?? 0}</td>
									<td className="text-right">
										<GapCell points={row.points} leader={teamLeader} />
									</td>
								</tr>
							))}
						</tbody>
					</table>
				)}
			</div>
		</div>
	);
}

function Empty() {
	return <p className="p-6 text-center text-sm text-zinc-500">Standings unavailable for this season.</p>;
}
