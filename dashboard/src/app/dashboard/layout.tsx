"use client";

import { type ReactNode, useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import { usePathname } from "next/navigation";

import { useDataEngine } from "@/hooks/useDataEngine";
import { useWakeLock } from "@/hooks/useWakeLock";
import { useStores } from "@/hooks/useStores";
import { useSocket } from "@/hooks/useSocket";
import { useConnectionStore } from "@/stores/useConnectionStore";

import { useSettingsStore } from "@/stores/useSettingsStore";
import { useSidebarStore } from "@/stores/useSidebarStore";
import { useDataStore } from "@/stores/useDataStore";

import Sidebar from "@/components/Sidebar";
import SidenavButton from "@/components/SidenavButton";
import SessionInfo from "@/components/SessionInfo";
import WeatherInfo from "@/components/WeatherInfo";
import TrackInfo from "@/components/TrackInfo";
import DelayInput from "@/components/DelayInput";
import DelayTimer from "@/components/DelayTimer";
import ConnectionStatus from "@/components/ConnectionStatus";
import ReplayControlBar from "@/components/dashboard/ReplayControlBar";
import AlertToasts from "@/components/dashboard/AlertToasts";

import UiModeBoundary from "@/components/new-ui/UiModeBoundary";
import NewUiCompatibilityBoundary from "@/components/new-ui/NewUiCompatibilityBoundary";
import NewUiDashboardShell from "@/components/new-ui/shell/NewUiDashboardShell";

type Props = {
	children: ReactNode;
};

const newUiNativeRoutes = new Set(["/dashboard", "/dashboard/qualifying", "/dashboard/analysis", "/dashboard/standings", "/dashboard/weather"]);

export default function DashboardLayout({ children }: Props) {
	const pathname = usePathname();
	const stores = useStores();
	const { handleInitial, handleUpdate, maxDelay } = useDataEngine(stores);
	const { connected } = useSocket({ handleInitial, handleUpdate });
	const setConnected = useConnectionStore((s) => s.setConnected);
	useEffect(() => {
		setConnected(connected);
	}, [connected, setConnected]);

	const delay = useSettingsStore((state) => state.delay);
	const syncing = delay > maxDelay;

	useWakeLock();

	const hasSession = useDataStore(({ state }) => state?.SessionInfo != null);
	const ended = useDataStore(({ state }) => state?.SessionStatus?.Status === "Ends");
	const newUiContent =
		newUiNativeRoutes.has(pathname) ? children : <NewUiCompatibilityBoundary routeName="Dashboard">{children}</NewUiCompatibilityBoundary>;

	// Live runtime (data engine, socket, wake lock, store setup) stays above the
	// branch so Legacy and New UI share one connection. Only presentation switches.
	return (
		<UiModeBoundary
			legacy={
				<LegacyDashboardShell
					connected={connected}
					syncing={syncing}
					ended={ended}
					hasSession={hasSession}
					delay={delay}
					maxDelay={maxDelay}
				>
					{children}
				</LegacyDashboardShell>
			}
			simple={
				<NewUiDashboardShell>
					{newUiContent}
				</NewUiDashboardShell>
			}
			detailed={
				<NewUiDashboardShell>
					{newUiContent}
				</NewUiDashboardShell>
			}
		/>
	);
}

function LegacyDashboardShell({
	children,
	connected,
	syncing,
	ended,
	hasSession,
	delay,
	maxDelay,
}: {
	children: ReactNode;
	connected: boolean;
	syncing: boolean;
	ended: boolean;
	hasSession: boolean;
	delay: number;
	maxDelay: number;
}) {
	return (
		<div className="relative flex h-screen w-full overflow-hidden p-2 md:gap-2">
			<div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),transparent_16%,transparent_84%,rgba(0,229,255,0.06))]" />
			<div className="pointer-events-none absolute top-0 left-0 h-px w-full bg-gradient-to-r from-cyan-300/0 via-cyan-300/70 to-rose-400/0" />
			<Sidebar key="sidebar" connected={connected} />
			<AlertToasts />

			<motion.div layout="size" className="relative flex h-full min-w-0 flex-1 flex-col gap-2">
				<DesktopStaticBar show={!syncing || ended} />
				<MobileStaticBar show={!syncing || ended} connected={connected} />
				{hasSession && <ReplayControlBar />}

				<div
					className={
						!syncing || ended
							? "telemetry-panel tech-scrollbar w-full flex-1 overflow-auto rounded-lg border-cyan-300/10"
							: "hidden"
					}
				>
					<MobileDynamicBar />
					{children}
				</div>

				<div
					className={
						syncing && !ended
							? "telemetry-panel flex h-full flex-1 flex-col items-center justify-center gap-2 rounded-lg p-8 text-center"
							: "hidden"
					}
				>
					<p className="panel-title">Replay buffer</p>
					<h1 className="text-5xl font-black tracking-tight text-cyan-100">Syncing telemetry</h1>
					<p className="text-zinc-400">Please wait for {delay - maxDelay} seconds.</p>
					<p className="text-zinc-500">Or make your delay smaller.</p>
				</div>
			</motion.div>
		</div>
	);
}

function MobileDynamicBar() {
	return (
		<div className="flex flex-col divide-y divide-cyan-300/10 border-b border-cyan-300/10 bg-black/30 md:hidden">
			<div className="p-2">
				<SessionInfo />
			</div>
			<div className="p-2">
				<WeatherInfo />
			</div>
		</div>
	);
}

function MobileStaticBar({ show, connected }: { show: boolean; connected: boolean }) {
	const open = useSidebarStore((state) => state.open);

	return (
		<div className="telemetry-panel flex w-full items-center justify-between overflow-hidden rounded-lg p-2 md:hidden">
			<div className="flex items-center gap-2">
				<SidenavButton key="mobile" onClick={() => open()} />

				<DelayInput saveDelay={500} />
				<DelayTimer />

				<ConnectionStatus connected={connected} />
			</div>

			{show && <TrackInfo />}
		</div>
	);
}

function DesktopStaticBar({ show }: { show: boolean }) {
	const pinned = useSidebarStore((state) => state.pinned);
	const pin = useSidebarStore((state) => state.pin);

	return (
		<div className="telemetry-panel hidden w-full flex-row justify-between overflow-hidden rounded-lg p-2 md:flex">
			<div className="flex items-center gap-2">
				<AnimatePresence>
					{!pinned && <SidenavButton key="desktop" className="shrink-0" onClick={() => pin()} />}

					<motion.div key="session-info" layout="position">
						<SessionInfo />
					</motion.div>
				</AnimatePresence>
			</div>

			<div className="hidden md:items-center lg:flex">{show && <WeatherInfo />}</div>

			<div className="flex justify-end">{show && <TrackInfo />}</div>
		</div>
	);
}
