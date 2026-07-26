# No-Live-Session Dashboard State Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When no Formula 1 session is live, replace the empty dashboard with a deliberate no-live-session state that shows the real countdown to the next scheduled session, without introducing any predicted or synthesized data.

**Architecture:** Detect "no live session" from the absence of `state.SessionInfo`. Surface the existing `/api/schedule/next` feed to the client through a server-side Next.js Route Handler (keeping `API_URL` off the client), select the next session with a pure helper, and render a HUD-styled `NoLiveSession` hero that reuses the existing countdown logic. Gate the main dashboard body on the live signal with three branches: connecting, no-session, live (unchanged).

**Tech Stack:** Next.js App Router (Route Handlers), React 19, TypeScript, Tailwind CSS, Zustand, `motion/react`, Node test runner.

**Reference:** Design spec at `docs/superpowers/specs/2026-06-10-no-live-session-state-design.md`.

---

### Task 1: Next-session selection helper (TDD)

- [ ] Add failing tests in `dashboard/test/nextSession.test.ts` proving the earliest future session is selected.
- [ ] Add failing tests proving a future race is returned when present and `null` when absent.
- [ ] Add failing tests proving a round with only past/started sessions yields no countdown target.
- [ ] Add failing tests proving empty or malformed rounds are handled without throwing.
- [ ] Implement `dashboard/src/lib/nextSession.ts` exporting a pure `selectNextTargets(round, now)` returning `{ nextSession, nextRace }`, mirroring the filter logic in `components/schedule/NextRound.tsx` (next non-race future session + future race).
- [ ] Run `node --experimental-strip-types --test test/nextSession.test.ts` and confirm green.

### Task 2: Server-side schedule proxy

- [ ] Add `dashboard/src/app/dashboard/next-session/route.ts` as a Route Handler that fetches `${env.API_URL}/api/schedule/next` with `cache: "no-store"` and returns the JSON `Round`.
- [ ] On upstream `204 No Content`, fetch failure, or non-OK status, respond with a normalized shape the client can read as "no upcoming round" (e.g. `null` body with `200`, or an explicit `{ round: null }`), never a 500 that breaks the client UI.
- [ ] Confirm `API_URL` is read only inside the handler (server runtime) and never imported into a client module.

### Task 3: Client hook for the next round

- [ ] Add `dashboard/src/hooks/useNextSession.ts` that fetches `/dashboard/next-session`, exposing `{ round, nextSession, nextRace, loading, error }` and applying `selectNextTargets` from Task 1.
- [ ] Recompute targets on an interval coarse enough to roll over when a session starts (e.g. refetch the round periodically), without a per-frame network cost; the per-second tick stays in the countdown component.
- [ ] Handle the "no upcoming round" / error shapes from Task 2 by exposing `nextSession = null` so the hero can show the explicit unavailable message.

### Task 4: NoLiveSession hero component

- [ ] Add `dashboard/src/components/dashboard/NoLiveSession.tsx` using `telemetry-panel`, `panel-title`, and `data-chip` styling consistent with the HUD aesthetic.
- [ ] Show the primary "no live session" line, the next round identity (name + country) from real data, and a prominent countdown.
- [ ] Reuse the existing countdown timer logic from `components/schedule/Countdown.tsx`; if its styling is too coupled to the schedule page, extract the requestAnimationFrame timer into a shared hook/util consumed by both, without duplicating the loop.
- [ ] Render the next-race countdown as secondary context only when distinct from the next session.
- [ ] When `nextSession` is null, show an explicit "next session unavailable" message instead of a timer.
- [ ] Add quiet secondary links to `/schedule` and `/dashboard/standings`.
- [ ] Respect `prefers-reduced-motion`: countdown stays accurate and legible without requiring animation.

### Task 5: Gate the dashboard body

- [ ] In `dashboard/src/app/dashboard/page.tsx`, derive the live signal from `useDataStore((s) => !!s.state?.SessionInfo)` and the existing `connected` flag (threaded from the layout/socket as needed).
- [ ] Branch the body: connecting (lightweight indicator) → no-session (`NoLiveSession`) → live (`PresentationMode` / `RegularDashboard` exactly as today).
- [ ] Keep the connecting branch visually light so a normal momentary connection does not flash the full hero.
- [ ] Leave the layout top static bar and its skeletons unchanged.

### Task 6: Verify

- [ ] Run `node --experimental-strip-types --test test/*.test.ts` and confirm all suites pass (existing 18 + new).
- [ ] Run `corepack yarn lint`.
- [ ] Run `corepack yarn build` with the required environment variables (`API_URL`, `NEXT_PUBLIC_LIVE_URL`, `SKIP_ENV_VALIDATION` as appropriate).
- [ ] Validate in Browser when a local dashboard target is available:
  - [ ] No live feed → no-session hero with a ticking real countdown.
  - [ ] Schedule proxy returns no round → explicit unavailable message, no fabricated timer.
  - [ ] Live session present → dashboard renders unchanged (no regression).
  - [ ] Desktop, medium, and narrow viewports show no overlap or clipped text.
