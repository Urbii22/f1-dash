# UI Redesign Phase 3: Detailed Live Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a pit-wall Detailed dashboard with accessible resizable panels, persisted per-preset proportions, and Race, Strategy, and Driver workspace presets.

**Architecture:** Define pure layout schemas and normalization before UI. Persist only validated proportions by route/preset. Compose existing domain data through focused New UI technical panels. Use fixed panel topology with resizable splitters; do not implement drag-and-drop.

**Tech Stack:** React 19, Zustand persist, Tailwind CSS Grid, Pointer Events, ARIA separators, Vitest, React Testing Library.

---

## File Structure

Create:

- `dashboard/src/lib/detailedLayout.ts`
- `dashboard/src/lib/detailedLayout.test.ts`
- `dashboard/src/stores/useDetailedLayoutStore.ts`
- `dashboard/src/stores/useDetailedLayoutStore.test.ts`
- `dashboard/src/components/new-ui/layout/ResizableWorkspace.tsx`
- `dashboard/src/components/new-ui/layout/WorkspaceSplitter.tsx`
- `dashboard/src/components/new-ui/layout/PresetSelector.tsx`
- `dashboard/src/components/new-ui/layout/ResizableWorkspace.test.tsx`
- `dashboard/src/components/new-ui/live/TechnicalTimingBoard.tsx`
- `dashboard/src/components/new-ui/live/TechnicalTelemetryPanel.tsx`
- `dashboard/src/components/new-ui/live/TechnicalStrategyPanel.tsx`
- `dashboard/src/components/new-ui/live/TechnicalEventsPanel.tsx`
- `dashboard/src/components/new-ui/live/TechnicalWeatherPanel.tsx`
- `dashboard/src/components/new-ui/live/TechnicalMapPanel.tsx`
- `dashboard/src/components/new-ui/live/DetailedDashboardView.tsx`
- `dashboard/src/components/new-ui/live/DetailedDashboardView.test.tsx`

Modify:

- `dashboard/src/app/dashboard/page.tsx`
- `dashboard/src/components/dashboard/Map.tsx` only for `technical` adapter props.
- `dashboard/src/components/dashboard/DriverComparisonPanel.tsx` only to extract pure subviews/models if needed.

### Task 1: Define Layout Schemas And Defaults

**Files:**
- Create: `dashboard/src/lib/detailedLayout.ts`
- Create: `dashboard/src/lib/detailedLayout.test.ts`

- [ ] **Step 1: Write normalization tests**

Define:

```ts
export type DetailedPreset = "race" | "strategy" | "driver";
export type DashboardLayout = {
	primary: number;
	secondaryTop: number;
	bottomLeft: number;
};
```

Defaults:

```ts
export const dashboardPresetDefaults: Record<DetailedPreset, DashboardLayout> = {
	race: { primary: 48, secondaryTop: 58, bottomLeft: 55 },
	strategy: { primary: 42, secondaryTop: 45, bottomLeft: 62 },
	driver: { primary: 38, secondaryTop: 52, bottomLeft: 46 },
};
```

Test clamps: `primary 32..62`, `secondaryTop 30..70`, `bottomLeft 35..70`; malformed values reset only the malformed field to preset default.

- [ ] **Step 2: Implement pure functions**

```ts
export function normalizeDashboardLayout(value: unknown, preset: DetailedPreset): DashboardLayout;
export function updateDashboardLayout(layout: DashboardLayout, key: keyof DashboardLayout, value: number): DashboardLayout;
export function layoutStorageKey(route: string, preset: DetailedPreset): string;
```

- [ ] **Step 3: Verify and commit**

```powershell
corepack yarn test src/lib/detailedLayout.test.ts
git add dashboard/src/lib/detailedLayout.ts dashboard/src/lib/detailedLayout.test.ts
git commit -m "feat: define Detailed workspace layouts"
```

### Task 2: Persist Preset And Layout State

**Files:**
- Create: `dashboard/src/stores/useDetailedLayoutStore.ts`
- Create: `dashboard/src/stores/useDetailedLayoutStore.test.ts`

- [ ] **Step 1: Write store tests**

Test active preset default `race`, independent values for `dashboard:race` and `dashboard:strategy`, reset one preset without deleting others, and invalid persisted layout normalization.

- [ ] **Step 2: Implement store API**

```ts
type DetailedLayoutStore = {
	activePresetByRoute: Record<string, DetailedPreset>;
	layouts: Record<string, DashboardLayout>;
	setPreset: (route: string, preset: DetailedPreset) => void;
	setLayoutValue: (route: string, preset: DetailedPreset, key: keyof DashboardLayout, value: number) => void;
	resetLayout: (route: string, preset: DetailedPreset) => void;
	getLayout: (route: string, preset: DetailedPreset) => DashboardLayout;
};
```

Persist name: `detailed-layouts-v1`. Partialize only preset/layout records.

- [ ] **Step 3: Verify and commit**

```powershell
corepack yarn test src/stores/useDetailedLayoutStore.test.ts
git add dashboard/src/stores/useDetailedLayoutStore.ts dashboard/src/stores/useDetailedLayoutStore.test.ts
git commit -m "feat: persist Detailed workspace presets"
```

### Task 3: Build Accessible Workspace Splitter

**Files:**
- Create: `dashboard/src/components/new-ui/layout/WorkspaceSplitter.tsx`
- Create: `dashboard/src/components/new-ui/layout/ResizableWorkspace.test.tsx`

- [ ] **Step 1: Write pointer and keyboard tests**

Assert separator has orientation, min/max/current values, Arrow keys change by 1, Shift+Arrow changes by 5, Home sets minimum, End sets maximum, and pointer drag calls normalized value callback.

- [ ] **Step 2: Implement splitter API**

```tsx
type WorkspaceSplitterProps = {
	label: string;
	orientation: "horizontal" | "vertical";
	value: number;
	min: number;
	max: number;
	onChange: (value: number) => void;
};
```

Use pointer capture. Calculate percentage against parent bounding rect. Keep a visible 12px hit target and 2px visual line.

- [ ] **Step 3: Verify and commit**

```powershell
corepack yarn test src/components/new-ui/layout/ResizableWorkspace.test.tsx
git add dashboard/src/components/new-ui/layout/WorkspaceSplitter.tsx dashboard/src/components/new-ui/layout/ResizableWorkspace.test.tsx
git commit -m "feat: add accessible workspace splitter"
```

### Task 4: Build Resizable Workspace And Preset Controls

**Files:**
- Create: `dashboard/src/components/new-ui/layout/ResizableWorkspace.tsx`
- Create: `dashboard/src/components/new-ui/layout/PresetSelector.tsx`
- Modify: `dashboard/src/components/new-ui/layout/ResizableWorkspace.test.tsx`

- [ ] **Step 1: Add composition tests**

Assert all named slots render, CSS grid templates reflect layout percentages, preset selector uses radiogroup, reset calls only active route/preset, and resizing updates store.

- [ ] **Step 2: Implement fixed topology**

Slots:

```ts
type ResizableWorkspaceProps = {
	primary: ReactNode;
	secondaryTop: ReactNode;
	secondaryBottom: ReactNode;
	bottomLeft: ReactNode;
	bottomRight: ReactNode;
};
```

Top row uses `primary`; right column splits `secondaryTop`. Bottom row splits `bottomLeft`. Entire workspace uses `h-full min-h-0 overflow-hidden`.

- [ ] **Step 3: Verify and commit**

```powershell
corepack yarn test src/components/new-ui/layout/ResizableWorkspace.test.tsx
git add dashboard/src/components/new-ui/layout
git commit -m "feat: add persisted Detailed workspace"
```

### Task 5: Build Technical Timing Board

**Files:**
- Create: `dashboard/src/components/new-ui/live/TechnicalTimingBoard.tsx`
- Create: `dashboard/src/components/new-ui/live/TechnicalTimingBoard.test.tsx`

- [ ] **Step 1: Test technical columns and selection**

Required columns: position, driver/status, tyre/age/stops, interval/gap, last/best lap, three sectors, speed trap. Optional telemetry column appears only when car data exists. Missing values show `-`.

- [ ] **Step 2: Implement using shared timing models**

Extend `liveTiming.ts` with a separate `TechnicalTimingRowModel`; do not add hidden technical fields to compact row rendering. Reuse driver identity and status helpers.

- [ ] **Step 3: Verify and commit**

```powershell
corepack yarn test src/components/new-ui/live/TechnicalTimingBoard.test.tsx src/lib/view-models/liveTiming.test.ts
git add dashboard/src/components/new-ui/live/TechnicalTimingBoard.tsx dashboard/src/components/new-ui/live/TechnicalTimingBoard.test.tsx dashboard/src/lib/view-models/liveTiming.ts dashboard/src/lib/view-models/liveTiming.test.ts
git commit -m "feat: add technical timing board"
```

### Task 6: Build Driver-Synchronized Technical Panels

**Files:**
- Create: `dashboard/src/components/new-ui/live/TechnicalTelemetryPanel.tsx`
- Create: `dashboard/src/components/new-ui/live/TechnicalStrategyPanel.tsx`
- Create: `dashboard/src/components/new-ui/live/TechnicalWeatherPanel.tsx`
- Create: `dashboard/src/components/new-ui/live/TechnicalMapPanel.tsx`
- Create: `dashboard/src/components/new-ui/live/TechnicalPanels.test.tsx`

- [ ] **Step 1: Write synchronization tests**

Set selected driver in store and assert telemetry, strategy, and map panels show same driver. Clear selection and assert each explains how to select a driver rather than showing stale data.

- [ ] **Step 2: Implement focused adapters**

- Telemetry: speed, gear, throttle, brake, trustworthy DRS, recent lap trend.
- Strategy: stint, tyre age, degradation, pit window, undercut model when available.
- Weather: air/track temp, rain, wind, trend and session impact summary.
- Map: `variant="technical"`, labels, selected focus, optional trails and marshal overlays.

Each panel subscribes only to fields it renders.

- [ ] **Step 3: Verify and commit**

```powershell
corepack yarn test src/components/new-ui/live/TechnicalPanels.test.tsx
git add dashboard/src/components/new-ui/live/TechnicalTelemetryPanel.tsx dashboard/src/components/new-ui/live/TechnicalStrategyPanel.tsx dashboard/src/components/new-ui/live/TechnicalWeatherPanel.tsx dashboard/src/components/new-ui/live/TechnicalMapPanel.tsx dashboard/src/components/new-ui/live/TechnicalPanels.test.tsx dashboard/src/components/dashboard/Map.tsx
git commit -m "feat: add synchronized technical panels"
```

### Task 7: Build Technical Events And Comparison Panels

**Files:**
- Create: `dashboard/src/components/new-ui/live/TechnicalEventsPanel.tsx`
- Create: `dashboard/src/components/new-ui/live/TechnicalComparisonPanel.tsx`
- Create: `dashboard/src/components/new-ui/live/TechnicalEventsPanel.test.tsx`
- Modify: `dashboard/src/components/dashboard/DriverComparisonPanel.tsx` only to export shared pure helpers if needed.

- [ ] **Step 1: Write tests**

Events tabs: `Race Control`, `Alerts`, `Radios`. Preserve unreadable/missing timestamps as unavailable. Comparison uses current two-driver selection and aligned timing/strategy models; selecting a third still replaces oldest according to existing store behavior.

- [ ] **Step 2: Implement panel tabs and comparison adapter**

Use `role="tablist"`, arrow-key tab navigation, and persistent local active tab. Do not duplicate audio playback logic; wrap existing radio message behavior.

- [ ] **Step 3: Verify and commit**

```powershell
corepack yarn test src/components/new-ui/live/TechnicalEventsPanel.test.tsx dashboard/test/driverComparison.test.ts
git add dashboard/src/components/new-ui/live/TechnicalEventsPanel.tsx dashboard/src/components/new-ui/live/TechnicalComparisonPanel.tsx dashboard/src/components/new-ui/live/TechnicalEventsPanel.test.tsx dashboard/src/components/dashboard/DriverComparisonPanel.tsx
git commit -m "feat: add technical event and comparison panels"
```

### Task 8: Map Presets To Panel Composition

**Files:**
- Create: `dashboard/src/components/new-ui/live/dashboardPresets.tsx`
- Create: `dashboard/src/components/new-ui/live/dashboardPresets.test.tsx`

- [ ] **Step 1: Test each preset slot map**

Required mapping:

```text
Race:     timing | story/events | map | strategy | comparison
Strategy: timing | strategy     | weather | stint/pace | map
Driver:   timing | telemetry    | comparison | recent laps | map
```

- [ ] **Step 2: Implement pure preset resolver**

```tsx
export function getDashboardPresetSlots(preset: DetailedPreset): ResizableWorkspaceProps
```

Return components, not store logic. Keep all panels mounted only when present in active preset to avoid unnecessary subscriptions.

- [ ] **Step 3: Verify and commit**

```powershell
corepack yarn test src/components/new-ui/live/dashboardPresets.test.tsx
git add dashboard/src/components/new-ui/live/dashboardPresets.tsx dashboard/src/components/new-ui/live/dashboardPresets.test.tsx
git commit -m "feat: define Detailed dashboard presets"
```

### Task 9: Compose Detailed Dashboard

**Files:**
- Create: `dashboard/src/components/new-ui/live/DetailedDashboardView.tsx`
- Create: `dashboard/src/components/new-ui/live/DetailedDashboardView.test.tsx`

- [ ] **Step 1: Write composition tests**

Assert preset selector, reset button, workspace, selected driver continuity, no document scrolling class, and correct route key `dashboard`.

- [ ] **Step 2: Implement view**

```tsx
export default function DetailedDashboardView() {
	const preset = useDetailedLayoutStore((state) => state.activePresetByRoute.dashboard ?? "race");
	const slots = getDashboardPresetSlots(preset);
	return (
		<div data-testid="detailed-dashboard" className="flex h-full min-h-0 flex-col overflow-hidden">
			<DetailedWorkspaceToolbar route="dashboard" preset={preset} />
			<ResizableWorkspace {...slots} />
		</div>
	);
}
```

- [ ] **Step 3: Verify and commit**

```powershell
corepack yarn test src/components/new-ui/live/DetailedDashboardView.test.tsx
git add dashboard/src/components/new-ui/live/DetailedDashboardView.tsx dashboard/src/components/new-ui/live/DetailedDashboardView.test.tsx
git commit -m "feat: compose Detailed live dashboard"
```

### Task 10: Enable Detailed Route And Verify Context Preservation

**Files:**
- Modify: `dashboard/src/app/dashboard/page.tsx`
- Create: `dashboard/test/dashboardModeContinuity.test.tsx`

- [ ] **Step 1: Replace Detailed fallback**

```tsx
<UiModeBoundary
	legacy={<LegacyDashboardPage />}
	simple={<LiveDashboardState density="simple" />}
	detailed={<LiveDashboardState density="detailed" />}
/>
```

`LiveDashboardState` chooses `DetailedDashboardView` for ready/replay Detailed states.

- [ ] **Step 2: Test mode continuity**

Select driver `4`, compare `1` and `81`, set replay speed `2`, switch density, and assert all stores retain values. Route test must not mock navigation because no navigation should occur.

- [ ] **Step 3: Full verification**

```powershell
corepack yarn test
corepack yarn lint
$env:API_URL='http://localhost:4001'; $env:NEXT_PUBLIC_LIVE_URL='http://localhost:4000'; corepack yarn build
```

- [ ] **Step 4: Browser QA at 1920x1080**

Verify three presets, pointer resizing, keyboard resizing, persistence after reload, reset behavior, Simple/Detailed continuity, internal panel scrolling, and unchanged Legacy.

- [ ] **Step 5: Commit**

```powershell
git add dashboard/src/app/dashboard/page.tsx dashboard/src/components/new-ui/live/LiveDashboardState.tsx dashboard/test/dashboardModeContinuity.test.tsx
git commit -m "feat: enable Detailed New UI dashboard"
```

## Phase 3 Completion Gate

- [ ] Every preset renders its required panels.
- [ ] Split values persist per preset and reset independently.
- [ ] Pointer and keyboard resize pass.
- [ ] 1920x1080 workspace has no document scroll.
- [ ] Simple, Detailed, and Legacy preserve selected driver/replay context.
- [ ] Commit checkpoint:

```powershell
git commit --allow-empty -m "chore: complete Detailed dashboard phase"
```
