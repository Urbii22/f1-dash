"use client";

import Link from "next/link";

import { useDataStore } from "@/stores/useDataStore";

/**
 * During a live race the feed carries a predicted end-of-race championship.
 * The official standings above stay the source of truth; this just points to
 * the live prediction on the dashboard. Renders nothing otherwise.
 */
export default function LivePredictionBanner() {
	const isRace = useDataStore((s) => s.state?.SessionInfo?.Type === "Race");
	const hasPrediction = useDataStore((s) => s.state?.ChampionshipPrediction?.Drivers != null);

	if (!isRace || !hasPrediction) return null;

	return (
		<Link
			href="/dashboard"
			className="flex items-center gap-2 rounded-md border border-cyan-300/30 bg-cyan-300/10 px-3 py-2 text-sm text-cyan-100 transition-colors hover:bg-cyan-300/20"
		>
			<span className="relative flex h-2 w-2">
				<span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75" />
				<span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-400" />
			</span>
			Live race in progress — see the predicted championship on the dashboard →
		</Link>
	);
}
