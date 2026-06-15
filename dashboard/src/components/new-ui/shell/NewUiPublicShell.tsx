"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

import NewUiSidebar from "@/components/new-ui/shell/NewUiSidebar";
import DensityToggle from "@/components/new-ui/DensityToggle";
import { isNavItemActive } from "@/components/new-ui/shell/navigation";

const TOP_NAV = [
	{ href: "/", label: "Home" },
	{ href: "/dashboard", label: "Live" },
	{ href: "/schedule", label: "Schedule" },
	{ href: "/results", label: "Results" },
	{ href: "/help", label: "Help" },
] as const;

export default function NewUiPublicShell({ children }: { children: ReactNode }) {
	const pathname = usePathname() ?? "";

	return (
		<div className="new-ui-app-shell new-ui-app-shell--public">
			{/* Desktop: shared sidebar. Hidden under 1024px via CSS. */}
			<div className="new-ui-app-shell__sidebar">
				<NewUiSidebar />
			</div>

			<div className="new-ui-workspace">
				{/* Compact top nav for narrow viewports (<1024px). */}
				<nav aria-label="Primary" className="new-ui-top-nav">
					<ul className="new-ui-top-nav__items">
						{TOP_NAV.map((item) => {
							const active = isNavItemActive(item.href, pathname);
							return (
								<li key={item.href}>
									<Link
										href={item.href}
										aria-current={active ? "page" : undefined}
										className={clsx("new-ui-top-nav__link")}
										data-active={active}
									>
										{item.label}
									</Link>
								</li>
							);
						})}
					</ul>
					<DensityToggle className="new-ui-top-nav__density" />
				</nav>

				<div className="new-ui-workspace__bar new-ui-workspace__bar--public">
					<DensityToggle className="new-ui-workspace__density" />
				</div>

				<main className="new-ui-workspace__main">{children}</main>
			</div>
		</div>
	);
}
