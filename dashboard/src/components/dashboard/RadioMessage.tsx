import { useRef, useState } from "react";
import { motion } from "motion/react";
import { utc } from "moment";
import clsx from "clsx";

import type { Driver, RadioCapture } from "@/types/state.type";

import { useSettingsStore } from "@/stores/useSettingsStore";

import { toTrackTime } from "@/lib/toTrackTime";

import DriverTag from "@/components/driver/DriverTag";
import PlayControls from "@/components/ui/PlayControls";
import Progress from "@/components/ui/Progress";

type Props = {
	driver: Driver;
	capture: RadioCapture;
	basePath: string;
	gmtOffset: string;
};

export default function RadioMessage({ driver, capture, basePath, gmtOffset }: Props) {
	const audioRef = useRef<HTMLAudioElement | null>(null);
	const intervalRef = useRef<NodeJS.Timeout | null>(null);

	const [playing, setPlaying] = useState<boolean>(false);
	const [duration, setDuration] = useState<number>(10);
	const [progress, setProgress] = useState<number>(0);

	const loadMeta = () => {
		if (!audioRef.current) return;
		setDuration(audioRef.current.duration);
	};

	const onEnded = () => {
		setPlaying(false);
		setProgress(0);

		if (intervalRef.current) {
			clearInterval(intervalRef.current);
		}
	};

	const updateProgress = () => {
		if (!audioRef.current) return;
		setProgress(audioRef.current.currentTime);
	};

	const togglePlayback = () => {
		setPlaying((old) => {
			if (!audioRef.current) return old;

			if (!old) {
				audioRef.current.play();
				intervalRef.current = setInterval(updateProgress, 10);
			} else {
				audioRef.current.pause();

				if (intervalRef.current) {
					clearInterval(intervalRef.current);
				}

				setTimeout(() => {
					setProgress(0);
					audioRef.current?.fastSeek(0);
				}, 10000);
			}

			return !old;
		});
	};

	const favoriteDriver = useSettingsStore((state) => state.favoriteDrivers.includes(driver.RacingNumber));

	const localTime = utc(capture.Utc).local().format("HH:mm:ss");
	const trackTime = utc(toTrackTime(capture.Utc, gmtOffset)).format("HH:mm");

	return (
		<motion.li
			animate={{ opacity: 1, scale: 1 }}
			initial={{ opacity: 0, scale: 0.9 }}
			className={clsx("data-chip flex flex-col gap-2 rounded-md p-2", {
				"border-cyan-300/60! bg-cyan-300/15!": favoriteDriver,
			})}
		>
			<div className="flex items-center gap-1 font-mono text-xs leading-none text-cyan-300/60">
				<time dateTime={localTime}>{localTime}</time>
				{"//"}
				<time className="text-zinc-500" dateTime={trackTime}>
					{trackTime}
				</time>
			</div>

			<div className="flex items-center gap-2">
				<DriverTag className="!w-fit" teamColor={driver.TeamColour} short={driver.Tla} />

				<PlayControls playing={playing} onClick={togglePlayback} />
				<Progress duration={duration} progress={progress} />

				<audio
					preload="none"
					src={`${basePath}${capture.Path}`}
					ref={audioRef}
					onEnded={() => onEnded()}
					onLoadedMetadata={() => loadMeta()}
				/>
			</div>
		</motion.li>
	);
}
