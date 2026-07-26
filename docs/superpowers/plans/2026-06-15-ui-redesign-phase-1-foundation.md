# UI Redesign Phase 1: Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add reversible UI preferences, New UI foundations, test infrastructure, and compatibility routing without changing Legacy behavior.

**Architecture:** Persist generation and density in a dedicated Zustand store. Mount a root-level preference synchronizer and generation control, then introduce reusable New UI primitives and shells. Route content switches through a client boundary; unmigrated New UI routes render existing content inside an explicit compatibility frame.

**Tech Stack:** React 19, Next.js App Router, Zustand persist middleware, Tailwind CSS 4, Lucide React, Vitest, React Testing Library, jsdom.

---

## File Structure

Create:

- `dashboard/src/lib/uiPreferences.ts`: preference types, defaults, normalization.
- `dashboard/src/stores/useUiPreferencesStore.ts`: persisted UI preferences.
- `dashboard/src/components/new-ui/UiPreferenceSync.tsx`: body data attributes and hydration marker.
- `dashboard/src/components/new-ui/InterfaceGenerationToggle.tsx`: always-available Legacy/New control.
- `dashboard/src/components/new-ui/DensityToggle.tsx`: Simple/Detailed control visible in New UI.
- `dashboard/src/components/new-ui/UiModeBoundary.tsx`: route presentation switch.
- `dashboard/src/components/new-ui/NewUiCompatibilityBoundary.tsx`: framed Legacy fallback.
- `dashboard/src/components/new-ui/primitives/Panel.tsx`
- `dashboard/src/components/new-ui/primitives/Kpi.tsx`
- `dashboard/src/components/new-ui/primitives/StatusBadge.tsx`
- `dashboard/src/components/new-ui/primitives/ViewState.tsx`
- `dashboard/src/components/new-ui/shell/NewUiSidebar.tsx`
- `dashboard/src/components/new-ui/shell/NewUiSessionBar.tsx`
- `dashboard/src/components/new-ui/shell/NewUiDashboardShell.tsx`
- `dashboard/src/components/new-ui/shell/NewUiPublicShell.tsx`
- `dashboard/src/lib/view-models/sessionBar.ts`
- `dashboard/src/lib/uiPreferences.test.ts`
- `dashboard/src/lib/view-models/sessionBar.test.ts`
- `dashboard/src/components/new-ui/UiModeBoundary.test.tsx`
- `dashboard/src/components/new-ui/primitives/primitives.test.tsx`
- `dashboard/test/setup.ts`

Modify:

- `dashboard/package.json`
- `dashboard/yarn.lock`
- `dashboard/vitest.config.ts`
- `dashboard/src/app/layout.tsx`
- `dashboard/src/styles/globals.css`
- `dashboard/src/app/dashboard/layout.tsx`
- `dashboard/src/app/(nav)/layout.tsx`
- `dashboard/src/app/archive/layout.tsx`
- `dashboard/src/app/results/layout.tsx`
- `dashboard/src/app/h2h/layout.tsx`
- `dashboard/src/app/driver/layout.tsx`

### Task 1: Add Component-Test Infrastructure

**Files:**
- Modify: `dashboard/package.json`
- Modify: `dashboard/yarn.lock`
- Modify: `dashboard/vitest.config.ts`
- Create: `dashboard/test/setup.ts`

- [ ] **Step 1: Install test dependencies**

Run from `dashboard/`:

```powershell
corepack yarn add -D @testing-library/react @testing-library/user-event @testing-library/jest-dom jsdom
```

Expected: command exits `0`; package manifest and lockfile change.

- [ ] **Step 2: Configure jsdom and setup file**

Replace the `test` section in `vitest.config.ts` with:

```ts
test: {
	include: ["src/**/*.test.ts", "src/**/*.test.tsx", "test/**/*.test.ts", "test/**/*.test.tsx"],
	environment: "jsdom",
	setupFiles: ["./test/setup.ts"],
	css: true,
},
```

Create `dashboard/test/setup.ts`:

```ts
import "@testing-library/jest-dom/vitest";

class ResizeObserverStub {
	observe() {}
	unobserve() {}
	disconnect() {}
}

Object.defineProperty(globalThis, "ResizeObserver", {
	configurable: true,
	value: ResizeObserverStub,
});
```

- [ ] **Step 3: Run current tests before feature work**

Run:

```powershell
corepack yarn test
```

Expected: existing suite passes with zero failures under jsdom.

- [ ] **Step 4: Commit**

```powershell
git add dashboard/package.json dashboard/yarn.lock dashboard/vitest.config.ts dashboard/test/setup.ts
git commit -m "test: add new UI component test setup"
```

### Task 2: Define And Normalize UI Preferences

**Files:**
- Create: `dashboard/src/lib/uiPreferences.ts`
- Create: `dashboard/src/lib/uiPreferences.test.ts`

- [ ] **Step 1: Write failing normalization tests**

Create `uiPreferences.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { defaultUiPreferences, normalizeUiPreferences } from "@/lib/uiPreferences";

describe("UI preferences", () => {
	it("defaults new users to Legacy and Simple", () => {
		expect(normalizeUiPreferences(undefined)).toEqual(defaultUiPreferences);
	});

	it("keeps valid stored values", () => {
		expect(normalizeUiPreferences({ generation: "new", density: "detailed" })).toEqual({
			generation: "new",
			density: "detailed",
		});
	});

	it("repairs invalid storage independently", () => {
		expect(normalizeUiPreferences({ generation: "broken", density: "detailed" })).toEqual({
			generation: "legacy",
			density: "detailed",
		});
	});
});
```

- [ ] **Step 2: Verify failure**

Run:

```powershell
corepack yarn test src/lib/uiPreferences.test.ts
```

Expected: FAIL because module does not exist.

- [ ] **Step 3: Implement pure preference model**

Create `uiPreferences.ts`:

```ts
export type InterfaceGeneration = "legacy" | "new";
export type UiDensity = "simple" | "detailed";

export type UiPreferences = {
	generation: InterfaceGeneration;
	density: UiDensity;
};

export const defaultUiPreferences: UiPreferences = {
	generation: "legacy",
	density: "simple",
};

export function normalizeUiPreferences(value: unknown): UiPreferences {
	const candidate = value as Partial<Record<keyof UiPreferences, unknown>> | null | undefined;
	return {
		generation: candidate?.generation === "new" ? "new" : "legacy",
		density: candidate?.density === "detailed" ? "detailed" : "simple",
	};
}
```

- [ ] **Step 4: Verify pass and commit**

```powershell
corepack yarn test src/lib/uiPreferences.test.ts
git add dashboard/src/lib/uiPreferences.ts dashboard/src/lib/uiPreferences.test.ts
git commit -m "feat: define UI preference model"
```

Expected: 3 tests pass; commit succeeds.

### Task 3: Add Persisted UI Preference Store

**Files:**
- Create: `dashboard/src/stores/useUiPreferencesStore.ts`
- Create: `dashboard/src/stores/useUiPreferencesStore.test.ts`

- [ ] **Step 1: Write failing store test**

```ts
import { beforeEach, expect, test } from "vitest";
import { useUiPreferencesStore } from "@/stores/useUiPreferencesStore";

beforeEach(() => {
	localStorage.clear();
	useUiPreferencesStore.getState().reset();
});

test("changes generation and density without touching either other value", () => {
	useUiPreferencesStore.getState().setGeneration("new");
	expect(useUiPreferencesStore.getState()).toMatchObject({ generation: "new", density: "simple" });
	useUiPreferencesStore.getState().setDensity("detailed");
	expect(useUiPreferencesStore.getState()).toMatchObject({ generation: "new", density: "detailed" });
});
```

- [ ] **Step 2: Run and confirm failure**

```powershell
corepack yarn test src/stores/useUiPreferencesStore.test.ts
```

Expected: FAIL because store does not exist.

- [ ] **Step 3: Implement store**

```ts
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
	defaultUiPreferences,
	normalizeUiPreferences,
	type InterfaceGeneration,
	type UiDensity,
} from "@/lib/uiPreferences";

type UiPreferencesStore = {
	generation: InterfaceGeneration;
	density: UiDensity;
	hydrated: boolean;
	setGeneration: (generation: InterfaceGeneration) => void;
	setDensity: (density: UiDensity) => void;
	setHydrated: (hydrated: boolean) => void;
	reset: () => void;
};

export const useUiPreferencesStore = create<UiPreferencesStore>()(
	persist(
		(set) => ({
			...defaultUiPreferences,
			hydrated: false,
			setGeneration: (generation) => set({ generation }),
			setDensity: (density) => set({ density }),
			setHydrated: (hydrated) => set({ hydrated }),
			reset: () => set({ ...defaultUiPreferences, hydrated: true }),
		}),
		{
			name: "ui-preferences-v1",
			storage: createJSONStorage(() => localStorage),
			partialize: ({ generation, density }) => ({ generation, density }),
			merge: (persisted, current) => ({ ...current, ...normalizeUiPreferences(persisted), hydrated: true }),
			onRehydrateStorage: () => (state) => state?.setHydrated(true),
		},
	),
);
```

- [ ] **Step 4: Verify and commit**

```powershell
corepack yarn test src/stores/useUiPreferencesStore.test.ts
git add dashboard/src/stores/useUiPreferencesStore.ts dashboard/src/stores/useUiPreferencesStore.test.ts
git commit -m "feat: persist UI generation and density"
```

### Task 4: Synchronize Root Attributes And Add Global Generation Toggle

**Files:**
- Create: `dashboard/src/components/new-ui/UiPreferenceSync.tsx`
- Create: `dashboard/src/components/new-ui/InterfaceGenerationToggle.tsx`
- Modify: `dashboard/src/app/layout.tsx`
- Create: `dashboard/src/components/new-ui/InterfaceGenerationToggle.test.tsx`

- [ ] **Step 1: Write interaction test**

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, test } from "vitest";
import InterfaceGenerationToggle from "@/components/new-ui/InterfaceGenerationToggle";
import { useUiPreferencesStore } from "@/stores/useUiPreferencesStore";

beforeEach(() => useUiPreferencesStore.getState().reset());

test("switches to New UI without navigation", async () => {
	render(<InterfaceGenerationToggle />);
	await userEvent.click(screen.getByRole("button", { name: "Use New UI" }));
	expect(useUiPreferencesStore.getState().generation).toBe("new");
});
```

- [ ] **Step 2: Run and verify failure**

```powershell
corepack yarn test src/components/new-ui/InterfaceGenerationToggle.test.tsx
```

- [ ] **Step 3: Implement synchronizer and toggle**

`UiPreferenceSync.tsx`:

```tsx
"use client";

import { useEffect } from "react";
import { useUiPreferencesStore } from "@/stores/useUiPreferencesStore";

export default function UiPreferenceSync() {
	const generation = useUiPreferencesStore((state) => state.generation);
	const density = useUiPreferencesStore((state) => state.density);
	const hydrated = useUiPreferencesStore((state) => state.hydrated);

	useEffect(() => {
		document.body.dataset.uiGeneration = generation;
		document.body.dataset.uiDensity = density;
		document.body.dataset.uiHydrated = String(hydrated);
	}, [density, generation, hydrated]);

	return null;
}
```

`InterfaceGenerationToggle.tsx`:

```tsx
"use client";

import { useUiPreferencesStore } from "@/stores/useUiPreferencesStore";

export default function InterfaceGenerationToggle() {
	const generation = useUiPreferencesStore((state) => state.generation);
	const setGeneration = useUiPreferencesStore((state) => state.setGeneration);
	const next = generation === "legacy" ? "new" : "legacy";
	return (
		<button
			type="button"
			aria-pressed={generation === "new"}
			aria-label={next === "new" ? "Use New UI" : "Use Legacy UI"}
			onClick={() => setGeneration(next)}
			className="ui-generation-toggle"
		>
			{generation === "legacy" ? "Legacy" : "New UI"}
		</button>
	);
}
```

Mount both as direct children of `<body>` around existing `OledModeProvider`, keeping the toggle outside route shells.

- [ ] **Step 4: Verify and commit**

```powershell
corepack yarn test src/components/new-ui/InterfaceGenerationToggle.test.tsx
git add dashboard/src/components/new-ui/UiPreferenceSync.tsx dashboard/src/components/new-ui/InterfaceGenerationToggle.tsx dashboard/src/components/new-ui/InterfaceGenerationToggle.test.tsx dashboard/src/app/layout.tsx
git commit -m "feat: add global UI generation control"
```

### Task 5: Add New UI Tokens And Base Utilities

**Files:**
- Modify: `dashboard/src/styles/globals.css`

- [ ] **Step 1: Add scoped tokens**

Append tokens under `body[data-ui-generation="new"]` so Legacy selectors remain unchanged:

```css
body[data-ui-generation="new"] {
	--ui-bg: #0b0d10;
	--ui-surface-1: #12151a;
	--ui-surface-2: #191d23;
	--ui-surface-3: #22272f;
	--ui-border: rgba(255, 255, 255, 0.1);
	--ui-text: #f5f7fa;
	--ui-muted: #9aa3ad;
	--ui-subtle: #6d7680;
	--ui-focus: #ffffff;
	background: var(--ui-bg);
	color: var(--ui-text);
}

.new-ui-number {
	font-variant-numeric: tabular-nums;
}

.ui-generation-toggle {
	position: fixed;
	right: 0.75rem;
	bottom: 0.75rem;
	z-index: 100;
	min-height: 2.5rem;
	border: 1px solid rgba(255, 255, 255, 0.22);
	border-radius: 999px;
	background: rgba(10, 12, 15, 0.92);
	padding: 0.5rem 0.85rem;
	color: white;
	font-size: 0.75rem;
	font-weight: 700;
	box-shadow: 0 8px 30px rgba(0, 0, 0, 0.35);
}

.ui-generation-toggle:focus-visible {
	outline: 2px solid white;
	outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
	body[data-ui-generation="new"] *,
	body[data-ui-generation="new"] *::before,
	body[data-ui-generation="new"] *::after {
		scroll-behavior: auto !important;
		animation-duration: 0.01ms !important;
		transition-duration: 0.01ms !important;
	}
}
```

- [ ] **Step 2: Run Legacy regression checks**

```powershell
corepack yarn test
corepack yarn lint
```

Expected: both exit `0`; no existing class is renamed or deleted.

- [ ] **Step 3: Commit**

```powershell
git add dashboard/src/styles/globals.css
git commit -m "style: add scoped New UI design tokens"
```

### Task 6: Build New UI Primitives

**Files:**
- Create: `dashboard/src/components/new-ui/primitives/Panel.tsx`
- Create: `dashboard/src/components/new-ui/primitives/Kpi.tsx`
- Create: `dashboard/src/components/new-ui/primitives/StatusBadge.tsx`
- Create: `dashboard/src/components/new-ui/primitives/ViewState.tsx`
- Create: `dashboard/src/components/new-ui/primitives/primitives.test.tsx`

- [ ] **Step 1: Write semantic tests**

Test that `Panel` exposes a labelled region, `Kpi` renders value/unit/context, `StatusBadge` includes visible text, and `ViewState` distinguishes loading, empty, unavailable, and error.

```tsx
import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import Panel from "@/components/new-ui/primitives/Panel";
import ViewState from "@/components/new-ui/primitives/ViewState";

test("panel is labelled by its title", () => {
	render(<Panel title="Classification">content</Panel>);
	expect(screen.getByRole("region", { name: "Classification" })).toBeVisible();
});

test("unavailable state is explicit", () => {
	render(<ViewState state="unavailable" title="Telemetry unavailable" />);
	expect(screen.getByText("Telemetry unavailable")).toBeVisible();
});
```

- [ ] **Step 2: Run and confirm failure**

```powershell
corepack yarn test src/components/new-ui/primitives/primitives.test.tsx
```

- [ ] **Step 3: Implement primitives**

Use focused props; do not accept arbitrary presentation variants beyond `primary | secondary | contextual` for `Panel` and semantic status kinds for `StatusBadge`.

`Panel` minimum API:

```tsx
type PanelProps = {
	title: string;
	eyebrow?: string;
	action?: React.ReactNode;
	level?: "primary" | "secondary" | "contextual";
	children: React.ReactNode;
	className?: string;
};
```

`ViewState` minimum API:

```tsx
type ViewStateProps = {
	state: "loading" | "empty" | "unavailable" | "error";
	title: string;
	description?: string;
	action?: React.ReactNode;
};
```

- [ ] **Step 4: Verify and commit**

```powershell
corepack yarn test src/components/new-ui/primitives/primitives.test.tsx
git add dashboard/src/components/new-ui/primitives
git commit -m "feat: add New UI presentation primitives"
```

### Task 7: Add Mode Boundary And Compatibility Fallback

**Files:**
- Create: `dashboard/src/components/new-ui/UiModeBoundary.tsx`
- Create: `dashboard/src/components/new-ui/NewUiCompatibilityBoundary.tsx`
- Create: `dashboard/src/components/new-ui/UiModeBoundary.test.tsx`

- [ ] **Step 1: Write all three branch tests**

```tsx
test.each([
	["legacy", "simple", "Legacy content"],
	["new", "simple", "Simple content"],
	["new", "detailed", "Detailed content"],
 ] as const)("renders %s/%s branch", (generation, density, expected) => {
	useUiPreferencesStore.setState({ generation, density, hydrated: true });
	render(<UiModeBoundary legacy={<>Legacy content</>} simple={<>Simple content</>} detailed={<>Detailed content</>} />);
	expect(screen.getByText(expected)).toBeVisible();
});
```

- [ ] **Step 2: Implement branch component**

```tsx
"use client";

import type { ReactNode } from "react";
import { useUiPreferencesStore } from "@/stores/useUiPreferencesStore";

export default function UiModeBoundary(props: { legacy: ReactNode; simple: ReactNode; detailed: ReactNode }) {
	const { generation, density, hydrated } = useUiPreferencesStore();
	if (!hydrated || generation === "legacy") return props.legacy;
	return density === "simple" ? props.simple : props.detailed;
}
```

Compatibility frame must include route name and text `This route is still using the Legacy layout inside New UI.`. It must not alter children or intercept links.

- [ ] **Step 3: Verify and commit**

```powershell
corepack yarn test src/components/new-ui/UiModeBoundary.test.tsx
git add dashboard/src/components/new-ui/UiModeBoundary.tsx dashboard/src/components/new-ui/NewUiCompatibilityBoundary.tsx dashboard/src/components/new-ui/UiModeBoundary.test.tsx
git commit -m "feat: add reversible UI route boundary"
```

### Task 8: Build Session-Bar View Model And Density Toggle

**Files:**
- Create: `dashboard/src/lib/view-models/sessionBar.ts`
- Create: `dashboard/src/lib/view-models/sessionBar.test.ts`
- Create: `dashboard/src/components/new-ui/DensityToggle.tsx`
- Create: `dashboard/src/components/new-ui/shell/NewUiSessionBar.tsx`

- [ ] **Step 1: Test truthful session modes**

Cover live, replay, delayed, disconnected, ended, and no-session inputs. Expected output shape:

```ts
type SessionBarModel = {
	eventName: string;
	sessionName: string;
	clock: string;
	lapLabel: string | null;
	trackStatus: { label: string; tone: "neutral" | "green" | "yellow" | "red" };
	connectionLabel: "Live" | "Delayed" | "Replay" | "Disconnected" | "Ended" | "No session";
	weatherLabel: string | null;
};
```

- [ ] **Step 2: Implement pure builder**

Function signature:

```ts
export function buildSessionBarModel(input: {
	state: State | null;
	connected: boolean;
	delaySeconds: number;
	replayPaused: boolean;
}): SessionBarModel
```

Use existing `getTrackStatusMessage` and existing session clock display rules. Never label delayed or replayed content as `Live`.

- [ ] **Step 3: Implement density control and bar**

Density toggle uses a two-button radiogroup with labels `Simple` and `Detailed`; it is hidden when generation is Legacy. Session bar consumes only `SessionBarModel`, not raw stores; add a small connected wrapper if store access is required.

- [ ] **Step 4: Verify and commit**

```powershell
corepack yarn test src/lib/view-models/sessionBar.test.ts
git add dashboard/src/lib/view-models/sessionBar.ts dashboard/src/lib/view-models/sessionBar.test.ts dashboard/src/components/new-ui/DensityToggle.tsx dashboard/src/components/new-ui/shell/NewUiSessionBar.tsx
git commit -m "feat: add New UI session context bar"
```

### Task 9: Build New UI Navigation And Shells

**Files:**
- Create: `dashboard/src/components/new-ui/shell/navigation.ts`
- Create: `dashboard/src/components/new-ui/shell/NewUiSidebar.tsx`
- Create: `dashboard/src/components/new-ui/shell/NewUiDashboardShell.tsx`
- Create: `dashboard/src/components/new-ui/shell/NewUiPublicShell.tsx`
- Create: `dashboard/src/components/new-ui/shell/navigation.test.ts`

- [ ] **Step 1: Test route grouping and active matching**

Define groups exactly:

```ts
export const newUiNavigation = [
	{ label: "Live", items: ["/dashboard", "/dashboard/qualifying", "/dashboard/track-map", "/dashboard/weather"] },
	{ label: "Analysis", items: ["/dashboard/analysis", "/dashboard/standings", "/h2h"] },
	{ label: "History", items: ["/archive", "/results", "/schedule"] },
	{ label: "System", items: ["/dashboard/settings", "/help", "/"] },
] as const;
```

Test exact match for `/dashboard` and prefix match for dynamic history/profile routes.

- [ ] **Step 2: Build compact sidebar**

Use Lucide icons, visible text labels, `aria-current="page"`, 12rem expanded width, and icon-only collapsed state. Do not include delay/replay controls in navigation.

- [ ] **Step 3: Build dashboard/public shells**

Dashboard shell structure:

```tsx
<div className="new-ui-app-shell">
	<NewUiSidebar />
	<div className="new-ui-workspace">
		<NewUiSessionBar />
		<main>{children}</main>
	</div>
</div>
```

Public shell uses same sidebar on desktop and a compact top nav under 1024px. Both shells include `DensityToggle` and retain global generation control.

- [ ] **Step 4: Verify and commit**

```powershell
corepack yarn test src/components/new-ui/shell/navigation.test.ts
git add dashboard/src/components/new-ui/shell
git commit -m "feat: add New UI application shells"
```

### Task 10: Integrate Shells Without Changing Legacy

**Files:**
- Modify: `dashboard/src/app/dashboard/layout.tsx`
- Modify: `dashboard/src/app/(nav)/layout.tsx`
- Modify: `dashboard/src/app/archive/layout.tsx`
- Modify: `dashboard/src/app/results/layout.tsx`
- Modify: `dashboard/src/app/h2h/layout.tsx`
- Modify: `dashboard/src/app/driver/layout.tsx`
- Create: `dashboard/test/uiShellCompatibility.test.ts`

- [ ] **Step 1: Extract current JSX into local Legacy shell functions**

Do not edit their markup. Example pattern:

```tsx
return (
	<UiModeBoundary
		legacy={<LegacyDashboardShell>{children}</LegacyDashboardShell>}
		simple={<NewUiDashboardShell><NewUiCompatibilityBoundary routeName="Dashboard">{children}</NewUiCompatibilityBoundary></NewUiDashboardShell>}
		detailed={<NewUiDashboardShell><NewUiCompatibilityBoundary routeName="Dashboard">{children}</NewUiCompatibilityBoundary></NewUiDashboardShell>}
	/>
);
```

Keep `useDataEngine`, `useSocket`, wake lock, and store setup above this branch so both generations share one live runtime.

- [ ] **Step 2: Add source-level regression assertions**

`uiShellCompatibility.test.ts` must assert:

- dashboard runtime hooks appear outside `LegacyDashboardShell`;
- every listed layout imports a New UI shell;
- every unmigrated route family includes `NewUiCompatibilityBoundary`;
- Legacy sidebar remains mounted only in Legacy branch.

- [ ] **Step 3: Run complete verification**

```powershell
corepack yarn test
corepack yarn lint
$env:API_URL='http://localhost:4001'; $env:NEXT_PUBLIC_LIVE_URL='http://localhost:4000'; corepack yarn build
```

Expected: all exit `0`.

- [ ] **Step 4: Browser smoke test at 1920x1080**

Verify:

1. Default load shows Legacy.
2. Toggle changes to New UI without route change.
3. Reload restores New UI.
4. Density choice persists.
5. New UI compatibility frame renders current content.
6. Returning to Legacy exactly restores existing shell.

- [ ] **Step 5: Commit**

```powershell
git add dashboard/src/app dashboard/test/uiShellCompatibility.test.ts
git commit -m "feat: integrate reversible New UI shells"
```

## Phase 1 Completion Gate

- [ ] `git diff --check` reports no errors.
- [ ] `git status --short` contains no unexpected files.
- [ ] Full test, lint, and build commands pass.
- [ ] Legacy screenshots at `/`, `/dashboard`, `/results`, and `/archive` show no unintended changes.
- [ ] New UI toggle is reachable from every route.
- [ ] Commit phase checkpoint:

```powershell
git commit --allow-empty -m "chore: complete UI redesign foundation phase"
```
