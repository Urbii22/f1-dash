"use client";

import clsx from "clsx";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";

import { useAlertStore, type StoredAlert } from "@/stores/useAlertStore";

const TOAST_LIFETIME_MS = 8000;
const MAX_TOASTS = 3;

/**
 * Ephemeral toasts for critical alerts (red flag, safety car, penalties...).
 * Rendered once in the dashboard layout so they are visible on every page.
 */
export default function AlertToasts() {
	const alerts = useAlertStore((store) => store.alerts);
	const [hidden, setHidden] = useState<Set<string>>(new Set());
	const [now, setNow] = useState(() => Date.now());

	const active = alerts
		.filter((alert) => alert.severity === "critical")
		.filter((alert) => !hidden.has(alert.id) && now - alert.receivedAt < TOAST_LIFETIME_MS)
		.slice(-MAX_TOASTS);

	// tick only while there is something to expire
	useEffect(() => {
		if (active.length === 0) return;
		const interval = setInterval(() => setNow(Date.now()), 1000);
		return () => clearInterval(interval);
	}, [active.length]);

	const hide = (id: string) => setHidden((current) => new Set(current).add(id));

	return (
		<div className="pointer-events-none fixed right-4 bottom-4 z-50 flex w-80 flex-col gap-2">
			<AnimatePresence>
				{active.map((alert) => (
					<Toast key={alert.id} alert={alert} onHide={() => hide(alert.id)} />
				))}
			</AnimatePresence>
		</div>
	);
}

function Toast({ alert, onHide }: { alert: StoredAlert; onHide: () => void }) {
	return (
		<motion.button
			layout
			initial={{ opacity: 0, x: 40 }}
			animate={{ opacity: 1, x: 0 }}
			exit={{ opacity: 0, x: 40 }}
			className={clsx(
				"telemetry-panel pointer-events-auto rounded-lg border border-rose-400/40 bg-zinc-950/95 p-3 text-left",
				"shadow-[0_0_24px_rgba(244,63,94,0.25)]",
			)}
			onClick={onHide}
		>
			<p className="font-mono text-xs font-bold tracking-wider text-rose-400 uppercase">{alert.title}</p>
			<p className="mt-1 text-sm text-zinc-300">{alert.body}</p>
		</motion.button>
	);
}
