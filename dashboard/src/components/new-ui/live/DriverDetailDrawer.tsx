"use client";

import { useEffect } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import type { DriverDrawerModel } from "@/lib/view-models/driverDrawer";
import { buildDriverDrawerModel } from "@/lib/view-models/driverDrawer";
import { useDataStore } from "@/stores/useDataStore";
import { useDriverSelectionStore } from "@/stores/useDriverSelectionStore";
import { useLapHistoryStore } from "@/stores/useLapHistoryStore";
import Panel from "@/components/new-ui/primitives/Panel";
import ViewState from "@/components/new-ui/primitives/ViewState";
import { useConnectedRaceStory } from "@/components/new-ui/live/useRaceStoryData";

function Stat({ label, value }: { label: string; value: string }) {
	return (
		<div className="flex flex-col">
			<span className="text-[0.6rem] tracking-wide text-[var(--ui-subtle)] uppercase">{label}</span>
			<span className="new-ui-number font-semibold tabular-nums">{value}</span>
		</div>
	);
}

export function DriverDetailDrawerView({
	model,
	onClose,
}: {
	model: DriverDrawerModel | null;
	onClose: () => void;
}) {
	const reduced = useReducedMotion();

	useEffect(() => {
		if (!model) return;
		const handle = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				event.preventDefault();
				onClose();
			}
		};
		document.addEventListener("keydown", handle);
		return () => document.removeEventListener("keydown", handle);
	}, [model, onClose]);

	return (
		<AnimatePresence>
			{model ? (
				<motion.aside
					key="driver-drawer"
					role="dialog"
					aria-label={`${model.fullName} details`}
					initial={reduced ? false : { opacity: 0, x: 24 }}
					animate={reduced ? {} : { opacity: 1, x: 0 }}
					exit={reduced ? {} : { opacity: 0, x: 24 }}
					className="new-ui-driver-drawer absolute top-0 right-0 z-20 flex h-full w-[min(28rem,38vw)] flex-col gap-3 overflow-y-auto border-l border-[var(--ui-border)] bg-[var(--ui-surface-1)] p-4"
				>
					<header className="flex items-start justify-between gap-2">
						<div className="flex min-w-0 items-center gap-2">
							<span className="h-8 w-1.5 rounded-full" style={{ backgroundColor: model.teamColor }} aria-hidden="true" />
							<div className="min-w-0">
								<p className="text-lg font-black">{model.code}</p>
								<p className="truncate text-sm text-[var(--ui-muted)]">{model.fullName}</p>
								<p className="truncate text-xs text-[var(--ui-subtle)]">{model.teamName}</p>
							</div>
						</div>
						<button
							type="button"
							aria-label="Close driver details"
							onClick={onClose}
							className="rounded-md border border-[var(--ui-border)] px-2 py-1 text-xs font-semibold hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-[var(--ui-focus)] focus-visible:outline-none"
						>
							Close
						</button>
					</header>

					<Panel title="Race position" level="contextual">
						<div className="grid grid-cols-2 gap-3">
							<Stat label="Position" value={model.positionLabel} />
							<Stat label="Gap" value={model.gapLabel} />
							<Stat label="Last lap" value={model.lastLap ?? "-"} />
							<Stat label="Best lap" value={model.bestLap ?? "-"} />
						</div>
					</Panel>

					<Panel title="Tyre & stint" level="contextual">
						{model.stint ? (
							<div className="grid grid-cols-3 gap-3">
								<Stat label="Compound" value={model.stint.compound} />
								<Stat label="Age" value={model.stint.age !== null ? `${model.stint.age}L` : "-"} />
								<Stat label="Stops" value={String(model.stint.stops)} />
							</div>
						) : (
							<ViewState state="unavailable" title="No stint data" />
						)}
					</Panel>

					<Panel title="Recent laps" level="contextual">
						{model.laps.length > 0 ? (
							<ul className="flex flex-col gap-1">
								{model.laps.map((lap) => (
									<li key={lap.lap} className="flex justify-between text-sm">
										<span className="text-[var(--ui-muted)]">L{lap.lap}</span>
										<span className="new-ui-number tabular-nums">{lap.time}</span>
										<span className="new-ui-number tabular-nums text-[var(--ui-subtle)]">{lap.deltaToBest ?? "-"}</span>
									</li>
								))}
							</ul>
						) : (
							<ViewState state="unavailable" title="No recorded laps" />
						)}
					</Panel>

					<Panel title="Telemetry" level="contextual">
						{model.telemetry.speed === null &&
						model.telemetry.gear === null &&
						model.telemetry.throttle === null &&
						model.telemetry.brake === null &&
						model.telemetry.drs === null ? (
							<ViewState state="unavailable" title="Telemetry unavailable" />
						) : (
							<div className="grid grid-cols-3 gap-3">
								<Stat label="Speed" value={model.telemetry.speed ?? "-"} />
								<Stat label="Gear" value={model.telemetry.gear ?? "-"} />
								<Stat
									label="Throttle"
									value={model.telemetry.throttle !== null ? `${model.telemetry.throttle}%` : "-"}
								/>
								<Stat label="Brake" value={model.telemetry.brake === null ? "-" : model.telemetry.brake ? "On" : "Off"} />
								<Stat label="DRS" value={model.telemetry.drs ?? "-"} />
							</div>
						)}
					</Panel>

					<Panel title="Strategy" level="contextual">
						{model.strategySummary ? (
							<p className="text-sm text-[var(--ui-muted)]">{model.strategySummary}</p>
						) : (
							<ViewState state="unavailable" title="No strategy summary" />
						)}
					</Panel>

					<Panel title="Related alerts" level="contextual">
						{model.alerts.length > 0 ? (
							<ul className="flex flex-col gap-2">
								{model.alerts.map((alert) => (
									<li key={alert.id} className="rounded-md border border-[var(--ui-border)] bg-[var(--ui-surface-2)] p-2">
										<p className="font-semibold">{alert.title}</p>
										<p className="text-sm text-[var(--ui-muted)]">{alert.detail}</p>
									</li>
								))}
							</ul>
						) : (
							<ViewState state="empty" title="No related alerts" />
						)}
					</Panel>
				</motion.aside>
			) : null}
		</AnimatePresence>
	);
}

export default function DriverDetailDrawer() {
	const selectedDriver = useDriverSelectionStore((store) => store.selectedDriver);
	const clearSelectedDriver = useDriverSelectionStore((store) => store.clearSelectedDriver);
	const state = useDataStore((store) => store.state ?? null);
	const carsData = useDataStore((store) => store.carsData);
	const laps = useLapHistoryStore((store) => (selectedDriver ? store.laps[selectedDriver] : undefined));
	const story = useConnectedRaceStory();

	const model = buildDriverDrawerModel({
		driverNumber: selectedDriver,
		state,
		carsData,
		laps: laps ?? [],
		story,
	});

	// Closing returns focus to the originating timing row and never touches comparisons.
	const handleClose = () => {
		const number = selectedDriver;
		clearSelectedDriver();
		if (number) {
			const row = document.querySelector<HTMLElement>(`[data-driver-row="${number}"]`);
			row?.focus();
		}
	};

	return <DriverDetailDrawerView model={model} onClose={handleClose} />;
}
