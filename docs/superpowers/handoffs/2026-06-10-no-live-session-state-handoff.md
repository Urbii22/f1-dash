# Handoff: No-Live-Session Dashboard State

> **Purpose of this document.** It is a complete, self-contained brief for an implementer (human or model) who has access to this repository but **none of the prior conversation**. It contains the goal, the real data-flow facts you need, the exact files to create/edit with code skeletons, the non-obvious gotchas, and how to test and verify. Read it top to bottom before writing code.

---

## 1. What this project is

`f1-dash` is a real-time Formula 1 telemetry and timing dashboard.

- **Backend:** Rust workspace (`api`, `realtime`, `signalr`, `simulator`, `shared`).
- **Frontend:** Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS 4 + Zustand 5, under `dashboard/`.
- The dashboard is **client-rendered** and receives live timing over Server-Sent Events (SSE).

You will only touch the **`dashboard/`** frontend. No Rust changes are required.

---

## 2. Goal & hard constraints

**Goal:** When no F1 session is live, the dashboard currently shows empty/skeleton panels and looks broken. Replace that with a deliberate **"no live session"** state that shows the **real countdown to the next scheduled session**.

**Hard constraints (do not violate):**

- **Real data only.** No predictions, no inferred timing, no synthesized values. The only data source for the countdown is the schedule feed the backend already serves.
- **Zero regression when live.** When a session is active, the dashboard must render exactly as it does today.
- **UI-only change.** No new backend endpoints, no new third-party data.
- **`API_URL` must never reach the client.** It is a server-only environment variable (see §4).

---

## 3. The three states

The main dashboard body must resolve to exactly one of:

1. **Connecting** — SSE not yet open and no session metadata yet. Show a light, calm indicator. Brief on a normal connection.
2. **No live session** — connection settled and no session metadata present. Show the new hero + countdown.
3. **Live** — session metadata present. Render the existing dashboard unchanged.

**The single source of truth for "a session is live" is the presence of `state.SessionInfo`** in the global data store. Absence of `SessionInfo` ⇒ no live session.

> Session *end* is **not** a separate state for this task. When a session finishes, the feed keeps exposing `SessionInfo`, and existing `SessionStatus.Status === "Ends"` handling stays untouched. Only a genuinely absent `SessionInfo` triggers the no-session state.

---

## 4. Data-flow facts you need (with ground-truth code)

### 4.1 The global data store

`dashboard/src/stores/useDataStore.ts` — timing state lives here. `state` is `null` until the SSE `initial` message arrives, then it is merged from buffers.

```ts
type DataStore = {
  state: State | null;        // <-- state.SessionInfo presence = live signal
  carsData: CarsData | null;
  positions: Positions | null;
  // setters...
};
```

`State.SessionInfo` type (`dashboard/src/types/state.type.ts`):

```ts
export type State = {
  SessionInfo?: SessionInfo;
  SessionStatus?: SessionStatus;   // Status: "Started" | "Finished" | "Finalised" | "Ends"
  // ...many other optional fields
};
export type SessionInfo = { Meeting: Meeting; Name: string; /* ... */ };
```

### 4.2 The SSE connection and the `connected` flag

`dashboard/src/hooks/useSocket.ts` opens an `EventSource` to `${NEXT_PUBLIC_LIVE_URL}/api/realtime` and returns `{ connected }`.

`dashboard/src/app/dashboard/layout.tsx` calls `useSocket` and currently passes `connected` **only to the Sidebar**:

```ts
const { connected } = useSocket({ handleInitial, handleUpdate });
// ...
<Sidebar key="sidebar" connected={connected} />
```

> **GOTCHA #1 — `page.tsx` cannot see `connected` today.** The dashboard page is rendered as `{children}` of the layout and receives no props. You must wire `connected` so the page can read it. See §6, Step 5 for the recommended minimal fix (a tiny connection store).

### 4.3 Environment variables (this is the crux of the design)

`dashboard/src/env.ts` enforces a server/client split with Zod and a runtime Proxy:

- `API_URL` — **server-only.** Accessing it on the client **throws**.
- `NEXT_PUBLIC_LIVE_URL` — public, the only base URL the client may use; it points at the `realtime` service (timing SSE), **not** the schedule API.

The schedule lives on the `api` service behind `API_URL`. **Therefore the client cannot fetch the schedule directly.** You will add a server-side Next.js Route Handler that proxies it (see §6, Step 2).

### 4.4 The schedule feed (the real countdown source)

The Rust `api` service exposes `GET /api/schedule/next`, returning a single `Round`:

```ts
// dashboard/src/types/schedule.type.ts
export type Round = {
  name: string;
  countryName: string;
  countryKey: null;
  start: string;   // ISO
  end: string;     // ISO
  sessions: Session[];
  over: boolean;
};
export type Session = {
  kind: string;    // e.g. "Practice 1", "Qualifying", "Race", "Sprint"
  start: string;   // ISO
  end: string;     // ISO
};
```

> **Important upstream behaviour:** `/api/schedule/next` returns **HTTP 204 No Content** when there is no upcoming round. Handle 204 explicitly (it is not an error and has no body).

### 4.5 Existing pieces you should REUSE, not reinvent

- **Server-fetch pattern:** `dashboard/src/components/schedule/NextRound.tsx` already fetches the next round server-side via `${env.API_URL}/api/schedule/next` with `cache: "no-store"`, and selects targets like this:

  ```ts
  const nextSession = next.sessions.filter(
    (s) => utc(s.start) > utc() && s.kind.toLowerCase() !== "race"
  )[0];
  const nextRace = next.sessions.find((s) => s.kind.toLowerCase() == "race");
  ```

  Reproduce this selection logic as a pure, testable helper (§6, Step 1).

- **Countdown timer:** `dashboard/src/components/schedule/Countdown.tsx` is a client component that animates a `days/hours/minutes/seconds` countdown to a `Session.start` via `requestAnimationFrame`. Reuse its timer logic. Its current styling is tuned for the light schedule page, so if it does not fit the HUD aesthetic, extract the timer computation into a shared hook and restyle, **without duplicating the animation loop**.

---

## 5. Visual design

The no-session hero must read as a deliberate part of the product, using the existing HUD design system already defined in `dashboard/src/styles/globals.css`:

- `.telemetry-panel` — the bordered, glowing panel container.
- `.panel-title` — the small mono uppercase cyan eyebrow.
- `.data-chip` — the small bordered chip used for actions/labels.
- Accent palette: cyan (`rgb(125 211 252)` / `#00e5ff`) primary, rose (`#ff2b55`) secondary.

Hero contents:

- A clear primary line: no live session is currently running.
- The next round identity: round name + country (from real schedule data).
- A prominent countdown to the next session (reuse the countdown logic).
- The next-race countdown as **secondary** context only when distinct from the next session.
- Quiet secondary links that stay within real data: to `/schedule` and `/dashboard/standings`.
- **Respect `prefers-reduced-motion`:** the countdown must stay accurate and legible without requiring animation.

The **connecting** state must be lighter than the hero (a short centered indicator consistent with existing loading treatments) so a normal momentary connection does not flash the heavy hero.

---

## 6. Implementation steps

> Follow in order. Each step lists the file(s) and a skeleton. Adapt names to match surrounding conventions; the skeletons are guidance, not verbatim requirements.

### Step 1 — Pure next-session selection helper (write tests first)

**New file:** `dashboard/src/lib/nextSession.ts`

```ts
import type { Round, Session } from "@/types/schedule.type";

export type NextTargets = {
  nextSession: Session | null; // earliest future non-race session
  nextRace: Session | null;    // earliest future race session
};

export function selectNextTargets(round: Round | null, now: Date): NextTargets {
  if (!round || !Array.isArray(round.sessions)) {
    return { nextSession: null, nextRace: null };
  }
  const nowMs = now.getTime();
  const future = round.sessions
    .filter((s) => Number.isFinite(Date.parse(s.start)) && Date.parse(s.start) > nowMs)
    .sort((a, b) => Date.parse(a.start) - Date.parse(b.start));

  const nextSession = future.find((s) => s.kind.toLowerCase() !== "race") ?? null;
  const nextRace = future.find((s) => s.kind.toLowerCase() === "race") ?? null;
  return { nextSession, nextRace };
}
```

**New test file:** `dashboard/test/nextSession.test.ts`

> **GOTCHA #2 — test imports.** The Node test runner (`--experimental-strip-types`) does **not** resolve the `@/` path alias. Existing tests import with **relative paths and explicit `.ts` extensions**. Match that exactly:

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { selectNextTargets } from "../src/lib/nextSession.ts";

const round = (sessions: { kind: string; start: string }[]) => ({
  name: "Test GP", countryName: "X", countryKey: null,
  start: "", end: "", over: false,
  sessions: sessions.map((s) => ({ ...s, end: s.start })),
});

test("selects the earliest future non-race session", () => {
  const now = new Date("2026-06-10T00:00:00Z");
  const r = round([
    { kind: "Practice 1", start: "2026-06-12T10:00:00Z" },
    { kind: "Qualifying", start: "2026-06-13T14:00:00Z" },
    { kind: "Race", start: "2026-06-14T13:00:00Z" },
  ]);
  assert.equal(selectNextTargets(r as any, now).nextSession?.kind, "Practice 1");
});

test("returns the future race when present", () => {
  const now = new Date("2026-06-10T00:00:00Z");
  const r = round([{ kind: "Race", start: "2026-06-14T13:00:00Z" }]);
  assert.equal(selectNextTargets(r as any, now).nextRace?.kind, "Race");
});

test("returns null race when no future race exists", () => {
  const now = new Date("2026-06-14T18:00:00Z");
  const r = round([{ kind: "Race", start: "2026-06-14T13:00:00Z" }]);
  assert.equal(selectNextTargets(r as any, now).nextRace, null);
});

test("yields no targets when all sessions are in the past", () => {
  const now = new Date("2026-06-20T00:00:00Z");
  const r = round([{ kind: "Practice 1", start: "2026-06-12T10:00:00Z" }]);
  assert.deepEqual(selectNextTargets(r as any, now), { nextSession: null, nextRace: null });
});

test("handles null and malformed rounds without throwing", () => {
  const now = new Date();
  assert.deepEqual(selectNextTargets(null, now), { nextSession: null, nextRace: null });
  assert.deepEqual(selectNextTargets({} as any, now), { nextSession: null, nextRace: null });
});
```

Run and confirm green: `node --experimental-strip-types --test test/nextSession.test.ts` (from `dashboard/`).

### Step 2 — Server-side schedule proxy (Route Handler)

**New file:** `dashboard/src/app/dashboard/next-session/route.ts`

```ts
import { NextResponse } from "next/server";
import { env } from "@/env";
import type { Round } from "@/types/schedule.type";

export const dynamic = "force-dynamic"; // never statically cache

export async function GET() {
  try {
    const res = await fetch(`${env.API_URL}/api/schedule/next`, { cache: "no-store" });
    // 204 = no upcoming round; treat as a valid "none" result, not an error.
    if (res.status === 204 || !res.ok) {
      return NextResponse.json({ round: null });
    }
    const round: Round = await res.json();
    return NextResponse.json({ round });
  } catch (e) {
    console.error("next-session proxy failed", e);
    return NextResponse.json({ round: null });
  }
}
```

- `API_URL` is read **only here** (server runtime). Do not import it into any client module.
- The client always gets `200` with `{ round: Round | null }`, so client UI never breaks on a backend hiccup.

### Step 3 — Client hook for the next round

**New file:** `dashboard/src/hooks/useNextSession.ts`

```ts
"use client";
import { useEffect, useState } from "react";
import type { Round } from "@/types/schedule.type";
import { selectNextTargets, type NextTargets } from "@/lib/nextSession";

const REFETCH_MS = 60_000; // coarse: only to roll over when a session starts

export function useNextSession() {
  const [round, setRound] = useState<Round | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [targets, setTargets] = useState<NextTargets>({ nextSession: null, nextRace: null });

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch("/dashboard/next-session", { cache: "no-store" });
        const data: { round: Round | null } = await res.json();
        if (!alive) return;
        setRound(data.round);
        setError(false);
      } catch {
        if (alive) setError(true);
      } finally {
        if (alive) setLoading(false);
      }
    };
    load();
    const id = setInterval(load, REFETCH_MS);
    return () => { alive = false; clearInterval(id); };
  }, []);

  // Recompute targets whenever the round changes; the per-second tick lives in the countdown.
  useEffect(() => {
    setTargets(selectNextTargets(round, new Date()));
  }, [round]);

  return { round, ...targets, loading, error };
}
```

### Step 4 — NoLiveSession hero component

**New file:** `dashboard/src/components/dashboard/NoLiveSession.tsx`

- Use `telemetry-panel`, `panel-title`, `data-chip` classes for visual consistency.
- Show primary line, round identity (`round.name`, `round.countryName`), and a prominent countdown to `nextSession.start`.
- Reuse the countdown logic from `components/schedule/Countdown.tsx`. If its styling doesn't fit, extract the `requestAnimationFrame` timer into a shared hook (e.g. `hooks/useCountdown.ts`) consumed by both, **without duplicating the loop**.
- Render the `nextRace` countdown as secondary context only when it differs from `nextSession`.
- When `nextSession` is `null` (no upcoming round / backend error), show an explicit **"next session unavailable"** message — never a fabricated timer.
- Add quiet links to `/schedule` and `/dashboard/standings`.
- Honor `prefers-reduced-motion` (e.g. via a CSS media query or `useReducedMotion()` from `motion/react`).

### Step 5 — Make `connected` readable by the page

> Resolves GOTCHA #1. Recommended minimal approach: a tiny connection store.

**New file:** `dashboard/src/stores/useConnectionStore.ts`

```ts
import { create } from "zustand";

type ConnectionStore = {
  connected: boolean;
  setConnected: (connected: boolean) => void;
};

export const useConnectionStore = create<ConnectionStore>((set) => ({
  connected: false,
  setConnected: (connected) => set({ connected }),
}));
```

**Edit:** `dashboard/src/app/dashboard/layout.tsx` — mirror the existing `connected` into the store:

```ts
import { useEffect } from "react";
import { useConnectionStore } from "@/stores/useConnectionStore";
// ...
const { connected } = useSocket({ handleInitial, handleUpdate });
const setConnected = useConnectionStore((s) => s.setConnected);
useEffect(() => { setConnected(connected); }, [connected, setConnected]);
```

(Keep passing `connected` to `Sidebar` as before — that prop stays.)

> Alternative if you prefer not to add a store: gate purely on `SessionInfo`, and approximate the connecting state with a short mount delay before showing the hero. The store approach is cleaner and uses the real connection signal.

### Step 6 — Gate the dashboard body

**Edit:** `dashboard/src/app/dashboard/page.tsx`

Current structure (for reference):

```tsx
export default function Page() {
  const presentationMode = usePresentationModeStore((s) => s.enabled);
  // ...
  return (
    <div className="flex w-full flex-col gap-3 p-3">
      <div className="flex justify-end">{/* Presentation toggle button */}</div>
      {presentationMode ? <PresentationMode /> : <RegularDashboard />}
      <Footer />
    </div>
  );
}
```

Add the gate **before** the live composition:

```tsx
const hasSession = useDataStore((s) => !!s.state?.SessionInfo);
const connected = useConnectionStore((s) => s.connected);

// inside the returned tree, replacing `{presentationMode ? <PresentationMode/> : <RegularDashboard/>}`:
{hasSession ? (
  presentationMode ? <PresentationMode /> : <RegularDashboard />
) : connected ? (
  <NoLiveSession />
) : (
  <ConnectingState />  // light, centered indicator; can be a small local component
)}
```

- Keep the Presentation toggle button hidden or disabled while there is no session (it has nothing to toggle). Optional but tidy.
- **Do not** alter the layout top static bar or its skeletons — out of scope.

---

## 7. How to test & verify

All commands run from the `dashboard/` directory. This is a **Windows** repo; the package manager is **yarn via corepack** (`yarn@4.14.1`).

### Unit tests

```
node --experimental-strip-types --test test/nextSession.test.ts   # new
node --experimental-strip-types --test test/*.test.ts             # full suite (18 existing + new must pass)
```

### Lint

```
corepack yarn lint
```

### Production build

The build needs env vars. `API_URL` and `NEXT_PUBLIC_LIVE_URL` must be set (any well-formed `http(s)://...` value passes Zod). If you only want to type/build-check without real backends, you may set `SKIP_ENV_VALIDATION=1`.

PowerShell example:

```powershell
$env:API_URL = "http://localhost:4000"
$env:NEXT_PUBLIC_LIVE_URL = "http://localhost:4000"
corepack yarn build
```

### Browser validation (when a local dashboard target is available)

- **No live feed** → no-session hero with a real, ticking countdown.
- **Backend returns no round (204)** → explicit "next session unavailable" message, no fabricated timer.
- **Live session present** → dashboard renders exactly as before (no regression).
- **Connecting** appears only briefly and does not flash the full hero on a normal connection.
- Desktop, medium, and narrow viewports show no overlap or clipped text.

---

## 8. Acceptance criteria

- On a non-session day, the dashboard shows a deliberate no-live-session state, not empty/skeleton panels.
- The countdown is driven solely by `/api/schedule/next` via the server-side proxy; `API_URL` is never exposed to the client.
- The live dashboard is unchanged when a session is active.
- No predictive, inferred, or synthesized data is introduced.
- `selectNextTargets` is covered by passing unit tests, and the full suite stays green.
- `corepack yarn lint` and `corepack yarn build` succeed.

---

## 9. Files summary

**New:**
- `dashboard/src/lib/nextSession.ts`
- `dashboard/test/nextSession.test.ts`
- `dashboard/src/app/dashboard/next-session/route.ts`
- `dashboard/src/hooks/useNextSession.ts`
- `dashboard/src/components/dashboard/NoLiveSession.tsx`
- `dashboard/src/stores/useConnectionStore.ts`
- *(optional)* `dashboard/src/hooks/useCountdown.ts` if extracting the timer from `Countdown.tsx`

**Edited:**
- `dashboard/src/app/dashboard/layout.tsx` (mirror `connected` into the store)
- `dashboard/src/app/dashboard/page.tsx` (gate the body into connecting / no-session / live)

---

## 10. Out of scope

- Predicting session likelihood, weather, or results.
- Gating routes other than the main dashboard page (track-map, standings, weather) — a later pass can reuse `NoLiveSession`.
- Redesigning the top static bar skeletons.
- A distinct "session just ended" state separate from existing `SessionStatus` handling.
- Push notifications or reminders.

---

## 11. Gotchas recap

1. **`page.tsx` has no `connected` prop** — wire it via a connection store (Step 5).
2. **Tests must use relative imports with `.ts` extensions**, not the `@/` alias — the Node test runner won't resolve the alias.
3. **`API_URL` is server-only** and throws if read on the client — that is the entire reason the Route Handler proxy exists.
4. **`/api/schedule/next` returns 204** when there's no upcoming round — handle it as "none", not an error.
5. **Reuse, don't reinvent** the countdown loop and the next-session selection logic that already exist in `components/schedule/`.
