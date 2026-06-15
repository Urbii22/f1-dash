"use client";

import clsx from "clsx";
import type { KeyboardEvent, PointerEvent } from "react";

export type WorkspaceSplitterProps = {
	label: string;
	orientation: "horizontal" | "vertical";
	value: number;
	min: number;
	max: number;
	onChange: (value: number) => void;
	className?: string;
};

function clamp(value: number, min: number, max: number): number {
	if (value < min) return min;
	if (value > max) return max;
	return value;
}

// Accessible resize handle. A "vertical" orientation splits left/right columns
// (the handle is a vertical line you drag horizontally); "horizontal" splits
// top/bottom rows. Keyboard and pointer both report a clamped percentage so the
// owning workspace can persist it.
export default function WorkspaceSplitter({
	label,
	orientation,
	value,
	min,
	max,
	onChange,
	className,
}: WorkspaceSplitterProps) {
	const isVertical = orientation === "vertical";

	const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
		const step = event.shiftKey ? 5 : 1;
		const decreaseKey = isVertical ? "ArrowLeft" : "ArrowUp";
		const increaseKey = isVertical ? "ArrowRight" : "ArrowDown";

		switch (event.key) {
			case decreaseKey:
				event.preventDefault();
				onChange(clamp(value - step, min, max));
				break;
			case increaseKey:
				event.preventDefault();
				onChange(clamp(value + step, min, max));
				break;
			case "Home":
				event.preventDefault();
				onChange(min);
				break;
			case "End":
				event.preventDefault();
				onChange(max);
				break;
			default:
				break;
		}
	};

	const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
		event.currentTarget.setPointerCapture(event.pointerId);
	};

	const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
		if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
		const parent = event.currentTarget.parentElement;
		if (!parent) return;
		const bounds = parent.getBoundingClientRect();
		const ratio = isVertical
			? (event.clientX - bounds.left) / bounds.width
			: (event.clientY - bounds.top) / bounds.height;
		if (!Number.isFinite(ratio)) return;
		onChange(clamp(Math.round(ratio * 100), min, max));
	};

	const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
		event.currentTarget.releasePointerCapture(event.pointerId);
	};

	return (
		<div
			role="separator"
			aria-label={label}
			aria-orientation={orientation}
			aria-valuenow={Math.round(value)}
			aria-valuemin={min}
			aria-valuemax={max}
			tabIndex={0}
			onKeyDown={handleKeyDown}
			onPointerDown={handlePointerDown}
			onPointerMove={handlePointerMove}
			onPointerUp={handlePointerUp}
			className={clsx(
				"group relative z-10 flex shrink-0 touch-none items-center justify-center",
				"outline-none focus-visible:ring-2 focus-visible:ring-[var(--ui-accent)]",
				isVertical ? "w-3 cursor-col-resize" : "h-3 cursor-row-resize",
				className,
			)}
		>
			<span
				aria-hidden
				className={clsx(
					"rounded-full bg-[var(--ui-border)] transition-colors",
					"group-hover:bg-[var(--ui-accent)] group-focus-visible:bg-[var(--ui-accent)]",
					isVertical ? "h-full w-0.5" : "h-0.5 w-full",
				)}
			/>
		</div>
	);
}
