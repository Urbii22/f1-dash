"use client";

import Footer from "@/components/Footer";
import CutoffPanel from "@/components/qualifying/CutoffPanel";
import DeletedLaps from "@/components/qualifying/DeletedLaps";
import HotLaps from "@/components/qualifying/HotLaps";
import QualiBoard from "@/components/qualifying/QualiBoard";
import QualiHeader from "@/components/qualifying/QualiHeader";
import QualiProgression from "@/components/qualifying/QualiProgression";
import SpeedTrap from "@/components/qualifying/SpeedTrap";
import { isQualifyingSession } from "@/lib/quali";
import { useDataStore } from "@/stores/useDataStore";
import UiModeBoundary from "@/components/new-ui/UiModeBoundary";
import SimpleQualifyingView from "@/components/new-ui/qualifying/SimpleQualifyingView";
import DetailedQualifyingView from "@/components/new-ui/qualifying/DetailedQualifyingView";

export default function QualifyingPage() {
	return (
		<UiModeBoundary
			legacy={<LegacyQualifyingPage />}
			simple={<SimpleQualifyingView />}
			detailed={<DetailedQualifyingView />}
		/>
	);
}

export function LegacyQualifyingPage() {
	const sessionInfo = useDataStore((state) => state.state?.SessionInfo);

	if (!sessionInfo) {
		return (
			<div className="flex min-h-[50vh] w-full flex-col items-center justify-center gap-3">
				<div className="h-2 w-2 animate-pulse rounded-full bg-cyan-400" />
				<p className="panel-title">Loading qualifying session</p>
			</div>
		);
	}

	if (!isQualifyingSession(sessionInfo)) {
		return (
			<div className="flex min-h-[50vh] w-full flex-col items-center justify-center">
				<p>qualifying view unavailable</p>
				<p className="text-sm text-zinc-500">only available during qualifying sessions</p>
			</div>
		);
	}

	return (
		<div className="flex w-full flex-col gap-3 p-3">
			<QualiHeader />
			<HotLaps />
			<div className="grid min-w-0 grid-cols-1 gap-3 2xl:grid-cols-[minmax(48rem,1fr)_minmax(22rem,0.38fr)] 2xl:items-start">
				<QualiBoard />
				<aside className="flex min-w-0 flex-col gap-3">
					<CutoffPanel />
					<DeletedLaps />
					<SpeedTrap />
				</aside>
			</div>
			<QualiProgression />
			<Footer />
		</div>
	);
}
