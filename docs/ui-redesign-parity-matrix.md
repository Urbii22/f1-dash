# New UI Functional Parity Matrix

**Branch:** `codex/modern-tech-ui`  
**Date:** 2026-06-16  
**Legacy default:** Yes — `generation` defaults to `"legacy"`.

## Route Parity

| Route | Legacy capability | Simple location | Detailed location | Automated proof | Gap |
|---|---|---|---|---|---|
| `/dashboard` | LeaderBoard, RaceControl, Strategy, TeamRadios, TrackViolations, Map, SmartAlerts | `SimpleDashboardView` | `DetailedDashboardView` (3 presets) | `LiveDashboardState.test.tsx`, `SimpleDashboardView.test.tsx`, `DetailedDashboardView.test.tsx` | None |
| `/dashboard/qualifying` | QualiBoard, QualiHeader, HotLaps, CutoffPanel, DeletedLaps, SpeedTrap, QualiProgression | `SimpleQualifyingView` | `DetailedQualifyingView` | `qualifyingPage.test.ts` | None |
| `/dashboard/analysis` | DriverFilter, LapChart, SectorChart | `SimpleAnalysisView` | `DetailedAnalysisView` | `AnalysisViews.test.tsx` | None |
| `/dashboard/standings` | DriverStandingsList, ConstructorStandingsList | `SimpleStandingsView` | `DetailedStandingsView` | `StandingsViews.test.tsx` | None |
| `/dashboard/weather` | WeatherCard, WeatherChart | `SimpleWeatherView` | `DetailedWeatherView` | `WeatherViews.test.tsx` | None |
| `/dashboard/track-map` | Map with driver positions | `SimpleTrackMapView` | `DetailedTrackMapView` | `TrackMapViews.test.tsx` | None |
| `/dashboard/settings` | All toggle/slider settings | `SimpleSettingsView` | `DetailedSettingsView` | `qualifyingPage.test.ts` (settings check) | None |
| `/results` | SeasonResultsList | `SimpleResultsListView` | `DetailedResultsListView` | `ResultsViews.test.tsx` | None |
| `/results/[round]` | RaceResultTable, QualiResultTable, GridList | `SimpleRoundResultView` | `DetailedRoundResultView` | `ResultsViews.test.tsx` | None |
| `/archive` | SessionPicker, session cards | `SimpleArchiveListView` | `DetailedArchiveListView` | `ArchiveViews.test.tsx` | None |
| `/archive/[sessionId]` | ArchiveAnalysis | `SimpleArchiveSessionView` | `DetailedArchiveSessionView` | `ArchiveViews.test.tsx` | None |
| `/h2h` | SeasonH2HView, driver selects | `SimpleH2HView` | `DetailedH2HView` | `H2HViews.test.tsx` | None |
| `/driver/[driverId]` | StandingRow, season rounds table | `SimpleDriverView` | `DetailedDriverView` | `DriverViews.test.tsx` | None |
| `/schedule` | NextRound, Schedule | `SimpleScheduleView` | `DetailedScheduleView` | `ScheduleViews.test.tsx` | None |
| `/` (home) | HubLink, LeaderList, latest result | `SimpleHomeView` | `DetailedHomeView` | `HomeViews.test.tsx` | None |
| `/help` | DriverStatus, DriverTire, complications | `SimpleHelpView` | `DetailedHelpView` | `HelpViews.test.tsx` | None |

## Cross-Cutting Capabilities

| Capability | Simple | Detailed | Automated proof | Gap |
|---|---|---|---|---|
| Generation toggle (Legacy ↔ New UI) | `NewUiPublicShell` / `NewUiDashboardShell` header | Same | `uiShellCompatibility.test.ts` | None |
| Preference persistence across reload | `useUiPreferencesStore` (localStorage `ui-preferences-v1`) | Same | `e2e/ui-preferences.spec.ts` | E2E requires live server |
| Density toggle (Simple ↔ Detailed) | `UiModeBoundary` boundary | Same | `uiShellCompatibility.test.ts` | None |
| Route preservation on switch | Boundary re-renders in-place | Same | `uiShellCompatibility.test.ts` | None |
| Driver selection continuity | `useDriverSelectionStore` shared | Same | `TechnicalPanels.test.tsx` | None |
| Live connection state | `useConnectionStore` | Same | `LiveDashboardState.test.tsx` | None |
| Delay / replay controls | Legacy shell; New UI session bar | Same session bar | `NewUiSessionBar` component | Manual verification needed |
| Alerts / audio | `SmartAlerts` in legacy; `TechnicalEventsPanel` in new | Same | `TechnicalEventsPanel.test.tsx` | None |
| Empty / no-session state | `NoLiveSession` | `ViewState "unavailable"` | `LiveDashboardState.test.tsx` | None |
| Archive links from live | TeamRadios links archive | Not yet surfaced in New UI | — | **Approved gap: archive links in live dashboard are a phase-7 enhancement** |
| Keyboard: drawer, tabs, splitters | N/A in legacy | Covered in E2E | `e2e/detailed-dashboard.spec.ts` | E2E requires live server |
| Accessibility WCAG AA | Not audited in legacy | `e2e/accessibility.spec.ts` | Axe | E2E requires live server |
| Panel error isolation | None | `PanelErrorBoundary` | `PanelErrorBoundary.test.tsx` | None |
| Render isolation (focused selectors) | N/A | Verified | `renderIsolation.test.tsx` | None |

## Approved Gaps

| Gap | Impact | Approved by |
|---|---|---|
| Archive links in live New UI dashboard | Low — users can navigate to `/archive` manually | Owner approval 2026-06-16 |
| E2E visual baselines require running server | Tests exist; baselines generated on first `test:e2e:update` run | Accepted: CI gated separately |
