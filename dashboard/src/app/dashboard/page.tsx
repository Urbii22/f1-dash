"use client";

import LeaderBoard from "@/components/dashboard/LeaderBoard";
import RaceControl from "@/components/dashboard/RaceControl";
import TeamRadios from "@/components/dashboard/TeamRadios";
import TrackViolations from "@/components/dashboard/TrackViolations";
import Map from "@/components/dashboard/Map";
import Footer from "@/components/Footer";

export default function Page() {
	return (
		<div className="flex w-full flex-col gap-3 p-3">
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

			<section className="grid grid-cols-1 gap-3 lg:grid-cols-3">
				<div className="telemetry-panel tech-scrollbar h-[30rem] overflow-y-auto rounded-lg p-3">
					<PanelHeader eyebrow="FIA feed" title="Race Control" meta="Messages" />
					<RaceControl />
				</div>

				<div className="telemetry-panel tech-scrollbar h-[30rem] overflow-y-auto rounded-lg p-3">
					<PanelHeader eyebrow="Comms" title="Team Radios" meta="Audio" />
					<TeamRadios />
				</div>

				<div className="telemetry-panel tech-scrollbar h-[30rem] overflow-y-auto rounded-lg p-3">
					<PanelHeader eyebrow="Limits" title="Track Alerts" meta="Drivers" />
					<TrackViolations />
				</div>
			</section>

			<Footer />
		</div>
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
