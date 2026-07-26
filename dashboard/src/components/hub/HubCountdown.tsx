"use client";

import { useCountdown } from "@/hooks/useCountdown";

export default function HubCountdown({ target, variant = "legacy" }: { target: string; variant?: "legacy" | "new" }) {
	const values = useCountdown(target);
	const labels = ["days", "hours", "min", "sec"];
	return (
		<div className="flex flex-wrap gap-3">
			{values.map((value, index) => (
				<div
					key={labels[index]}
					className={
						variant === "new"
							? "min-w-16 rounded-md border border-[var(--ui-border)] bg-[var(--ui-surface-2)] p-2 text-center"
							: "data-chip min-w-16 rounded-md p-2 text-center"
					}
				>
					<p className={variant === "new" ? "new-ui-number text-2xl font-black text-[var(--ui-accent)]" : "font-mono text-2xl font-black text-cyan-200"}>
						{value == null ? "--" : String(value).padStart(2, "0")}
					</p>
					<p className={variant === "new" ? "text-[0.65rem] uppercase text-[var(--ui-muted)]" : "text-[0.65rem] text-zinc-500 uppercase"}>
						{labels[index]}
					</p>
				</div>
			))}
		</div>
	);
}
