# F1 Interactive Race Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add interactive replay controls, a richer live map, driver detail panels, driver comparison, telemetry charts, intelligent alerts, and a broadcast-style presentation mode.

**Architecture:** Keep the existing dashboard route as the main operational cockpit and add small focused stores/components around it. Use existing Zustand patterns for UI state, existing `useDataStore` for live F1 data, and derive insights in pure helper functions before rendering them.

**Tech Stack:** Next.js App Router, React 19, Tailwind CSS, Zustand, motion/react, current SVG map renderer, current replay simulator.

---

## File Structure

- Create `dashboard/src/stores/useReplayControlStore.ts`: playback state shared by replay controls and `useDataEngine`.
- Modify `dashboard/src/hooks/useDataEngine.ts`: respect pause/speed/time-scrub settings.
- Create `dashboard/src/components/dashboard/ReplayControlBar.tsx`: play/pause, speed, timeline, jump controls.
- Modify `dashboard/src/app/dashboard/layout.tsx`: mount replay control bar in the dashboard shell.
- Create `dashboard/src/stores/useDriverSelectionStore.ts`: selected and compared drivers.
- Modify `dashboard/src/components/dashboard/Map.tsx`: animated traces, hover/click selection, labels, selected-driver focus styling.
- Create `dashboard/src/components/dashboard/DriverDetailPanel.tsx`: selected-driver side panel.
- Create `dashboard/src/components/dashboard/DriverComparisonPanel.tsx`: compare 2-3 drivers.
- Create `dashboard/src/components/dashboard/TelemetryPanel.tsx`: compact SVG charts for speed, throttle, brake, gear, DRS.
- Create `dashboard/src/lib/driverInsights.ts`: pure functions for pace, gap, DRS, track-limit and radio insights.
- Create `dashboard/src/components/dashboard/SmartAlerts.tsx`: intelligent alert feed.
- Create `dashboard/src/stores/usePresentationModeStore.ts`: presentation mode toggle.
- Create `dashboard/src/components/dashboard/PresentationMode.tsx`: broadcast-style view.
- Modify `dashboard/src/app/dashboard/page.tsx`: compose all new panels without nesting cards inside cards.
- Modify `tools/make-sample-replay.mjs`: add richer car telemetry and event sequences for verification.

---

### Task 1: Replay Control Store

**Files:**
- Create: `dashboard/src/stores/useReplayControlStore.ts`
- Modify: `dashboard/src/hooks/useDataEngine.ts`

- [ ] **Step 1: Create the store**

```ts
import { create } from "zustand";

type ReplaySpeed = 0.5 | 1 | 2 | 5;

type ReplayControlStore = {
	isPaused: boolean;
	speed: ReplaySpeed;
	seekOffsetMs: number;
	setPaused: (isPaused: boolean) => void;
	setSpeed: (speed: ReplaySpeed) => void;
	jumpBy: (deltaMs: number) => void;
	resetReplayControls: () => void;
};

export const useReplayControlStore = create<ReplayControlStore>((set) => ({
	isPaused: false,
	speed: 1,
	seekOffsetMs: 0,
	setPaused: (isPaused) => set({ isPaused }),
	setSpeed: (speed) => set({ speed }),
	jumpBy: (deltaMs) => set((state) => ({ seekOffsetMs: state.seekOffsetMs + deltaMs })),
	resetReplayControls: () => set({ isPaused: false, speed: 1, seekOffsetMs: 0 }),
}));
```

- [ ] **Step 2: Wire replay controls into data timing**

In `dashboard/src/hooks/useDataEngine.ts`, import the store and add refs:

```ts
import { useReplayControlStore } from "@/stores/useReplayControlStore";
```

Inside `useDataEngine`, add:

```ts
const replayPausedRef = useRef(false);
const replaySpeedRef = useRef(1);
const replaySeekOffsetRef = useRef(0);

const replayPaused = useReplayControlStore((state) => state.isPaused);
const replaySpeed = useReplayControlStore((state) => state.speed);
const replaySeekOffsetMs = useReplayControlStore((state) => state.seekOffsetMs);

useEffect(() => {
	replayPausedRef.current = replayPaused;
	replaySpeedRef.current = replaySpeed;
	replaySeekOffsetRef.current = replaySeekOffsetMs;
}, [replayPaused, replaySpeed, replaySeekOffsetMs]);
```

At the start of `handleCurrentState`, add:

```ts
if (replayPausedRef.current) return;
```

When calculating delayed timestamp, replace:

```ts
const delayedTimestamp = Date.now() - delay * 1000;
```

with:

```ts
const delayedTimestamp = Date.now() * replaySpeedRef.current - delay * 1000 + replaySeekOffsetRef.current;
```

- [ ] **Step 3: Run verification**

Run:

```bash
cd dashboard
corepack yarn lint
$env:API_URL='http://localhost:4001'; $env:NEXT_PUBLIC_LIVE_URL='http://localhost:4000'; corepack yarn build
```

Expected: both commands exit `0`.

- [ ] **Step 4: Commit**

```bash
git add dashboard/src/stores/useReplayControlStore.ts dashboard/src/hooks/useDataEngine.ts
git commit -m "feat: add replay control state"
```

---

### Task 2: Replay Control Bar

**Files:**
- Create: `dashboard/src/components/dashboard/ReplayControlBar.tsx`
- Modify: `dashboard/src/app/dashboard/layout.tsx`

- [ ] **Step 1: Create the UI component**

```tsx
"use client";

import { Pause, Play, RotateCcw, StepBack, StepForward } from "lucide-react";

import { useReplayControlStore } from "@/stores/useReplayControlStore";

const speeds = [0.5, 1, 2, 5] as const;

export default function ReplayControlBar() {
	const { isPaused, speed, setPaused, setSpeed, jumpBy, resetReplayControls } = useReplayControlStore();

	return (
		<div className="telemetry-panel flex items-center justify-between gap-3 rounded-lg p-2">
			<div className="flex items-center gap-2">
				<button className="data-chip rounded-md p-2" onClick={() => setPaused(!isPaused)} title={isPaused ? "Play" : "Pause"}>
					{isPaused ? <Play size={16} /> : <Pause size={16} />}
				</button>
				<button className="data-chip rounded-md p-2" onClick={() => jumpBy(-10_000)} title="Back 10 seconds">
					<StepBack size={16} />
				</button>
				<button className="data-chip rounded-md p-2" onClick={() => jumpBy(10_000)} title="Forward 10 seconds">
					<StepForward size={16} />
				</button>
				<button className="data-chip rounded-md p-2" onClick={resetReplayControls} title="Reset replay controls">
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
```

- [ ] **Step 2: Install lucide if missing**

Run:

```bash
cd dashboard
corepack yarn add lucide-react
```

Expected: dependency added to `dashboard/package.json`.

- [ ] **Step 3: Mount it below the static dashboard bar**

In `dashboard/src/app/dashboard/layout.tsx`, import:

```ts
import ReplayControlBar from "@/components/dashboard/ReplayControlBar";
```

Render after `MobileStaticBar`:

```tsx
<ReplayControlBar />
```

- [ ] **Step 4: Browser verification**

Open `http://localhost:3000/dashboard`.
Expected:
- Play/pause button is visible.
- Speed buttons are visible.
- Clicking pause stops data updates.
- Clicking play resumes data updates.

- [ ] **Step 5: Commit**

```bash
git add dashboard/package.json dashboard/yarn.lock dashboard/src/components/dashboard/ReplayControlBar.tsx dashboard/src/app/dashboard/layout.tsx
git commit -m "feat: add replay control bar"
```

---

### Task 3: Driver Selection and Live Map Upgrade

**Files:**
- Create: `dashboard/src/stores/useDriverSelectionStore.ts`
- Modify: `dashboard/src/components/dashboard/Map.tsx`

- [ ] **Step 1: Create selection store**

```ts
import { create } from "zustand";

type DriverSelectionStore = {
	selectedDriver: string | null;
	comparedDrivers: string[];
	setSelectedDriver: (driver: string | null) => void;
	toggleComparedDriver: (driver: string) => void;
	clearComparedDrivers: () => void;
};

export const useDriverSelectionStore = create<DriverSelectionStore>((set) => ({
	selectedDriver: null,
	comparedDrivers: [],
	setSelectedDriver: (selectedDriver) => set({ selectedDriver }),
	toggleComparedDriver: (driver) =>
		set((state) => {
			if (state.comparedDrivers.includes(driver)) {
				return { comparedDrivers: state.comparedDrivers.filter((item) => item !== driver) };
			}
			return { comparedDrivers: [...state.comparedDrivers, driver].slice(-3) };
		}),
	clearComparedDrivers: () => set({ comparedDrivers: [] }),
}));
```

- [ ] **Step 2: Make map dots selectable**

In `Map.tsx`, import the store:

```ts
import { useDriverSelectionStore } from "@/stores/useDriverSelectionStore";
```

Inside `Map`, read:

```ts
const selectedDriver = useDriverSelectionStore((state) => state.selectedDriver);
const setSelectedDriver = useDriverSelectionStore((state) => state.setSelectedDriver);
const toggleComparedDriver = useDriverSelectionStore((state) => state.toggleComparedDriver);
```

Pass props to `CarDot`:

```tsx
selected={selectedDriver === driver.RacingNumber}
onSelect={() => setSelectedDriver(driver.RacingNumber)}
onCompare={() => toggleComparedDriver(driver.RacingNumber)}
```

Update `CarDotProps`:

```ts
selected: boolean;
onSelect: () => void;
onCompare: () => void;
```

Update the `<g>`:

```tsx
<g
	role="button"
	tabIndex={0}
	onClick={onSelect}
	onDoubleClick={onCompare}
	onKeyDown={(event) => {
		if (event.key === "Enter") onSelect();
		if (event.key === " ") onCompare();
	}}
	className={clsx(
		"cursor-pointer fill-cyan-300 drop-shadow-[0_0_12px_rgba(0,229,255,0.85)]",
		{ "opacity-30": pit },
		{ "opacity-0!": hidden },
	)}
	style={{ transition: "all 1s linear", transform, ...(color && { fill: `#${color}` }) }}
>
```

Render selected ring:

```tsx
{selected && <circle className="stroke-white" r={260} fill="transparent" strokeWidth={60} />}
```

- [ ] **Step 3: Add short traces**

Add local state in `Map`:

```ts
const [driverTrails, setDriverTrails] = useState<Record<string, PositionCar[]>>({});
```

Add effect:

```ts
useEffect(() => {
	if (!positions) return;
	setDriverTrails((prev) =>
		Object.fromEntries(
			Object.entries(positions).map(([driver, pos]) => [driver, [...(prev[driver] ?? []), pos].slice(-8)]),
		),
	);
}, [positions]);
```

Render before car dots:

```tsx
{Object.entries(driverTrails).map(([driver, trail]) => (
	<polyline
		key={`trail.${driver}`}
		points={trail.map((pos) => {
			const rotated = rotate(pos.X, pos.Y, rotation, centerX, centerY);
			return `${rotated.x},${rotated.y}`;
		}).join(" ")}
		className="stroke-cyan-300/25"
		strokeWidth={45}
		fill="transparent"
		strokeLinecap="round"
	/>
))}
```

- [ ] **Step 4: Browser verification**

Expected:
- Clicking a car highlights it.
- Double-clicking a car adds it to comparison state.
- Cars leave short traces while moving.

- [ ] **Step 5: Commit**

```bash
git add dashboard/src/stores/useDriverSelectionStore.ts dashboard/src/components/dashboard/Map.tsx
git commit -m "feat: make race map interactive"
```

---

### Task 4: Driver Detail Panel

**Files:**
- Create: `dashboard/src/components/dashboard/DriverDetailPanel.tsx`
- Modify: `dashboard/src/app/dashboard/page.tsx`

- [ ] **Step 1: Create panel**

```tsx
"use client";

import { useDataStore } from "@/stores/useDataStore";
import { useDriverSelectionStore } from "@/stores/useDriverSelectionStore";

export default function DriverDetailPanel() {
	const selectedDriver = useDriverSelectionStore((state) => state.selectedDriver);
	const driver = useDataStore((state) => selectedDriver ? state.state?.DriverList?.[selectedDriver] : undefined);
	const timing = useDataStore((state) => selectedDriver ? state.state?.TimingData?.Lines?.[selectedDriver] : undefined);
	const app = useDataStore((state) => selectedDriver ? state.state?.TimingAppData?.Lines?.[selectedDriver] : undefined);
	const car = useDataStore((state) => selectedDriver ? state.carsData?.[selectedDriver] : undefined);

	if (!selectedDriver || !driver || !timing) {
		return (
			<section className="telemetry-panel rounded-lg p-3">
				<p className="panel-title">Pilot Core</p>
				<p className="mt-2 text-sm text-zinc-400">Select a driver on the map.</p>
			</section>
		);
	}

	return (
		<section className="telemetry-panel rounded-lg p-3">
			<div className="flex items-start justify-between gap-3 border-b border-cyan-300/10 pb-3">
				<div>
					<p className="panel-title">Pilot Core</p>
					<h2 className="text-2xl font-black text-white">{driver.Tla}</h2>
					<p className="text-sm text-zinc-400">{driver.FullName}</p>
				</div>
				<div className="data-chip rounded-md px-2 py-1 font-mono text-xs text-cyan-200">P{timing.Position}</div>
			</div>
			<div className="mt-3 grid grid-cols-2 gap-2 text-sm">
				<Metric label="Gap" value={timing.GapToLeader || "-"} />
				<Metric label="Interval" value={timing.IntervalToPositionAhead?.Value || "-"} />
				<Metric label="Last Lap" value={timing.LastLapTime?.Value || "-"} />
				<Metric label="Tyre" value={app?.Stints?.at(-1)?.Compound || "-"} />
				<Metric label="Speed" value={car?.Channels?.["2"] ? `${car.Channels["2"]} km/h` : "-"} />
				<Metric label="Gear" value={car?.Channels?.["3"] || "-"} />
			</div>
		</section>
	);
}

function Metric({ label, value }: { label: string; value: string }) {
	return (
		<div className="data-chip rounded-md p-2">
			<p className="font-mono text-[0.65rem] text-cyan-300 uppercase">{label}</p>
			<p className="mt-1 font-mono text-sm text-white">{value}</p>
		</div>
	);
}
```

- [ ] **Step 2: Mount in dashboard**

In `page.tsx`, import:

```ts
import DriverDetailPanel from "@/components/dashboard/DriverDetailPanel";
```

Add it near the map panel:

```tsx
<DriverDetailPanel />
```

- [ ] **Step 3: Verification**

Expected:
- No selected driver shows empty state.
- Clicking a map driver fills the panel with name, position, gap, tyre and telemetry.

- [ ] **Step 4: Commit**

```bash
git add dashboard/src/components/dashboard/DriverDetailPanel.tsx dashboard/src/app/dashboard/page.tsx
git commit -m "feat: add selected driver panel"
```

---

### Task 5: Driver Comparison Panel

**Files:**
- Create: `dashboard/src/components/dashboard/DriverComparisonPanel.tsx`
- Modify: `dashboard/src/app/dashboard/page.tsx`

- [ ] **Step 1: Create comparison panel**

```tsx
"use client";

import { useDataStore } from "@/stores/useDataStore";
import { useDriverSelectionStore } from "@/stores/useDriverSelectionStore";

export default function DriverComparisonPanel() {
	const comparedDrivers = useDriverSelectionStore((state) => state.comparedDrivers);
	const clearComparedDrivers = useDriverSelectionStore((state) => state.clearComparedDrivers);
	const drivers = useDataStore((state) => state.state?.DriverList);
	const timing = useDataStore((state) => state.state?.TimingData?.Lines);

	return (
		<section className="telemetry-panel rounded-lg p-3">
			<div className="flex items-center justify-between border-b border-cyan-300/10 pb-3">
				<div>
					<p className="panel-title">Head to Head</p>
					<h2 className="text-xl font-black text-white">Driver Compare</h2>
				</div>
				<button className="data-chip rounded-md px-2 py-1 text-xs text-cyan-200" onClick={clearComparedDrivers}>Clear</button>
			</div>
			<div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-3">
				{comparedDrivers.length === 0 && <p className="text-sm text-zinc-400">Double-click drivers on the map to compare.</p>}
				{comparedDrivers.map((driverNumber) => {
					const driver = drivers?.[driverNumber];
					const line = timing?.[driverNumber];
					return (
						<div key={driverNumber} className="data-chip rounded-md p-3">
							<p className="text-lg font-black text-white">{driver?.Tla ?? driverNumber}</p>
							<p className="font-mono text-xs text-cyan-200">P{line?.Position ?? "-"}</p>
							<p className="mt-2 text-sm text-zinc-300">{line?.GapToLeader ?? "-"}</p>
							<p className="text-sm text-zinc-400">{line?.LastLapTime?.Value ?? "-"}</p>
						</div>
					);
				})}
			</div>
		</section>
	);
}
```

- [ ] **Step 2: Mount in dashboard**

```tsx
import DriverComparisonPanel from "@/components/dashboard/DriverComparisonPanel";
```

Place below `DriverDetailPanel`.

- [ ] **Step 3: Verification**

Expected:
- Double-click up to three cars.
- Comparison cards show TLA, position, gap and last lap.
- Clear removes all cards.

- [ ] **Step 4: Commit**

```bash
git add dashboard/src/components/dashboard/DriverComparisonPanel.tsx dashboard/src/app/dashboard/page.tsx
git commit -m "feat: add driver comparison panel"
```

---

### Task 6: Telemetry Panel

**Files:**
- Create: `dashboard/src/components/dashboard/TelemetryPanel.tsx`
- Modify: `dashboard/src/app/dashboard/page.tsx`
- Modify: `tools/make-sample-replay.mjs`

- [ ] **Step 1: Extend sample replay with `CarDataZ`**

In `tools/make-sample-replay.mjs`, create:

```js
const carFrame = (timestamp, tick = 0) => ({
	Entries: [
		{
			Utc: timestamp,
			Cars: Object.fromEntries(
				drivers.map((driver, index) => {
					const speed = 245 + ((tick * 13 + index * 7) % 85);
					return [
						driver[0],
						{
							Channels: {
								"0": String(25 + ((tick + index) % 75)),
								"2": String(speed),
								"3": String(2 + ((tick + index) % 6)),
								"4": String(tick % 5 === 0 ? 1 : 0),
								"5": String(20 + ((tick * 3 + index) % 80)),
							},
						},
					];
				}),
			),
		},
	],
});
```

Set initial:

```js
initial.CarDataZ = compressed(carFrame(time(10)));
```

Add per tick:

```js
lines.push(feed("CarDataZ", compressed(carFrame(time(second), tick + 1)), time(second)));
```

- [ ] **Step 2: Create telemetry panel**

```tsx
"use client";

import { useDataStore } from "@/stores/useDataStore";
import { useDriverSelectionStore } from "@/stores/useDriverSelectionStore";

export default function TelemetryPanel() {
	const selectedDriver = useDriverSelectionStore((state) => state.selectedDriver);
	const driver = useDataStore((state) => selectedDriver ? state.state?.DriverList?.[selectedDriver] : undefined);
	const car = useDataStore((state) => selectedDriver ? state.carsData?.[selectedDriver] : undefined);
	const channels = car?.Channels;

	return (
		<section className="telemetry-panel rounded-lg p-3">
			<p className="panel-title">Telemetry Stream</p>
			<h2 className="text-xl font-black text-white">{driver?.Tla ?? "No driver selected"}</h2>
			<div className="mt-3 grid grid-cols-2 gap-2">
				<TelemetryBar label="Throttle" value={Number(channels?.["0"] ?? 0)} max={100} />
				<TelemetryBar label="Brake" value={Number(channels?.["5"] ?? 0)} max={100} />
				<TelemetryBar label="Speed" value={Number(channels?.["2"] ?? 0)} max={360} />
				<TelemetryBar label="DRS" value={Number(channels?.["4"] ?? 0) * 100} max={100} />
			</div>
		</section>
	);
}

function TelemetryBar({ label, value, max }: { label: string; value: number; max: number }) {
	const percent = Math.min(100, Math.max(0, (value / max) * 100));
	return (
		<div className="data-chip rounded-md p-2">
			<div className="flex justify-between font-mono text-xs text-cyan-200">
				<span>{label}</span>
				<span>{Math.round(value)}</span>
			</div>
			<div className="mt-2 h-2 rounded-full bg-black/50">
				<div className="h-full rounded-full bg-cyan-300" style={{ width: `${percent}%` }} />
			</div>
		</div>
	);
}
```

- [ ] **Step 3: Regenerate replay and verify**

```bash
node tools/make-sample-replay.mjs
```

Expected: `sample-replay/synthetic-f1-full-grid.data.txt` is regenerated and includes `CarDataZ`.

- [ ] **Step 4: Commit**

```bash
git add tools/make-sample-replay.mjs sample-replay/synthetic-f1-full-grid.data.txt dashboard/src/components/dashboard/TelemetryPanel.tsx dashboard/src/app/dashboard/page.tsx
git commit -m "feat: add selected driver telemetry"
```

---

### Task 7: Smart Alerts

**Files:**
- Create: `dashboard/src/lib/driverInsights.ts`
- Create: `dashboard/src/components/dashboard/SmartAlerts.tsx`
- Modify: `dashboard/src/app/dashboard/page.tsx`

- [ ] **Step 1: Create pure insight helpers**

```ts
import type { State } from "@/types/state.type";

export type SmartAlert = {
	id: string;
	severity: "info" | "warning" | "critical";
	title: string;
	body: string;
	driverNumber?: string;
};

export function buildSmartAlerts(state: State | null): SmartAlert[] {
	const timing = state?.TimingData?.Lines;
	const drivers = state?.DriverList;
	const messages = state?.RaceControlMessages?.Messages;
	if (!timing || !drivers) return [];

	const alerts: SmartAlert[] = [];

	for (const line of Object.values(timing)) {
		if (line.IntervalToPositionAhead?.Catching) {
			const driver = drivers[line.RacingNumber];
			alerts.push({
				id: `catching.${line.RacingNumber}`,
				severity: "info",
				title: `${driver?.Tla ?? line.RacingNumber} is closing`,
				body: `Interval to the car ahead is ${line.IntervalToPositionAhead.Value || "shrinking"}.`,
				driverNumber: line.RacingNumber,
			});
		}
	}

	const recentMessages = Array.isArray(messages) ? messages : Object.values(messages ?? {});
	for (const [index, msg] of recentMessages.slice(-5).entries()) {
		if (msg.Message?.toLowerCase().includes("track limits")) {
			alerts.push({
				id: `track-limits.${index}.${msg.Utc}`,
				severity: "warning",
				title: "Track limits",
				body: msg.Message,
			});
		}
	}

	return alerts.slice(-8).reverse();
}
```

- [ ] **Step 2: Create component**

```tsx
"use client";

import clsx from "clsx";

import { buildSmartAlerts } from "@/lib/driverInsights";
import { useDataStore } from "@/stores/useDataStore";
import { useDriverSelectionStore } from "@/stores/useDriverSelectionStore";

export default function SmartAlerts() {
	const state = useDataStore((store) => store.state);
	const setSelectedDriver = useDriverSelectionStore((store) => store.setSelectedDriver);
	const alerts = buildSmartAlerts(state);

	return (
		<section className="telemetry-panel tech-scrollbar h-[30rem] overflow-y-auto rounded-lg p-3">
			<p className="panel-title">Race Intelligence</p>
			<h2 className="text-xl font-black text-white">Smart Alerts</h2>
			<div className="mt-3 flex flex-col gap-2">
				{alerts.length === 0 && <p className="text-sm text-zinc-400">No tactical alerts yet.</p>}
				{alerts.map((alert) => (
					<button
						key={alert.id}
						className="data-chip rounded-md p-3 text-left"
						onClick={() => alert.driverNumber && setSelectedDriver(alert.driverNumber)}
					>
						<p className={clsx("font-mono text-xs uppercase", alert.severity === "warning" ? "text-amber-300" : "text-cyan-300")}>
							{alert.severity}
						</p>
						<p className="mt-1 font-bold text-white">{alert.title}</p>
						<p className="text-sm text-zinc-400">{alert.body}</p>
					</button>
				))}
			</div>
		</section>
	);
}
```

- [ ] **Step 3: Mount and verify**

Expected:
- Catching drivers create alerts.
- Track limit messages create alerts.
- Clicking a driver alert selects the driver.

- [ ] **Step 4: Commit**

```bash
git add dashboard/src/lib/driverInsights.ts dashboard/src/components/dashboard/SmartAlerts.tsx dashboard/src/app/dashboard/page.tsx
git commit -m "feat: add smart race alerts"
```

---

### Task 8: Presentation Mode

**Files:**
- Create: `dashboard/src/stores/usePresentationModeStore.ts`
- Create: `dashboard/src/components/dashboard/PresentationMode.tsx`
- Modify: `dashboard/src/app/dashboard/page.tsx`

- [ ] **Step 1: Create presentation mode store**

```ts
import { create } from "zustand";

type PresentationModeStore = {
	enabled: boolean;
	setEnabled: (enabled: boolean) => void;
};

export const usePresentationModeStore = create<PresentationModeStore>((set) => ({
	enabled: false,
	setEnabled: (enabled) => set({ enabled }),
}));
```

- [ ] **Step 2: Create presentation view**

```tsx
"use client";

import LeaderBoard from "@/components/dashboard/LeaderBoard";
import Map from "@/components/dashboard/Map";
import SmartAlerts from "@/components/dashboard/SmartAlerts";

export default function PresentationMode() {
	return (
		<div className="grid h-full grid-cols-[minmax(36rem,1fr)_26rem] gap-3 p-3">
			<section className="telemetry-panel min-h-0 rounded-lg p-3">
				<div className="h-full overflow-hidden rounded-md border border-cyan-300/10 bg-black/30">
					<Map />
				</div>
			</section>
			<aside className="flex min-h-0 flex-col gap-3">
				<section className="telemetry-panel tech-scrollbar min-h-0 flex-1 overflow-auto rounded-lg p-3">
					<p className="panel-title">Broadcast Grid</p>
					<LeaderBoard />
				</section>
				<SmartAlerts />
			</aside>
		</div>
	);
}
```

- [ ] **Step 3: Toggle in dashboard page**

In `page.tsx`:

```ts
import PresentationMode from "@/components/dashboard/PresentationMode";
import { usePresentationModeStore } from "@/stores/usePresentationModeStore";
```

At top of `Page`:

```ts
const presentationMode = usePresentationModeStore((state) => state.enabled);
const setPresentationMode = usePresentationModeStore((state) => state.setEnabled);
```

Render:

```tsx
<button className="data-chip rounded-md px-3 py-2 text-sm text-cyan-200" onClick={() => setPresentationMode(!presentationMode)}>
	{presentationMode ? "Dashboard" : "Presentation"}
</button>
{presentationMode ? <PresentationMode /> : <RegularDashboard />}
```

Move current dashboard body into:

```tsx
function RegularDashboard() {
	return <>{/* existing dashboard sections */}</>;
}
```

- [ ] **Step 4: Browser verification**

Expected:
- Toggle switches between operational dashboard and presentation view.
- Presentation view shows big map, compact leaderboard and smart alerts.
- No text overlaps at desktop and mobile widths.

- [ ] **Step 5: Commit**

```bash
git add dashboard/src/stores/usePresentationModeStore.ts dashboard/src/components/dashboard/PresentationMode.tsx dashboard/src/app/dashboard/page.tsx
git commit -m "feat: add broadcast presentation mode"
```

---

## Final Verification

- [ ] **Run lint**

```bash
cd dashboard
corepack yarn lint
```

Expected: exit `0`.

- [ ] **Run production build**

```bash
cd dashboard
$env:API_URL='http://localhost:4001'; $env:NEXT_PUBLIC_LIVE_URL='http://localhost:4000'; corepack yarn build
```

Expected: exit `0`.

- [ ] **Run replay generator syntax check**

```bash
node --check tools/make-sample-replay.mjs
node tools/make-sample-replay.mjs
```

Expected: both commands exit `0`.

- [ ] **Browser QA**

Open `http://localhost:3000/dashboard`.

Expected:
- Replay controls render and affect data flow.
- Map cars move, can be clicked, and show traces.
- Driver detail updates on selection.
- Comparison accepts up to three drivers.
- Telemetry bars update for selected driver.
- Smart alerts render from replay data.
- Presentation mode is usable and visually clean.

---

## Execution Order

1. Replay control store.
2. Replay control bar.
3. Interactive map and driver selection.
4. Driver detail panel.
5. Driver comparison panel.
6. Telemetry panel and richer replay data.
7. Smart alerts.
8. Presentation mode.
9. Full verification and push after user approval.

## Scope Notes

- Do not push to GitHub without asking first.
- Do not include `.log` files or temporary screenshots.
- Keep work on `codex/modern-tech-ui` unless the user asks for a new branch.
- Prefer small commits after each task so the project can be rolled back feature-by-feature.
