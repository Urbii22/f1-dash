"use client";

import type { ReactNode } from "react";

export type RouteHeaderProps = {
	eyebrow?: string;
	title: string;
	description?: string;
	status?: ReactNode;
	actions?: ReactNode;
};

export default function RouteHeader({ eyebrow, title, description, status, actions }: RouteHeaderProps) {
	return (
		<header className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--ui-border)] pb-4">
			<div className="min-w-0 max-w-3xl">
				{eyebrow ? <p className="text-xs font-semibold tracking-[0.16em] text-[var(--ui-subtle)] uppercase">{eyebrow}</p> : null}
				<h1 className="mt-1 text-2xl font-bold tracking-tight text-[var(--ui-text)]">{title}</h1>
				{description ? <p className="mt-1 text-sm text-[var(--ui-muted)]">{description}</p> : null}
				{status ? <div className="mt-3 text-sm text-[var(--ui-text)]">{status}</div> : null}
			</div>

			<div className="flex flex-wrap items-center justify-end gap-3">
				{actions}
			</div>
		</header>
	);
}
