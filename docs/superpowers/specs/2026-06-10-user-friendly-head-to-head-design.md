# User-Friendly Head-to-Head Dashboard Design

## Objective

Simplify the lower half of the race dashboard around the decisions a viewer needs most when comparing two drivers: the real gap, tyre strategy, pit state, and where time is being gained or lost across sectors and microsectors.

Remove Pilot Core and Telemetry Stream from the regular dashboard. Do not replace them with more telemetry controls or tabs. Use the recovered space for a focused Head-to-Head panel and bring FIA Race Control into the same row so the desktop layout remains balanced rather than stretching the comparison across an unnecessarily wide empty area.

## Desktop Layout

The first row remains unchanged:

- Live Classification on the left.
- Track Positioning on the right.

The next row becomes:

- Head-to-Head comparison at approximately 70% of the available width.
- FIA Race Control at approximately 30% of the available width.

The comparison and Race Control panels share a consistent visual height. Race Control scrolls internally when its message list exceeds that height.

The following row contains Smart Alerts, Team Radios, and Track Alerts. These panels may use three columns on wide screens and stack responsively on narrower screens.

## Head-to-Head Information Hierarchy

The Head-to-Head panel has no tabs. Its initial and only view prioritizes information in this order:

1. Real gap between the selected drivers.
2. Current position, completed lap, and track/pit/retirement state.
3. Tyre compound, stint age, and number of completed stops.
4. Sector and microsector comparison.
5. Last lap and personal best as supporting context.

Remove these metrics entirely from Head-to-Head:

- Instantaneous speed.
- Gear.
- RPM.
- Throttle and brake.
- Speed traps.
- Engine or car telemetry summaries.

## Compact Header

The header shows both drivers and the real gap without a large decorative title area.

- Driver abbreviations remain the strongest identity signal.
- Full names are secondary.
- Team-colour accents identify each side.
- The central gap is the largest number in the panel.
- A concise catching indicator appears only when supplied by the real timing feed.
- The clear-comparison action remains available as a compact icon or small command.

## Strategy Strip

Directly below the header, each driver receives a compact strategy summary:

- Position and completed lap.
- Current status: on track, `PIT`, `PIT OUT`, stopped, or retired.
- Tyre compound.
- Stint age in laps.
- Completed stop count.

The information is arranged as two opposing driver summaries rather than a long row-by-row matrix. This reduces repeated labels and lets the viewer compare both strategies at a glance.

## Sector Focus

Sector comparison is the largest content area in Head-to-Head.

- Display S1, S2, and S3 simultaneously on desktop.
- Each sector shows both driver times and the sector delta.
- Clearly identify which driver was faster and by how much.
- Align both drivers' microsectors in paired rows.
- Preserve existing status colours for neutral, personal best, overall best, yellow, and blue states.
- Keep stable microsector dimensions so partial updates do not resize the layout.
- Pending sectors remain visible with a neutral unavailable state.

Sector deltas use measured timing values only. No pace projection or inferred sector result is shown.

## Supporting Lap Times

Last lap and personal best appear in a compact footer or strip beneath the strategy summary and above the sector area. They remain visible but do not compete with gap, tyres, or sectors.

Only the faster comparable value receives an accent. Missing or incomparable values remain neutral.

## Empty and Partial States

- No selected drivers: show a concise instruction to select two drivers from the leaderboard or map.
- One selected driver: show that driver's identity and request a rival.
- Missing sector data: keep the three-sector structure and mark unavailable values.
- Missing tyre data: show `--` without synthesizing a compound or stint age.
- Different lap counts: retain the real lap difference in the central gap.
- Retired or stopped drivers remain comparable with an explicit status.

## Responsive Behaviour

- Wide desktop uses a 70/30 Head-to-Head and Race Control split.
- Medium screens stack Race Control beneath Head-to-Head before sector cards become unreadably narrow.
- Sectors may switch from three columns to a vertical list on narrow screens.
- Microsector rows may scroll horizontally within their sector card.
- No panel contains large unused vertical areas solely to match another panel.

## Component Changes

- Remove `DriverDetailPanel` and `TelemetryPanel` from the regular dashboard composition.
- Keep their files only if another route imports them; otherwise delete unused dashboard-only components.
- Refactor `DriverComparisonPanel` to consume the existing comparison model but stop rendering removed telemetry and speed-trap fields.
- Remove telemetry and speed traps from `DriverComparisonModel` if no remaining consumer requires them.
- Reposition the existing Race Control panel without changing its feed or message semantics.

## Testing

Automated tests cover:

- Comparison models no longer expose telemetry or speed traps.
- Gap, status, tyre, stint age, stop count, lap times, sectors, and microsectors remain derived correctly.
- Missing strategy or sector values remain unavailable rather than fabricated.

Browser validation covers:

- Pilot Core and Telemetry Stream are absent from the regular dashboard.
- Head-to-Head and Race Control occupy the second desktop row without excessive empty space.
- Gap, tyre strategy, stops, and all three sectors are visible without scrolling on a normal desktop viewport.
- Two selected drivers remain highlighted in the leaderboard.
- The comparison stays readable during live replay updates and pit transitions.
- Medium and narrow viewports contain no overlaps or clipped text.

## Acceptance Criteria

- The regular dashboard no longer displays Pilot Core or Telemetry Stream.
- Head-to-Head communicates the real gap, tyre strategy, pit status, and sector differences before any secondary information.
- No car telemetry or speed-trap data appears in Head-to-Head.
- FIA Race Control shares the comparison row on wide screens.
- The dashboard uses the available width without stretching Head-to-Head into an empty or difficult-to-scan layout.
- All displayed values continue to come from real feed fields or the explicitly launched local validation replay.

## Out of Scope

- Adding telemetry tabs or hidden advanced telemetry views.
- Predictive pace, pit-loss, or strategy simulation.
- Changing the upper classification/map layout.
- Redesigning Race Control message content.
- Comparing more than two drivers.
