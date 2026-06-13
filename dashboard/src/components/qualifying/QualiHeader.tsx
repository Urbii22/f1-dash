"use client";

import clsx from "clsx";
import { Check, Clock3, Flag } from "lucide-react";

import CountryFlag from "@/components/Flag";
import { useSessionClock } from "@/hooks/useSessionClock";
import { getTrackStatusMessage } from "@/lib/getTrackStatusMessage";
import { getQualiPrefix } from "@/lib/qualiView";
import { useDataStore } from "@/stores/useDataStore";

const endedStatuses = new Set(["Finished", "Finalised", "Ends"]);

export default function QualiHeader() {
	const sessionName = useDataStore((state) => state.state?.SessionInfo?.Name);
	const meetingName = useDataStore((state) => state.state?.SessionInfo?.Meeting?.Name);
	const countryCode = useDataStore((state) => state.state?.SessionInfo?.Meeting?.Country?.Code);
	const sessionPart = useDataStore((state) => state.state?.TimingData?.SessionPart);
	const trackStatus = useDataStore((state) => state.state?.TrackStatus);
	const sessionStatus = useDataStore((state) => state.state?.SessionStatus?.Status);
	const timeRemaining = useSessionClock();

	const prefix = getQualiPrefix(sessionName);
	const trackCode = Number.parseInt(trackStatus?.Status ?? "", 10);
	const trackMessage = getTrackStatusMessage(trackCode);
	const isRedFlag = trackCode === 5;
	const betweenRounds = sessionStatus ? endedStatuses.has(sessionStatus) : false;
	const roundMessage = betweenRounds
		? sessionPart && sessionPart < 3
			? `${prefix}${sessionPart} finalizada - esperando ${prefix}${sessionPart + 1}`
			: "clasificacion finalizada"
		: undefined;

	return (
		<header className="telemetry-panel rounded-lg p-4">
			<div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
				<div className="flex items-center gap-3">
					<CountryFlag countryCode={countryCode} className="hidden h-10 w-14 shrink-0 sm:flex" />
					<div>
						<p className="panel-title">{meetingName ?? "Qualifying command"}</p>
						<h1 className="text-2xl font-black tracking-tight text-white">Live Classification</h1>
					</div>
				</div>

				<div className="grid grid-cols-3 gap-2 sm:flex sm:min-w-[24rem] sm:flex-1 sm:justify-center">
					{[1, 2, 3].map((part) => {
						const active = sessionPart === part;
						const complete = sessionPart !== undefined && sessionPart > part;
						return (
							<div
								key={part}
								className={clsx(
									"data-chip flex min-w-24 items-center justify-center gap-2 rounded-md px-4 py-2 font-mono font-black",
									{
										"border-cyan-300/70! bg-cyan-300/15! text-cyan-100 shadow-[0_0_24px_rgba(0,229,255,0.12)]": active,
										"text-zinc-500": !active,
									},
								)}
							>
								{complete && <Check size={15} />}
								{prefix}
								{part}
							</div>
						);
					})}
				</div>

				<div className="flex flex-wrap items-center gap-2">
					<div className="data-chip flex items-center gap-2 rounded-md px-3 py-2 font-mono text-xl font-black tabular-nums">
						<Clock3 size={18} className="text-cyan-300" />
						{timeRemaining ?? "--:--:--"}
					</div>
					<div
						className={clsx("flex items-center gap-2 rounded-md px-3 py-2 font-mono text-sm font-black uppercase", {
							"animate-pulse bg-red-500 text-white shadow-[0_0_30px_rgba(239,68,68,0.45)]": isRedFlag,
							"data-chip": !isRedFlag,
						})}
					>
						<Flag size={17} />
						<span className={clsx(!isRedFlag && trackMessage?.color, "h-2 w-2 rounded-full")} />
						{trackMessage?.message ?? trackStatus?.Message ?? "Track status"}
					</div>
				</div>
			</div>

			{roundMessage && (
				<div className="mt-4 rounded-md border border-amber-300/30 bg-amber-300/10 px-3 py-2 font-mono text-sm font-bold text-amber-100 uppercase">
					{roundMessage}
				</div>
			)}
		</header>
	);
}
