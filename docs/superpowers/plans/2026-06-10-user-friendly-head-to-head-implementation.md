# User-Friendly Head-to-Head Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refocus the regular dashboard on a compact two-driver comparison and place FIA Race Control beside it on desktop.

**Architecture:** Keep the existing selection store and real timing derivations, but narrow `DriverComparisonModel` to strategy, lap, status, gap, sector, and microsector data. Recompose the dashboard into an unchanged top row, a responsive 70/30 comparison row, and a three-panel alerts row.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Tailwind CSS, Zustand, Node test runner.

---

### Task 1: Narrow the comparison model

- [x] Add failing tests proving telemetry and speed traps are absent.
- [x] Add failing tests proving missing strategy values remain `--` and statuses are explicit.
- [x] Remove car channels, telemetry, and speed traps from the model and builder.
- [x] Run `node --experimental-strip-types --test test/driverComparison.test.ts`.

### Task 2: Redesign Head-to-Head

- [x] Replace the matrix rows with a compact driver/gap header.
- [x] Add opposing strategy summaries and a subdued last/best-lap strip.
- [x] Make all three sector cards the dominant area with stable paired microsectors.
- [x] Preserve concise zero-driver and one-driver states.

### Task 3: Recompose the regular dashboard

- [x] Remove Pilot Core and Telemetry Stream from the regular dashboard.
- [x] Place Head-to-Head and Race Control in a responsive desktop 70/30 row with internal Race Control scrolling.
- [x] Place Smart Alerts, Team Radios, and Track Alerts in a responsive three-column row.
- [x] Delete dashboard-only components with no remaining imports.

### Task 4: Verify

- [x] Run focused comparison tests.
- [x] Run `corepack yarn lint`.
- [x] Run `corepack yarn build` with the required environment variables.
- [x] Validate desktop, medium, and narrow layouts in Browser when a local dashboard target is available.
