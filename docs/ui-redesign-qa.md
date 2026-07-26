# New UI QA Guide

## User Controls

### Interface Generation

The global generation control (top-right of every shell) switches between **Legacy** and **New UI**.

- **Legacy** — original interface, unchanged. Default on first visit.
- **New UI** — redesigned interface with Simple/Detailed densities.

The choice persists across reloads (stored in `localStorage` key `ui-preferences-v1`). To reset, clear `ui-preferences-v1` or use browser DevTools → Application → Storage.

To recover from a broken state: switch to **Legacy** using the generation toggle. Legacy is always available and unmodified.

### UI Density (New UI only)

When in New UI mode, the density control switches between **Simple** and **Detailed**.

- **Simple** — broadcast-oriented: classification prominent, key story panels, compact map.
- **Detailed** — pit-wall workstation: resizable panels, presets, technical tables.

The choice persists and restores on reload.

### Detailed Dashboard Presets

Three built-in presets are available via tabs at the top of the Detailed dashboard:

- **Race** — classification, gaps, incidents, Race Control.
- **Strategy** — stints, tyre life, pit windows, weather.
- **Driver** — selected-driver telemetry, recent laps, comparison.

Manual panel resizing updates that preset's saved proportions. The **Reset** button restores tested defaults.

### Driver Drawer

In Simple mode, clicking any driver row in the classification opens a side drawer with identity, current position, tyre/stint, pace trend, and recent laps. Press **Escape** or click outside to close.

Driver selection persists when switching between Simple and Detailed modes.

### Keyboard Controls

| Action | Key |
|---|---|
| Navigate rows/tabs | Tab / Shift+Tab |
| Expand drawer | Enter on driver row |
| Close drawer | Escape |
| Resize splitter | Arrow keys (±1) or Shift+Arrow (±5) |
| Reset preset splitter | Activate Reset button via Enter |

### Settings

Settings at `/dashboard/settings` are organized by category. Toggle and slider changes take effect immediately. The Interface Generation and Density toggles at the top of the page are the primary controls.

## QA Commands

Run from `dashboard/`:

```powershell
# Unit + component tests (Vitest)
corepack yarn test

# Lint
corepack yarn lint

# TypeScript type check
corepack yarn tsc --noEmit

# Production build (stop dev server first, delete .next)
$env:API_URL='http://localhost:4001'
$env:NEXT_PUBLIC_LIVE_URL='http://localhost:4000'
corepack yarn build

# E2E tests (requires running stack)
corepack yarn test:e2e

# Update visual baselines (first run or after intentional visual change)
corepack yarn test:e2e:update
```

## Fixture Mode

The `/ui-fixtures/[scenario]` route serves deterministic test data without a live F1 feed. It is only available when `UI_FIXTURES=1` is set in the environment (set automatically by `playwright.config.ts`).

Available scenarios:

| Path | State |
|---|---|
| `/ui-fixtures/simple-race` | New UI Simple, race in progress, green flag |
| `/ui-fixtures/detailed-race` | New UI Detailed, race in progress |
| `/ui-fixtures/yellow-flag` | New UI Simple, yellow flag active |
| `/ui-fixtures/no-session` | New UI Simple, no session data |
| `/ui-fixtures/disconnected-replay` | New UI Simple, disconnected |
| `/ui-fixtures/qualifying` | New UI Simple, qualifying session |
| `/ui-fixtures/weather` | New UI Detailed, weather-focused |
| `/ui-fixtures/archive` | New UI Simple, archive replay |

## Baseline Update Policy

- Run `test:e2e:update` only after a confirmed intentional visual change.
- Review all new baseline images in the PR before merging.
- Baseline files live in `e2e/*.spec.ts-snapshots/`. Commit them.

## Local Stack Start/Stop

From the repository root:

```powershell
# Start all services
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/start-all.ps1 -NoBrowser

# Stop all services
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/stop-all.ps1
```

Then open `http://localhost:3000` for the dashboard.

## 1920×1080 Manual Checklist

Run this after any significant New UI change to confirm the golden-path experience:

- [ ] Simple race: classification occupies > 40% viewport width.
- [ ] Simple race: no vertical page scrollbar visible.
- [ ] Simple race: track map does not dominate the layout.
- [ ] Driver drawer opens on click, closes on Escape.
- [ ] Switching to Detailed retains selected driver.
- [ ] Detailed Race preset: classification + Race Control visible.
- [ ] Detailed Strategy preset: stints panel visible.
- [ ] Detailed Driver preset: telemetry panel visible.
- [ ] Splitter drag changes panel proportions; reload restores them.
- [ ] Reset button restores default proportions.
- [ ] Generation toggle switches between Legacy and New UI on all routes.
- [ ] Legacy route looks unchanged after switching back.
- [ ] Settings toggles take effect immediately.
- [ ] Archive sessions list visible at `/archive`.
- [ ] Help content visible and uses UI terminology.
- [ ] No uncaught console errors on any visited route.
