import { motion } from "motion/react";
import { utc } from "moment";
import Image from "next/image";
import clsx from "clsx";

import type { Message } from "@/types/state.type";

import { useSettingsStore } from "@/stores/useSettingsStore";

import { toTrackTime } from "@/lib/toTrackTime";

type Props = {
	msg: Message;
	gmtOffset: string;
};

const getDriverNumber = (msg: Message) => {
	const match = msg.Message.match(/CAR (\d+)/);
	return match?.[1];
};

export function RaceControlMessage({ msg, gmtOffset }: Props) {
	const favoriteDriver = useSettingsStore((state) => state.favoriteDrivers.includes(getDriverNumber(msg) ?? ""));

	const localTime = utc(msg.Utc).local().format("HH:mm:ss");
	const trackTime = utc(toTrackTime(msg.Utc, gmtOffset)).format("HH:mm");

	return (
		<motion.li
			layout="position"
			animate={{ opacity: 1, scale: 1 }}
			initial={{ opacity: 0, scale: 0.8 }}
			className={clsx("data-chip flex items-center justify-between gap-4 rounded-md p-3", {
				"border-cyan-300/60! bg-cyan-300/15!": favoriteDriver,
			})}
		>
			<div>
				<div className="flex flex-wrap items-center gap-1.5 font-mono text-sm leading-none text-cyan-300/70">
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

				<p className="mt-2 text-base font-medium text-zinc-100">{msg.Message}</p>
			</div>

			{msg.Flag && msg.Flag !== "CLEAR" && (
				<Image
					src={`/flags/${msg.Flag.toLowerCase().replaceAll(" ", "-")}-flag.svg`}
					alt={msg.Flag}
					width={30}
					height={30}
				/>
			)}
		</motion.li>
	);
}
