# 2026 Grid and Real Pit Status Design

## Objective

Update the dashboard for the 2026 Formula 1 season while preserving its existing layout and its live-data architecture. The dashboard must support the current 22-driver, 11-team grid and must not simulate, infer, or relabel unavailable telemetry.

The former DRS area becomes a session-aware status area. For 2026 sessions it displays only real pit state. New 2026 systems such as Overtake Mode, Boost, and Active Aero remain hidden until the upstream feed exposes an explicit, verified field for them.

## Data Integrity Rule

Every user-visible race value must originate from the live or archived API feed.

- Do not generate synthetic drivers, teams, telemetry, pit states, energy modes, gaps, sectors, or microsectors.
- Do not infer Overtake Mode eligibility from an interval below one second.
- Do not interpret the legacy car-data channel `45` as Overtake Mode, Boost, or Active Aero.
- Do not substitute placeholder values that look like measured race data.
- When the feed does not provide a value, omit the indicator or display the dashboard's neutral unavailable state.

Synthetic replay tooling may remain as developer infrastructure, but it is not a production data source and must not be used as a fallback by the dashboard.

## 2026 Grid

The dashboard must render the participants supplied by `DriverList` rather than assuming a fixed 20-driver field. Leaderboard loading states and fixed-size UI assumptions are updated for a maximum expected field of 22 drivers.

For a real 2026 session, the feed is expected to supply these 11 teams and 22 race drivers:

- McLaren: Lando Norris and Oscar Piastri.
- Mercedes: George Russell and Kimi Antonelli.
- Red Bull Racing: Max Verstappen and Isack Hadjar.
- Ferrari: Charles Leclerc and Lewis Hamilton.
- Williams: Alex Albon and Carlos Sainz.
- Racing Bulls: Liam Lawson and Arvid Lindblad.
- Aston Martin: Fernando Alonso and Lance Stroll.
- Haas: Esteban Ocon and Oliver Bearman.
- Audi: Nico Hulkenberg and Gabriel Bortoleto.
- Alpine: Pierre Gasly and Franco Colapinto.
- Cadillac: Valtteri Bottas and Sergio Perez.

This list is a validation expectation, not a hard-coded replacement for `DriverList`. Driver numbers, names, team names, colours, ordering, and participation status continue to come from the session feed so substitutions and future grid changes work automatically.

## Pit Status Indicator

For 2026 sessions, the former DRS column becomes a compact pit-status column:

- Show `PIT` when `TimingData.Lines[driver].InPit` is true.
- Show `PIT OUT` when `TimingData.Lines[driver].PitOut` is true and `InPit` is false.
- Show no badge when neither state is active.
- Pit state takes precedence over any legacy car-data channel.

The column header is `STATUS`, not `DRS`, `OVT`, `BOOST`, or `AERO`.

The dedicated track-map driver list uses the same status semantics. Empty status cells retain stable dimensions so rows do not shift when a driver enters or exits the pit lane.

## Session Compatibility

The dashboard determines the rules era from `SessionInfo.StartDate` or the session path year.

- For sessions dated 2026 or later, channel `45` is treated as unspecified legacy telemetry and is not displayed.
- For sessions dated before 2026, existing DRS rendering may remain available when channel `45` contains a real value.
- If the session year cannot be determined, use the conservative 2026 behaviour: hide DRS and show only real pit state.

This prevents incorrect 2026 labels while retaining truthful visualization of archived pre-2026 sessions.

## Telemetry and Head-to-Head

All DRS references are removed from 2026 telemetry surfaces:

- The driver telemetry panel omits the DRS bar.
- The Head-to-Head telemetry summary shows speed and gear without a DRS suffix.
- Pit state remains available through each driver's real timing status.
- Help text explains the pit indicator and does not claim support for unavailable 2026 energy or aerodynamic modes.

Pre-2026 sessions may retain DRS in telemetry where a real channel value exists and the session year is known.

## Future 2026 Mode Support

Overtake Mode, Boost, and Active Aero are added only after the project captures and verifies explicit upstream fields from a real session. Future support requires:

1. A documented or repeatably observed source field.
2. Confirmed value semantics across multiple real samples.
3. A typed decoder isolated from legacy DRS handling.
4. Fixtures captured from real data, with sensitive or licensed content handled appropriately.
5. UI labels matching official Formula 1 terminology.

No heuristic decoder is included in this change.

## Error and Partial Data Handling

- A missing `DriverList` retains the existing loading or empty state; it does not inject a default grid.
- A driver missing `TimingData` remains visible if present in `DriverList`, with timing fields unavailable.
- Missing `InPit` or `PitOut` values are treated as unknown/off and do not produce a pit badge.
- A field of fewer than 22 participants is rendered as supplied, which supports practice sessions, withdrawals, substitutions, and incomplete feeds.
- A field larger than 22 is rendered without truncation when supplied by the API.

## Testing

Automated tests cover:

- Session-year detection for pre-2026, 2026, and unknown sessions.
- Pit-state precedence and the distinction between `PIT`, `PIT OUT`, and no status.
- Suppression of channel `45` for 2026 and unknown sessions.
- Preservation of real legacy DRS for a known pre-2026 session.
- Rendering and selection behaviour with 22 drivers.
- Rendering a feed-provided field without assuming exactly 22 entries.
- Head-to-Head output when DRS is unavailable.

Browser verification covers:

- A 22-driver leaderboard without clipping or overlap.
- Pit badges appearing and disappearing without row movement.
- Head-to-Head and telemetry surfaces containing no false 2026 DRS or energy-mode labels.
- Existing driver selection and comparison highlighting with the expanded grid.
- Desktop and narrow viewport layouts.

## Acceptance Criteria

- A real 2026 session can display all participants supplied by its 22-driver `DriverList`.
- No production path falls back to the synthetic replay grid or generated telemetry.
- No 2026 screen labels channel `45` as DRS, Overtake Mode, Boost, or Active Aero.
- The leaderboard displays only real `PIT` and `PIT OUT` states in the status column.
- Head-to-Head, map, and telemetry views remain functional when the new mode data is absent.
- Archived pre-2026 DRS data remains truthful and session-aware.

## Out of Scope

- Simulated or manually maintained live race data.
- Prediction of Overtake Mode availability or activation.
- Estimation of battery charge, electrical deployment, or active wing position.
- Strategy simulation or predicted pit outcomes.
- Replacing the existing Formula 1 timing feed with OpenF1.
- Hard-coding the 2026 grid as the dashboard's runtime source of truth.
