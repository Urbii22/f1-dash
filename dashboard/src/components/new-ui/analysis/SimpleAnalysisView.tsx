"use client";

import PositionChart from "@/components/analysis/PositionChart";
import RacePaceChart from "@/components/analysis/RacePaceChart";
import StintTimeline from "@/components/analysis/StintTimeline";
import ChartFrame from "@/components/new-ui/charts/ChartFrame";
import InsightSummary from "@/components/new-ui/routes/InsightSummary";
import RouteHeader from "@/components/new-ui/routes/RouteHeader";
import { useAnalysisPresentationData } from "@/components/new-ui/analysis/useAnalysisPresentationData";

export default function SimpleAnalysisView() {
	const data = useAnalysisPresentationData();
	const insights = data.conclusions.map((item) => ({ ...item, value: `${item.value} | ${item.metric}` }));

	return (
		<div className="new-ui-route-scroll flex h-full min-h-0 flex-col gap-4 overflow-y-auto p-4">
			<RouteHeader eyebrow={data.meetingName ?? "Current session"} title="Session analysis" description="The clearest pace, tyre, and position conclusions from the recorded sample." />
			<InsightSummary insights={insights} />
			<div className="grid gap-3 2xl:grid-cols-2">
				<ChartFrame title="Race pace" unit="lap time" summary="Clean lap-time trend for the selected drivers; lower values indicate stronger pace.">
					<RacePaceChart selected={data.selected} laps={data.laps} drivers={data.drivers} />
				</ChartFrame>
				<ChartFrame title="Tyre and stint picture" unit="compound and laps" summary="Stint lengths and measured degradation, with no projected values.">
					<StintTimeline stints={data.stints} laps={data.laps} drivers={data.drivers} />
				</ChartFrame>
				<ChartFrame title="Position changes" unit="race position" summary="Recorded position movement across completed laps.">
					<PositionChart selected={data.selected} laps={data.laps} drivers={data.drivers} />
				</ChartFrame>
			</div>
		</div>
	);
}
