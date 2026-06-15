export type Insight = {
	id: string;
	label: string;
	value: string;
	explanation: string;
	tone: "neutral" | "positive" | "warning" | "critical";
};

export default function InsightSummary({ insights, title = "Key insights" }: { insights: Insight[]; title?: string }) {
	const visibleInsights = insights.slice(0, 4);

	return (
		<section aria-labelledby="new-ui-insight-summary-title">
			<h2 id="new-ui-insight-summary-title" className="mb-3 text-sm font-semibold text-[var(--ui-text)]">
				{title}
			</h2>
			<ol className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-4">
				{visibleInsights.map((insight) => (
					<li
						key={insight.id}
						data-insight-id={insight.id}
						data-tone={insight.tone}
						className="rounded-lg border border-[var(--ui-border)] bg-[var(--ui-surface)] p-3"
					>
						<p className="text-[0.68rem] font-semibold tracking-wide text-[var(--ui-subtle)] uppercase">{insight.label}</p>
						<p className="mt-1 text-lg font-bold text-[var(--ui-text)]">{insight.value}</p>
						<p className="mt-1 text-xs leading-5 text-[var(--ui-muted)]">{insight.explanation}</p>
					</li>
				))}
			</ol>
		</section>
	);
}
