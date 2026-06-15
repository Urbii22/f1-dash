import type { ReactNode } from "react";

import ViewState from "@/components/new-ui/primitives/ViewState";

type ChartFrameProps = {
	title: string;
	unit: string;
	summary: string;
	legend?: ReactNode;
	state?: "ready" | "loading" | "empty";
	children?: ReactNode;
};

export default function ChartFrame({ title, unit, summary, legend, state = "ready", children }: ChartFrameProps) {
	return (
		<section className="new-ui-panel flex min-h-0 flex-col" aria-label={title}>
			<header className="new-ui-panel__header">
				<div className="new-ui-panel__heading">
					<p className="new-ui-panel__eyebrow">{unit}</p>
					<h2 className="new-ui-panel__title">{title}</h2>
				</div>
				{legend ? <div className="text-xs text-[var(--ui-muted)]">{legend}</div> : null}
			</header>
			<div className="new-ui-panel__body min-h-0 flex-1">
				<p className="mb-3 text-xs leading-5 text-[var(--ui-muted)]">{summary}</p>
				{state === "loading" ? <ViewState state="loading" title="Loading chart" /> : null}
				{state === "empty" ? <ViewState state="empty" title="No chart data" /> : null}
				{state === "ready" ? children : null}
			</div>
		</section>
	);
}
