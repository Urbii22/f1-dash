"use client";

import LeaderBoard from "@/components/dashboard/LeaderBoard";
import DriverComparisonPanel from "@/components/dashboard/DriverComparisonPanel";
import DriverDetailPanel from "@/components/dashboard/DriverDetailPanel";
import RaceControl from "@/components/dashboard/RaceControl";
import PresentationMode from "@/components/dashboard/PresentationMode";
import SmartAlerts from "@/components/dashboard/SmartAlerts";
import TeamRadios from "@/components/dashboard/TeamRadios";
import TelemetryPanel from "@/components/dashboard/TelemetryPanel";
import TrackViolations from "@/components/dashboard/TrackViolations";
import Map from "@/components/dashboard/Map";
import Footer from "@/components/Footer";
import { usePresentationModeStore } from "@/stores/usePresentationModeStore";

export default function Page() {
	const presentationMode = usePresentationModeStore((state) => state.enabled);
	const setPresentationMode = usePresentationModeStore((state) => state.setEnabled);

	return (
		<div className="flex w-full flex-col gap-3 p-3">
			<div className="flex justify-end">
				<button
					className="data-chip rounded-md px-3 py-2 text-sm text-cyan-200"
					onClick={() => setPresentationMode(!presentationMode)}
				>
					{presentationMode ? "Dashboard" : "Presentation"}
				</button>
			</div>
			{presentationMode ? <PresentationMode /> : <RegularDashboard />}
			<Footer />
		</div>
	);
}

function RegularDashboard() {
	return (
		<>
			<section className="flex flex-col gap-3 2xl:grid 2xl:grid-cols-[minmax(48rem,0.95fr)_minmax(36rem,1.05fr)]">
				<div className="telemetry-panel rounded-lg p-3">
					<PanelHeader eyebrow="Grid matrix" title="Live Classification" meta="Timing data" />
					<div className="tech-scrollbar mt-3 overflow-x-auto">
						<LeaderBoard />
					</div>
				</div>

				<div className="telemetry-panel min-h-[34rem] rounded-lg p-3 2xl:max-h-[52rem]">
					<PanelHeader eyebrow="Circuit radar" title="Track Positioning" meta="Sector overlay" />
					<div className="relative mt-3 h-[32rem] overflow-hidden rounded-md border border-cyan-300/10 bg-black/30 2xl:h-[calc(100%-3.5rem)]">
						<div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-cyan-300/10 to-transparent" />
						<Map />
					</div>
				</div>
			</section>

			<section className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(18rem,0.8fr)_minmax(26rem,1.2fr)]">
				<div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-1">
					<DriverDetailPanel />
					<TelemetryPanel />
				</div>
				<DriverComparisonPanel />
			</section>

			<section className="grid grid-cols-1 gap-3 lg:grid-cols-3">
				<SmartAlerts />

				<div className="telemetry-panel tech-scrollbar h-[30rem] overflow-y-auto rounded-lg p-3">
					<PanelHeader eyebrow="FIA feed" title="Race Control" meta="Messages" />
					<RaceControl />
				</div>

				<div className="telemetry-panel tech-scrollbar h-[30rem] overflow-y-auto rounded-lg p-3">
					<PanelHeader eyebrow="Comms" title="Team Radios" meta="Audio" />
					<TeamRadios />
				</div>
			</section>

			<section className="grid grid-cols-1 gap-3">
				<div className="telemetry-panel tech-scrollbar h-[30rem] overflow-y-auto rounded-lg p-3">
					<PanelHeader eyebrow="Limits" title="Track Alerts" meta="Drivers" />
					<TrackViolations />
				</div>
			</section>
		</>
	);
}

function PanelHeader({ eyebrow, title, meta }: { eyebrow: string; title: string; meta: string }) {
	return (
		<div className="flex items-start justify-between gap-3 border-b border-cyan-300/10 pb-3">
			<div>
				<p className="panel-title">{eyebrow}</p>
				<h2 className="text-xl font-black tracking-tight text-white">{title}</h2>
			</div>
			<div className="data-chip rounded-md px-2 py-1 font-mono text-[0.68rem] text-cyan-200 uppercase">{meta}</div>
		</div>
	);
}
