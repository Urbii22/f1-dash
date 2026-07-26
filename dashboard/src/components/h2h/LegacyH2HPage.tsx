import SeasonH2HView from "@/components/h2h/SeasonH2HView";
import SeasonSelect from "@/components/standings/SeasonSelect";
import type { DriverStandingRow } from "@/lib/f1data";
import type { SeasonH2H } from "@/lib/seasonH2H";

function DriverSelect({
	name,
	value,
	standings,
}: {
	name: string;
	value: string;
	standings: DriverStandingRow[];
}) {
	return (
		<select name={name} defaultValue={value} className="data-chip rounded-md px-3 py-2 text-white">
			{standings.map((row) => (
				<option key={row.driver.driverId} value={row.driver.driverId ?? ""}>
					{row.driver.code} · {row.driver.givenName} {row.driver.familyName}
				</option>
			))}
		</select>
	);
}

export default function LegacyH2HPage({
	driverA,
	driverB,
	comparison,
	season,
	standings,
}: {
	driverA: DriverStandingRow | null;
	driverB: DriverStandingRow | null;
	comparison: SeasonH2H | null;
	season: number;
	standings: DriverStandingRow[];
}) {
	return (
		<div className="flex flex-col gap-4">
			<section className="telemetry-panel rounded-lg p-5">
				<div className="flex flex-wrap items-start justify-between gap-3">
					<div>
						<p className="panel-title">Season comparison</p>
						<h1 className="text-3xl font-black">Driver head-to-head</h1>
						<p className="mt-1 text-zinc-400">Official race and qualifying results across {season}.</p>
					</div>
					<SeasonSelect selected={season} />
				</div>
				<form className="mt-5 grid gap-3 border-t border-cyan-300/10 pt-4 sm:grid-cols-[1fr_1fr_auto]">
					<input type="hidden" name="season" value={season} />
					<DriverSelect name="a" value={driverA?.driver.driverId ?? ""} standings={standings} />
					<DriverSelect name="b" value={driverB?.driver.driverId ?? ""} standings={standings} />
					<button className="rounded-md bg-cyan-300 px-4 py-2 font-bold text-black">Compare</button>
				</form>
			</section>
			{driverA && driverB && comparison ? (
				<SeasonH2HView
					driverA={driverA}
					driverB={driverB}
					comparison={comparison}
					season={season}
				/>
			) : (
				<div className="telemetry-panel rounded-lg p-8 text-center text-zinc-500">
					Driver data is unavailable for this season.
				</div>
			)}
		</div>
	);
}
