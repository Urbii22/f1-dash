"use client";

import Link from "next/link";

import { useConnectionStore } from "@/stores/useConnectionStore";
import { useDataStore } from "@/stores/useDataStore";
import { useNextSession } from "@/hooks/useNextSession";
import { useCountdown } from "@/hooks/useCountdown";
import type { UiDensity } from "@/lib/uiPreferences";
import Panel from "@/components/new-ui/primitives/Panel";
import ViewState from "@/components/new-ui/primitives/ViewState";
import SimpleDashboardView from "@/components/new-ui/live/SimpleDashboardView";

export type LiveDashboardMode = "connecting" | "no-session" | "live" | "replay" | "ended" | "error";

// Pure resolver: keeps "truthful state" logic out of the component so it can be
// unit tested. Disconnected but with retained data means we are showing replay,
// not still connecting.
export function resolveLiveDashboardMode(input: {
	connected: boolean;
	hasData: boolean;
	hasSessionInfo: boolean;
	ended: boolean;
	error?: boolean;
}): LiveDashboardMode {
	if (input.error) return "error";
	if (input.ended) return "ended";
	if (!input.connected) return input.hasData ? "replay" : "connecting";
	if (!input.hasSessionInfo) return "no-session";
	return "live";
}

function NewUiNoSession() {
	const { round, nextSession, loading } = useNextSession();
	const [days, hours, minutes, seconds] = useCountdown(nextSession?.start ?? null);

	const units: [number | null, string][] = [
		[days, "days"],
		[hours, "hrs"],
		[minutes, "min"],
		[seconds, "sec"],
	];

	return (
		<div className="grid h-full place-items-center p-6">
			<Panel title="No session live" eyebrow="Live timing" level="primary" className="w-full max-w-xl">
				<p className="text-sm text-[var(--ui-muted)]">
					The timing feed is connected — no active session is broadcasting.
				</p>

				<div className="mt-5 border-t border-[var(--ui-border)] pt-5">
					{loading ? (
						<ViewState state="loading" title="Loading next session" />
					) : !round || !nextSession ? (
						<ViewState state="unavailable" title="Next session unavailable" description="Schedule data could not be loaded." />
					) : (
						<>
							<div className="mb-3 flex flex-wrap items-center gap-2">
								<span className="rounded-md bg-white/5 px-2 py-1 font-mono text-[0.68rem] uppercase">{round.countryName}</span>
								<span className="text-lg font-bold">{round.name}</span>
							</div>
							<p className="mb-3 text-sm text-[var(--ui-muted)]">
								Next: <span className="font-semibold text-[var(--ui-text)]">{nextSession.kind}</span>
							</p>
							<div className="flex gap-4">
								{units.map(([val, unit]) => (
									<div key={unit} className="flex flex-col items-center">
										<span className="new-ui-number text-3xl font-black tabular-nums">
											{val == null ? "--" : val.toString().padStart(2, "0")}
										</span>
										<span className="text-xs text-[var(--ui-subtle)]">{unit}</span>
									</div>
								))}
							</div>
						</>
					)}
				</div>

				<div className="mt-6 flex flex-wrap gap-3 border-t border-[var(--ui-border)] pt-5 text-sm">
					<Link href="/schedule" className="rounded-md bg-white/5 px-3 py-2 hover:bg-white/10">
						Full schedule →
					</Link>
					<Link href="/dashboard/standings" className="rounded-md bg-white/5 px-3 py-2 hover:bg-white/10">
						Standings →
					</Link>
				</div>
			</Panel>
		</div>
	);
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function LiveDashboardState({ density: _density = "simple" as UiDensity }: { density?: UiDensity }) {
	const connected = useConnectionStore((store) => store.connected);
	const hasData = useDataStore((store) => store.state != null);
	const hasSessionInfo = useDataStore((store) => store.state?.SessionInfo != null);
	const ended = useDataStore((store) => store.state?.SessionStatus?.Status === "Ends");

	const mode = resolveLiveDashboardMode({ connected, hasData, hasSessionInfo, ended });

	switch (mode) {
		case "live":
		case "replay":
			// Phase 3 introduces the Detailed composition; Simple covers both densities for now.
			return <SimpleDashboardView />;
		case "ended":
			return (
				<div className="grid h-full place-items-center p-6">
					<ViewState
						state="empty"
						title="Session ended"
						description="This session has finished. Open the archive or results for full analysis."
					/>
				</div>
			);
		case "no-session":
			return <NewUiNoSession />;
		case "error":
			return (
				<div className="grid h-full place-items-center p-6">
					<ViewState state="error" title="Live timing error" description="The timing feed reported an error. Try reconnecting." />
				</div>
			);
		case "connecting":
		default:
			return (
				<div className="grid h-full place-items-center p-6">
					<ViewState state="loading" title="Connecting to live timing" description="Waiting for the timing feed to respond." />
				</div>
			);
	}
}
