"use client";

import { useEffect, useState } from "react";

import { useDataStore } from "@/stores/useDataStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import type { ExtrapolatedClock } from "@/types/state.type";

const parseClockDuration = (value: string) => {
	const parts = value.split(":").map(Number);
	if (parts.length !== 3 || parts.some((part) => !Number.isFinite(part) || part < 0)) return undefined;
	const [hours, minutes, seconds] = parts;
	return ((hours * 60 + minutes) * 60 + seconds) * 1000;
};

const formatClockDuration = (milliseconds: number) => {
	const totalSeconds = Math.floor(Math.max(0, milliseconds) / 1000);
	const hours = Math.floor(totalSeconds / 3600);
	const minutes = Math.floor((totalSeconds % 3600) / 60);
	const seconds = totalSeconds % 60;
	return [hours, minutes, seconds].map((part) => String(part).padStart(2, "0")).join(":");
};

export const calculateSessionClock = (clock: ExtrapolatedClock | undefined, delaySeconds: number, nowMs: number) => {
	if (!clock?.Remaining) return undefined;
	if (!clock.Extrapolating) return clock.Remaining;

	const remainingMs = parseClockDuration(clock.Remaining);
	const feedUtcMs = Date.parse(clock.Utc);
	if (remainingMs === undefined || !Number.isFinite(feedUtcMs)) return clock.Remaining;

	const elapsedMs = Math.max(0, nowMs - feedUtcMs);
	return formatClockDuration(remainingMs - elapsedMs + Math.max(0, delaySeconds) * 1000);
};

export const useSessionClock = () => {
	const clock = useDataStore((state) => state.state?.ExtrapolatedClock);
	const delay = useSettingsStore((state) => state.delay);
	const [now, setNow] = useState(() => Date.now());

	useEffect(() => {
		if (!clock?.Extrapolating) return;

		const interval = window.setInterval(() => setNow(Date.now()), 1000);
		return () => window.clearInterval(interval);
	}, [clock?.Extrapolating, clock?.Utc, clock?.Remaining]);

	return calculateSessionClock(clock, delay, now);
};
