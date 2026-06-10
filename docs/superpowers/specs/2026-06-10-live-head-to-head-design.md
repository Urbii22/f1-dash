# Live Head-to-Head Comparison Design

## Objective

Upgrade the existing Head to Head panel into a dense live comparison for exactly two drivers. Preserve the current dashboard layout: leaderboard at the upper left, circuit map at the upper right, selected-driver telemetry below, and Head to Head at the lower right.

The comparison uses only measured live timing data. Strategy simulation, pit-loss prediction, and projected positions are out of scope.

## Driver Selection

- Head to Head accepts exactly two drivers.
- Double-clicking a leaderboard row or map marker toggles that driver in the comparison.
- Selecting a third driver replaces the oldest compared driver.
- Clearing the panel removes both compared drivers.
- A normal click continues to select the driver for Pilot Core and telemetry without changing the comparison.

## Leaderboard Highlighting

Compared drivers remain in their normal live classification positions.

Each compared row receives:

- A persistent border and subtle background tint based on the driver's team colour.
- A small `H2H` marker.
- Styling that remains visible while rows reorder as positions change.

The selected Pilot Core highlight and Head to Head highlight must remain distinguishable when they apply to the same row.

## Head-to-Head Layout

The existing lower-right Head to Head panel is replaced in place. No additional classification panel or page-level redesign is introduced.

### Header

- Driver one identity, position, tyre, stint age, and pit-stop count.
- Central real gap between the compared drivers.
- Driver two identity, position, tyre, stint age, and pit-stop count.
- A concise trend label when the real timing feed indicates that the trailing driver is catching.

### Comparison Matrix

The matrix uses one column per driver and a narrow central column for labels and deltas. It shows:

- Current position and completed lap count.
- On-track, in-pit, pit-out, stopped, or retired state.
- Current tyre compound, tyre/stint age, and number of stops.
- Last lap and personal best lap.
- Gap to leader and current interval information.
- Available speed-trap values.
- Instantaneous speed, gear, throttle, brake, RPM, and DRS state.

The better or faster live value is highlighted only where comparison is meaningful.

### Current Lap Sectors

- Show all three sectors simultaneously.
- Show the current sector values for both drivers.
- Show a sector delta when both values can be compared reliably.
- Show each microsector as an aligned pair of status cells.
- Preserve the existing status colour semantics for neutral, personal best, overall best, yellow, and blue statuses.
- Clearly mark sectors or microsectors that have not yet been completed.

## Real Gap Calculation

The panel must not invent timing values.

Gap priority:

1. Use direct interval data when one compared driver is immediately ahead of the other.
2. Otherwise derive the difference from both drivers' numeric gap-to-leader values when they are on the same lap.
3. When lap counts differ, display the real lap difference rather than converting it into seconds.
4. If the feed values cannot be parsed or compared reliably, display `--`.

The UI labels the value as a real timing gap and never presents it as a prediction.

## Data Derivation

Pure helper functions derive a comparison model from:

- `TimingData`
- `TimingStats`
- `TimingAppData`
- `DriverList`
- `carsData`

Helpers handle timing-string parsing, gap calculation, stint extraction, sector deltas, status labels, and telemetry normalization. Rendering components consume the derived model and do not duplicate timing logic.

## Responsive Behaviour

- Desktop keeps the dense three-column comparison inside the existing lower-right panel.
- Narrow layouts stack driver values while retaining the central labels and gap prominence.
- Microsector cells use stable dimensions and may horizontally scroll inside their section rather than shrinking into unreadability.
- The dashboard's existing map, Pilot Core, and leaderboard proportions remain unchanged.

## Empty and Partial States

- No drivers: prompt the user to double-click two leaderboard rows or map markers.
- One driver: show that driver's identity and request a rival.
- Missing telemetry: retain timing and strategy rows while showing `--` for unavailable channels.
- Missing sector data: retain the sector structure with pending cells.
- Retired or stopped drivers remain comparable and receive an explicit status.

## Testing

Automated tests cover the pure comparison helpers:

- Same-lap gap calculation from gap-to-leader values.
- Direct interval preference.
- Different-lap handling.
- Invalid or unavailable timing values.
- Two-driver replacement behaviour.
- Stint age and stop count extraction.
- Sector and microsector alignment.

Browser verification covers:

- Adding and removing two compared drivers.
- Replacing the oldest driver with a third selection.
- Persistent leaderboard highlighting during position changes.
- Live panel updates for timing, tyres, sectors, microsectors, and telemetry.
- Desktop and mobile layout without overlap.

## Out of Scope

- Pit-loss estimation.
- Predicted post-stop position.
- Strategy recommendations.
- Historical telemetry graphs.
- Comparing more than two drivers.
- Redesigning the dashboard layout or classification table.
