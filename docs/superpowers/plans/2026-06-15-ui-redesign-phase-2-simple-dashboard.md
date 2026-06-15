# UI Redesign Phase 2: Simple Live Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a complete 1920x1080 broadcast-style live dashboard where classification dominates, strategic context and alerts are immediately legible, the map is secondary, and driver detail opens in a side drawer.

**Architecture:** Derive stable user-facing models from existing live stores using pure functions. Render compact New UI panels from those models and compose them in `SimpleDashboardView`. Keep existing Legacy dashboard components untouched; reuse map, alerts, strategy, replay, and selection behavior through wrappers or focused adapters.

**Tech Stack:** React 19, Zustand selectors, Tailwind CSS 4, Motion, Lucide React, Vitest, React Testing Library.

---

## File Structure

Create:

- `dashboard/src/lib/view-models/liveTiming.ts`
- `dashboard/src/lib/view-models/liveTiming.test.ts`
- `dashboard/src/lib/view-models/raceStory.ts`
- `dashboard/src/lib/view-models/raceStory.test.ts`
- `dashboard/src/lib/view-models/driverDrawer.ts`
- `dashboard/src/lib/view-models/driverDrawer.test.ts`
- `dashboard/src/components/new-ui/live/CompactTimingBoard.tsx`
- `dashboard/src/components/new-ui/live/CompactTimingRow.tsx`
- `dashboard/src/components/new-ui/live/RaceStoryPanel.tsx`
- `dashboard/src/components/new-ui/live/KeyAlertsPanel.tsx`
- `dashboard/src/components/new-ui/live/CompactTrackMap.tsx`
- `dashboard/src/components/new-ui/live/DriverDetailDrawer.tsx`
- `dashboard/src/components/new-ui/live/SimpleDashboardView.tsx`
- `dashboard/src/components/new-ui/live/LiveDashboardState.tsx`
- `dashboard/src/components/new-ui/live/SimpleDashboardView.test.tsx`

Modify:

- `dashboard/src/app/dashboard/page.tsx`
- `dashboard/src/components/dashboard/Map.tsx` only if a nonvisual adapter prop is required.
- `dashboard/src/components/dashboard/SmartAlerts.tsx` only if model extraction is required.
- `dashboard/src/components/dashboard/StrategyPanel.tsx` only if model extraction is required.
- `dashboard/src/stores/useDriverSelectionStore.ts`

### Task 1: Define Compact Timing View Model

**Files:**
- Create: `dashboard/src/lib/view-models/liveTiming.ts`
- Create: `dashboard/src/lib/view-models/liveTiming.test.ts`

- [ ] **Step 1: Write failing model tests**

Cover leader, normal driver, pit, pit-out, retired, stopped, missing gap, catching interval, position gain/loss, tyre compound, tyre age, and team-color fallback.

Expected model:

```ts
export type CompactTimingRowModel = {
	driverNumber: string;
	position: number | null;
	positionChange: number | null;
	code: string;
	fullName: string;
	teamName: string;
	teamColor: string;
	compound: string | null;
	tyreAge: number | null;
	primaryGap: string;
	secondaryGap: string | null;
	trend: "closing" | "stable" | "falling-back" | null;
	status: "running" | "pit" | "pit-out" | "retired" | "stopped";
	lastLap: string | null;
	bestLap: string | null;
};
```

Test rule: unavailable gap becomes `-`; leader becomes `Leader`; no value becomes numeric zero only when source value is explicitly zero.

- [ ] **Step 2: Verify failure**

```powershell
corepack yarn test src/lib/view-models/liveTiming.test.ts
```

- [ ] **Step 3: Implement builder**

```ts
export function buildCompactTimingRows(input: {
	drivers: DriverList | undefined;
	timing: TimingData | undefined;
	appTiming: TimingAppData | undefined;
	previousPositions?: Record<string, number>;
}): CompactTimingRowModel[]
```

Sort through existing `sortPos`. Read the final stint with `.at(-1)`. Use `getDriverStatus` for pit/retirement semantics. Do not read Zustand inside this module.

- [ ] **Step 4: Verify and commit**

```powershell
corepack yarn test src/lib/view-models/liveTiming.test.ts
git add dashboard/src/lib/view-models/liveTiming.ts dashboard/src/lib/view-models/liveTiming.test.ts
git commit -m "feat: derive compact live timing rows"
```

### Task 2: Build Compact Timing Board

**Files:**
- Create: `dashboard/src/components/new-ui/live/CompactTimingRow.tsx`
- Create: `dashboard/src/components/new-ui/live/CompactTimingBoard.tsx`
- Create: `dashboard/src/components/new-ui/live/CompactTimingBoard.test.tsx`

- [ ] **Step 1: Write interaction and semantics tests**

Assert:

- row accessible name includes position and driver;
- click selects driver;
- Enter selects driver;
- status has visible text, not color alone;
- compact row does not render sectors or car channels;
- selected row exposes `aria-selected="true"`.

- [ ] **Step 2: Implement row contract**

```tsx
type CompactTimingRowProps = {
	row: CompactTimingRowModel;
	selected: boolean;
	onSelect: (driverNumber: string) => void;
};
```

Grid columns at 1920px: `3rem minmax(8rem,1.2fr) 5.5rem 6.5rem 5rem`. Render position, identity, tyre, gap/trend, status. Team color appears as a 4px identity bar and small marker, never a full saturated background.

Use Motion layout animation only when row position changes. Disable the transition through the global reduced-motion rule. Do not animate changing lap times, gaps, or telemetry values.

- [ ] **Step 3: Implement connected board**

Use focused selectors for `DriverList`, `TimingData`, and `TimingAppData`. Memoize `buildCompactTimingRows`. Show 22 fixed-height skeleton rows during loading and `ViewState` for no timing.

- [ ] **Step 4: Verify and commit**

```powershell
corepack yarn test src/components/new-ui/live/CompactTimingBoard.test.tsx
git add dashboard/src/components/new-ui/live/CompactTimingRow.tsx dashboard/src/components/new-ui/live/CompactTimingBoard.tsx dashboard/src/components/new-ui/live/CompactTimingBoard.test.tsx
git commit -m "feat: add broadcast timing board"
```

### Task 3: Derive Race Story And Key Alerts

**Files:**
- Create: `dashboard/src/lib/view-models/raceStory.ts`
- Create: `dashboard/src/lib/view-models/raceStory.test.ts`

- [ ] **Step 1: Write ordered-story tests**

Expected model:

```ts
export type RaceStoryItem = {
	id: string;
	kind: "flag" | "penalty" | "pit" | "battle" | "strategy" | "weather" | "radio";
	priority: 1 | 2 | 3;
	title: string;
	detail: string;
	timestamp: string | null;
	driverNumber: string | null;
};

export type RaceStrategySignal = {
	id: string;
	driverNumber: string | null;
	title: string;
	detail: string;
	priority: 1 | 2 | 3;
};
```

Test deduplication by stable `id`, ordering by priority then recency, maximum six items, track-limit warning versus penalty distinction, and closing battle explanation such as `NOR closing on PIA, 0.7s gap`.

- [ ] **Step 2: Implement composition over existing helpers**

```ts
export function buildRaceStory(input: {
	state: State | null;
	alerts: StoredAlert[];
	strategySignals: RaceStrategySignal[];
}): RaceStoryItem[]
```

Import `StoredAlert` from `useAlertStore`. Build `RaceStrategySignal[]` from existing `PaceModel`, `PitWindow`, and undercut helpers before calling this function. Reuse `classifyRaceControlMessage`, existing alert rules, and strategy helpers. Do not duplicate rule detection inside components.

- [ ] **Step 3: Verify and commit**

```powershell
corepack yarn test src/lib/view-models/raceStory.test.ts
git add dashboard/src/lib/view-models/raceStory.ts dashboard/src/lib/view-models/raceStory.test.ts
git commit -m "feat: derive readable race stories"
```

### Task 4: Build Story And Alert Panels

**Files:**
- Create: `dashboard/src/components/new-ui/live/RaceStoryPanel.tsx`
- Create: `dashboard/src/components/new-ui/live/KeyAlertsPanel.tsx`
- Create: `dashboard/src/components/new-ui/live/RaceStoryPanel.test.tsx`

- [ ] **Step 1: Write tests**

Assert top priority appears first, maximum six visible items, selecting a driver story updates `useDriverSelectionStore`, and alert text includes category and impact.

- [ ] **Step 2: Implement panels**

`RaceStoryPanel` renders top three story cards without scrolling. `KeyAlertsPanel` renders a bounded list of six with internal scroll. Both accept `RaceStoryItem[]` props; connected wrappers derive data separately.

- [ ] **Step 3: Verify and commit**

```powershell
corepack yarn test src/components/new-ui/live/RaceStoryPanel.test.tsx
git add dashboard/src/components/new-ui/live/RaceStoryPanel.tsx dashboard/src/components/new-ui/live/KeyAlertsPanel.tsx dashboard/src/components/new-ui/live/RaceStoryPanel.test.tsx
git commit -m "feat: add race story and key alert panels"
```

### Task 5: Add Secondary Compact Map

**Files:**
- Create: `dashboard/src/components/new-ui/live/CompactTrackMap.tsx`
- Modify: `dashboard/src/components/dashboard/Map.tsx` only if required.
- Create: `dashboard/src/components/new-ui/live/CompactTrackMap.test.tsx`

- [ ] **Step 1: Test compact behavior**

Assert wrapper title is `Track position`, helper text identifies map as orientation, selected driver remains forwarded, and no technical overlay controls are shown in Simple mode.

- [ ] **Step 2: Add adapter props without changing Legacy defaults**

If `Map` needs configuration, add optional props with current behavior as defaults:

```ts
type MapProps = {
	variant?: "legacy" | "compact" | "technical";
	showLabels?: boolean;
	showTrails?: boolean;
};
```

Legacy call sites pass no props and remain unchanged. Compact wrapper uses `variant="compact"`, limited labels, no trails, and selected-driver focus.

- [ ] **Step 3: Verify and commit**

```powershell
corepack yarn test src/components/new-ui/live/CompactTrackMap.test.tsx src/lib/mapMotion.test.ts
git add dashboard/src/components/new-ui/live/CompactTrackMap.tsx dashboard/src/components/new-ui/live/CompactTrackMap.test.tsx dashboard/src/components/dashboard/Map.tsx
git commit -m "feat: add compact secondary track map"
```

### Task 6: Derive Driver Drawer Model

**Files:**
- Create: `dashboard/src/lib/view-models/driverDrawer.ts`
- Create: `dashboard/src/lib/view-models/driverDrawer.test.ts`

- [ ] **Step 1: Write model tests**

Model must include identity, position, gap, current stint, stops, last/best lap, last five local laps, pace direction, speed, gear, throttle, brake, DRS when trustworthy, strategy summary, and related alerts.

```ts
export type DriverDrawerModel = {
	driverNumber: string;
	code: string;
	fullName: string;
	teamName: string;
	teamColor: string;
	positionLabel: string;
	gapLabel: string;
	stint: { compound: string; age: number | null; stops: number } | null;
	laps: { lap: number; time: string; deltaToBest: string | null }[];
	telemetry: { speed: string | null; gear: string | null; throttle: number | null; brake: boolean | null; drs: string | null };
	strategySummary: string | null;
	alerts: RaceStoryItem[];
};
```

Test 2026 DRS behavior through existing `getDriverStatus` policy; do not infer unsupported telemetry.

- [ ] **Step 2: Implement builder**

```ts
export function buildDriverDrawerModel(input: {
	driverNumber: string | null;
	state: State | null;
	carsData: CarsData | null;
	laps: LapRecord[];
	story: RaceStoryItem[];
}): DriverDrawerModel | null
```

- [ ] **Step 3: Verify and commit**

```powershell
corepack yarn test src/lib/view-models/driverDrawer.test.ts
git add dashboard/src/lib/view-models/driverDrawer.ts dashboard/src/lib/view-models/driverDrawer.test.ts
git commit -m "feat: derive selected driver summary"
```

### Task 7: Build Accessible Driver Drawer

**Files:**
- Create: `dashboard/src/components/new-ui/live/DriverDetailDrawer.tsx`
- Create: `dashboard/src/components/new-ui/live/DriverDetailDrawer.test.tsx`
- Modify: `dashboard/src/stores/useDriverSelectionStore.ts`

- [ ] **Step 1: Add explicit clear action to selection store**

Add:

```ts
clearSelectedDriver: () => void;
```

Implementation sets only `selectedDriver: null`; comparisons remain unchanged.

- [ ] **Step 2: Test drawer interactions**

Assert drawer uses `role="dialog"`, has driver name, closes with button and Escape, returns focus to the selected timing row, and does not clear comparisons.

- [ ] **Step 3: Implement drawer**

Use Motion for enter/exit unless reduced motion. Width: `min(28rem, 38vw)` at 1920px. Sections: driver header, race position, tyre/stint, pace and recent laps, compact telemetry, strategy, related alerts. Each unavailable section uses `ViewState`, not fabricated values.

- [ ] **Step 4: Verify and commit**

```powershell
corepack yarn test src/components/new-ui/live/DriverDetailDrawer.test.tsx dashboard/test/driverComparison.test.ts
git add dashboard/src/stores/useDriverSelectionStore.ts dashboard/src/components/new-ui/live/DriverDetailDrawer.tsx dashboard/src/components/new-ui/live/DriverDetailDrawer.test.tsx
git commit -m "feat: add Simple mode driver drawer"
```

### Task 8: Build Simple Dashboard Composition

**Files:**
- Create: `dashboard/src/components/new-ui/live/SimpleDashboardView.tsx`
- Create: `dashboard/src/components/new-ui/live/SimpleDashboardView.test.tsx`

- [ ] **Step 1: Write layout contract test**

Assert data areas and order:

```text
classification -> race story -> alerts/strategy -> compact map
```

At desktop, classification column must use `minmax(42rem, 1.5fr)`, context column `minmax(24rem, 0.8fr)`, and secondary column `minmax(18rem, 0.55fr)`. Drawer overlays/replaces secondary column rather than shrinking classification below 42rem.

- [ ] **Step 2: Implement composition**

```tsx
export default function SimpleDashboardView() {
	return (
		<div data-testid="simple-dashboard" className="grid h-full min-h-0 grid-cols-[minmax(42rem,1.5fr)_minmax(24rem,.8fr)_minmax(18rem,.55fr)] gap-3 overflow-hidden p-3">
			<CompactTimingBoard />
			<div className="grid min-h-0 grid-rows-[auto_1fr] gap-3"><RaceStoryPanel /><KeyAlertsPanel /></div>
			<div className="grid min-h-0 grid-rows-[minmax(14rem,.7fr)_minmax(18rem,1fr)] gap-3"><CompactTrackMap /><SimpleStrategySummary /></div>
			<DriverDetailDrawer />
		</div>
	);
}
```

Create `SimpleStrategySummary` as a compact adapter over existing strategy helpers; do not mount the dense Legacy `StrategyPanel` unchanged.

- [ ] **Step 3: Verify and commit**

```powershell
corepack yarn test src/components/new-ui/live/SimpleDashboardView.test.tsx
git add dashboard/src/components/new-ui/live/SimpleDashboardView.tsx dashboard/src/components/new-ui/live/SimpleDashboardView.test.tsx dashboard/src/components/new-ui/live/SimpleStrategySummary.tsx
git commit -m "feat: compose Simple live dashboard"
```

### Task 9: Add Live, Connecting, No-Session, Ended, And Error States

**Files:**
- Create: `dashboard/src/components/new-ui/live/LiveDashboardState.tsx`
- Create: `dashboard/src/components/new-ui/live/LiveDashboardState.test.tsx`

- [ ] **Step 1: Test state resolver**

Explicit states:

```ts
type LiveDashboardMode = "connecting" | "no-session" | "live" | "replay" | "ended" | "error";
```

Test that disconnected with retained replay data is `replay`, not `connecting`; ended session is `ended`; connected without SessionInfo is `no-session`.

- [ ] **Step 2: Implement state component**

`live` and `replay` render `SimpleDashboardView`. Other states render New UI-specific messages and actions. Reuse countdown data from existing `NoLiveSession`, but create a presentation adapter rather than nesting the Legacy panel.

- [ ] **Step 3: Verify and commit**

```powershell
corepack yarn test src/components/new-ui/live/LiveDashboardState.test.tsx dashboard/test/noLiveLayout.test.ts
git add dashboard/src/components/new-ui/live/LiveDashboardState.tsx dashboard/src/components/new-ui/live/LiveDashboardState.test.tsx
git commit -m "feat: add truthful Simple dashboard states"
```

### Task 10: Wire Simple Dashboard Into Route Boundary

**Files:**
- Modify: `dashboard/src/app/dashboard/page.tsx`
- Modify: `dashboard/src/app/dashboard/layout.tsx` if workspace height needs shell adjustment.
- Modify: `dashboard/test/raceControlLayout.test.ts`
- Create: `dashboard/test/simpleDashboardRoute.test.ts`

- [ ] **Step 1: Preserve current page as `LegacyDashboardPage`**

Move current page JSX into a local exported function without changing markup. Default export becomes:

```tsx
export default function DashboardPage() {
	return (
		<UiModeBoundary
			legacy={<LegacyDashboardPage />}
			simple={<LiveDashboardState density="simple" />}
			detailed={<NewUiCompatibilityBoundary routeName="Detailed dashboard"><LegacyDashboardPage /></NewUiCompatibilityBoundary>}
		/>
	);
}
```

- [ ] **Step 2: Update source-level route tests**

Assert current Legacy components still appear inside `LegacyDashboardPage`, Simple branch uses `LiveDashboardState`, and Detailed remains explicit fallback.

- [ ] **Step 3: Run full verification**

```powershell
corepack yarn test
corepack yarn lint
$env:API_URL='http://localhost:4001'; $env:NEXT_PUBLIC_LIVE_URL='http://localhost:4000'; corepack yarn build
```

- [ ] **Step 4: Browser QA at 1920x1080**

Verify classification is largest region, map is secondary, no document scrollbar exists, internal lists scroll, selected driver drawer opens/closes, mode switching preserves selection, replay controls remain functional, and Legacy is visually unchanged.

- [ ] **Step 5: Commit**

```powershell
git add dashboard/src/app/dashboard/page.tsx dashboard/src/app/dashboard/layout.tsx dashboard/test/raceControlLayout.test.ts dashboard/test/simpleDashboardRoute.test.ts
git commit -m "feat: enable Simple New UI dashboard"
```

## Phase 2 Completion Gate

- [ ] All phase tests and full suite pass.
- [ ] 1920x1080 Simple view has no document scrolling.
- [ ] Drawer keyboard behavior verified.
- [ ] Team/FIA colors verified semantically.
- [ ] Legacy dashboard screenshot matches phase 1 baseline.
- [ ] Commit checkpoint:

```powershell
git commit --allow-empty -m "chore: complete Simple dashboard phase"
```
