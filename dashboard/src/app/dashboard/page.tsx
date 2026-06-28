"use client";

import { useRef, useState } from "react";

import LeaderBoard from "@/components/dashboard/LeaderBoard";
import DriverComparisonPanel from "@/components/dashboard/DriverComparisonPanel";
import RaceControl from "@/components/dashboard/RaceControl";
import PresentationMode from "@/components/dashboard/PresentationMode";
import SmartAlerts from "@/components/dashboard/SmartAlerts";
import StrategyPanel from "@/components/dashboard/StrategyPanel";
import TeamRadios from "@/components/dashboard/TeamRadios";
import TrackViolations from "@/components/dashboard/TrackViolations";
import Map from "@/components/dashboard/Map";
import Footer from "@/components/Footer";
import NoLiveSession from "@/components/dashboard/NoLiveSession";
import { usePresentationModeStore } from "@/stores/usePresentationModeStore";
import { useConnectionStore } from "@/stores/useConnectionStore";
import { useDataStore } from "@/stores/useDataStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { dashboardSplitBounds, dashboardSplitFromPointer } from "@/lib/dashboardSplit";

export default function DashboardPage() {
	return <LegacyDashboardPage />;
}

export function LegacyDashboardPage() {
	const presentationMode = usePresentationModeStore((state) => state.enabled);
	const setPresentationMode = usePresentationModeStore((state) => state.setEnabled);
	const hasSession = useDataStore(({ state }) => state?.SessionInfo != null);
	const connected = useConnectionStore((s) => s.connected);
	const [dashboardPreview, setDashboardPreview] = useState(false);
	const showDashboard = hasSession || dashboardPreview;

	return (
		<div className="flex w-full flex-col gap-3 p-3">
			{hasSession && (
				<div className="flex justify-end">
					<button
						className="data-chip rounded-md px-3 py-2 text-sm text-cyan-200"
						onClick={() => setPresentationMode(!presentationMode)}
					>
						{presentationMode ? "Dashboard" : "Presentation"}
					</button>
				</div>
			)}
			{showDashboard ? (
				<>
					{!hasSession && <OfflineDashboardNotice onExit={() => setDashboardPreview(false)} />}
					{hasSession && presentationMode ? (
					<PresentationMode />
				) : (
					<RegularDashboard />
					)}
				</>
			) : connected ? (
				<NoLiveSession onOpenDashboard={() => setDashboardPreview(true)} />
			) : (
				<ConnectingState />
			)}
			<Footer />
		</div>
	);
}

function OfflineDashboardNotice({ onExit }: { onExit: () => void }) {
	return (
		<div className="telemetry-panel flex flex-wrap items-center justify-between gap-3 rounded-lg border-amber-300/30 bg-amber-300/8 px-4 py-3">
			<div>
				<p className="font-mono text-xs font-black tracking-widest text-amber-200 uppercase">Offline dashboard</p>
				<p className="mt-1 text-sm text-zinc-300">No live telemetry is available. Panels may be empty until the next session starts.</p>
			</div>
			<button
				type="button"
				onClick={onExit}
				className="data-chip rounded-md px-3 py-2 text-sm font-semibold text-amber-100 hover:border-amber-300/50"
			>
				Back to countdown
			</button>
		</div>
	);
}

function ConnectingState() {
	return (
		<div className="flex min-h-[40vh] items-center justify-center">
			<div className="flex flex-col items-center gap-3 text-center">
				<div className="h-2 w-2 animate-pulse rounded-full bg-cyan-400" />
				<p className="panel-title">Connecting</p>
				<p className="text-sm text-zinc-500">Establishing live feed…</p>
			</div>
		</div>
	);
}

function RegularDashboard() {
	const dashboardPanelSplit = useSettingsStore((state) => state.dashboardPanelSplit);
	const setDashboardPanelSplit = useSettingsStore((state) => state.setDashboardPanelSplit);
	const splitContainerRef = useRef<HTMLElement>(null);

	const updateSplit = (pointerX: number) => {
		const bounds = splitContainerRef.current?.getBoundingClientRect();
		if (!bounds) return;
		setDashboardPanelSplit(
			dashboardSplitFromPointer({
				pointerX,
				containerLeft: bounds.left,
				containerWidth: bounds.width,
			}),
		);
	};

	return (
		<>
			<section
				ref={splitContainerRef}
				className="flex flex-col gap-3 2xl:grid 2xl:gap-0 2xl:items-stretch"
				style={{
					gridTemplateColumns: `minmax(0, ${dashboardPanelSplit}fr) 0.75rem minmax(0, ${100 - dashboardPanelSplit}fr)`,
				}}
			>
				<div className="telemetry-panel min-w-0 rounded-lg p-3">
					<PanelHeader eyebrow="Grid matrix" title="Live Classification" meta="Timing data" />
					<div className="tech-scrollbar mt-3 overflow-x-auto">
						<LeaderBoard />
					</div>
				</div>

				<div
					role="separator"
					aria-label="Resize dashboard panels"
					aria-orientation="vertical"
					aria-valuemin={dashboardSplitBounds.min}
					aria-valuemax={dashboardSplitBounds.max}
					aria-valuenow={Math.round(dashboardPanelSplit)}
					tabIndex={0}
					className="group hidden cursor-col-resize touch-none items-stretch justify-center 2xl:flex"
					onPointerDown={(event) => event.currentTarget.setPointerCapture(event.pointerId)}
					onPointerMove={(event) => {
						if (event.currentTarget.hasPointerCapture(event.pointerId)) updateSplit(event.clientX);
					}}
					onPointerUp={(event) => event.currentTarget.releasePointerCapture(event.pointerId)}
					onKeyDown={(event) => {
						const step = event.shiftKey ? 5 : 1;
						if (event.key === "ArrowLeft") {
							event.preventDefault();
							setDashboardPanelSplit(dashboardPanelSplit - step);
						}
						if (event.key === "ArrowRight") {
							event.preventDefault();
							setDashboardPanelSplit(dashboardPanelSplit + step);
						}
					}}
				>
					<div className="my-3 w-px rounded-full bg-cyan-300/20 transition-all group-hover:w-1 group-hover:bg-cyan-300/70 group-focus:w-1 group-focus:bg-cyan-300/70" />
				</div>

				<CircuitColumn />
			</section>

			<section>
				<DriverComparisonPanel />
			</section>

			<section className="grid grid-cols-1 gap-3 lg:grid-cols-2 2xl:grid-cols-4">
				<SmartAlerts />

				<StrategyPanel />

				<div className="telemetry-panel tech-scrollbar h-[30rem] overflow-y-auto rounded-lg p-3">
					<PanelHeader eyebrow="Comms" title="Team Radios" meta="Audio" />
					<TeamRadios />
				</div>
				<div className="telemetry-panel tech-scrollbar h-[30rem] overflow-y-auto rounded-lg p-3">
					<PanelHeader eyebrow="Limits" title="Track Alerts" meta="Drivers" />
					<TrackViolations />
				</div>
			</section>
		</>
	);
}

function CircuitColumn() {
	return (
		<div className="min-w-0 2xl:relative 2xl:min-h-0">
			<div className="flex min-w-0 flex-col gap-3 2xl:absolute 2xl:inset-0">
				<div className="telemetry-panel min-h-[34rem] rounded-lg p-3">
					<PanelHeader eyebrow="Circuit radar" title="Track Positioning" meta="Sector overlay" />
					<div className="relative mt-3 h-[32rem] overflow-hidden rounded-md border border-cyan-300/10 bg-black/30">
						<div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-cyan-300/10 to-transparent" />
						<Map />
					</div>
				</div>

				<div className="telemetry-panel flex min-h-0 flex-1 flex-col rounded-lg p-3">
					<PanelHeader eyebrow="FIA feed" title="Race Control" meta="Latest messages" />
					<div className="tech-scrollbar min-h-0 flex-1 overflow-y-auto pr-1">
						<RaceControl />
					</div>
				</div>
			</div>
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
