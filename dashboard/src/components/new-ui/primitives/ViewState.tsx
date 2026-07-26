"use client";

import type { ReactNode } from "react";

export type ViewStateKind = "loading" | "empty" | "unavailable" | "error";

export type ViewStateProps = {
	state: ViewStateKind;
	title: string;
	description?: string;
	action?: ReactNode;
};

export default function ViewState({ state, title, description, action }: ViewStateProps) {
	return (
		<div
			className="new-ui-view-state"
			data-state={state}
			role={state === "error" ? "alert" : "status"}
			aria-busy={state === "loading"}
		>
			<p className="new-ui-view-state__title">{title}</p>
			{description ? <p className="new-ui-view-state__description">{description}</p> : null}
			{action ? <div className="new-ui-view-state__action">{action}</div> : null}
		</div>
	);
}
