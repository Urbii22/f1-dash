"use client";

import clsx from "clsx";
import { motion, useReducedMotion } from "motion/react";

import type { CompactTimingRowModel } from "@/lib/view-models/liveTiming";

export type CompactTimingRowProps = {
	row: CompactTimingRowModel;
	selected: boolean;
	onSelect: (driverNumber: string) => void;
};

const STATUS_LABEL: Record<CompactTimingRowModel["status"], string> = {
	running: "On track",
	pit: "In pit",
	"pit-out": "Pit out",
	retired: "Retired",
	stopped: "Stopped",
};

const STATUS_TONE: Record<CompactTimingRowModel["status"], string> = {
	running: "text-[var(--ui-muted)]",
	pit: "text-sky-300",
	"pit-out": "text-sky-200",
	retired: "text-zinc-500",
	stopped: "text-rose-400",
};

const TREND_LABEL: Record<NonNullable<CompactTimingRowModel["trend"]>, string> = {
	closing: "Closing",
	stable: "Holding",
	"falling-back": "Dropping",
};

const TREND_SYMBOL: Record<NonNullable<CompactTimingRowModel["trend"]>, string> = {
	closing: "▲",
	stable: "→",
	"falling-back": "▼",
};

function PositionChange({ change }: { change: number | null }) {
	if (change === null || change === 0) return null;
	const gained = change > 0;
	return (
		<span
			className={clsx("ml-1 text-[0.6rem] font-bold", gained ? "text-emerald-400" : "text-rose-400")}
			aria-label={gained ? `Gained ${change}` : `Lost ${Math.abs(change)}`}
		>
			{gained ? "▲" : "▼"}
			{Math.abs(change)}
		</span>
	);
}

export default function CompactTimingRow({ row, selected, onSelect }: CompactTimingRowProps) {
	const reduced = useReducedMotion();

	const accessibleName = [
		row.position !== null ? `Position ${row.position}` : "No position",
		row.code,
		row.fullName,
		STATUS_LABEL[row.status],
	].join(", ");

	return (
		<motion.div
			layout={reduced ? false : "position"}
			role="button"
			tabIndex={0}
			aria-selected={selected}
			aria-label={accessibleName}
			onClick={() => onSelect(row.driverNumber)}
			onKeyDown={(event) => {
				if (event.key === "Enter" || event.key === " ") {
					event.preventDefault();
					onSelect(row.driverNumber);
				}
			}}
			className={clsx(
				"grid cursor-pointer items-center gap-2 rounded-md py-1.5 pr-2 outline-none transition-colors",
				"grid-cols-[3rem_minmax(8rem,1.2fr)_5.5rem_6.5rem_5rem]",
				"hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-[var(--ui-focus)]",
				selected ? "bg-white/10" : "bg-transparent",
			)}
		>
			{/* identity bar uses team colour to identify the driver, not as a fill */}
			<div className="flex items-center">
				<span className="mr-2 h-6 w-1 rounded-full" style={{ backgroundColor: row.teamColor }} aria-hidden="true" />
				<span className="new-ui-number text-lg font-bold tabular-nums">
					{row.position ?? "-"}
				</span>
				<PositionChange change={row.positionChange} />
			</div>

			<div className="flex min-w-0 items-center gap-2">
				<span
					className="h-2 w-2 shrink-0 rounded-full"
					style={{ backgroundColor: row.teamColor }}
					aria-hidden="true"
				/>
				<span className="font-semibold">{row.code}</span>
				<span className="truncate text-xs text-[var(--ui-muted)]">{row.fullName}</span>
			</div>

			<div className="new-ui-number text-sm tabular-nums">
				{row.compound ? (
					<span>
						<span className="font-semibold">{row.compound.slice(0, 1)}</span>
						<span className="ml-1 text-[var(--ui-muted)]">{row.tyreAge !== null ? `${row.tyreAge}L` : "-"}</span>
					</span>
				) : (
					<span className="text-[var(--ui-subtle)]">-</span>
				)}
			</div>

			<div className="new-ui-number flex flex-col text-right tabular-nums">
				<span className="text-sm font-semibold">{row.primaryGap}</span>
				{row.trend ? (
					<span className="text-[0.65rem] text-[var(--ui-muted)]">
						<span aria-hidden="true">{TREND_SYMBOL[row.trend]}</span> {TREND_LABEL[row.trend]}
						{row.secondaryGap ? ` ${row.secondaryGap}` : ""}
					</span>
				) : row.secondaryGap ? (
					<span className="text-[0.65rem] text-[var(--ui-muted)]">{row.secondaryGap}</span>
				) : null}
			</div>

			<div className={clsx("text-right text-xs font-medium", STATUS_TONE[row.status])}>
				{STATUS_LABEL[row.status]}
			</div>
		</motion.div>
	);
}
