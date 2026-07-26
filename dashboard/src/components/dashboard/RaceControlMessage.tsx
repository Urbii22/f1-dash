import { motion } from "motion/react";
import { utc } from "moment";
import clsx from "clsx";
import { CircleAlert, Flag, Gauge, Radio, Search, ShieldAlert, TriangleAlert } from "lucide-react";

import type { Message } from "@/types/state.type";

import { useSettingsStore } from "@/stores/useSettingsStore";

import { toTrackTime } from "@/lib/toTrackTime";
import { classifyRaceControlMessage, type RaceControlVisualKind } from "@/lib/raceControlVisual";

type Props = {
	msg: Message;
	gmtOffset: string;
};

const getDriverNumber = (msg: Message) => {
	const match = msg.Message.match(/CAR (\d+)/);
	return match?.[1];
};

const visualStyles: Record<RaceControlVisualKind, { accent: string; icon: string; badge: string }> = {
	penalty: {
		accent: "border-l-rose-500 bg-rose-500/8",
		icon: "border-rose-400/40 bg-rose-500/15 text-rose-300",
		badge: "border-rose-400/30 bg-rose-500/15 text-rose-200",
	},
	investigation: {
		accent: "border-l-amber-400 bg-amber-400/7",
		icon: "border-amber-300/40 bg-amber-400/15 text-amber-200",
		badge: "border-amber-300/30 bg-amber-400/15 text-amber-100",
	},
	"track-limits": {
		accent: "border-l-orange-400 bg-orange-400/7",
		icon: "border-orange-300/40 bg-orange-400/15 text-orange-200",
		badge: "border-orange-300/30 bg-orange-400/15 text-orange-100",
	},
	"flag-yellow": {
		accent: "border-l-yellow-300 bg-yellow-300/7",
		icon: "border-yellow-300/40 bg-yellow-300/15 text-yellow-200",
		badge: "border-yellow-300/30 bg-yellow-300/15 text-yellow-100",
	},
	"flag-red": {
		accent: "border-l-red-500 bg-red-500/8",
		icon: "border-red-400/40 bg-red-500/15 text-red-300",
		badge: "border-red-400/30 bg-red-500/15 text-red-200",
	},
	"flag-green": {
		accent: "border-l-emerald-400 bg-emerald-400/7",
		icon: "border-emerald-300/40 bg-emerald-400/15 text-emerald-200",
		badge: "border-emerald-300/30 bg-emerald-400/15 text-emerald-100",
	},
	"flag-blue": {
		accent: "border-l-blue-400 bg-blue-400/7",
		icon: "border-blue-300/40 bg-blue-400/15 text-blue-200",
		badge: "border-blue-300/30 bg-blue-400/15 text-blue-100",
	},
	"flag-chequered": {
		accent: "border-l-zinc-100 bg-white/5",
		icon: "border-zinc-300/40 bg-white/10 text-white",
		badge: "border-zinc-300/30 bg-white/10 text-zinc-100",
	},
	flag: {
		accent: "border-l-cyan-400 bg-cyan-400/7",
		icon: "border-cyan-300/40 bg-cyan-400/15 text-cyan-200",
		badge: "border-cyan-300/30 bg-cyan-400/15 text-cyan-100",
	},
	"safety-car": {
		accent: "border-l-yellow-400 bg-yellow-400/7",
		icon: "border-yellow-300/40 bg-yellow-400/15 text-yellow-200",
		badge: "border-yellow-300/30 bg-yellow-400/15 text-yellow-100",
	},
	drs: {
		accent: "border-l-emerald-400 bg-emerald-400/7",
		icon: "border-emerald-300/40 bg-emerald-400/15 text-emerald-200",
		badge: "border-emerald-300/30 bg-emerald-400/15 text-emerald-100",
	},
	general: {
		accent: "border-l-cyan-500/60 bg-cyan-400/5",
		icon: "border-cyan-300/30 bg-cyan-400/10 text-cyan-200",
		badge: "border-cyan-300/20 bg-cyan-400/10 text-cyan-100",
	},
};

function MessageIcon({ kind }: { kind: RaceControlVisualKind }) {
	if (kind === "penalty") return <ShieldAlert size={20} />;
	if (kind === "investigation") return <Search size={20} />;
	if (kind === "track-limits") return <TriangleAlert size={20} />;
	if (kind === "safety-car") return <Radio size={20} />;
	if (kind === "drs") return <Gauge size={20} />;
	if (kind.startsWith("flag")) return <Flag size={20} />;
	return <CircleAlert size={20} />;
}

export function RaceControlMessage({ msg, gmtOffset }: Props) {
	const driverNumber = getDriverNumber(msg);
	const favoriteDriver = useSettingsStore((state) => state.favoriteDrivers.includes(driverNumber ?? ""));
	const visual = classifyRaceControlMessage(msg);
	const styles = visualStyles[visual.kind];

	const localTime = utc(msg.Utc).local().format("HH:mm:ss");
	const trackTime = utc(toTrackTime(msg.Utc, gmtOffset)).format("HH:mm");

	return (
		<motion.li
			layout="position"
			animate={{ opacity: 1, scale: 1 }}
			initial={{ opacity: 0, scale: 0.8 }}
			className={clsx("data-chip flex items-start gap-3 rounded-md border-l-4 p-3", styles.accent, {
				"border-cyan-300/60! bg-cyan-300/15!": favoriteDriver,
			})}
		>
			<div className={clsx("flex h-10 w-10 shrink-0 items-center justify-center rounded-md border", styles.icon)}>
				<MessageIcon kind={visual.kind} />
			</div>

			<div className="min-w-0 flex-1">
				<div className="flex flex-wrap items-center gap-2">
					<span className={clsx("rounded border px-2 py-1 font-mono text-[0.65rem] font-black uppercase", styles.badge)}>
						{visual.label}
					</span>
					{driverNumber && (
						<span className="rounded border border-cyan-300/20 bg-black/30 px-2 py-1 font-mono text-[0.65rem] font-black text-cyan-100">
							CAR {driverNumber}
						</span>
					)}
				</div>

				<p className="mt-2 text-sm font-semibold leading-snug text-zinc-100">{msg.Message}</p>

				<div className="mt-2 flex flex-wrap items-center gap-1.5 font-mono text-[0.65rem] leading-none text-cyan-300/60">
					{msg.Lap && (
						<>
							<p>Lap {msg.Lap}</p>
							{"//"}
						</>
					)}
					<time dateTime={localTime}>{localTime}</time>
					{"//"}
					<time className="text-zinc-500" dateTime={trackTime}>
						{trackTime}
					</time>
				</div>
			</div>
		</motion.li>
	);
}
