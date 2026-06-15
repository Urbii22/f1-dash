# UI Redesign Phase 4: Live Secondary Routes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate qualifying, analysis, standings, weather, and track-map routes to complete New UI Simple and Detailed presentations while retaining their existing data logic and Legacy views.

**Architecture:** For each route, extract the current page into a Legacy component, add pure route-specific view models, build Simple and Detailed compositions from shared primitives, then replace that route's compatibility fallback with `UiModeBoundary`. Shared live runtime remains owned by `dashboard/layout.tsx`.

**Tech Stack:** Next.js App Router, React 19, existing chart/map components, Zustand, Tailwind CSS 4, Vitest, React Testing Library.

---

## Migration Rule Used By Every Task

Each route follows this exact pattern:

```tsx
export default function RoutePage() {
	return (
		<UiModeBoundary
			legacy={<LegacyRoutePage />}
			simple={<SimpleRouteView />}
			detailed={<DetailedRouteView />}
		/>
	);
}
```

Do not rewrite current Legacy markup. Extract it verbatim. Server pages may fetch once and pass the same serializable data to all branches; do not issue duplicate requests per UI mode.

### Task 1: Create Shared Route Page Header And Insight Summary

**Files:**
- Create: `dashboard/src/components/new-ui/routes/RouteHeader.tsx`
- Create: `dashboard/src/components/new-ui/routes/InsightSummary.tsx`
- Create: `dashboard/src/components/new-ui/routes/RouteHeader.test.tsx`

- [ ] **Step 1: Write tests**

Assert header renders title, context, optional status, actions, and density control; summary renders maximum four ordered conclusions with visible category text.

- [ ] **Step 2: Implement APIs**

```tsx
type RouteHeaderProps = {
	eyebrow?: string;
	title: string;
	description?: string;
	status?: ReactNode;
	actions?: ReactNode;
};

type Insight = {
	id: string;
	label: string;
	value: string;
	explanation: string;
	tone: "neutral" | "positive" | "warning" | "critical";
};
```

- [ ] **Step 3: Verify and commit**

```powershell
corepack yarn test src/components/new-ui/routes/RouteHeader.test.tsx
git add dashboard/src/components/new-ui/routes
git commit -m "feat: add shared New UI route framing"
```

### Task 2: Derive Qualifying Summary Models

**Files:**
- Create: `dashboard/src/lib/view-models/qualifying.ts`
- Create: `dashboard/src/lib/view-models/qualifying.test.ts`

- [ ] **Step 1: Write model tests**

Model outputs:

```ts
type QualifyingSummaryModel = {
	phaseLabel: "Q1" | "Q2" | "Q3" | "SQ1" | "SQ2" | "SQ3";
	cutoffPosition: number | null;
	cutoffTime: string | null;
	atRisk: { driverNumber: string; code: string; delta: string; state: string }[];
	hotLaps: { driverNumber: string; code: string; sector: number | null }[];
	deletedLaps: { driverNumber: string | null; message: string; timestamp: string }[];
	insights: Insight[];
};
```

Cover sprint prefixes, Q1/Q2 cutoffs, Q3 no cutoff, empty timing gaps, flying laps, deleted laps, and missing driver metadata. Reuse `quali.ts` and `qualiView.ts`.

- [ ] **Step 2: Implement pure builder and verify**

```ts
export function buildQualifyingSummary(state: State | null): QualifyingSummaryModel | null
```

Run:

```powershell
corepack yarn test src/lib/view-models/qualifying.test.ts src/lib/quali.test.ts src/lib/qualiView.test.ts
```

- [ ] **Step 3: Commit**

```powershell
git add dashboard/src/lib/view-models/qualifying.ts dashboard/src/lib/view-models/qualifying.test.ts
git commit -m "feat: derive qualifying summaries"
```

### Task 3: Build And Wire Qualifying Views

**Files:**
- Create: `dashboard/src/components/new-ui/qualifying/SimpleQualifyingView.tsx`
- Create: `dashboard/src/components/new-ui/qualifying/DetailedQualifyingView.tsx`
- Create: `dashboard/src/components/new-ui/qualifying/QualifyingViews.test.tsx`
- Modify: `dashboard/src/app/dashboard/qualifying/page.tsx`
- Modify: `dashboard/test/qualifyingPage.test.ts`

- [ ] **Step 1: Test content differences**

Simple must show phase, cutoff, at-risk drivers, hot laps, and major deletions. It must not mount full progression or speed-trap tables. Detailed must show technical board, progression, sectors/theoretical best, deleted laps, and speed trap.

- [ ] **Step 2: Implement views**

Reuse `CutoffPanel`, `HotLaps`, `QualiBoard`, `QualiProgression`, and `SpeedTrap` through New UI adapters. Do not wrap Legacy telemetry panels inside New UI; extract data or add neutral variant props with Legacy defaults.

- [ ] **Step 3: Wire boundary and run tests**

```powershell
corepack yarn test src/components/new-ui/qualifying/QualifyingViews.test.tsx dashboard/test/qualifyingPage.test.ts
```

- [ ] **Step 4: Commit**

```powershell
git add dashboard/src/components/new-ui/qualifying dashboard/src/app/dashboard/qualifying/page.tsx dashboard/test/qualifyingPage.test.ts
git commit -m "feat: migrate qualifying to New UI"
```

### Task 4: Derive Analysis Conclusions

**Files:**
- Create: `dashboard/src/lib/view-models/analysis.ts`
- Create: `dashboard/src/lib/view-models/analysis.test.ts`
- Create: `dashboard/src/stores/useAnalysisViewStore.ts`
- Create: `dashboard/src/stores/useAnalysisViewStore.test.ts`

- [ ] **Step 1: Write insight tests**

Required conclusions: fastest clean race pace, strongest degradation, largest position gain/loss, longest viable stint, top speed, and qualifying potential when applicable. Every conclusion must include metric and sample context.

```ts
type AnalysisConclusion = Insight & {
	driverNumbers: string[];
	metric: string;
	sampleSize: number;
};
```

Test insufficient samples produce no claim rather than a misleading winner.

- [ ] **Step 2: Implement using existing analysis helpers**

Compose `analysisSeries`, `sessionInsights`, `lapHistory`, and `strategy`; do not copy their formulas.

Create a transient, non-persisted `useAnalysisViewStore` shared by Legacy, Simple, and Detailed analysis presenters:

```ts
type AnalysisTab = "pace" | "positions" | "stints" | "strategy" | "insights" | "speed" | "quali";

type AnalysisViewStore = {
	activeTab: AnalysisTab;
	selectedDrivers: string[] | null;
	setActiveTab: (activeTab: AnalysisTab) => void;
	setSelectedDrivers: (selectedDrivers: string[] | null) => void;
};
```

Refactor the current Legacy page to read these values instead of component-local `useState`. This preserves active tab and driver filters while switching generation or density.

- [ ] **Step 3: Verify and commit**

```powershell
corepack yarn test src/lib/view-models/analysis.test.ts src/stores/useAnalysisViewStore.test.ts src/lib/analysisSeries.test.ts src/lib/sessionInsights.test.ts src/lib/strategy.test.ts
git add dashboard/src/lib/view-models/analysis.ts dashboard/src/lib/view-models/analysis.test.ts dashboard/src/stores/useAnalysisViewStore.ts dashboard/src/stores/useAnalysisViewStore.test.ts
git commit -m "feat: derive readable session analysis"
```

### Task 5: Build And Wire Analysis Views

**Files:**
- Create: `dashboard/src/components/new-ui/analysis/SimpleAnalysisView.tsx`
- Create: `dashboard/src/components/new-ui/analysis/DetailedAnalysisView.tsx`
- Create: `dashboard/src/components/new-ui/analysis/AnalysisViews.test.tsx`
- Modify: `dashboard/src/app/dashboard/analysis/page.tsx`

- [ ] **Step 1: Test Simple versus Detailed**

Simple shows `InsightSummary`, one pace chart, one tyre/stint chart, and one position-change visual. Detailed preserves all existing tabs and driver filters, with explicit units and chart summaries. Both presenters and `LegacyAnalysisPage` consume `useAnalysisViewStore`; add a test that changes tab and selected drivers, switches density, and observes the same values.

- [ ] **Step 2: Implement chart frame adapter**

Create `dashboard/src/components/new-ui/charts/ChartFrame.tsx` with title, unit, legend, textual summary, loading/empty state, and children. Update new views to wrap existing charts; Legacy stays unchanged.

- [ ] **Step 3: Wire route and verify**

```powershell
corepack yarn test src/components/new-ui/analysis/AnalysisViews.test.tsx src/lib/analysisSeries.test.ts src/lib/sessionInsights.test.ts
```

- [ ] **Step 4: Commit**

```powershell
git add dashboard/src/components/new-ui/analysis dashboard/src/components/new-ui/charts dashboard/src/app/dashboard/analysis/page.tsx
git commit -m "feat: migrate analysis to New UI"
```

### Task 6: Derive And Build Standings Views

**Files:**
- Create: `dashboard/src/lib/view-models/standings.ts`
- Create: `dashboard/src/lib/view-models/standings.test.ts`
- Create: `dashboard/src/components/new-ui/standings/SimpleStandingsView.tsx`
- Create: `dashboard/src/components/new-ui/standings/DetailedStandingsView.tsx`
- Create: `dashboard/src/components/new-ui/standings/StandingsViews.test.tsx`
- Modify: `dashboard/src/app/dashboard/standings/page.tsx`

- [ ] **Step 1: Test standings story model**

Output top three, championship leader margin, closest battle, biggest predicted change, and rows with current/predicted position. Missing prediction remains unavailable.

- [ ] **Step 2: Implement views**

Simple uses podium/ranked cards and top championship stories. Detailed uses complete sortable table, season selector, and live-prediction columns. Sorting is pure and tested for position, points, and predicted position.

- [ ] **Step 3: Wire and verify**

```powershell
corepack yarn test src/lib/view-models/standings.test.ts src/components/new-ui/standings/StandingsViews.test.tsx
```

- [ ] **Step 4: Commit**

```powershell
git add dashboard/src/lib/view-models/standings.ts dashboard/src/lib/view-models/standings.test.ts dashboard/src/components/new-ui/standings dashboard/src/app/dashboard/standings/page.tsx
git commit -m "feat: migrate standings to New UI"
```

### Task 7: Derive Weather Impact Model

**Files:**
- Create: `dashboard/src/lib/view-models/weather.ts`
- Create: `dashboard/src/lib/view-models/weather.test.ts`

- [ ] **Step 1: Write impact tests**

Model:

```ts
type WeatherImpactModel = {
	condition: "dry" | "mixed" | "wet" | "unknown";
	rainRiskLabel: string;
	trackEvolution: string;
	windImpact: string;
	confidence: "low" | "medium" | "high";
	metrics: { air: string; track: string; humidity: string; wind: string };
	insights: Insight[];
};
```

Test current rainfall, forecast/radar unavailable, high wind, cooling track, malformed numeric strings, and units.

- [ ] **Step 2: Implement builder**

Use `WeatherData`, existing RainViewer frame metadata, and configured units. Separate observation from forecast; never present radar absence as zero rain risk.

- [ ] **Step 3: Verify and commit**

```powershell
corepack yarn test src/lib/view-models/weather.test.ts
git add dashboard/src/lib/view-models/weather.ts dashboard/src/lib/view-models/weather.test.ts
git commit -m "feat: derive weather session impact"
```

### Task 8: Build And Wire Weather Views

**Files:**
- Create: `dashboard/src/components/new-ui/weather/SimpleWeatherView.tsx`
- Create: `dashboard/src/components/new-ui/weather/DetailedWeatherView.tsx`
- Create: `dashboard/src/components/new-ui/weather/WeatherViews.test.tsx`
- Modify: `dashboard/src/app/dashboard/weather/page.tsx`
- Modify: `dashboard/src/app/dashboard/weather/map.tsx`
- Modify: `dashboard/src/app/dashboard/weather/map-timeline.tsx`

- [ ] **Step 1: Test route compositions**

Simple: impact summary, four metrics, concise timeline. Detailed: radar map, timeline controls, full measurements, trend explanation. Both must expose unavailable radar state.

- [ ] **Step 2: Add neutral variants to weather map/timeline**

Add optional `variant?: "legacy" | "new"` with default `legacy`; do not alter existing output without prop. New variant removes cyan/glow framing and uses New UI controls.

- [ ] **Step 3: Wire and verify**

```powershell
corepack yarn test src/components/new-ui/weather/WeatherViews.test.tsx src/lib/view-models/weather.test.ts
```

- [ ] **Step 4: Commit**

```powershell
git add dashboard/src/components/new-ui/weather dashboard/src/app/dashboard/weather dashboard/src/lib/view-models/weather.ts dashboard/src/lib/view-models/weather.test.ts
git commit -m "feat: migrate weather to New UI"
```

### Task 9: Build Track-Map Simple And Detailed Views

**Files:**
- Create: `dashboard/src/components/new-ui/map/SimpleTrackMapView.tsx`
- Create: `dashboard/src/components/new-ui/map/DetailedTrackMapView.tsx`
- Create: `dashboard/src/components/new-ui/map/MapOverlayControls.tsx`
- Create: `dashboard/src/components/new-ui/map/TrackMapViews.test.tsx`
- Modify: `dashboard/src/app/dashboard/track-map/page.tsx`

- [ ] **Step 1: Test map role differences**

Simple shows orientation map, selected-driver focus, current battle summary, and minimal labels. Detailed shows overlay controls for labels, trails, marshal sectors, pit status, and selected-driver telemetry link.

- [ ] **Step 2: Implement overlay state**

Keep overlay state local to route; no persistence in this phase. Controls use checkboxes/toggles with visible labels. Default Detailed overlays: labels on, trails off, marshal sectors on, pit status on.

- [ ] **Step 3: Wire and verify**

```powershell
corepack yarn test src/components/new-ui/map/TrackMapViews.test.tsx src/lib/mapMotion.test.ts
```

- [ ] **Step 4: Commit**

```powershell
git add dashboard/src/components/new-ui/map dashboard/src/app/dashboard/track-map/page.tsx
git commit -m "feat: migrate track map to New UI"
```

### Task 10: Live Route Integration Verification

**Files:**
- Create: `dashboard/test/newUiLiveRoutes.test.ts`
- Modify: `dashboard/src/components/new-ui/shell/navigation.ts` if active matching gaps are found.

- [ ] **Step 1: Add source integration matrix**

Assert each route page imports `UiModeBoundary`, has named Legacy/Simple/Detailed components, and no longer uses `NewUiCompatibilityBoundary`:

```text
/dashboard/qualifying
/dashboard/analysis
/dashboard/standings
/dashboard/weather
/dashboard/track-map
```

- [ ] **Step 2: Run full suite, lint, build**

```powershell
corepack yarn test
corepack yarn lint
$env:API_URL='http://localhost:4001'; $env:NEXT_PUBLIC_LIVE_URL='http://localhost:4000'; corepack yarn build
```

- [ ] **Step 3: Browser QA at 1920x1080**

For every route, switch Legacy/New and Simple/Detailed; verify no route reload, no page-level scroll on primary live views, correct empty state outside session type, consistent selected driver, and no cyan Legacy panel styling inside New UI.

- [ ] **Step 4: Commit**

```powershell
git add dashboard/test/newUiLiveRoutes.test.ts dashboard/src/components/new-ui/shell/navigation.ts
git commit -m "test: verify New UI live route coverage"
```

## Phase 4 Completion Gate

- [ ] All five live secondary routes have both New UI densities.
- [ ] Legacy route markup remains available.
- [ ] Full suite/lint/build pass.
- [ ] 1920x1080 screenshots captured for each New UI route density.
- [ ] Commit checkpoint:

```powershell
git commit --allow-empty -m "chore: complete New UI live routes phase"
```
