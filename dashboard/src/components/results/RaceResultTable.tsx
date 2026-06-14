import Link from "next/link";

import { driverFullName, type ResultRow } from "@/lib/f1data";

export default function RaceResultTable({ rows, season }: { rows: ResultRow[]; season: number }) {
	return (
		<div className="tech-scrollbar overflow-x-auto">
			<table className="w-full min-w-[760px] text-left text-sm">
				<thead className="font-mono text-[0.65rem] text-zinc-500 uppercase">
					<tr>
						<th className="p-2">Pos</th>
						<th>Driver</th>
						<th>Team</th>
						<th>Grid</th>
						<th>Time / gap</th>
						<th>Status</th>
						<th className="text-right">Pts</th>
					</tr>
				</thead>
				<tbody>
					{rows.map((row) => (
						<tr key={row.driver.driverId ?? row.position} className="border-t border-cyan-300/10">
							<td className="p-2 font-mono text-cyan-200">{row.position ?? "-"}</td>
							<td className="font-bold">
								{row.driver.driverId ? (
									<Link className="hover:text-cyan-200" href={`/driver/${row.driver.driverId}?season=${season}`}>
										{driverFullName(row.driver)}
									</Link>
								) : (
									driverFullName(row.driver)
								)}
							</td>
							<td className="text-zinc-300">{row.constructor ?? "-"}</td>
							<td className="font-mono">{row.grid === 0 ? "PIT" : (row.grid ?? "-")}</td>
							<td className="font-mono text-zinc-300">{row.time ?? "-"}</td>
							<td className="text-zinc-400">{row.status ?? "-"}</td>
							<td className="text-right font-mono">{row.points ?? 0}</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}
