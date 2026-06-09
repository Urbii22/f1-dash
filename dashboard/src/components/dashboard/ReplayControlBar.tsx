"use client";

import { Pause, Play, RotateCcw, StepBack, StepForward } from "lucide-react";

import { useReplayControlStore } from "@/stores/useReplayControlStore";

const speeds = [0.5, 1, 2, 5] as const;

export default function ReplayControlBar() {
	const { isPaused, speed, setPaused, setSpeed, jumpBy, resetReplayControls } = useReplayControlStore();

	return (
		<div className="telemetry-panel flex items-center justify-between gap-3 rounded-lg p-2">
			<div className="flex items-center gap-2">
				<button
					className="data-chip rounded-md p-2 text-cyan-200"
					onClick={() => setPaused(!isPaused)}
					title={isPaused ? "Play" : "Pause"}
				>
					{isPaused ? <Play size={16} /> : <Pause size={16} />}
				</button>
				<button className="data-chip rounded-md p-2 text-cyan-200" onClick={() => jumpBy(-10_000)} title="Back 10 seconds">
					<StepBack size={16} />
				</button>
				<button className="data-chip rounded-md p-2 text-cyan-200" onClick={() => jumpBy(10_000)} title="Forward 10 seconds">
					<StepForward size={16} />
				</button>
				<button className="data-chip rounded-md p-2 text-cyan-200" onClick={resetReplayControls} title="Reset replay controls">
					<RotateCcw size={16} />
				</button>
			</div>
			<div className="flex items-center gap-1">
				{speeds.map((item) => (
					<button
						key={item}
						className={`rounded-md px-2 py-1 font-mono text-xs ${speed === item ? "bg-cyan-300 text-black" : "data-chip text-cyan-200"}`}
						onClick={() => setSpeed(item)}
					>
						{item}x
					</button>
				))}
			</div>
		</div>
	);
}
