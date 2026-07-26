"use client";

import clsx from "clsx";
import { useState, type KeyboardEvent } from "react";

import RadioMessage from "@/components/dashboard/RadioMessage";
import Panel from "@/components/new-ui/primitives/Panel";
import ViewState from "@/components/new-ui/primitives/ViewState";
import { classifyRaceControlMessage } from "@/lib/raceControlVisual";
import { useAlertStore } from "@/stores/useAlertStore";
import { useDataStore } from "@/stores/useDataStore";

const TABS = ["Race Control", "Alerts", "Radios"] as const;
type EventsTab = (typeof TABS)[number];

export default function TechnicalEventsPanel() {
	const [active, setActive] = useState<EventsTab>("Race Control");

	const onTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
		if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
		event.preventDefault();
		const direction = event.key === "ArrowRight" ? 1 : -1;
		const next = (index + direction + TABS.length) % TABS.length;
		setActive(TABS[next]);
		event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus();
	};

	return (
		<Panel title="Events" eyebrow="Session feed" className="flex min-h-0 flex-col">
			<div role="tablist" aria-label="Event source" className="mb-2 flex gap-1">
				{TABS.map((tab, index) => (
					<button key={tab} role="tab" type="button" aria-selected={active === tab} tabIndex={active === tab ? 0 : -1}
						onClick={() => setActive(tab)} onKeyDown={(event) => onTabKeyDown(event, index)}
						className={clsx("rounded px-2 py-1 text-xs font-semibold", active === tab ? "bg-white text-black" : "bg-white/5 text-[var(--ui-muted)]")}
					>{tab}</button>
				))}
			</div>
			<div role="tabpanel" className="tech-scrollbar min-h-0 flex-1 overflow-y-auto">
				{active === "Race Control" ? <RaceControlEvents /> : active === "Alerts" ? <AlertEvents /> : <RadioEvents />}
			</div>
		</Panel>
	);
}

function RaceControlEvents() {
	const messages = useDataStore((state) => state.state?.RaceControlMessages?.Messages);
	if (!messages) return <ViewState state="loading" title="Loading Race Control" />;
	if (messages.length === 0) return <ViewState state="empty" title="No Race Control messages" />;
	return (
		<ul className="space-y-2">
			{messages.slice().reverse().map((message, index) => {
				const visual = classifyRaceControlMessage(message);
				const validTime = Number.isFinite(Date.parse(message.Utc));
				return <li key={`${message.Utc}-${index}`} className="rounded-md border border-[var(--ui-border)] bg-white/[0.03] p-2">
					<div className="flex items-center justify-between gap-2 text-xs"><strong>{visual.label}</strong><span className="new-ui-number text-[var(--ui-muted)]">{validTime ? new Date(message.Utc).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "Time unavailable"}</span></div>
					<p className="mt-1 text-sm">{message.Message}</p>
				</li>;
			})}
		</ul>
	);
}

function AlertEvents() {
	const alerts = useAlertStore((state) => state.alerts);
	if (alerts.length === 0) return <ViewState state="empty" title="No tactical alerts" />;
	return <ul className="space-y-2">{alerts.slice().reverse().map((alert) => <li key={alert.id} className="rounded-md border border-[var(--ui-border)] p-2"><p className="text-xs font-semibold uppercase text-[var(--ui-muted)]">{alert.severity}</p><strong>{alert.title}</strong><p className="text-sm text-[var(--ui-muted)]">{alert.body}</p></li>)}</ul>;
}

function RadioEvents() {
	const drivers = useDataStore((state) => state.state?.DriverList);
	const captures = useDataStore((state) => state.state?.TeamRadio?.Captures);
	const path = useDataStore((state) => state.state?.SessionInfo?.Path);
	const offset = useDataStore((state) => state.state?.SessionInfo?.GmtOffset);
	if (!captures) return <ViewState state="loading" title="Loading team radios" />;
	if (captures.length === 0) return <ViewState state="empty" title="No team radios" />;
	if (!drivers || !path || !offset) return <ViewState state="unavailable" title="Radio metadata unavailable" />;
	return <ul className="space-y-2">{captures.slice().reverse().slice(0, 20).map((capture, index) => {
		const driver = drivers[capture.RacingNumber];
		return driver ? <RadioMessage key={`${capture.Utc}-${index}`} driver={driver} capture={capture} basePath={`https://livetiming.formula1.com/static/${path}`} gmtOffset={offset} /> : null;
	})}</ul>;
}
