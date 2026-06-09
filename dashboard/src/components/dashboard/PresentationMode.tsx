"use client";

import LeaderBoard from "@/components/dashboard/LeaderBoard";
import Map from "@/components/dashboard/Map";
import SmartAlerts from "@/components/dashboard/SmartAlerts";

export default function PresentationMode() {
	return (
		<div className="grid min-h-full grid-cols-1 gap-3 p-3 xl:grid-cols-[minmax(36rem,1fr)_26rem]">
			<section className="telemetry-panel min-h-[34rem] rounded-lg p-3">
				<div className="h-full overflow-hidden rounded-md border border-cyan-300/10 bg-black/30">
					<Map />
				</div>
			</section>
			<aside className="flex min-h-0 flex-col gap-3">
				<section className="telemetry-panel tech-scrollbar min-h-[24rem] flex-1 overflow-auto rounded-lg p-3">
					<p className="panel-title">Broadcast Grid</p>
					<LeaderBoard />
				</section>
				<SmartAlerts />
			</aside>
		</div>
	);
}
