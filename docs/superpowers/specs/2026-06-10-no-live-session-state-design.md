# No-Live-Session Dashboard State Design

## Objective

Replace the empty, broken-looking dashboard that appears when no Formula 1 session is live with an intentional, informative state. When there is no active session, the dashboard should clearly communicate that timing is idle and present the real countdown to the next scheduled session, sourced exclusively from the existing schedule feed.

This is a UI-only change. It introduces no predictions, no synthesized timing, and no new data sources beyond the schedule endpoint the project already serves.

## Problem

The live dashboard derives all of its content from the SSE timing feed (`NEXT_PUBLIC_LIVE_URL/api/realtime`). Outside of a race weekend session, the feed delivers no timing payload, so `useDataStore.state` stays effectively empty: the leaderboard, track map, comparison, race control, and alert panels render their loading skeletons or empty bodies indefinitely. To a visitor on a non-race day — the majority of the calendar — the application looks like it is failing rather than idle.

## States

The dashboard body resolves to exactly one of three mutually exclusive states.

1. **Connecting.** The SSE connection is not yet open and no session metadata has arrived. Show a concise, calm connecting indicator. This state should be brief on a normal connection.
2. **No live session.** The SSE connection is open (or has settled) and no session metadata is present. Show the no-live-session hero with the next-session countdown.
3. **Live.** Session metadata is present. Render the existing dashboard exactly as today. No behavioural change.

### Live-session signal

A session is considered live when `state.SessionInfo` is present. Absence of `SessionInfo` is the single source of truth for "no live session". The connecting versus no-session distinction is made with the existing `connected` flag already threaded through the dashboard layout.

Session end is out of scope as a distinct state: when a session finishes, the feed continues to expose `SessionInfo` and the existing `SessionStatus.Status === "Ends"` handling remains untouched. Only a genuinely absent `SessionInfo` triggers the no-session state.

## Data Source

The countdown uses the existing schedule feed and nothing else.

- The Rust `api` service already exposes `GET /api/schedule/next`, returning a `Round` with its `sessions[]` (each with `kind`, `start`, `end`).
- The dashboard body is client-rendered and may only read `NEXT_PUBLIC_*` environment variables. `API_URL` is server-only, so the client cannot call the schedule service directly.
- A Next.js Route Handler under the dashboard app proxies the next round: it runs server-side, fetches `${API_URL}/api/schedule/next`, and returns the JSON to the client. This mirrors the existing server-side `getNext()` pattern used by the public schedule page and keeps `API_URL` off the client.

No countdown is fabricated. If the schedule feed returns no upcoming round or the request fails, the no-session state still renders with an explicit "next session unavailable" message instead of a timer.

## Next-Session Selection

Given the next `Round`, the displayed target session is selected with deterministic, testable logic:

- The next upcoming session is the earliest session whose `start` is in the future.
- If a future race session exists within the round, it is also surfaced as a secondary "next race" target, consistent with the existing public schedule behaviour.
- If every session in the round has already started or ended, no countdown target is shown and the round is presented as in-progress or concluded without a timer.

The selection logic is extracted into a small pure function so it can be unit tested independently of any component or network call.

## Visual Design

The no-session hero adopts the existing HUD aesthetic (`telemetry-panel`, `panel-title`, `data-chip`, cyan/rose accents) so it reads as a deliberate part of the product, not a fallback page.

- A clear primary line: no live session is currently running.
- The next round identity: round name and country, from real schedule data.
- A prominent countdown to the next session, reusing the established countdown logic.
- The next-race countdown as secondary context when distinct from the next session.
- Quiet secondary actions that stay within real data: links to the full Schedule and to Standings.
- Respect `prefers-reduced-motion`: the countdown remains accurate and legible without requiring animation.

The connecting state is visually lighter than the no-session hero — a short, centered indicator consistent with existing loading treatments — to avoid flashing a heavy empty-state hero during a normal momentary connection.

## Scope of Panels

Version one gates the main `/dashboard` page body. When the no-session state is active, the page renders the hero in place of `RegularDashboard` and `PresentationMode`. The hero is implemented as a reusable component so the other live-timing routes (track map, standings, weather) can adopt the same gate in a later pass without redesign.

The top static bar (session, weather, track info) is owned by the dashboard layout and keeps its current skeleton behaviour in version one; tightening those skeletons for the idle case is a follow-up, not part of this change.

## Component & File Changes

- Add a Route Handler (e.g. `app/dashboard/next-session/route.ts`) that proxies `GET /api/schedule/next` server-side using `API_URL`.
- Add a client hook (e.g. `useNextSession`) that fetches the proxied next round and exposes loading, data, and error.
- Add a pure selection helper (e.g. `lib/nextSession.ts`) returning the next session and next race from a round.
- Add a `NoLiveSession` component rendering the hero, countdown, round identity, and secondary links.
- Reuse the existing `Countdown` logic; if its current styling is too tied to the schedule page, factor the timer computation into a shared form usable by both without duplicating the animation-frame loop.
- Gate the dashboard body in `app/dashboard/page.tsx` on the live-session signal, adding the connecting and no-session branches ahead of the existing live composition.

## Testing

Automated tests cover:

- Next-session selection returns the earliest future session.
- Next-race selection returns a future race when present and nothing when absent.
- A round whose sessions have all started yields no countdown target.
- Malformed or empty rounds are handled without throwing.

Browser validation covers:

- With no live feed, the dashboard shows the no-session hero rather than empty panels.
- The countdown renders against real schedule data and ticks down.
- When the schedule proxy returns no upcoming round, the hero shows the explicit unavailable message instead of a timer.
- When a live session is present, the dashboard renders exactly as before with no regression.
- The connecting state appears only briefly and does not flash the full hero on a normal connection.
- Desktop, medium, and narrow viewports present the hero without overlap or clipped text.

## Acceptance Criteria

- On a non-session day the dashboard presents a deliberate no-live-session state, not empty or skeleton panels.
- The countdown is driven solely by the existing `/api/schedule/next` feed via a server-side proxy; `API_URL` is never exposed to the client.
- The live dashboard is byte-for-byte unchanged when a session is active.
- No predictive, inferred, or synthesized data is introduced.
- Next-session selection is covered by passing unit tests.

## Out of Scope

- Predicting session likelihood, weather, or results.
- Gating routes other than the main dashboard page (track map, standings, weather) — reserved as a follow-up using the same reusable component.
- Redesigning the top static bar skeletons.
- A distinct "session just ended" state separate from the existing `SessionStatus` handling.
- Push notifications or reminders for upcoming sessions.
