# 2026 Grid and Real Pit Status Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the dashboard render the API-provided 2026 field without a 20-driver assumption and replace unsupported 2026 DRS displays with real pit status only.

**Architecture:** Add a small pure session/status policy module that determines the rules era and returns a display model from real timing fields. Components consume that model, while pre-2026 sessions retain truthful legacy DRS support. `DriverList` and `TimingData` remain the runtime source of truth; no grid or telemetry fixtures enter production code.

**Tech Stack:** Next.js 16, React 19, TypeScript, Zustand, Node test runner, Tailwind CSS.

---

### Task 1: Add Session-Aware Status Policy

**Files:**
- Create: `dashboard/src/lib/driverStatus.ts`
- Create: `dashboard/test/driverStatus.test.ts`

- [ ] **Step 1: Write failing tests for session-year detection**

Add tests asserting that `getSessionYear()` reads an ISO `StartDate`, falls back to the leading year in `Path`, and returns `null` for unknown input.

```ts
assert.equal(getSessionYear({ StartDate: "2026-03-08T04:00:00Z", Path: "2026/Australian_GP/Race" }), 2026);
assert.equal(getSessionYear({ StartDate: "", Path: "2025/Monaco_GP/Race" }), 2025);
assert.equal(getSessionYear(undefined), null);
```

- [ ] **Step 2: Run the tests and verify RED**

Run: `corepack yarn node --no-warnings --experimental-strip-types --test test/driverStatus.test.ts`

Expected: FAIL because `src/lib/driverStatus.ts` does not exist.

- [ ] **Step 3: Implement the minimal year parser**

Export `getSessionYear(session)` from `driverStatus.ts`. Parse a valid four-digit year from `StartDate`, otherwise from the start of `Path`, otherwise return `null`.

- [ ] **Step 4: Run the tests and verify GREEN**

Run the Task 1 test command and expect all year tests to pass.

- [ ] **Step 5: Write failing tests for status precedence and era rules**

Cover these exact outcomes from `getDriverStatus()`:

```ts
assert.deepEqual(getDriverStatus({ year: 2026, inPit: true, pitOut: false, legacyChannel: 12 }), { kind: "pit", label: "PIT" });
assert.deepEqual(getDriverStatus({ year: 2026, inPit: false, pitOut: true, legacyChannel: 12 }), { kind: "pit-out", label: "PIT OUT" });
assert.deepEqual(getDriverStatus({ year: 2026, inPit: false, pitOut: false, legacyChannel: 12 }), { kind: "none", label: "" });
assert.deepEqual(getDriverStatus({ year: null, inPit: false, pitOut: false, legacyChannel: 12 }), { kind: "none", label: "" });
assert.deepEqual(getDriverStatus({ year: 2025, inPit: false, pitOut: false, legacyChannel: 12 }), { kind: "drs-active", label: "DRS" });
assert.deepEqual(getDriverStatus({ year: 2025, inPit: false, pitOut: false, legacyChannel: 8 }), { kind: "drs-ready", label: "DRS" });
```

- [ ] **Step 6: Run the tests and verify RED**

Expected: FAIL because `getDriverStatus()` is not exported.

- [ ] **Step 7: Implement the minimal status policy**

Define a discriminated `DriverStatus` union. Pit and pit-out always take precedence. Only a known year below 2026 may decode channel `45`; years 2026+ and unknown years return the empty state.

- [ ] **Step 8: Run the tests and verify GREEN**

Run the Task 1 test command and expect all tests to pass.

- [ ] **Step 9: Commit the policy and tests**

```powershell
git add -- dashboard/src/lib/driverStatus.ts dashboard/test/driverStatus.test.ts
git commit -m "feat: add session-aware driver status policy"
```

### Task 2: Replace the Leaderboard DRS Control

**Files:**
- Create: `dashboard/src/components/driver/DriverStatus.tsx`
- Modify: `dashboard/src/components/driver/Driver.tsx`
- Modify: `dashboard/src/components/dashboard/LeaderBoard.tsx`
- Delete: `dashboard/src/components/driver/DriverDRS.tsx`

- [ ] **Step 1: Create the status presentation component**

Build `DriverStatus` around the `DriverStatus` model. Keep a stable `h-8 w-full` cell. Render no text or visible border for `none`, cyan `PIT`, blue `PIT OUT`, muted legacy DRS ready, and emerald legacy DRS active.

- [ ] **Step 2: Wire the policy into each driver row**

Read `SessionInfo` from `useDataStore`, call `getSessionYear()`, then call `getDriverStatus()` with `InPit`, `PitOut`, and the optional channel `45`. Replace the old `hasDRS()` and `possibleDRS()` helpers and render `DriverStatus`.

- [ ] **Step 3: Rename the table header and expand loading rows**

Change the header from `DRS` to `Status`. Change the leaderboard skeleton count from 20 to 22 without changing its grid dimensions.

- [ ] **Step 4: Verify lint and type compilation**

Run: `corepack yarn lint`

Expected: PASS with no missing import or deleted-component references in the leaderboard path.

- [ ] **Step 5: Commit the leaderboard integration**

```powershell
git add -- dashboard/src/components/driver/DriverStatus.tsx dashboard/src/components/driver/Driver.tsx dashboard/src/components/dashboard/LeaderBoard.tsx dashboard/src/components/driver/DriverDRS.tsx
git commit -m "feat: show real pit status in 2026 leaderboard"
```

### Task 3: Remove Unsupported 2026 Telemetry Labels

**Files:**
- Modify: `dashboard/src/lib/driverComparison.ts`
- Modify: `dashboard/test/driverComparison.test.ts`
- Modify: `dashboard/src/components/dashboard/DriverComparisonPanel.tsx`
- Modify: `dashboard/src/components/dashboard/TelemetryPanel.tsx`

- [ ] **Step 1: Write a failing comparison-model test**

Update the comparison fixture to assert that the public telemetry model contains speed, gear, throttle, brake, and RPM but does not expose a `drs` property.

```ts
assert.equal("drs" in model!.telemetry, false);
```

- [ ] **Step 2: Run the comparison tests and verify RED**

Run: `corepack yarn node --no-warnings --experimental-strip-types --test test/driverComparison.test.ts`

Expected: FAIL because the model currently exposes `telemetry.drs`.

- [ ] **Step 3: Remove DRS from the comparison model and UI**

Delete `drs` from `DriverComparisonModel`, stop reading channel `45`, rename `Speed / gear / DRS` to `Speed / gear`, and remove `formatDrs()`. Keep pit state in the existing position/status row.

- [ ] **Step 4: Remove the DRS telemetry bar**

Render throttle, brake, speed, and RPM from real channels. Do not replace DRS with a guessed 2026 mode.

- [ ] **Step 5: Run both unit suites and verify GREEN**

Run:

```powershell
corepack yarn node --no-warnings --experimental-strip-types --test test/driverStatus.test.ts test/driverComparison.test.ts
```

Expected: all tests pass.

- [ ] **Step 6: Commit the telemetry cleanup**

```powershell
git add -- dashboard/src/lib/driverComparison.ts dashboard/test/driverComparison.test.ts dashboard/src/components/dashboard/DriverComparisonPanel.tsx dashboard/src/components/dashboard/TelemetryPanel.tsx
git commit -m "feat: remove unsupported 2026 drs telemetry"
```

### Task 4: Update Secondary Driver Surfaces and Documentation

**Files:**
- Modify: `dashboard/src/app/dashboard/track-map/page.tsx`
- Modify: `dashboard/src/app/dashboard/standings/page.tsx`
- Modify: `dashboard/src/app/(nav)/help/page.tsx`
- Modify: `dashboard/src/types/state.type.ts`

- [ ] **Step 1: Reuse the status policy on the track-map list**

Replace `DriverDRS` and its local DRS helpers with `DriverStatus`, passing the session-aware model exactly as in the main leaderboard. Expand its loading skeleton from 20 to 22.

- [ ] **Step 2: Remove the standings 20-driver loading assumption**

Change the standings skeleton count from 20 to 22. Runtime rows remain entirely feed-driven.

- [ ] **Step 3: Update help content**

Replace the DRS eligibility explanation with concise `STATUS` documentation for `PIT` and `PIT OUT`. State that 2026 Overtake Mode, Boost, and Active Aero are not shown because the feed does not expose verified fields.

- [ ] **Step 4: Neutralize the channel type comment**

Change the channel `45` comment from an unconditional DRS claim to `Legacy DRS channel (pre-2026; unspecified in 2026)` without renaming the raw feed key.

- [ ] **Step 5: Scan production UI for stale DRS claims**

Run: `rg -n "DriverDRS|Speed / gear / DRS|<p>DRS</p>|label=\"DRS\"|DRS & PIT" dashboard/src`

Expected: no matches. Remaining references may only describe verified legacy compatibility in types or policy code.

- [ ] **Step 6: Commit secondary surfaces**

```powershell
git add -- dashboard/src/app/dashboard/track-map/page.tsx dashboard/src/app/dashboard/standings/page.tsx 'dashboard/src/app/(nav)/help/page.tsx' dashboard/src/types/state.type.ts
git commit -m "feat: align secondary views with 2026 status data"
```

### Task 5: Full Verification and Browser QA

**Files:**
- No production files expected
- Create screenshots under: `output/playwright/`

- [ ] **Step 1: Run all focused tests**

```powershell
corepack yarn node --no-warnings --experimental-strip-types --test test/driverStatus.test.ts test/driverComparison.test.ts
```

Expected: all tests pass.

- [ ] **Step 2: Run lint**

Run: `corepack yarn lint`

Expected: PASS.

- [ ] **Step 3: Run a production build**

```powershell
$env:API_URL='http://localhost:4001'; $env:NEXT_PUBLIC_LIVE_URL='http://localhost:4000'; corepack yarn build
```

Expected: Next.js production build succeeds.

- [ ] **Step 4: Verify the dashboard in the in-app browser**

Open `http://127.0.0.1:3000/dashboard`. Verify that the header says `STATUS`, empty status cells do not shift rows, pit states show only real `PIT`/`PIT OUT`, selected H2H drivers remain highlighted, and the comparison contains `Speed / gear` without DRS.

- [ ] **Step 5: Verify the 22-driver runtime source**

Inspect the rendered row count through `[data-driver-number]`. Confirm it equals the number of entries actually delivered by the active `DriverList`; do not require 22 if the active feed supplies fewer entries.

- [ ] **Step 6: Capture validation screenshots**

Save desktop screenshots showing the full leaderboard/status column and Head-to-Head panel under `output/playwright/2026-real-status-dashboard.png` and `output/playwright/2026-real-status-head-to-head.png`.

- [ ] **Step 7: Review the final diff**

Run: `git diff --check` and `git status --short`. Confirm no unrelated pre-existing workspace changes were staged or reverted.
