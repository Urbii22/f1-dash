# UI Redesign Phase 6: Hardening And Release Evidence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prove functional parity, accessibility, visual stability, truthful error states, and acceptable render performance across Legacy, New UI Simple, and New UI Detailed.

**Architecture:** Add deterministic UI fixtures and Playwright coverage without coupling production routes to test data. Isolate panel failures with local boundaries, audit focused Zustand subscriptions, capture 1920x1080 baselines, and record route-by-route parity evidence. Keep Legacy available and default unchanged.

**Tech Stack:** Vitest, React Testing Library, Playwright, axe-core, Next.js fixture route, React Profiler, existing launcher and sample replay.

---

## File Structure

Create:

- `dashboard/playwright.config.ts`
- `dashboard/e2e/ui-preferences.spec.ts`
- `dashboard/e2e/simple-dashboard.spec.ts`
- `dashboard/e2e/detailed-dashboard.spec.ts`
- `dashboard/e2e/routes.spec.ts`
- `dashboard/e2e/accessibility.spec.ts`
- `dashboard/src/app/ui-fixtures/[scenario]/page.tsx`
- `dashboard/src/components/new-ui/fixtures/UiFixtureHarness.tsx`
- `dashboard/src/lib/fixtures/uiFixtures.ts`
- `dashboard/src/components/new-ui/errors/PanelErrorBoundary.tsx`
- `dashboard/src/components/new-ui/errors/PanelErrorBoundary.test.tsx`
- `dashboard/src/lib/view-models/viewState.ts`
- `dashboard/src/lib/view-models/viewState.test.ts`
- `dashboard/test/renderIsolation.test.tsx`
- `docs/ui-redesign-parity-matrix.md`
- `docs/ui-redesign-qa.md`

Modify:

- `dashboard/package.json`
- `dashboard/yarn.lock`
- New UI panel compositions from phases 2-5.
- `README.md`
- `SETUP.md`

### Task 1: Add Playwright And Axe Infrastructure

**Files:**
- Modify: `dashboard/package.json`
- Modify: `dashboard/yarn.lock`
- Create: `dashboard/playwright.config.ts`

- [ ] **Step 1: Install dependencies**

Run from `dashboard/`:

```powershell
corepack yarn add -D @playwright/test @axe-core/playwright
corepack yarn playwright install chromium
```

Expected: dependency install and Chromium install exit `0`.

- [ ] **Step 2: Add scripts**

Add to `package.json`:

```json
"test:e2e": "playwright test",
"test:e2e:update": "playwright test --update-snapshots"
```

- [ ] **Step 3: Create deterministic config**

```ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
	testDir: "./e2e",
	fullyParallel: false,
	retries: 0,
	use: {
		baseURL: "http://127.0.0.1:3100",
		trace: "retain-on-failure",
		screenshot: "only-on-failure",
		viewport: { width: 1920, height: 1080 },
		colorScheme: "dark",
		...devices["Desktop Chrome"],
	},
	webServer: {
		command: "corepack yarn dev --port 3100",
		url: "http://127.0.0.1:3100/ui-fixtures/simple-race",
		reuseExistingServer: false,
		env: {
			UI_FIXTURES: "1",
			API_URL: "http://127.0.0.1:4001",
			NEXT_PUBLIC_LIVE_URL: "http://127.0.0.1:4000",
		},
	},
});
```

- [ ] **Step 4: Verify config discovery and commit**

```powershell
corepack yarn playwright test --list
git add dashboard/package.json dashboard/yarn.lock dashboard/playwright.config.ts
git commit -m "test: add New UI Playwright infrastructure"
```

### Task 2: Build Deterministic UI Fixture Harness

**Files:**
- Create: `dashboard/src/lib/fixtures/uiFixtures.ts`
- Create: `dashboard/src/components/new-ui/fixtures/UiFixtureHarness.tsx`
- Create: `dashboard/src/app/ui-fixtures/[scenario]/page.tsx`
- Create: `dashboard/src/lib/fixtures/uiFixtures.test.ts`

- [ ] **Step 1: Define supported scenarios and tests**

```ts
export type UiFixtureScenario =
	| "simple-race"
	| "detailed-race"
	| "yellow-flag"
	| "no-session"
	| "disconnected-replay"
	| "qualifying"
	| "weather"
	| "archive";
```

Test every scenario returns valid `State`, optional car/position data, alerts, lap history, and expected UI preferences. Use fixed UTC timestamps and 20 current drivers.

- [ ] **Step 2: Implement fixture data as plain objects**

Fixture builder API:

```ts
export function buildUiFixture(scenario: UiFixtureScenario): {
	state: State | null;
	carsData: CarsData | null;
	positions: Positions | null;
	generation: "legacy" | "new";
	density: "simple" | "detailed";
	connected: boolean;
};
```

Use realistic but synthetic values. Include missing values on at least two drivers to exercise unavailable states.

- [ ] **Step 3: Implement gated route**

Server page calls `notFound()` unless `process.env.UI_FIXTURES === "1"`. Client harness seeds `useDataStore`, `useConnectionStore`, `useUiPreferencesStore`, and selection/layout stores before rendering the target route presenter directly. Cleanup resets stores on unmount.

- [ ] **Step 4: Verify and commit**

```powershell
corepack yarn test src/lib/fixtures/uiFixtures.test.ts
git add dashboard/src/lib/fixtures dashboard/src/components/new-ui/fixtures dashboard/src/app/ui-fixtures
git commit -m "test: add deterministic New UI fixtures"
```

### Task 3: Add Preference Persistence E2E

**Files:**
- Create: `dashboard/e2e/ui-preferences.spec.ts`

- [ ] **Step 1: Test generation persistence**

```ts
test("restores New UI after reload", async ({ page }) => {
	await page.goto("/ui-fixtures/simple-race");
	await page.getByRole("button", { name: "Use New UI" }).click();
	await page.reload();
	await expect(page.locator("body")).toHaveAttribute("data-ui-generation", "new");
});
```

- [ ] **Step 2: Test density and route preservation**

Navigate to a query-bearing fixture URL, switch Simple/Detailed, assert URL is unchanged and selected driver remains. Corrupt `ui-preferences-v1` in localStorage, reload, and assert fallback to Legacy/Simple without crash.

- [ ] **Step 3: Run and commit**

```powershell
corepack yarn test:e2e e2e/ui-preferences.spec.ts
git add dashboard/e2e/ui-preferences.spec.ts
git commit -m "test: cover UI preference persistence"
```

### Task 4: Add Simple Dashboard E2E And Baseline

**Files:**
- Create: `dashboard/e2e/simple-dashboard.spec.ts`

- [ ] **Step 1: Test interaction flow**

Flow:

1. Open `simple-race` at 1920x1080.
2. Assert classification, race story, alerts, strategy, and compact map visible.
3. Assert classification bounding box wider than map.
4. Click driver row; assert drawer opens.
5. Press Escape; assert drawer closes and focus returns.
6. Assert `document.documentElement.scrollHeight === window.innerHeight` or no vertical page overflow beyond 1px tolerance.

- [ ] **Step 2: Add screenshot assertion**

```ts
await expect(page).toHaveScreenshot("new-ui-simple-race-1920x1080.png", {
	animations: "disabled",
	maxDiffPixelRatio: 0.01,
});
```

Also capture yellow flag, no-session, and disconnected replay.

- [ ] **Step 3: Generate baseline, rerun, commit**

```powershell
corepack yarn test:e2e:update e2e/simple-dashboard.spec.ts
corepack yarn test:e2e e2e/simple-dashboard.spec.ts
git add dashboard/e2e/simple-dashboard.spec.ts dashboard/e2e/simple-dashboard.spec.ts-snapshots
git commit -m "test: baseline Simple New UI dashboard"
```

### Task 5: Add Detailed Dashboard E2E And Baseline

**Files:**
- Create: `dashboard/e2e/detailed-dashboard.spec.ts`

- [ ] **Step 1: Test all presets**

Assert Race, Strategy, Driver tabs show required panel labels. Select a driver before changing preset and assert selection persists.

- [ ] **Step 2: Test keyboard resizing and persistence**

Focus primary splitter, record `aria-valuenow`, press `ArrowRight`, assert +1; press `Shift+ArrowRight`, assert +5; reload and assert retained. Click reset and assert preset default.

- [ ] **Step 3: Test pointer resizing**

Drag splitter 100px, assert value changes within schema bounds and no text selection occurs.

- [ ] **Step 4: Capture screenshots and commit**

```powershell
corepack yarn test:e2e:update e2e/detailed-dashboard.spec.ts
corepack yarn test:e2e e2e/detailed-dashboard.spec.ts
git add dashboard/e2e/detailed-dashboard.spec.ts dashboard/e2e/detailed-dashboard.spec.ts-snapshots
git commit -m "test: baseline Detailed New UI dashboard"
```

### Task 6: Add Route And Legacy Visual Coverage

**Files:**
- Create: `dashboard/e2e/routes.spec.ts`

- [ ] **Step 1: Define screenshot matrix**

Use fixture routes or deterministic mocked API responses to cover:

```text
Legacy: /, /dashboard, /results, /archive
Simple: dashboard, qualifying, analysis, standings, weather, track map,
        archive, round result, H2H, driver, home, schedule, settings, help
Detailed: same route families
```

- [ ] **Step 2: Assert route controls**

For every route: generation toggle visible, New UI density toggle visible only in New UI, active navigation correct, no uncaught page errors, and no horizontal document overflow at 1920px. On Analysis, set driver filters and active tab before changing density and assert they persist. On Archive, set `year` and `type` query filters and assert both URL and visible result count persist.

- [ ] **Step 3: Generate and verify baselines**

```powershell
corepack yarn test:e2e:update e2e/routes.spec.ts
corepack yarn test:e2e e2e/routes.spec.ts
```

- [ ] **Step 4: Commit**

```powershell
git add dashboard/e2e/routes.spec.ts dashboard/e2e/routes.spec.ts-snapshots
git commit -m "test: add full route visual baselines"
```

### Task 7: Add Automated Accessibility Coverage

**Files:**
- Create: `dashboard/e2e/accessibility.spec.ts`

- [ ] **Step 1: Run axe on representative states**

```ts
const results = await new AxeBuilder({ page })
	.withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
	.analyze();
expect(results.violations).toEqual([]);
```

Run on Simple race, Detailed race, driver drawer open, qualifying, archive, settings confirmation modal, and no-session.

- [ ] **Step 2: Add keyboard traversal checks**

Verify skip/focus order, visible focus, sidebar navigation, density toggle, timing rows, drawer, tabs, splitters, reset modal, and Escape behavior. Verify status labels remain understandable with CSS colors disabled.

Add responsive and zoom smoke checks:

- 200% browser zoom at 1920x1080: generation/density controls and primary route action remain reachable.
- 1024x768: New UI shell has no horizontal document overflow.
- 390x844: navigation can open/close, route title remains visible, and compatibility escape to Legacy remains reachable. Full mobile layout parity is not required in this phase.

- [ ] **Step 3: Run and commit**

```powershell
corepack yarn test:e2e e2e/accessibility.spec.ts
git add dashboard/e2e/accessibility.spec.ts
git commit -m "test: add New UI accessibility coverage"
```

### Task 8: Add Panel Error Isolation And Shared View-State Resolver

**Files:**
- Create: `dashboard/src/components/new-ui/errors/PanelErrorBoundary.tsx`
- Create: `dashboard/src/components/new-ui/errors/PanelErrorBoundary.test.tsx`
- Create: `dashboard/src/lib/view-models/viewState.ts`
- Create: `dashboard/src/lib/view-models/viewState.test.ts`
- Modify: New UI route compositions from phases 2-5.

- [ ] **Step 1: Test boundary isolation**

Render one throwing child beside healthy content; assert healthy content remains and failed panel shows `Panel unavailable` plus retry button. Retry remounts only failed panel.

- [ ] **Step 2: Test shared state resolver**

```ts
export function resolveViewState(input: {
	loading: boolean;
	error?: unknown;
	available: boolean;
	empty: boolean;
}): "loading" | "error" | "unavailable" | "empty" | "ready"
```

Priority: loading, error, unavailable, empty, ready.

- [ ] **Step 3: Wrap independent panels**

Wrap dashboard panels, charts, map, weather radar, archive telemetry, and H2H tables. Do not wrap the whole workspace in one panel boundary.

- [ ] **Step 4: Verify and commit**

```powershell
corepack yarn test src/components/new-ui/errors/PanelErrorBoundary.test.tsx src/lib/view-models/viewState.test.ts
git add dashboard/src/components/new-ui/errors dashboard/src/lib/view-models/viewState.ts dashboard/src/lib/view-models/viewState.test.ts dashboard/src/components/new-ui
git commit -m "feat: isolate New UI panel failures"
```

### Task 9: Audit Render Isolation

**Files:**
- Create: `dashboard/test/renderIsolation.test.tsx`
- Modify: New UI connected wrappers that subscribe too broadly.

- [ ] **Step 1: Add render-count regression harness**

Render timing board and weather panel with counters. Update only `WeatherData`; assert weather rerenders and timing board does not. Update one driver's timing; assert unrelated static shell does not rerender.

- [ ] **Step 2: Replace broad subscriptions**

Forbidden pattern in high-frequency New UI panels:

```ts
useDataStore((state) => state.state)
```

Use focused selectors such as:

```ts
useDataStore((state) => state.state?.TimingData)
useDataStore((state) => state.state?.WeatherData)
```

Memoize pure view models by their actual inputs. Do not add deep JSON comparison.

- [ ] **Step 3: Verify and commit**

```powershell
corepack yarn test test/renderIsolation.test.tsx
git add dashboard/test/renderIsolation.test.tsx dashboard/src/components/new-ui
git commit -m "perf: isolate New UI live panel renders"
```

### Task 10: Create And Complete Parity Matrix

**Files:**
- Create: `docs/ui-redesign-parity-matrix.md`

- [ ] **Step 1: Add matrix columns**

```text
Route | Legacy capability | Simple location | Detailed location | Automated proof | Manual proof | Gap
```

Rows must include every route and these cross-cutting capabilities: connection state, replay, delay, driver selection, comparison, alerts/audio, units, favorites, settings, archive links, keyboard controls, empty/error states.

- [ ] **Step 2: Populate evidence**

Every row links to a test file or screenshot name. A gap must state impact and explicit approval; do not write vague `partial`.

- [ ] **Step 3: Commit**

```powershell
git add docs/ui-redesign-parity-matrix.md
git commit -m "docs: record New UI functional parity"
```

### Task 11: Document User And QA Workflows

**Files:**
- Create: `docs/ui-redesign-qa.md`
- Modify: `README.md`
- Modify: `SETUP.md`

- [ ] **Step 1: Document user controls**

Explain Legacy/New UI, Simple/Detailed, persistence, driver drawer, Detailed presets, splitter keyboard controls, reset behavior, and how to recover by selecting Legacy.

- [ ] **Step 2: Document QA commands**

Include exact unit/lint/build/E2E commands, fixture mode, baseline update policy, local stack start/stop, and 1920x1080 manual checklist.

- [ ] **Step 3: Commit**

```powershell
git add docs/ui-redesign-qa.md README.md SETUP.md
git commit -m "docs: add New UI usage and QA guide"
```

### Task 12: Final Full Verification

**Files:**
- No planned source changes. Fix only failures uncovered by commands, in separate focused commits.

- [ ] **Step 1: Verify worktree and formatting**

```powershell
git status --short
git diff --check
```

Expected: no unexpected changes; no whitespace errors.

- [ ] **Step 2: Run complete dashboard verification**

```powershell
Set-Location dashboard
corepack yarn test
corepack yarn lint
$env:API_URL='http://localhost:4001'
$env:NEXT_PUBLIC_LIVE_URL='http://localhost:4000'
corepack yarn build
corepack yarn test:e2e
```

Expected: every command exits `0`; zero failed unit, component, E2E, visual, and axe tests.

- [ ] **Step 3: Run real-stack manual verification**

From repository root:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/start-all.ps1 -NoBrowser
```

Verify live/no-session behavior, replay controls when data exists, all routes, both generations, both New UI densities, presets, drawer, alerts, weather, archive, and settings. Stop:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/stop-all.ps1
```

- [ ] **Step 4: Review parity matrix**

No unapproved `Gap` cell may remain. Confirm Legacy remains selectable and default remains `legacy`.

- [ ] **Step 5: Commit any verification fixes by owning task**

If verification changed files, group them by the failed behavior, stage each explicit file path shown by `git status --short`, rerun the command that previously failed, and create a focused commit:

```powershell
git status --short
git diff --check
git commit -m "fix: resolve final New UI verification gaps"
```

Run `git diff --cached --name-only` before the commit and confirm every staged file belongs to that fix. Do not create an empty final fix commit.

## Phase 6 Completion Gate

- [ ] Unit/component tests pass.
- [ ] Lint passes.
- [ ] Production build passes.
- [ ] Playwright interaction and visual tests pass.
- [ ] Axe reports zero WCAG A/AA violations in covered states.
- [ ] Parity matrix has no unapproved gaps.
- [ ] Legacy remains available and default.
- [ ] `git status --short` is clean or contains only explicitly accepted user changes.

## Release Decision

This phase does **not** remove Legacy or change the default. After evidence is reviewed, create a separate design decision for one of:

1. keep Legacy/New toggle indefinitely;
2. make New UI default while retaining Legacy fallback;
3. schedule Legacy removal after a defined deprecation window.
