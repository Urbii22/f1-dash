import { driverFullName, type QualiRow } from "@/lib/f1data";

export default function QualiResultTable({ rows }: { rows: QualiRow[] }) {
	return (
		<div className="tech-scrollbar overflow-x-auto">
			<table className="w-full min-w-[620px] text-left text-sm">
				<thead className="font-mono text-[0.65rem] text-zinc-500 uppercase">
					<tr>
						<th className="p-2">Pos</th>
						<th>Driver</th>
						<th>Team</th>
						<th>Q1</th>
						<th>Q2</th>
						<th>Q3</th>
					</tr>
				</thead>
				<tbody>
					{rows.map((row) => (
						<tr key={row.driver.driverId ?? row.position} className="border-t border-cyan-300/10">
							<td className="p-2 font-mono text-cyan-200">{row.position ?? "-"}</td>
							<td className="font-bold">{driverFullName(row.driver)}</td>
							<td className="text-zinc-300">{row.constructor ?? "-"}</td>
							<td className="font-mono">{row.q1 ?? "-"}</td>
							<td className="font-mono">{row.q2 ?? "-"}</td>
							<td className="font-mono">{row.q3 ?? "-"}</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}
