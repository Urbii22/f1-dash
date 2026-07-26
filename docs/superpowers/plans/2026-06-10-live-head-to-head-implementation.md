# Live Head-to-Head Comparison Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current summary cards with a live two-driver comparison while highlighting both drivers in the existing leaderboard.

**Architecture:** Limit comparison state to two driver numbers. Derive all timing, strategy, sector, microsector, gap, and telemetry values in pure helpers, then render a dense three-column matrix inside the existing Head to Head panel. Keep the dashboard layout unchanged.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Tailwind CSS, Zustand, Node test runner.

---

## File Structure

- Modify `dashboard/src/stores/useDriverSelectionStore.ts`: enforce a two-driver rolling comparison.
- Create `dashboard/src/lib/driverComparison.ts`: pure comparison model and timing parsers.
- Create `dashboard/test/driverComparison.test.ts`: tests for gaps, laps, stints, and sector alignment.
- Modify `dashboard/src/components/driver/Driver.tsx`: persistent team-colour H2H row highlight and badge.
- Replace `dashboard/src/components/dashboard/DriverComparisonPanel.tsx`: exhaustive live comparison UI.

### Task 1: Two-Driver State

- [ ] Write a failing test proving a third selection replaces the oldest driver.
- [ ] Change `toggleComparedDriver` to keep only the last two unique drivers.
- [ ] Run the focused Node test and confirm it passes.

### Task 2: Pure Comparison Model

- [ ] Add failing tests for direct interval preference, same-lap gap-to-leader subtraction, lap differences, invalid values, stint extraction, and sector alignment.
- [ ] Implement `parseTimingSeconds`, `calculateDriverGap`, `getDriverRaceStatus`, `getCurrentStint`, `normalizeSectors`, and `buildDriverComparison`.
- [ ] Represent unavailable values as `--` and never estimate pit loss.
- [ ] Run all comparison helper tests.

### Task 3: Leaderboard Highlighting

- [ ] Read both compared driver numbers in `Driver.tsx`.
- [ ] Apply a subtle team-colour border, background tint, glow, and `H2H` badge to compared rows.
- [ ] Preserve the separate white Pilot Core selection treatment.
- [ ] Verify rows remain highlighted after live reordering.

### Task 4: Exhaustive Head-to-Head Panel

- [ ] Replace the summary cards with empty, one-driver, and two-driver states.
- [ ] Add the driver header and central real-gap display.
- [ ] Add matrix rows for position/lap/status, tyre/stint/stops, last/best laps, race reference gaps, speed traps, and instantaneous telemetry.
- [ ] Add three current-lap sector blocks with aligned microsector cells and deltas.
- [ ] Keep the panel responsive without changing the surrounding dashboard layout.

### Task 5: Verification

- [ ] Run `node --experimental-strip-types --test test/driverComparison.test.ts`.
- [ ] Run `corepack yarn lint`.
- [ ] Run the production build with the dashboard environment variables.
- [ ] Start simulator, realtime, and dashboard services.
- [ ] In Browser, select two drivers, verify row highlights, verify the panel, select a third driver, and verify oldest replacement.
- [ ] Capture desktop screenshots showing the full dashboard and a focused Head to Head view.
- [ ] Commit only implementation files; do not push without explicit approval.
