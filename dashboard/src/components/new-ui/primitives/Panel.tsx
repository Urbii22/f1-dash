"use client";

import { useId, type ReactNode } from "react";
import clsx from "clsx";

export type PanelProps = {
	title: string;
	eyebrow?: string;
	action?: ReactNode;
	level?: "primary" | "secondary" | "contextual";
	children: ReactNode;
	className?: string;
};

export default function Panel({ title, eyebrow, action, level = "secondary", children, className }: PanelProps) {
	const titleId = useId();

	return (
		<section
			aria-labelledby={titleId}
			data-level={level}
			className={clsx("new-ui-panel", className)}
		>
			<header className="new-ui-panel__header">
				<div className="new-ui-panel__heading">
					{eyebrow ? <p className="new-ui-panel__eyebrow">{eyebrow}</p> : null}
					<h2 id={titleId} className="new-ui-panel__title">
						{title}
					</h2>
				</div>
				{action ? <div className="new-ui-panel__action">{action}</div> : null}
			</header>
			<div className="new-ui-panel__body">{children}</div>
		</section>
	);
}
