"use client";

import Panel from "@/components/new-ui/primitives/Panel";
import ViewState from "@/components/new-ui/primitives/ViewState";
import { buildDriverComparison, calculateDriverGap } from "@/lib/driverComparison";
import { useDataStore } from "@/stores/useDataStore";
import { useDriverSelectionStore } from "@/stores/useDriverSelectionStore";

export default function TechnicalComparisonPanel() {
	const compared = useDriverSelectionStore((state) => state.comparedDrivers);
	const drivers = useDataStore((state) => state.state?.DriverList);
	const timing = useDataStore((state) => state.state?.TimingData?.Lines);
	const stats = useDataStore((state) => state.state?.TimingStats?.Lines);
	const app = useDataStore((state) => state.state?.TimingAppData?.Lines);

	if (compared.length < 2) return <Panel title="Driver comparison" eyebrow="Head to head"><ViewState state="empty" title="Select two drivers" description="Add two drivers from timing or the map." /></Panel>;
	const [firstNumber, secondNumber] = compared;
	const first = buildDriverComparison(firstNumber, { driver: drivers?.[firstNumber], timing: timing?.[firstNumber], stats: stats?.[firstNumber], app: app?.[firstNumber] });
	const second = buildDriverComparison(secondNumber, { driver: drivers?.[secondNumber], timing: timing?.[secondNumber], stats: stats?.[secondNumber], app: app?.[secondNumber] });
	if (!first || !second || !timing?.[firstNumber] || !timing?.[secondNumber]) return <Panel title="Driver comparison" eyebrow="Head to head"><ViewState state="unavailable" title="Comparison data unavailable" /></Panel>;
	const gap = calculateDriverGap(timing[firstNumber], timing[secondNumber]);

	return (
		<Panel title="Driver comparison" eyebrow="Head to head">
			<div className="grid grid-cols-[1fr_auto_1fr] items-stretch overflow-hidden rounded-md border border-[var(--ui-border)]">
				<DriverSummary model={first} />
				<div className="flex min-w-28 flex-col items-center justify-center border-x border-[var(--ui-border)] bg-white/[0.03] px-3"><span className="text-xs text-[var(--ui-muted)]">Gap</span><strong className="new-ui-number text-xl">{gap.value}</strong></div>
				<DriverSummary model={second} align="right" />
			</div>
		</Panel>
	);
}

function DriverSummary({ model, align = "left" }: { model: NonNullable<ReturnType<typeof buildDriverComparison>>; align?: "left" | "right" }) {
	return <div className={align === "right" ? "p-3 text-right" : "p-3"}><div className={align === "right" ? "flex flex-row-reverse items-center gap-2" : "flex items-center gap-2"}><span className="h-8 w-1 rounded" style={{ backgroundColor: `#${model.teamColour || "6d7680"}` }} /><strong className="text-xl">{model.tla}</strong></div><div className="mt-2 space-y-1 text-xs text-[var(--ui-muted)]"><p>P{model.position} · {model.status}</p><p>{model.stint.compound} · {model.stint.age} laps · {model.stint.stops} stops</p><p className="new-ui-number">Last {model.lastLap} · Best {model.bestLap}</p></div></div>;
}
