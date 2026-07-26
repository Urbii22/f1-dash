"use client";

import RouteHeader from "@/components/new-ui/routes/RouteHeader";
import Panel from "@/components/new-ui/primitives/Panel";

function ColorRow({ color, bg, label }: { color?: string; bg: string; label: string }) {
	return (
		<div className="flex items-center gap-3">
			<span className="inline-block h-4 w-4 flex-shrink-0 rounded" style={{ background: bg }} aria-hidden="true" />
			<span style={color ? { color } : undefined} className="text-sm font-medium">{label}</span>
		</div>
	);
}

function SectionTitle({ children }: { children: React.ReactNode }) {
	return <h2 className="mt-6 mb-3 text-base font-semibold text-[var(--ui-text)] first:mt-0">{children}</h2>;
}

export function SimpleHelpView() {
	return (
		<div className="new-ui-route-scroll flex h-full min-h-0 flex-col gap-4 overflow-y-auto p-4">
			<RouteHeader
				eyebrow="Documentation"
				title="Help & reference"
				description="UI conventions, timing colors, status meanings, and control explanations."
			/>

			<div className="grid gap-4 xl:grid-cols-2">
				<Panel title="Timing colors" eyebrow="What each color means" level="primary">
					<div className="flex flex-col gap-2 mt-2">
						<ColorRow bg="#ffffff" color="#ffffff" label="White — last lap time" />
						<ColorRow bg="#f59e0b" color="#f59e0b" label="Yellow — slower than personal best (mini sectors only)" />
						<ColorRow bg="#10b981" color="#10b981" label="Green — personal best" />
						<ColorRow bg="#8b5cf6" color="#8b5cf6" label="Purple — overall best (fastest on track)" />
						<ColorRow bg="#3b82f6" color="#3b82f6" label="Blue — driver currently in the pit lane" />
					</div>
				</Panel>

				<Panel title="Driver status indicators" eyebrow="Leaderboard backgrounds">
					<ul className="mt-2 space-y-3 text-sm">
						<li className="rounded-md bg-violet-800/30 px-3 py-2">Purple background — fastest overall lap time</li>
						<li className="rounded-md border border-[var(--ui-border)] px-3 py-2 opacity-50">Reduced opacity — crashed or retired</li>
						<li className="rounded-md bg-red-800/30 px-3 py-2">Red background — elimination zone in qualifying</li>
					</ul>
				</Panel>

				<Panel title="Pit status" eyebrow="In-lane indicators">
					<p className="mt-2 mb-3 text-sm text-[var(--ui-muted)]">Status column shows real timing feed values. Empty means driver is on track.</p>
					<div className="flex flex-col gap-2 text-sm font-mono">
						<span className="inline-block rounded bg-blue-900/50 px-2 py-1 text-blue-300">PIT</span>
						<span className="ml-0 text-sm text-[var(--ui-muted)]">Driver is in the pit lane</span>
						<span className="inline-block rounded bg-yellow-900/50 px-2 py-1 text-yellow-300 mt-2">PIT OUT</span>
						<span className="inline-block text-sm text-[var(--ui-muted)]">Driver has just left the pit lane</span>
					</div>
				</Panel>

				<Panel title="Delay control" eyebrow="Stream sync">
					<p className="mt-2 text-sm text-[var(--ui-muted)]">
						F1-dash updates ahead of most broadcast streams. Set a delay in seconds to match your stream.
						A 30 s delay causes the dashboard to update 30 s later than the live edge.
					</p>
					<p className="mt-2 text-xs text-[var(--ui-subtle)]">
						Delay is limited to the time spent on the dashboard page in the current visit.
					</p>
				</Panel>
			</div>
		</div>
	);
}

export function DetailedHelpView() {
	return (
		<div className="new-ui-route-scroll flex h-full min-h-0 flex-col gap-4 overflow-y-auto p-4">
			<RouteHeader
				eyebrow="Documentation"
				title="Help & reference"
				description="Complete reference for UI conventions, timing colors, status meanings, tire compounds, telemetry channels, and controls."
			/>

			<div className="grid gap-4 xl:grid-cols-2">
				<Panel title="Timing colors" eyebrow="What each color means" level="primary">
					<div className="flex flex-col gap-2 mt-2">
						<ColorRow bg="#ffffff" color="#ffffff" label="White — last lap time" />
						<ColorRow bg="#f59e0b" color="#f59e0b" label="Yellow — slower than personal best (mini sectors only)" />
						<ColorRow bg="#10b981" color="#10b981" label="Green — personal best" />
						<ColorRow bg="#8b5cf6" color="#8b5cf6" label="Purple — overall best (fastest on track)" />
						<ColorRow bg="#3b82f6" color="#3b82f6" label="Blue — driver currently in the pit lane" />
					</div>
					<p className="mt-3 text-xs text-[var(--ui-subtle)]">
						Mini sectors use yellow only — applying yellow to all non-improving drivers would clutter the leaderboard.
					</p>
				</Panel>

				<Panel title="Driver status indicators" eyebrow="Leaderboard backgrounds">
					<ul className="mt-2 space-y-3 text-sm">
						<li className="rounded-md bg-violet-800/30 px-3 py-2">Purple background — fastest overall lap time</li>
						<li className="rounded-md border border-[var(--ui-border)] px-3 py-2 opacity-50">Reduced opacity — crashed or retired</li>
						<li className="rounded-md bg-red-800/30 px-3 py-2">Red background — elimination zone in qualifying</li>
					</ul>
				</Panel>

				<Panel title="Pit lane status" eyebrow="In-lane indicators">
					<p className="mt-2 mb-3 text-sm text-[var(--ui-muted)]">Status column uses real timing feed values. Empty means driver is on track.</p>
					<div className="flex flex-col gap-2 text-sm font-mono">
						<span className="inline-block w-fit rounded bg-blue-900/50 px-2 py-1 text-blue-300">PIT</span>
						<span className="text-sm text-[var(--ui-muted)]">Driver is in the pit lane</span>
						<span className="inline-block w-fit rounded bg-yellow-900/50 px-2 py-1 text-yellow-300 mt-2">PIT OUT</span>
						<span className="text-sm text-[var(--ui-muted)]">Driver has just left the pit lane</span>
					</div>
				</Panel>

				<Panel title="Tire compounds" eyebrow="Compound icons">
					<p className="mt-2 mb-3 text-sm text-[var(--ui-muted)]">Tire icons show compound and age in laps. Multiple icons indicate a pit stop occurred.</p>
					<div className="grid grid-cols-3 gap-2 text-sm">
						{[["Soft", "bg-red-500"], ["Medium", "bg-yellow-400"], ["Hard", "bg-white"], ["Intermediate", "bg-green-500"], ["Wet", "bg-blue-500"], ["Unknown", "bg-zinc-500"]].map(([name, bg]) => (
							<div key={name} className="flex items-center gap-2">
								<span className={`inline-block h-5 w-5 rounded-full ${bg}`} />
								<span className="text-[var(--ui-muted)]">{name}</span>
							</div>
						))}
					</div>
				</Panel>

				<Panel title="Driver telemetry channels" eyebrow="Pedal and RPM display">
					<ul className="mt-2 space-y-2 text-sm">
						<li><span className="inline-block h-3 w-8 rounded bg-red-500 mr-2 align-middle" />Brake — on/off binary signal</li>
						<li><span className="inline-block h-3 w-8 rounded bg-emerald-500 mr-2 align-middle" />Throttle — percentage 0–100 %</li>
						<li><span className="inline-block h-3 w-8 rounded bg-blue-500 mr-2 align-middle" />RPM — engine revs 0–15 000</li>
					</ul>
					<p className="mt-3 text-xs text-[var(--ui-subtle)]">
						2026 Overtake Mode, Boost, and Active Aero are not displayed — the public timing feed does not expose verified fields.
					</p>
				</Panel>

				<Panel title="Weather indicators" eyebrow="Complication icons">
					<ul className="mt-2 space-y-2 text-sm text-[var(--ui-muted)]">
						<li><strong className="text-[var(--ui-text)]">TRC</strong> — track surface temperature</li>
						<li><strong className="text-[var(--ui-text)]">AIR</strong> — ambient air temperature</li>
						<li><strong className="text-[var(--ui-text)]">HUM</strong> — relative humidity percentage</li>
						<li><strong className="text-[var(--ui-text)]">RAIN</strong> — rain sensor on/off</li>
						<li><strong className="text-[var(--ui-text)]">WIND</strong> — speed in m/s plus cardinal direction</li>
					</ul>
				</Panel>

				<Panel title="Delay control" eyebrow="Stream sync">
					<p className="mt-2 text-sm text-[var(--ui-muted)]">
						F1-dash receives the timing feed before most broadcast streams. Set a delay in seconds to match your stream.
					</p>
					<SectionTitle>What to sync on</SectionTitle>
					<ul className="list-disc pl-4 text-sm text-[var(--ui-muted)] space-y-1">
						<li>Lap counter change (race)</li>
						<li>Session clock tick (practice, qualifying)</li>
						<li>Mini sector color change (if visible on broadcast)</li>
					</ul>
					<p className="mt-3 text-xs text-[var(--ui-subtle)]">
						Maximum settable delay equals time spent on the dashboard page in the current visit.
					</p>
				</Panel>
			</div>
		</div>
	);
}
