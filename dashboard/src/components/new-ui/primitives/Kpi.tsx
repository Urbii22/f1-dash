"use client";

import type { ReactNode } from "react";
import clsx from "clsx";

export type KpiTrend = "up" | "down" | "flat";

export type KpiProps = {
	label: string;
	value: ReactNode;
	unit?: string;
	context?: string;
	trend?: KpiTrend;
	className?: string;
};

const trendSymbol: Record<KpiTrend, string> = {
	up: "▲",
	down: "▼",
	flat: "→",
};

export default function Kpi({ label, value, unit, context, trend, className }: KpiProps) {
	return (
		<div className={clsx("new-ui-kpi", className)}>
			<p className="new-ui-kpi__label">{label}</p>
			<p className="new-ui-kpi__value new-ui-number">
				<span className="new-ui-kpi__number">{value}</span>
				{unit ? <span className="new-ui-kpi__unit">{unit}</span> : null}
			</p>
			{(context || trend) && (
				<p className="new-ui-kpi__context">
					{trend ? (
						<span className="new-ui-kpi__trend" data-trend={trend} aria-hidden="true">
							{trendSymbol[trend]}
						</span>
					) : null}
					{context ? <span>{context}</span> : null}
				</p>
			)}
		</div>
	);
}
