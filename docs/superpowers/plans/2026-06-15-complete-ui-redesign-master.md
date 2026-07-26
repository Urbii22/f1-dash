# Complete UI Redesign Master Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a complete, reversible UI redesign with a persisted `Legacy / New UI` switch and persisted `Simple / Detailed` density inside New UI, while preserving all existing data behavior.

**Architecture:** Keep the current application as the Legacy implementation. Add a persisted presentation preference store, shared New UI shells and primitives, route-level mode boundaries, and pure view-model adapters over the existing stores and API responses. Implement the redesign in six independently deployable phases; every intermediate commit must leave Legacy usable and provide a compatibility fallback for routes not yet migrated.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 5.9, Tailwind CSS 4, Zustand 5, Motion, Lucide React, Vitest, React Testing Library, Playwright.

---

## Source Of Truth

Read before execution:

- Design: `docs/superpowers/specs/2026-06-15-complete-ui-redesign-design.md`
- Existing launcher: `scripts/start-all.ps1`
- Dashboard scripts: `dashboard/package.json`
- Existing live runtime: `dashboard/src/app/dashboard/layout.tsx`
- Existing settings persistence: `dashboard/src/stores/useSettingsStore.ts`
- Existing driver selection: `dashboard/src/stores/useDriverSelectionStore.ts`
- Existing replay state: `dashboard/src/stores/useReplayControlStore.ts`

Do not remove or visually rewrite Legacy components during phases 1-5. New UI components live under `dashboard/src/components/new-ui/`; pure New UI derivation logic lives under `dashboard/src/lib/view-models/`; New UI state lives in focused stores under `dashboard/src/stores/`.

## Mandatory Invariants

1. Default generation is `legacy` for users without stored preference.
2. First New UI visit uses `simple`; later visits restore stored density.
3. Generation or density changes do not navigate, reload, reset replay, clear driver selection, or clear comparisons.
4. Legacy rendering remains behaviorally unchanged.
5. Every New UI route has `loading`, `empty`, `unavailable`, and `error` behavior.
6. Missing numeric data renders `-` or an explicit unavailable label, never synthesized zero.
7. Team colors identify drivers; FIA colors remain reserved for race state.
8. Live Simple and Detailed workspaces fit inside 1920x1080 without document scrolling.
9. Panel splitters support pointer and keyboard operation.
10. Each task is committed separately after its listed tests pass.

## Plan Suite And Dependency Order

Execute in this exact order:

1. `docs/superpowers/plans/2026-06-15-ui-redesign-phase-1-foundation.md`
2. `docs/superpowers/plans/2026-06-15-ui-redesign-phase-2-simple-dashboard.md`
3. `docs/superpowers/plans/2026-06-15-ui-redesign-phase-3-detailed-dashboard.md`
4. `docs/superpowers/plans/2026-06-15-ui-redesign-phase-4-live-routes.md`
5. `docs/superpowers/plans/2026-06-15-ui-redesign-phase-5-history-and-system.md`
6. `docs/superpowers/plans/2026-06-15-ui-redesign-phase-6-hardening.md`

Do not start a later phase while the previous phase has failing tests, build errors, unresolved accessibility blockers, or undocumented Legacy regressions.

## Phase Outputs

### Phase 1: Foundation

Produces persisted preferences, global controls, visual tokens, primitives, New UI shells, route boundary, compatibility fallback, component-test infrastructure, and a Legacy regression baseline.

Release state: users can switch to New UI, but unmigrated routes render Legacy content inside the New UI compatibility frame.

### Phase 2: Simple Live Dashboard

Produces broadcast-style timing, race story panels, compact map, selected-driver drawer, and complete no-session/connection states.

Release state: `/dashboard` is fully usable in New UI Simple; Detailed temporarily uses the compatibility fallback.

### Phase 3: Detailed Live Dashboard

Produces pit-wall layout, persisted route/preset split sizes, accessible splitters, Race/Strategy/Driver presets, and synchronized technical panels.

Release state: `/dashboard` supports both New UI densities and preserves context between them.

### Phase 4: Live Secondary Routes

Produces New UI Simple and Detailed variants for qualifying, analysis, standings, weather, and track map.

Release state: every `/dashboard/*` route is migrated except settings, which remains a compatibility fallback until phase 5.

### Phase 5: History And System Routes

Produces New UI variants for archive, results, H2H, driver profiles, home, schedule, settings, and help.

Release state: every application route has a New UI implementation; Legacy remains selectable.

### Phase 6: Hardening

Produces parity matrix, visual baselines, accessibility and keyboard coverage, performance safeguards, error isolation, full regression evidence, and rollout documentation.

Release state: New UI is eligible for broader testing. Do not change the default or remove Legacy without a separate explicit decision.

## Shared Naming Contracts

Use these names consistently across all phases:

```ts
export type InterfaceGeneration = "legacy" | "new";
export type UiDensity = "simple" | "detailed";
export type DetailedPreset = "race" | "strategy" | "driver";
export type AsyncViewState = "loading" | "ready" | "empty" | "unavailable" | "error";
```

Route boundary API:

```tsx
<UiModeBoundary
	legacy={<LegacyContent />}
	simple={<SimpleContent />}
	detailed={<DetailedContent />}
/>
```

Compatibility fallback API:

```tsx
<NewUiCompatibilityBoundary routeName="Settings">
	<LegacySettingsPage />
</NewUiCompatibilityBoundary>
```

Detailed layout key contract:

```ts
type DetailedLayoutKey = `${string}:${DetailedPreset}`;
// Examples: "dashboard:race", "dashboard:strategy", "track-map:driver"
```

## Commit Policy

- Commit after each numbered task.
- Stage only files listed by that task.
- Use `test:`, `feat:`, `refactor:`, `style:`, `perf:`, or `docs:` prefixes.
- Do not push a partially completed phase.
- At each phase end, review `git status --short` and `git diff --check`.
- If unrelated user changes appear, stop before commit and ask how to proceed.

## Standard Verification Commands

From `dashboard/`:

```powershell
corepack yarn test
corepack yarn lint
$env:API_URL='http://localhost:4001'
$env:NEXT_PUBLIC_LIVE_URL='http://localhost:4000'
corepack yarn build
```

Expected: all commands exit `0`; Vitest reports zero failed tests; ESLint reports zero errors; Next build completes all routes.

For local browser verification from repository root:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/start-all.ps1 -NoBrowser
```

Open `http://localhost:3000`. Stop with:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/stop-all.ps1
```

## Cross-Phase Acceptance Matrix

| Requirement | Primary phase | Final proof |
|---|---:|---|
| Persisted Legacy/New UI | 1 | unit + component + reload E2E |
| Persisted Simple/Detailed | 1 | unit + component + reload E2E |
| Route/context preserved | 1-3 | component + E2E |
| Simple classification-first dashboard | 2 | 1920x1080 visual baseline |
| Driver side drawer | 2 | interaction + keyboard E2E |
| Detailed resizable presets | 3 | unit + pointer/keyboard E2E |
| Qualifying/analysis/live route parity | 4 | route tests + screenshots |
| Archive/results/system route parity | 5 | route tests + screenshots |
| Error isolation and truthful live/replay state | 2-6 | view-model + E2E |
| WCAG-oriented keyboard/contrast behavior | 1-6 | axe + manual checklist |
| No unrelated telemetry rerenders | 6 | render-count regression test |
| Legacy unchanged | every phase | Legacy screenshots + full tests |

## Rollback Rules

- Any New UI failure can be escaped by selecting `Legacy`; this control must remain outside route-specific New UI content.
- If persisted UI data cannot be parsed, normalize to `{ generation: "legacy", density: "simple" }`.
- If a Detailed layout is invalid, reset only that route/preset key.
- If a route migration is incomplete, use `NewUiCompatibilityBoundary`; never render a partially wired page.
- Never migrate data acquisition and presentation in the same task unless a missing selector blocks the view model.

## Final Completion Gate

The redesign implementation is complete only when:

- all six phase plans are fully checked;
- `corepack yarn test`, `lint`, and production `build` pass from a clean worktree;
- Playwright covers generation/density persistence, both dashboard modes, all routes, and splitter keyboard behavior;
- visual baselines exist for Legacy, New Simple, and New Detailed at 1920x1080;
- the parity matrix has no unapproved gaps;
- Legacy remains available and default behavior is unchanged;
- documentation explains both toggles and layout reset behavior.
