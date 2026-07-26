"use client";

import clsx from "clsx";

import { deltaToCutoff, formatLapTime, getCutoffPosition, parseLapTime } from "@/lib/quali";
import { sortPos } from "@/lib/sorting";
import { useDataStore } from "@/stores/useDataStore";

const formatDelta = (delta: number | undefined) => {
	if (delta === undefined) return "--.---";
	return `${delta >= 0 ? "+" : "-"}${(Math.abs(delta) / 1000).toFixed(3)}`;
};

export default function CutoffPanel() {
	const timingData = useDataStore((state) => state.state?.TimingData);
	const appData = useDataStore((state) => state.state?.TimingAppData);
	const drivers = useDataStore((state) => state.state?.DriverList);
	const ordered = Object.values(timingData?.Lines ?? {}).sort(sortPos);
	const cutoffPosition = getCutoffPosition(timingData?.SessionPart);
	const referencePosition = cutoffPosition ?? 1;
	const reference = ordered.find((driver) => Number.parseInt(driver.Position, 10) === referencePosition);
	const referenceDriver = reference ? drivers?.[reference.RacingNumber] : undefined;
	const referenceTime = reference?.BestLapTime?.Value ?? "";
	const threatened = cutoffPosition
		? ordered.filter((driver) => {
				const position = Number.parseInt(driver.Position, 10);
				return !driver.KnockedOut && position >= cutoffPosition - 3 && position <= cutoffPosition + 5;
			})
		: [];
	const p1Time = ordered.find((driver) => Number.parseInt(driver.Position, 10) === 1)?.BestLapTime?.Value;
	const fallback107 = parseLapTime(p1Time);
	const rule107 =
		timingData?.SessionPart === 1
			? timingData.CutOffTime || (fallback107 === undefined ? undefined : formatLapTime(fallback107 * 1.07))
			: undefined;

	return (
		<section className="telemetry-panel rounded-lg p-3">
			<div className="border-b border-cyan-300/10 pb-3">
				<p className="panel-title">Threshold model</p>
				<h2 className="text-xl font-black">{cutoffPosition ? "Estimated Cutoff" : "Provisional Pole"}</h2>
			</div>

			<div className="mt-3 rounded-lg border border-cyan-300/20 bg-cyan-300/5 p-4">
				<div className="flex items-center justify-between gap-3">
					<div>
						<p className="font-mono text-xs font-black text-zinc-500 uppercase">
							P{referencePosition} {referenceDriver?.Tla ?? "---"}
						</p>
						<p className="font-mono text-3xl font-black tabular-nums">{referenceTime || "--:--.---"}</p>
					</div>
					<div
						className="h-10 w-2 rounded-full"
						style={{ backgroundColor: `#${referenceDriver?.TeamColour ?? "00e5ff"}` }}
					/>
				</div>
				<p className="mt-2 text-xs text-zinc-500">Estimated until the chequered flag confirms the final order.</p>
			</div>

			{rule107 && (
				<div className="mt-3 flex items-center justify-between rounded-md border border-rose-400/30 bg-rose-400/10 px-3 py-2">
					<span className="font-mono text-xs font-black text-rose-200 uppercase">107% rule</span>
					<span className="font-mono font-black text-rose-100 tabular-nums">{rule107}</span>
				</div>
			)}

			{cutoffPosition && (
				<div className="mt-4 space-y-1">
					<p className="panel-title mb-2">Threat window</p>
					{threatened.map((timingDriver) => {
						const driver = drivers?.[timingDriver.RacingNumber];
						const position = Number.parseInt(timingDriver.Position, 10);
						const delta = deltaToCutoff(timingDriver.BestLapTime?.Value, referenceTime);
						const currentStint = appData?.Lines?.[timingDriver.RacingNumber]?.Stints?.at(-1);
						const status = !timingDriver.BestLapTime?.Value
							? "sin tiempo"
							: timingDriver.InPit
								? "en boxes"
								: timingDriver.Stopped
									? "detenido"
									: "en pista";
						return (
							<div
								key={timingDriver.RacingNumber}
								className={clsx("data-chip grid grid-cols-[2.5rem_1fr_auto] items-center gap-2 rounded-md px-2 py-2", {
									"border-rose-400/40! bg-rose-400/10!": position > cutoffPosition || timingDriver.Cutoff,
								})}
							>
								<span className="font-mono text-sm font-black">P{position}</span>
								<div className="min-w-0">
									<p className="truncate font-bold">
										{driver?.Tla ?? timingDriver.RacingNumber}{" "}
										<span className="text-xs text-zinc-500">{currentStint?.Compound ?? "--"}</span>
									</p>
									<p className="text-[0.65rem] text-zinc-500 uppercase">{status}</p>
								</div>
								<span
									className={clsx(
										"font-mono font-black tabular-nums",
										delta !== undefined && delta <= 0 ? "text-emerald-400" : "text-rose-400",
									)}
								>
									{formatDelta(delta)}
								</span>
							</div>
						);
					})}
				</div>
			)}
		</section>
	);
}
