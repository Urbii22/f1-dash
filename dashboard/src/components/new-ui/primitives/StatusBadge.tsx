"use client";

import type { ReactNode } from "react";
import clsx from "clsx";

export type StatusTone = "neutral" | "green" | "yellow" | "red" | "blue";

export type StatusBadgeProps = {
	tone: StatusTone;
	label: string;
	icon?: ReactNode;
	className?: string;
};

export default function StatusBadge({ tone, label, icon, className }: StatusBadgeProps) {
	return (
		<span className={clsx("new-ui-status-badge", className)} data-tone={tone}>
			{icon ? (
				<span className="new-ui-status-badge__icon" aria-hidden="true">
					{icon}
				</span>
			) : null}
			<span className="new-ui-status-badge__label">{label}</span>
		</span>
	);
}
