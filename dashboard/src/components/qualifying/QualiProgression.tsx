"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import {
	buildProgressionGroups,
	getProgressionVisibility,
	type QualiProgressionEntry,
	type QualiProgressionGroups,
} from "@/lib/qualiView";
import { useDataStore } from "@/stores/useDataStore";
import type { DriverList } from "@/types/state.type";

type FrozenGroups = Partial<QualiProgressionGroups>;

export default function QualiProgression() {
	const lines = useDataStore((state) => state.state?.TimingData?.Lines);
	const sessionPart = useDataStore((state) => state.state?.TimingData?.SessionPart);
	const sessionPath = useDataStore((state) => state.state?.SessionInfo?.Path);
	const sessionStatus = useDataStore((state) => state.state?.SessionStatus?.Status);
	const drivers = useDataStore((state) => state.state?.DriverList);
	const currentGroups = useMemo(() => buildProgressionGroups(lines), [lines]);
	const [frozen, setFrozen] = useState<FrozenGroups>({});
	const previous = useRef<{ path?: string; part?: number }>({});

	useEffect(() => {
		const prior = previous.current;
		if (prior.path && prior.path !== sessionPath) {
			setFrozen({});
		} else if (prior.part && sessionPart && sessionPart < prior.part) {
			setFrozen({});
		} else if (prior.part === 1 && sessionPart && sessionPart > 1) {
			setFrozen((state) => ({ ...state, q1: currentGroups.q1 }));
		} else if (prior.part === 2 && sessionPart && sessionPart > 2) {
			setFrozen((state) => ({ ...state, q2: currentGroups.q2 }));
		}
		previous.current = { path: sessionPath, part: sessionPart };
	}, [currentGroups.q1, currentGroups.q2, sessionPart, sessionPath]);

	const visibility = getProgressionVisibility(sessionPart, sessionStatus);
	if (!visibility.q1 && !visibility.q2 && !visibility.q3) return null;

	return (
		<section className="telemetry-panel rounded-lg p-3">
			<div className="flex items-center justify-between border-b border-cyan-300/10 pb-3">
				<div>
					<p className="panel-title">Round archive</p>
					<h2 className="text-xl font-black">Qualifying Progression</h2>
				</div>
				<span className="data-chip rounded-md px-2 py-1 font-mono text-xs text-cyan-200">PROVISIONAL GRID</span>
			</div>
			<div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-3">
				<ProgressionColumn
					title="Eliminated Q1"
					entries={frozen.q1 ?? currentGroups.q1}
					drivers={drivers}
					visible={visibility.q1}
				/>
				<ProgressionColumn
					title="Eliminated Q2"
					entries={frozen.q2 ?? currentGroups.q2}
					drivers={drivers}
					visible={visibility.q2}
				/>
				<ProgressionColumn title="Q3 Top 10" entries={currentGroups.q3} drivers={drivers} visible={visibility.q3} />
			</div>
		</section>
	);
}

function ProgressionColumn({
	title,
	entries,
	drivers,
	visible,
}: {
	title: string;
	entries: QualiProgressionEntry[];
	drivers: DriverList | undefined;
	visible: boolean;
}) {
	return (
		<div className="rounded-lg border border-cyan-300/10 bg-black/25 p-3">
			<h3 className="font-mono text-xs font-black tracking-wider text-cyan-200 uppercase">{title}</h3>
			<div className="mt-2 space-y-1">
				{!visible && <p className="py-4 text-center text-sm text-zinc-600">Round in progress</p>}
				{visible && entries.length === 0 && (
					<p className="py-4 text-center text-sm text-zinc-600">No result snapshot</p>
				)}
				{visible &&
					entries.map((entry) => {
						const driver = drivers?.[entry.racingNumber];
						return (
							<div
								key={entry.racingNumber}
								className="data-chip grid grid-cols-[2rem_3rem_1fr] items-center gap-2 rounded-md px-2 py-1.5"
							>
								<span className="font-mono text-xs text-zinc-500">P{entry.position}</span>
								<span className="font-black" style={{ color: `#${driver?.TeamColour ?? "00e5ff"}` }}>
									{driver?.Tla ?? entry.racingNumber}
								</span>
								<span className="text-right font-mono text-sm text-zinc-300 tabular-nums">
									{entry.bestLap || "--:--.---"}
								</span>
							</div>
						);
					})}
			</div>
		</div>
	);
}
