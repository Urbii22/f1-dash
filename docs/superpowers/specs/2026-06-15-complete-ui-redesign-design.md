# Complete UI Redesign Design

**Date:** 2026-06-15

## Goal

Redesign the complete application so live and historical Formula 1 data is easier to scan, understand, and explore. The new UI must feel designed around race decisions rather than raw feeds, while preserving every current capability and providing a safe route back to the existing interface.

The first target is a 1920x1080 desktop display. Mobile and tablet layouts must remain functional, but they are not the primary design target for this project.

## Product Model

The application will expose two independent preference levels:

1. **Interface generation:** `Legacy` or `New UI`.
2. **New UI density:** `Simple` or `Detailed`.

Both preferences persist locally and survive reloads. The existing interface remains intact behind `Legacy` until the new interface reaches functional parity and passes verification. Switching interface generation or density must preserve the current route, live session, selected driver, comparisons, active filters, and replay position whenever those concepts exist on both sides.

The default interface generation remains `Legacy` during rollout. The first visit to `New UI` starts in `Simple`; subsequent visits restore the last selected density.

## Design Principles

- Show conclusions and race context before supporting measurements.
- Make position, gap, lap, tyre, trend, session state, and FIA status scannable in two to three seconds.
- Use progressive disclosure instead of presenting every field simultaneously.
- Give each screen one clear primary task and no more than three visual hierarchy levels.
- Keep live changes stable enough to read; animate only meaningful changes.
- Use shared data components and selectors across Legacy, Simple, and Detailed views.
- Keep scrolling inside panels where possible. Primary live workspaces should fit within 1920x1080 without page-level scrolling.
- Use color semantically. Team color identifies drivers; FIA colors identify race state and warnings.

## Visual System

### Foundation

The new UI uses neutral graphite surfaces with restrained depth. It removes most decorative grids, glow, scan-line effects, repeated cyan borders, and all-uppercase technical labels. The overall finish should feel like a modern sports broadcast in Simple mode and a professional pit-wall workstation in Detailed mode.

### Color

- Neutral graphite and off-white form the base.
- Driver and team colors identify selection, comparisons, traces, and charts.
- Red, yellow, green, blue, and black/white combinations are reserved for FIA and race-status meaning.
- Accent color cannot be the only status signal; text or icons must reinforce it.

### Typography And Numbers

- Sans-serif typography handles navigation, headings, labels, and explanatory content.
- Monospace typography is limited to timing, telemetry, lap data, and aligned numeric tables.
- Tabular numerals are required for changing values.
- Position, gap, current lap, flag status, and session phase receive the strongest numeric scale.
- Secondary labels use plain language instead of internal feed terminology.

### Components

The new system defines reusable primitives for:

- workspace shell and top session bar;
- primary, secondary, and contextual panels;
- driver identity and team-color markers;
- timing rows in compact and technical variants;
- KPI tiles with value, unit, trend, and context;
- status badges and FIA alerts;
- chart frames, legends, tooltips, empty states, and loading states;
- tabs, segmented controls, drawers, resizable splitters, and preset controls.

These primitives must be used throughout live, historical, analysis, and settings routes. Route-specific panels may compose them but should not reimplement their styling.

### Motion

Motion communicates position changes, new alerts, flag changes, selection, drawer transitions, and panel resizing. Continuous ambient animation and decorative pulsing are excluded. Reduced-motion preferences must disable nonessential transitions.

## Shared Architecture

The data engine, Zustand stores, domain selectors, and existing API contracts remain shared. The redesign introduces presentation adapters rather than a second data layer.

Recommended boundaries:

- `LegacyShell`: renders the current route compositions unchanged.
- `NewUiShell`: provides new navigation, session bar, density toggle, drawers, and visual tokens.
- `SimpleView`: broadcast-oriented composition for each route.
- `DetailedView`: engineering-oriented composition for each route.
- shared domain view models: convert feed-shaped data into labels, trends, statuses, chart series, and user-facing insights.
- shared panel components: render the same domain view models at different density levels.

Interface preferences belong in a small persisted UI store. Detailed workspace split sizes also persist locally, scoped by route and preset. Invalid or outdated saved layouts fall back to tested defaults.

## Global Navigation And Session Bar

The new navigation is narrower and quieter than the current sidebar. It uses recognizable icons plus labels, separates live, analysis, history, and system destinations, and gives the active route a strong but non-glowing state.

The global session bar shows only current context:

- event and session name;
- session clock or replay time;
- lap or phase;
- FIA flag/status;
- weather summary;
- connection or replay state.

Controls such as delay, replay speed, interface generation, UI density, and advanced settings move into a consolidated control area. Critical replay controls remain immediately available while replaying.

## Live Dashboard: Simple

Simple mode follows a modern broadcast hierarchy. Classification is the primary element and occupies roughly half the usable width.

The remaining space prioritizes:

- key alerts and race-control events;
- current strategic story, including tyre windows and pit activity;
- highlighted battle or selected-driver context;
- a compact track map as a secondary orientation aid.

The map must not dominate the screen. It is one module among several and may reduce further when a driver drawer is open.

Timing rows initially show position, driver, tyre, gap or interval, position trend, and concise status. Sector details, car channels, and secondary timing values stay hidden until selection.

Selecting a driver opens a right-side drawer without navigating away. It contains identity, current position, tyre and stint, pace trend, recent laps, compact telemetry, strategy context, and relevant alerts. Closing it restores the previous layout. Selection remains active when switching to Detailed mode.

The complete Simple workspace must fit at 1920x1080 without document scrolling. Long feeds use bounded internal scrolling.

## Live Dashboard: Detailed

Detailed mode behaves like a pit-wall workstation. Classification remains the fixed reference, while the surrounding workspace exposes map, telemetry, strategy, weather, radios, Race Control, alerts, and comparison data simultaneously.

Panels are resizable through accessible splitters. They are not freely draggable. This keeps layouts predictable and avoids unusable arrangements while still supporting different engineering priorities.

Three built-in presets are required:

- **Race:** classification, incidents, gaps, strategy, and Race Control.
- **Strategy:** stints, tyre life, pit windows, weather, and projected traffic.
- **Driver:** selected-driver telemetry, recent laps, comparison, and track context.

Each preset restores tested panel proportions. Manual resizing updates the saved proportions for that preset. A reset action restores defaults.

Selecting a driver synchronizes every relevant panel. Internal tabs may group related technical content to prevent the workspace becoming an unreadable wall of numbers. Charts require explicit units, scales, legends, and value tooltips.

## Route Designs

### Qualifying

Simple mode emphasizes session phase, elimination line, drivers at risk, active hot laps, and major deleted laps. Detailed mode adds sector progression, theoretical bests, speed traps, tyre context, and complete timing tables.

### Analysis

Simple mode opens with generated conclusions and a small number of explanatory visuals: pace leaders, tyre degradation, major position changes, and strategic turning points. Detailed mode keeps full driver filters, chart tabs, legends, scales, and comparisons.

### Standings And Results

Simple mode uses ranked cards, team-color identity, position changes, points gaps, and highlighted championship stories. Detailed mode provides sortable complete tables and supporting breakdowns. Results pages clearly separate grid, finish, status, points, pit stops, and penalties.

### Weather

Simple mode answers what conditions mean for the session: rain risk, expected timing, track evolution, wind impact, and confidence. Detailed mode adds radar, timeline, raw measurements, trends, and map controls.

### Track Map

Simple mode treats the map as orientation plus battle context, with limited labels and selected-driver focus. Detailed mode exposes traces, intervals, marshal sectors, pit state, selectable overlays, and telemetry links. Map visuals must never obscure driver identity or status.

### Archive

The archive index becomes a visual session library with event, date, session type, duration, and available data. A session opens into the same Simple/Detailed model used by live data. Replay state and archive navigation remain obvious and cannot be confused with a live connection.

### Head-To-Head And Driver Pages

Simple mode summarizes advantage, recent form, tyre, pace, and decisive differences. Detailed mode shows aligned lap, sector, telemetry, stint, and event comparisons. Driver colors remain consistent across all charts and panels.

### Schedule And Home

The home and schedule routes adopt the same hierarchy and surface system. The next session, local start time, championship context, and primary actions dominate. Supporting rounds and metadata use quieter cards.

### Settings And Help

Settings are regrouped into Appearance, Data and Units, Live and Replay, Alerts and Audio, Drivers, Layout, and Accessibility. Each setting gets a short consequence-focused explanation. Risky reset actions require confirmation. Help content uses the same terminology shown in the UI.

## Data Comprehension Rules

- Derived labels must explain feed values, for example `Closing by 0.3s/lap` instead of only `Catching`.
- Missing data uses a distinct unavailable state, never zero unless zero is meaningful.
- Units appear beside values and follow the user's configured system.
- Trends include direction and timeframe.
- Tables keep columns aligned and avoid repeated labels inside every row.
- Tooltips explain abbreviations and uncommon metrics.
- Important events include timestamp, driver or location, category, and impact.
- Alerts are deduplicated and ordered by urgency, then recency.

## Error, Loading, And Empty States

Each module handles unavailable data independently. One malformed or absent feed cannot blank the full workspace. Loading skeletons preserve final dimensions. Empty states state why content is missing and whether it is expected for the current session type.

Connection loss, delayed feeds, replay mode, archive mode, and ended sessions receive visibly distinct global states. The system must not imply live data when showing cached or replayed data.

## Accessibility

- All toggles, drawers, tabs, splitters, presets, and rows are keyboard operable.
- Resizable splitters expose ARIA orientation, current value, and keyboard increments.
- Focus states remain clearly visible.
- Status is never communicated by color alone.
- Contrast targets WCAG AA for normal text and essential UI controls.
- Charts expose concise textual summaries for their key conclusion.
- UI supports browser zoom without hiding critical controls.

## Rollout Plan

Implementation is divided into independently verifiable phases under one visual specification:

1. Interface-generation toggle, persisted preferences, New UI shell, tokens, and primitives.
2. New live dashboard Simple mode and driver drawer.
3. New live dashboard Detailed mode, presets, and resizable panels.
4. Qualifying, track map, weather, standings, and analysis routes.
5. Archive, results, head-to-head, driver, schedule, home, settings, and help routes.
6. Functional parity audit, accessibility pass, performance pass, and decision on Legacy retirement.

Legacy remains available through all phases. A route not yet implemented in New UI must render its Legacy version inside a clear compatibility boundary rather than show a broken or incomplete page.

## Testing And Verification

Automated coverage must include:

- persistence and restoration of `Legacy/New UI` and `Simple/Detailed` preferences;
- route preservation while switching interface generation;
- selected-driver and comparison continuity between densities;
- panel resizing, keyboard resizing, preset restoration, and invalid-layout fallback;
- view-model handling for missing, delayed, replayed, and malformed data;
- Simple and Detailed conditional content on every migrated route;
- accessibility behavior for navigation, drawers, tabs, tables, and splitters.

Visual regression baselines are required at 1920x1080 for both New UI densities and for Legacy after shell integration. Browser verification must cover live data, no-session state, replay, archive, qualifying, race, and connection loss.

Performance verification should ensure frequent telemetry updates do not rerender unrelated panels and that resizing remains responsive. Charts and maps should update through focused selectors and memoized derived models.

## Acceptance Criteria

- User can switch between Legacy and New UI from a global control and the choice persists.
- User can switch New UI between Simple and Detailed and the choice persists.
- Switching modes preserves route and relevant working context.
- Simple live dashboard makes classification, key alerts, and strategic story more prominent than the map.
- Selecting a driver in Simple opens a useful side drawer without route navigation.
- Detailed dashboard provides accessible, persisted resizable panels and three resettable presets.
- Every current route has an approved New UI composition or an explicit Legacy compatibility fallback during rollout.
- All migrated routes use shared visual primitives and user-facing data models.
- Primary live layouts fit 1920x1080 without page-level scrolling.
- Legacy behavior remains unchanged until a separate retirement decision.

## Out Of Scope

- Freeform drag-and-drop dashboards.
- User-authenticated cloud layout synchronization.
- A mobile-first redesign in this phase.
- Backend feed or API redesign unless a missing derived value cannot be produced safely on the client.
- Removing Legacy before full parity, verification, and explicit approval.
