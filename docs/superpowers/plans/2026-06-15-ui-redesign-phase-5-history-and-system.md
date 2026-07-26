# UI Redesign Phase 5: History And System Routes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete New UI coverage for archive, results, H2H, driver profiles, home, schedule, settings, and help.

**Architecture:** Preserve server-side fetches and pass fetched data into client `UiModeBoundary` presenters. Create shared historical result and profile models so Simple cards and Detailed tables use identical facts. Reorganize settings presentation without changing existing setting keys or behavior.

**Tech Stack:** Next.js server/client components, React 19, existing Jolpica/archive APIs, Zustand settings, Tailwind CSS 4, Vitest, React Testing Library.

---

### Task 1: Create Server-Safe Presentation Boundary

**Files:**
- Create: `dashboard/src/components/new-ui/ServerUiModeBoundary.tsx`
- Create: `dashboard/src/components/new-ui/ServerUiModeBoundary.test.tsx`

- [ ] **Step 1: Write serialization-safe branch tests**

Props accept React nodes and no functions. Assert Legacy/Simple/Detailed branch behavior matches `UiModeBoundary`.

- [ ] **Step 2: Implement client boundary**

```tsx
"use client";

import type { ReactNode } from "react";
import UiModeBoundary from "@/components/new-ui/UiModeBoundary";

export default function ServerUiModeBoundary(props: { legacy: ReactNode; simple: ReactNode; detailed: ReactNode }) {
	return <UiModeBoundary {...props} />;
}
```

- [ ] **Step 3: Verify and commit**

```powershell
corepack yarn test src/components/new-ui/ServerUiModeBoundary.test.tsx
git add dashboard/src/components/new-ui/ServerUiModeBoundary.tsx dashboard/src/components/new-ui/ServerUiModeBoundary.test.tsx
git commit -m "feat: add server route UI boundary"
```

### Task 2: Redesign Archive Index

**Files:**
- Create: `dashboard/src/lib/view-models/archive.ts`
- Create: `dashboard/src/lib/view-models/archive.test.ts`
- Create: `dashboard/src/components/new-ui/archive/SimpleArchiveIndex.tsx`
- Create: `dashboard/src/components/new-ui/archive/DetailedArchiveIndex.tsx`
- Create: `dashboard/src/components/new-ui/archive/ArchiveIndexViews.test.tsx`
- Modify: `dashboard/src/app/archive/page.tsx`

- [ ] **Step 1: Test archive card model**

Include event, session type, date, duration, circuit/location, available laps/events/telemetry flags, and truthful empty data. Sort newest first.

- [ ] **Step 2: Implement views**

Simple uses visual session cards grouped by event. Detailed adds filters for year/session type and a data-availability table. Both link to `/archive/{id}`. Store filters in URL search parameters `year` and `type`; changing density or generation must leave those parameters unchanged.

- [ ] **Step 3: Wire one server fetch into all branches**

The page fetches sessions once, builds serializable model once, and passes it to the boundary.

- [ ] **Step 4: Verify and commit**

```powershell
corepack yarn test src/lib/view-models/archive.test.ts src/components/new-ui/archive/ArchiveIndexViews.test.tsx
git add dashboard/src/lib/view-models/archive.ts dashboard/src/lib/view-models/archive.test.ts dashboard/src/components/new-ui/archive dashboard/src/app/archive/page.tsx
git commit -m "feat: migrate archive index to New UI"
```

### Task 3: Redesign Archive Session Detail

**Files:**
- Create: `dashboard/src/components/new-ui/archive/SimpleArchiveSession.tsx`
- Create: `dashboard/src/components/new-ui/archive/DetailedArchiveSession.tsx`
- Create: `dashboard/src/components/new-ui/archive/ArchiveSessionViews.test.tsx`
- Modify: `dashboard/src/app/archive/[sessionId]/page.tsx`

- [ ] **Step 1: Test live-versus-archive labeling**

Both views visibly say `Recorded session`; neither renders `Live`. Simple shows session summary, decisive events, pace leaders, stints, and primary replay action. Detailed exposes full `ArchiveAnalysis`, telemetry compare, events, qualifying report when applicable, and units/tooltips.

- [ ] **Step 2: Implement views over existing fetched props**

Use existing `ArchiveSessionDetail`, laps, stints, and events. Keep API fetch and 404 behavior unchanged.

- [ ] **Step 3: Verify and commit**

```powershell
corepack yarn test src/components/new-ui/archive/ArchiveSessionViews.test.tsx src/components/archive/QualiReport.test.ts
git add dashboard/src/components/new-ui/archive dashboard/src/app/archive/[sessionId]/page.tsx
git commit -m "feat: migrate archive sessions to New UI"
```

### Task 4: Redesign Season Results Index

**Files:**
- Create: `dashboard/src/lib/view-models/results.ts`
- Create: `dashboard/src/lib/view-models/results.test.ts`
- Create: `dashboard/src/components/new-ui/results/SimpleSeasonResults.tsx`
- Create: `dashboard/src/components/new-ui/results/DetailedSeasonResults.tsx`
- Modify: `dashboard/src/app/results/page.tsx`

- [ ] **Step 1: Test season story model**

Cover completed/live/upcoming rounds, latest winner, next round, archive availability, and empty API response. Reuse `seasonResults.ts`.

- [ ] **Step 2: Implement views**

Simple emphasizes current season story and cards. Detailed keeps full season list with status, date, winner, and recording link.

- [ ] **Step 3: Verify and commit**

```powershell
corepack yarn test src/lib/view-models/results.test.ts src/lib/seasonResults.test.ts
git add dashboard/src/lib/view-models/results.ts dashboard/src/lib/view-models/results.test.ts dashboard/src/components/new-ui/results dashboard/src/app/results/page.tsx
git commit -m "feat: migrate season results to New UI"
```

### Task 5: Redesign Round Result Detail

**Files:**
- Create: `dashboard/src/components/new-ui/results/SimpleRoundResult.tsx`
- Create: `dashboard/src/components/new-ui/results/DetailedRoundResult.tsx`
- Create: `dashboard/src/components/new-ui/results/RoundResultViews.test.tsx`
- Modify: `dashboard/src/app/results/[round]/page.tsx`

- [ ] **Step 1: Test data hierarchy**

Simple shows podium, fastest lap, major position gains, DNFs/penalties, and archive action. Detailed separates race result, grid, qualifying, status, points, and penalties in complete tables.

- [ ] **Step 2: Extract current result JSX into Legacy component**

Fetch race, qualifying, and archive sessions once. Pass values to all presenters. Preserve unavailable result path.

- [ ] **Step 3: Verify and commit**

```powershell
corepack yarn test src/components/new-ui/results/RoundResultViews.test.tsx
git add dashboard/src/components/new-ui/results dashboard/src/app/results/[round]/page.tsx
git commit -m "feat: migrate round results to New UI"
```

### Task 6: Redesign H2H

**Files:**
- Create: `dashboard/src/components/new-ui/h2h/SimpleH2HView.tsx`
- Create: `dashboard/src/components/new-ui/h2h/DetailedH2HView.tsx`
- Create: `dashboard/src/components/new-ui/h2h/H2HViews.test.tsx`
- Modify: `dashboard/src/app/h2h/page.tsx`

- [ ] **Step 1: Test Simple summary and Detailed alignment**

Simple answers who leads qualifying, race, points, podiums, and recent form. Detailed shows aligned round-by-round comparison, missing rounds, finish/grid deltas, and current selectors.

- [ ] **Step 2: Implement over `buildSeasonH2H`**

No new comparison math in components. Team/driver color stays stable across all rows and charts.

- [ ] **Step 3: Verify and commit**

```powershell
corepack yarn test src/components/new-ui/h2h/H2HViews.test.tsx src/lib/seasonH2H.test.ts
git add dashboard/src/components/new-ui/h2h dashboard/src/app/h2h/page.tsx
git commit -m "feat: migrate season H2H to New UI"
```

### Task 7: Redesign Driver Profile

**Files:**
- Create: `dashboard/src/components/new-ui/driver/SimpleDriverProfile.tsx`
- Create: `dashboard/src/components/new-ui/driver/DetailedDriverProfile.tsx`
- Create: `dashboard/src/components/new-ui/driver/DriverProfileViews.test.tsx`
- Modify: `dashboard/src/app/driver/[driverId]/page.tsx`

- [ ] **Step 1: Test profile differences**

Simple shows identity, championship position, points, wins, podiums, best result, recent form, and teammate comparison action. Detailed adds complete Grand Prix log and per-round deltas.

- [ ] **Step 2: Preserve server fetching and not-found behavior**

Build summary once from `summarizeDriverSeason`; pass same values to all branches.

- [ ] **Step 3: Verify and commit**

```powershell
corepack yarn test src/components/new-ui/driver/DriverProfileViews.test.tsx src/lib/seasonH2H.test.ts
git add dashboard/src/components/new-ui/driver dashboard/src/app/driver/[driverId]/page.tsx
git commit -m "feat: migrate driver profiles to New UI"
```

### Task 8: Redesign Home And Schedule

**Files:**
- Create: `dashboard/src/components/new-ui/hub/SimpleHomeView.tsx`
- Create: `dashboard/src/components/new-ui/hub/DetailedHomeView.tsx`
- Create: `dashboard/src/components/new-ui/schedule/SimpleScheduleView.tsx`
- Create: `dashboard/src/components/new-ui/schedule/DetailedScheduleView.tsx`
- Create: `dashboard/src/components/new-ui/hub/HomeScheduleViews.test.tsx`
- Modify: `dashboard/src/app/(nav)/page.tsx`
- Modify: `dashboard/src/app/(nav)/schedule/page.tsx`

- [ ] **Step 1: Test priorities**

Home Simple prioritizes next/current session, local start, live/archive action, and championship context. Schedule Simple prioritizes next weekend and local times. Detailed variants show full weekend/season metadata.

- [ ] **Step 2: Implement using `weekendHub` and schedule helpers**

Do not add duplicate date conversion. Missing schedule uses explicit unavailable state.

- [ ] **Step 3: Verify and commit**

```powershell
corepack yarn test src/components/new-ui/hub/HomeScheduleViews.test.tsx src/lib/weekendHub.test.ts dashboard/test/nextSession.test.ts
git add dashboard/src/components/new-ui/hub dashboard/src/components/new-ui/schedule dashboard/src/app/(nav)/page.tsx dashboard/src/app/(nav)/schedule/page.tsx
git commit -m "feat: migrate home and schedule to New UI"
```

### Task 9: Reorganize Settings Without Changing Behavior

**Files:**
- Create: `dashboard/src/components/new-ui/settings/SettingsSection.tsx`
- Create: `dashboard/src/components/new-ui/settings/NewSettingsView.tsx`
- Create: `dashboard/src/components/new-ui/settings/NewSettingsView.test.tsx`
- Modify: `dashboard/src/app/dashboard/settings/page.tsx`

- [ ] **Step 1: Build setting inventory test**

Assert New UI exposes every existing setting key exactly once: delay, speed unit, corner numbers, car metrics, table headers, best sectors, mini sectors, qualifying theoretical best, speed trap, OLED mode, safety-car colors, favorite drivers, race-control chime, volume, and alert settings.

- [ ] **Step 2: Group presentation**

Groups: Appearance; Data and Units; Live and Replay; Alerts and Audio; Drivers; Layout; Accessibility. Each control includes consequence-focused description. Add New UI generation/density and Detailed layout reset controls. Reset requires modal confirmation.

- [ ] **Step 3: Wire boundary and verify safety tests**

```powershell
corepack yarn test src/components/new-ui/settings/NewSettingsView.test.tsx dashboard/test/settingsSafety.test.ts
```

- [ ] **Step 4: Commit**

```powershell
git add dashboard/src/components/new-ui/settings dashboard/src/app/dashboard/settings/page.tsx
git commit -m "feat: migrate settings to New UI"
```

### Task 10: Redesign Help And Terminology

**Files:**
- Create: `dashboard/src/components/new-ui/help/NewHelpView.tsx`
- Create: `dashboard/src/components/new-ui/help/NewHelpView.test.tsx`
- Modify: `dashboard/src/app/(nav)/help/page.tsx`

- [ ] **Step 1: Test required help topics**

Topics: Legacy/New UI, Simple/Detailed, driver selection/drawer, comparison, replay, Detailed presets/resizing/reset, timing colors/statuses, archive versus live, keyboard controls, missing data.

- [ ] **Step 2: Implement searchable section navigation**

Use native details/summary or accessible tabs. Match exact UI labels; no internal feed field names.

- [ ] **Step 3: Verify and commit**

```powershell
corepack yarn test src/components/new-ui/help/NewHelpView.test.tsx
git add dashboard/src/components/new-ui/help dashboard/src/app/(nav)/help/page.tsx
git commit -m "feat: migrate help to New UI terminology"
```

### Task 11: Remove Remaining Compatibility Fallbacks From Migrated Routes

**Files:**
- Create: `dashboard/test/newUiRouteCoverage.test.ts`
- Modify: route layouts only if fallback wrappers are still applied above migrated pages.

- [ ] **Step 1: Build complete route matrix test**

Enumerate every app route and expected migration status. Assert only intentionally unmigrated stubs, such as `/dashboard/driver/[nr]` if still empty, may use compatibility fallback and must be documented.

- [ ] **Step 2: Run full verification**

```powershell
corepack yarn test
corepack yarn lint
$env:API_URL='http://localhost:4001'; $env:NEXT_PUBLIC_LIVE_URL='http://localhost:4000'; corepack yarn build
```

- [ ] **Step 3: Browser QA**

Switch all routes through Legacy/New and Simple/Detailed. Confirm server routes do not refetch when changing density, query strings remain, dynamic route IDs remain, and browser back/forward works.

- [ ] **Step 4: Commit**

```powershell
git add dashboard/test/newUiRouteCoverage.test.ts dashboard/src/app
git commit -m "test: enforce complete New UI route coverage"
```

## Phase 5 Completion Gate

- [ ] Every public, historical, and settings route has Simple and Detailed presentations.
- [ ] Server data is fetched once per request.
- [ ] Existing settings keys and behavior remain intact.
- [ ] Full suite/lint/build pass.
- [ ] Commit checkpoint:

```powershell
git commit --allow-empty -m "chore: complete New UI route migration phase"
```
