"use client";

import { useEffect, useState } from "react";
import type { Round } from "@/types/schedule.type";
import { selectNextTargets, type NextTargets } from "@/lib/nextSession";

const REFETCH_MS = 60_000;

export function useNextSession() {
	const [round, setRound] = useState<Round | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(false);
	const [targets, setTargets] = useState<NextTargets>({ nextSession: null, nextRace: null });

	useEffect(() => {
		let alive = true;
		const load = async () => {
			try {
				const res = await fetch("/dashboard/next-session", { cache: "no-store" });
				const data: { round: Round | null } = await res.json();
				if (!alive) return;
				setRound(data.round);
				setTargets(selectNextTargets(data.round, new Date()));
				setError(false);
			} catch {
				if (alive) setError(true);
			} finally {
				if (alive) setLoading(false);
			}
		};
		load();
		const id = setInterval(load, REFETCH_MS);
		return () => {
			alive = false;
			clearInterval(id);
		};
	}, []);

	return { round, ...targets, loading, error };
}
