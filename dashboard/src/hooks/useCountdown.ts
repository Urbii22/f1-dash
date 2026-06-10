"use client";

import { useEffect, useRef, useState } from "react";
import { duration, now, utc } from "moment";

export type CountdownTick = [number | null, number | null, number | null, number | null];

export function useCountdown(isoStart: string | null): CountdownTick {
	const [[days, hours, minutes, seconds], setDuration] = useState<CountdownTick>([null, null, null, null]);
	const requestRef = useRef<number | null>(null);

	useEffect(() => {
		if (!isoStart) return;
		const target = utc(isoStart);

		const tick = () => {
			const diff = duration(target.diff(now()));
			if (diff.asSeconds() > 0) {
				setDuration([parseInt(diff.asDays().toString()), diff.hours(), diff.minutes(), diff.seconds()]);
			} else {
				setDuration([0, 0, 0, 0]);
			}
			requestRef.current = requestAnimationFrame(tick);
		};

		requestRef.current = requestAnimationFrame(tick);
		return () => (requestRef.current ? cancelAnimationFrame(requestRef.current) : void 0);
	}, [isoStart]);

	return [days, hours, minutes, seconds];
}
