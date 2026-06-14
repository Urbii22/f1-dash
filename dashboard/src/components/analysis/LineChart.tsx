"use client";

import { useMemo, useRef, useState } from "react";

export type ChartPoint = {
	x: number;
	y: number;
	clipped?: boolean;
};

export type ChartSeries = {
	id: string;
	label: string;
	color: string;
	points: ChartPoint[];
};

type Props = {
	series: ChartSeries[];
	yInverted?: boolean;
	yFormatter?: (value: number) => string;
	xFormatter?: (value: number) => string;
	yTickCount?: number;
	integerY?: boolean;
	// "line" connects points in x order; "scatter" plots independent points
	// (x is continuous, not a lap index) and skips the index-based hover tooltip
	variant?: "line" | "scatter";
};

const VIEW_W = 800;
const VIEW_H = 320;
const PAD = { left: 64, right: 16, top: 16, bottom: 32 };

const PLOT_W = VIEW_W - PAD.left - PAD.right;
const PLOT_H = VIEW_H - PAD.top - PAD.bottom;

function niceTicks(min: number, max: number, count: number, integer: boolean): number[] {
	if (!Number.isFinite(min) || !Number.isFinite(max) || min === max) return [min];
	const span = max - min;
	const rawStep = span / Math.max(1, count - 1);
	const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
	const candidates = [1, 2, 2.5, 5, 10].map((m) => m * magnitude);
	let step = candidates.find((c) => c >= rawStep) ?? candidates[candidates.length - 1];
	if (integer) step = Math.max(1, Math.round(step));

	const ticks: number[] = [];
	for (let tick = Math.ceil(min / step) * step; tick <= max + step * 0.001; tick += step) {
		ticks.push(Number(tick.toFixed(6)));
	}
	return ticks;
}

export default function LineChart({
	series,
	yInverted,
	yFormatter,
	xFormatter,
	yTickCount = 5,
	integerY,
	variant = "line",
}: Props) {
	const scatter = variant === "scatter";
	const containerRef = useRef<HTMLDivElement | null>(null);
	const [hoverX, setHoverX] = useState<number | null>(null);

	const visible = series.filter((s) => s.points.length > 0);

	const { xMin, xMax, yMin, yMax } = useMemo(() => {
		const xs = visible.flatMap((s) => s.points.map((p) => p.x));
		const ys = visible.flatMap((s) => s.points.map((p) => p.y));
		const xMin = Math.min(...xs);
		const xMax = Math.max(...xs);
		let yMin = Math.min(...ys);
		let yMax = Math.max(...ys);
		if (yMin === yMax) {
			yMin -= 1;
			yMax += 1;
		}
		const yPad = (yMax - yMin) * 0.06;
		return { xMin, xMax, yMin: yMin - yPad, yMax: yMax + yPad };
	}, [visible]);

	if (visible.length === 0) {
		return <p className="p-6 text-center text-sm text-zinc-500">No data to plot yet.</p>;
	}

	const toX = (x: number) => PAD.left + (xMax === xMin ? PLOT_W / 2 : ((x - xMin) / (xMax - xMin)) * PLOT_W);
	const toY = (y: number) => {
		const fraction = yMax === yMin ? 0.5 : (y - yMin) / (yMax - yMin);
		return yInverted ? PAD.top + fraction * PLOT_H : PAD.top + (1 - fraction) * PLOT_H;
	};

	const yTicks = niceTicks(yMin, yMax, yTickCount, !!integerY);
	const xTicks = scatter
		? niceTicks(xMin, xMax, 6, false)
		: niceTicks(xMin, xMax, Math.min(10, Math.floor(xMax - xMin) + 1), true);

	const hoveredX = hoverX !== null ? Math.round(xMin + ((hoverX - PAD.left) / PLOT_W) * (xMax - xMin)) : null;

	const hoverEntries =
		hoveredX !== null
			? visible
					.map((s) => {
						const point = s.points.find((p) => p.x === hoveredX);
						return point ? { label: s.label, color: s.color, point } : null;
					})
					.filter((entry): entry is NonNullable<typeof entry> => entry !== null)
			: [];

	const handleMove = (event: React.MouseEvent<SVGSVGElement>) => {
		const rect = event.currentTarget.getBoundingClientRect();
		const x = ((event.clientX - rect.left) / rect.width) * VIEW_W;
		setHoverX(x >= PAD.left && x <= VIEW_W - PAD.right ? x : null);
	};

	return (
		<div ref={containerRef} className="relative">
			<svg
				viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
				className="h-auto w-full select-none"
				onMouseMove={scatter ? undefined : handleMove}
				onMouseLeave={scatter ? undefined : () => setHoverX(null)}
			>
				{yTicks.map((tick) => (
					<g key={`y.${tick}`}>
						<line x1={PAD.left} x2={VIEW_W - PAD.right} y1={toY(tick)} y2={toY(tick)} stroke="rgba(0,229,255,0.08)" />
						<text
							x={PAD.left - 8}
							y={toY(tick) + 4}
							textAnchor="end"
							fontSize={11}
							fill="#71717a"
							fontFamily="monospace"
						>
							{yFormatter ? yFormatter(tick) : String(tick)}
						</text>
					</g>
				))}

				{xTicks.map((tick) => (
					<text
						key={`x.${tick}`}
						x={toX(tick)}
						y={VIEW_H - 10}
						textAnchor="middle"
						fontSize={11}
						fill="#71717a"
						fontFamily="monospace"
					>
						{xFormatter ? xFormatter(tick) : String(tick)}
					</text>
				))}

				{visible.map((s) =>
					scatter ? (
						<g key={s.id}>
							{s.points.map((p, i) => (
								<circle
									key={`${s.id}.${i}`}
									cx={toX(p.x)}
									cy={toY(p.y)}
									r={3}
									fill={s.color}
									fillOpacity={0.7}
								/>
							))}
						</g>
					) : (
						<g key={s.id}>
							<polyline
								fill="none"
								stroke={s.color}
								strokeWidth={2}
								strokeLinejoin="round"
								strokeLinecap="round"
								points={s.points.map((p) => `${toX(p.x)},${toY(p.y)}`).join(" ")}
							/>
							{s.points
								.filter((p) => p.clipped)
								.map((p) => (
									<circle
										key={`${s.id}.${p.x}`}
										cx={toX(p.x)}
										cy={toY(p.y)}
										r={3.5}
										fill="none"
										stroke={s.color}
										strokeWidth={1.5}
									/>
								))}
						</g>
					),
				)}

				{hoveredX !== null && hoverEntries.length > 0 && (
					<line
						x1={toX(hoveredX)}
						x2={toX(hoveredX)}
						y1={PAD.top}
						y2={VIEW_H - PAD.bottom}
						stroke="rgba(255,255,255,0.25)"
						strokeDasharray="4 4"
					/>
				)}
			</svg>

			{hoveredX !== null && hoverEntries.length > 0 && (
				<div className="pointer-events-none absolute top-2 right-2 rounded-md border border-cyan-300/20 bg-black/80 p-2 font-mono text-xs">
					<p className="text-zinc-400">{xFormatter ? xFormatter(hoveredX) : `x ${hoveredX}`}</p>
					{hoverEntries.map((entry) => (
						<p key={entry.label} style={{ color: entry.color }}>
							{entry.label} {yFormatter ? yFormatter(entry.point.y) : entry.point.y}
							{entry.point.clipped ? " *" : ""}
						</p>
					))}
				</div>
			)}
		</div>
	);
}
