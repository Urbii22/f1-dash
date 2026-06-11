"use client";

import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { useEffect } from "react";
import Link from "next/link";
import clsx from "clsx";

import { useSidebarStore } from "@/stores/useSidebarStore";
import { useSettingsStore } from "@/stores/useSettingsStore";

import ConnectionStatus from "@/components/ConnectionStatus";
import DelayInput from "@/components/DelayInput";
import SidenavButton from "@/components/SidenavButton";
import DelayTimer from "@/components/DelayTimer";

const liveTimingItems = [
	{
		href: "/dashboard",
		name: "Dashboard",
	},
	{
		href: "/dashboard/track-map",
		name: "Track Map",
	},
	{
		href: "/dashboard/standings",
		name: "Standings",
	},
	{
		href: "/dashboard/analysis",
		name: "Analysis",
	},
	{
		href: "/dashboard/weather",
		name: "Weather",
	},
];

type Props = {
	connected: boolean;
};

export default function Sidebar({ connected }: Props) {
	// const favoriteDrivers = useSettingsStore((state) => state.favoriteDrivers);
	// const drivers = useDataStore((state) => state.driverList);

	// const driverItems = drivers
	// 	? favoriteDrivers.map((nr) => ({
	// 			href: `/dashboard/driver/${nr}`,
	// 			name: drivers[nr].fullName,
	// 		}))
	// 	: null;

	const { opened, pinned } = useSidebarStore();
	const close = useSidebarStore((state) => state.close);
	const open = useSidebarStore((state) => state.open);

	const pin = useSidebarStore((state) => state.pin);
	const unpin = useSidebarStore((state) => state.unpin);

	const oledMode = useSettingsStore((state) => state.oledMode);

	useEffect(() => {
		const handleResize = () => {
			if (window.innerWidth < 768) {
				unpin();
			}
		};

		window.addEventListener("resize", handleResize);
		handleResize();

		return () => window.removeEventListener("resize", handleResize, false);
	}, [unpin]);

	return (
		<div>
			<motion.div className="hidden md:block" style={{ width: 236 }} animate={{ width: pinned ? 236 : 8 }} />

			<AnimatePresence>
				{opened && (
					<motion.div
						onTouchEnd={() => close()}
						className="fixed top-0 right-0 bottom-0 left-0 z-30 bg-black/50 backdrop-blur-md md:hidden"
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
					/>
				)}
			</AnimatePresence>

			<motion.div
				className="no-scrollbar fixed top-0 bottom-0 left-0 z-40 flex overflow-y-auto"
				//
				onHoverEnd={!pinned ? () => close() : undefined}
				onHoverStart={!pinned ? () => open() : undefined}
				//
				animate={{ left: pinned || opened ? 0 : -236 }}
				transition={{ type: "spring", bounce: 0.1 }}
			>
				<nav
					className={clsx("telemetry-panel m-2 flex w-56 flex-col gap-3 rounded-lg p-3", {
						"bg-black": oledMode,
						"bg-zinc-950/90": !oledMode,
					})}
				>
					<div className="flex items-center justify-between gap-2 border-b border-cyan-300/10 pb-3">
						<div className="flex items-center gap-2">
							<DelayInput saveDelay={500} />
							<DelayTimer />

							<ConnectionStatus connected={connected} />
						</div>

						<SidenavButton className="hidden md:flex" onClick={() => (pinned ? unpin() : pin())} />
						<SidenavButton className="md:hidden" onClick={() => close()} />
					</div>

					<div>
						<p className="text-[0.65rem] font-bold tracking-[0.22em] text-cyan-300 uppercase">F1 Command</p>
						<p className="font-mono text-xs text-zinc-500">Live telemetry suite</p>
					</div>

					<div className="flex flex-col gap-1">
						{liveTimingItems.map((item) => (
							<Item key={item.href} item={item} />
						))}
					</div>

					{/* <p className="mt-4 p-2 text-sm text-zinc-500">Favorite Drivers</p>

					<div className="flex flex-col gap-1">
						{driverItems === null && (
							<>
								<div className="h-8 animate-pulse rounded-lg bg-zinc-800" />
								<div className="h-8 animate-pulse rounded-lg bg-zinc-800" />
							</>
						)}
						{driverItems !== null && driverItems.length === 0 && <div className="p-2">No favorites</div>}
						{driverItems?.map((item) => <Item key={item.href} item={item} />)}
					</div> */}

					<p className="mt-2 border-t border-cyan-300/10 pt-3 font-mono text-xs text-zinc-500 uppercase">General</p>

					<div className="flex flex-col gap-1">
						<Item item={{ href: "/dashboard/settings", name: "Settings" }} />

						<Item target="_blank" item={{ href: "/schedule", name: "Schedule" }} />
						<Item target="_blank" item={{ href: "/help", name: "Help" }} />
						<Item target="_blank" item={{ href: "/", name: "Home" }} />
					</div>

					<p className="mt-2 border-t border-cyan-300/10 pt-3 font-mono text-xs text-zinc-500 uppercase">Project</p>

					<div className="flex flex-col gap-1">
						<Item target="_blank" item={{ href: "https://github.com/slowlydev/f1-dash", name: "Source" }} />
						<Item target="_blank" item={{ href: "https://discord.gg/unJwu66NuB", name: "Community" }} />
					</div>
				</nav>
			</motion.div>
		</div>
	);
}

type ItemProps = {
	target?: string;
	item: { href: string; name: string };
};

const Item = ({ target, item }: ItemProps) => {
	const active = usePathname() === item.href;

	return (
		<Link href={item.href} target={target}>
			<div
				className={clsx(
					"data-chip rounded-md px-3 py-2 text-sm text-zinc-300 transition hover:border-cyan-300/40 hover:bg-cyan-300/10 hover:text-white",
					{
						"border-cyan-300/60! bg-cyan-300/15! text-cyan-100 shadow-[0_0_24px_rgba(0,229,255,0.12)]": active,
					},
				)}
			>
				<span className="font-mono text-[0.68rem] text-cyan-300/70">/</span> {item.name}
			</div>
		</Link>
	);
};
