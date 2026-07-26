import { driverFullName, type ResultRow } from "@/lib/f1data";

export default function GridList({ rows }: { rows: ResultRow[] }) {
	const grid = [...rows].sort((a, b) => (a.grid || 999) - (b.grid || 999));
	return (
		<div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
			{grid.map((row) => (
				<div key={row.driver.driverId ?? row.position} className="data-chip flex items-center gap-3 rounded-md p-3">
					<span className="font-mono text-lg font-black text-cyan-200">{row.grid === 0 ? "PIT" : `P${row.grid}`}</span>
					<div>
						<p className="font-bold">{driverFullName(row.driver)}</p>
						<p className="text-xs text-zinc-500">{row.constructor ?? "-"}</p>
					</div>
				</div>
			))}
		</div>
	);
}
