"use client";

import clsx from "clsx";
import { useMemo } from "react";

import Panel from "@/components/new-ui/primitives/Panel";
import ViewState from "@/components/new-ui/primitives/ViewState";
import { buildTechnicalTimingRows, type TechnicalTimingRowModel } from "@/lib/view-models/liveTiming";
import { useDataStore } from "@/stores/useDataStore";
import { useDriverSelectionStore } from "@/stores/useDriverSelectionStore";

const GRID_COLUMNS = "3rem minmax(7.5rem,1.2fr) 5rem 5.5rem 5.5rem 5.5rem 4.5rem 4.5rem 4.5rem 4.5rem 5.5rem";

const STATUS_LABEL: Record<TechnicalTimingRowModel["status"], string> = {
	running: "Track",
	pit: "Pit",
	"pit-out": "Pit out",
	retired: "Retired",
	stopped: "Stopped",
};

export default function TechnicalTimingBoard() {
	const drivers = useDataStore((state) => state.state?.DriverList);
	const timing = useDataStore((state) => state.state?.TimingData);
	const appTiming = useDataStore((state) => state.state?.TimingAppData);
	const carsData = useDataStore((state) => state.carsData ?? undefined);
	const selectedDriver = useDriverSelectionStore((state) => state.selectedDriver);
	const setSelectedDriver = useDriverSelectionStore((state) => state.setSelectedDriver);

	const rows = useMemo(
		() => buildTechnicalTimingRows({ drivers, timing, appTiming, carsData }),
		[appTiming, carsData, drivers, timing],
	);

	return (
		<Panel title="Technical classification" eyebrow="Pit wall timing" level="primary" className="flex min-h-0 flex-col">
			<div className="tech-scrollbar min-h-0 flex-1 overflow-auto">
				<div className="min-w-[76rem]">
					<div
						data-testid="technical-timing-header"
						className="grid gap-2 border-b border-[var(--ui-border)] px-2 pb-2 text-[0.62rem] tracking-wide text-[var(--ui-subtle)] uppercase"
						style={{ gridTemplateColumns: GRID_COLUMNS }}
					>
						<span>Pos</span><span>Driver / status</span><span>Tyre</span><span>Gap</span><span>Interval</span>
						<span>Last / best</span><span>S1</span><span>S2</span><span>S3</span><span>Speed</span><span>Telemetry</span>
					</div>

					{!drivers || !timing ? (
						<div aria-busy="true" aria-label="Loading technical classification" className="space-y-1 p-2">
							{Array.from({ length: 12 }).map((_, index) => <div key={index} className="h-9 animate-pulse rounded bg-white/5" />)}
						</div>
					) : rows.length === 0 ? (
						<ViewState state="empty" title="No timing yet" description="Technical timing appears once session data is available." />
					) : (
						<div className="space-y-1 p-1">
							{rows.map((row) => (
								<TechnicalTimingRow
									key={row.driverNumber}
									row={row}
									selected={selectedDriver === row.driverNumber}
									onSelect={setSelectedDriver}
								/>
							))}
						</div>
					)}
				</div>
			</div>
		</Panel>
	);
}

function TechnicalTimingRow({ row, selected, onSelect }: {
	row: TechnicalTimingRowModel;
	selected: boolean;
	onSelect: (driverNumber: string) => void;
}) {
	return (
		<div
			data-testid={`technical-row-${row.driverNumber}`}
			role="button"
			tabIndex={0}
			aria-selected={selected}
			aria-label={`Position ${row.position ?? "unknown"}, ${row.code}, ${STATUS_LABEL[row.status]}`}
			onClick={() => onSelect(row.driverNumber)}
			onKeyDown={(event) => {
				if (event.key === "Enter" || event.key === " ") {
					event.preventDefault();
					onSelect(row.driverNumber);
				}
			}}
			className={clsx(
				"grid items-center gap-2 rounded-md px-2 py-1.5 text-xs outline-none transition-colors hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-white",
				selected && "bg-white/10",
			)}
			style={{ gridTemplateColumns: GRID_COLUMNS }}
		>
			<div className="flex items-center gap-2"><span className="h-6 w-1 rounded" style={{ background: row.teamColor }} /><strong className="new-ui-number text-base">{row.position ?? "-"}</strong></div>
			<div className="min-w-0"><strong>{row.code}</strong><span className="ml-2 text-[var(--ui-muted)]">{STATUS_LABEL[row.status]}</span></div>
			<div className="new-ui-number">{row.compound ? `${row.compound.slice(0, 1)} ${row.tyreAge ?? "-"}L / ${row.stops}P` : "-"}</div>
			<div className="new-ui-number">{row.primaryGap}</div>
			<div className="new-ui-number">{row.interval}</div>
			<div className="new-ui-number"><span>{row.lastLap ?? "-"}</span><span className="block text-[0.65rem] text-[var(--ui-muted)]">{row.bestLap ?? "-"}</span></div>
			{row.sectors.map((sector, index) => <div key={index} className="new-ui-number">{sector}</div>)}
			<div className="new-ui-number">{row.speedTrap}</div>
			<div data-testid={`technical-telemetry-${row.driverNumber}`} className="new-ui-number">
				{row.telemetry ? `${row.telemetry.speed} km/h · G${row.telemetry.gear}` : "-"}
			</div>
		</div>
	);
}
