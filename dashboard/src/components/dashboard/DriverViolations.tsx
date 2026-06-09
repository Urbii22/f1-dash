import type { Driver, TimingData } from "@/types/state.type";

import { calculatePosition } from "@/lib/calculatePosition";

import DriverTag from "@/components/driver/DriverTag";

type Props = {
	driver: Driver;
	driverViolations: number;
	driversTiming: TimingData | undefined;
};

export default function DriverViolations({ driver, driverViolations, driversTiming }: Props) {
	return (
		<div className="data-chip flex gap-2 rounded-md p-2" key={`violation.${driver.RacingNumber}`}>
			<DriverTag className="h-fit" teamColor={driver.TeamColour} short={driver.Tla} />

			<div className="flex flex-col justify-around text-sm leading-none text-zinc-300">
				<p>
					{driverViolations} Violation{driverViolations > 1 ? "s" : ""}
					{driverViolations > 4 && (
						<span className="text-rose-300"> - {Math.round(driverViolations / 5) * 5}s Penalty</span>
					)}
				</p>
				{driverViolations > 4 && driversTiming && (
					<p className="font-mono text-xs text-cyan-300/70">
						{calculatePosition(Math.round(driverViolations / 5) * 5, driver.RacingNumber, driversTiming)}
						th after penalty
					</p>
				)}
			</div>
		</div>
	);
}
