"use client";

import { useState, type ComponentType } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import {
	Radio,
	Timer,
	Map,
	CloudSun,
	LineChart,
	ListOrdered,
	GitCompare,
	Archive,
	Trophy,
	Calendar,
	Settings,
	HelpCircle,
	Home,
	PanelLeft,
	PanelLeftClose,
} from "lucide-react";

import { newUiNavigation, isNavItemActive } from "@/components/new-ui/shell/navigation";

type IconType = ComponentType<{ size?: number; "aria-hidden"?: boolean }>;

const ROUTE_META: Record<string, { label: string; icon: IconType }> = {
	"/dashboard": { label: "Live", icon: Radio },
	"/dashboard/qualifying": { label: "Qualifying", icon: Timer },
	"/dashboard/track-map": { label: "Track map", icon: Map },
	"/dashboard/weather": { label: "Weather", icon: CloudSun },
	"/dashboard/analysis": { label: "Analysis", icon: LineChart },
	"/dashboard/standings": { label: "Standings", icon: ListOrdered },
	"/h2h": { label: "Head to head", icon: GitCompare },
	"/archive": { label: "Archive", icon: Archive },
	"/results": { label: "Results", icon: Trophy },
	"/schedule": { label: "Schedule", icon: Calendar },
	"/dashboard/settings": { label: "Settings", icon: Settings },
	"/help": { label: "Help", icon: HelpCircle },
	"/": { label: "Home", icon: Home },
};

export default function NewUiSidebar() {
	const pathname = usePathname() ?? "";
	const [collapsed, setCollapsed] = useState(false);

	return (
		<nav
			aria-label="Primary"
			className={clsx("new-ui-sidebar", collapsed && "new-ui-sidebar--collapsed")}
			data-collapsed={collapsed}
		>
			<button
				type="button"
				className="new-ui-sidebar__collapse"
				aria-expanded={!collapsed}
				aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
				onClick={() => setCollapsed((value) => !value)}
			>
				{collapsed ? <PanelLeft size={18} aria-hidden /> : <PanelLeftClose size={18} aria-hidden />}
			</button>

			{newUiNavigation.map((group) => (
				<div key={group.label} className="new-ui-sidebar__group">
					<p className="new-ui-sidebar__group-label">{group.label}</p>
					<ul className="new-ui-sidebar__items">
						{group.items.map((item) => {
							const meta = ROUTE_META[item] ?? { label: item, icon: Home };
							const Icon = meta.icon;
							const active = isNavItemActive(item, pathname);
							return (
								<li key={item}>
									<Link
										href={item}
										aria-current={active ? "page" : undefined}
										className="new-ui-sidebar__link"
										data-active={active}
										title={meta.label}
									>
										<Icon size={18} aria-hidden />
										<span className="new-ui-sidebar__link-label">{meta.label}</span>
									</Link>
								</li>
							);
						})}
					</ul>
				</div>
			))}
		</nav>
	);
}
