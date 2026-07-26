# Slow 2026 Validation Replay Design

## Objective

Update the existing local validation replay to exercise the dashboard with the complete 2026 Formula 1 field and rules-aware status display. The replay is developer tooling only: it must be clearly synthetic, launched explicitly, and never used as a production fallback or presented as real race data.

The replay runs for approximately eight minutes. Its slower cadence gives a tester enough time to select drivers, inspect telemetry, compare Head-to-Head values, and observe pit-state transitions without the interface changing continuously.

## 2026 Field

The replay contains 22 drivers across 11 teams:

- McLaren: Lando Norris (`1`) and Oscar Piastri (`81`).
- Mercedes: George Russell (`63`) and Kimi Antonelli (`12`).
- Red Bull Racing: Max Verstappen (`3`) and Isack Hadjar (`6`).
- Ferrari: Charles Leclerc (`16`) and Lewis Hamilton (`44`).
- Williams: Alex Albon (`23`) and Carlos Sainz (`55`).
- Racing Bulls: Liam Lawson (`30`) and Arvid Lindblad (`41`).
- Aston Martin: Fernando Alonso (`14`) and Lance Stroll (`18`).
- Haas: Esteban Ocon (`31`) and Oliver Bearman (`87`).
- Audi: Nico Hulkenberg (`27`) and Gabriel Bortoleto (`5`).
- Alpine: Pierre Gasly (`10`) and Franco Colapinto (`43`).
- Cadillac: Valtteri Bottas (`77`) and Sergio Perez (`11`).

The racing numbers match the 2026 feed observed by the application. Team names and colours are fixture metadata for local UI validation and do not become a runtime source of truth for real sessions.

## 2026 Rules Representation

- Remove the synthetic `DRS ENABLED` race-control message.
- Do not emit car-data channel `45` for the 2026 replay.
- Do not simulate Overtake Mode, Boost, Active Aero, battery charge, or eligibility.
- Exercise only real dashboard status concepts that have defined feed fields: `InPit` and `PitOut`.
- Include separate pit entry and pit exit sequences for several drivers so `PIT`, `PIT OUT`, and empty status states can be inspected.

## Replay Cadence

The target wall-clock duration is approximately eight minutes at `1x` playback.

- Emit routine timing, position, car-data, and lap-count frames every 8-10 seconds.
- Separate major race-control, position-change, retirement, and pit events by at least 30 seconds where practical.
- Keep each `PIT` state visible for at least 20 seconds.
- Keep each `PIT OUT` state visible for at least 15 seconds before clearing it.
- Avoid simultaneous major events so each transition can be inspected independently.
- Retain the existing playback-speed controls for testers who want faster execution.

## Scenario Timeline

The replay begins with all 22 drivers visible and timing data populated. The scenario then introduces events gradually:

1. Stable green-flag running for driver selection and initial Head-to-Head setup.
2. A yellow-flag period and a later green-flag restoration.
3. A position exchange among front-running drivers.
4. A first driver entering the pit, remaining there, exiting, and returning to the neutral status.
5. A second pit sequence later in the replay to validate another row and Head-to-Head state.
6. A track-limits race-control message.
7. A retirement late enough that the tester can inspect normal operation first.
8. Session completion near the eight-minute mark.

Exact timestamps are deterministic and generated from a single scenario table rather than scattered tick-number conditions.

## Dynamic Data

The replay continues to exercise:

- Position and gap changes.
- Intervals and catching flags.
- Lap count and last-lap changes.
- Tyre compounds, stint ages, and pit-stop counts.
- Sector and microsector statuses.
- Speed traps.
- RPM, speed, gear, throttle, and brake telemetry.
- Track positions for all 22 drivers.
- Head-to-Head selection and persistent row highlighting.

Values are synthetic and exist only to test rendering and interaction. The session name, meeting name, location, and archive status visibly identify the source as a local synthetic validation replay.

## Generator Structure

The existing `tools/make-sample-replay.mjs` remains the generator entry point. Its scenario timing is made data-driven:

- A 22-driver fixture defines identity, team, colour, country, and starting tyre.
- A timeline describes timestamped status and race-control events.
- Frame generation derives routine updates from elapsed replay time.
- Pit-stop counts and stint data update when a driver completes a simulated pit sequence.

The generated file remains `sample-replay/synthetic-f1-full-grid.data.txt` so the current simulator launch workflow continues to work.

## Launch Workflow

Local validation uses the existing services:

1. Regenerate the replay fixture.
2. Stop or replace any process currently using the simulator/realtime development ports.
3. Launch the simulator in replay mode with the generated file.
4. Launch the realtime service pointed at the simulator WebSocket.
5. Keep the dashboard development server available at `http://127.0.0.1:3000/dashboard`.
6. Navigate or reload the in-app browser on the dashboard.

The launched stack is local and does not contact GitHub or publish artifacts.

## Testing and Validation

Automated validation parses the generated replay and asserts:

- `DriverList` contains exactly 22 drivers and 11 teams.
- The expected 2026 driver/team assignments are present.
- Yuki Tsunoda and Kick Sauber are absent.
- Audi, Cadillac, Arvid Lindblad, Valtteri Bottas, and Sergio Perez are present.
- No car frame contains channel `45`.
- No race-control message contains `DRS`.
- Pit and pit-out transitions exist and meet their minimum visible durations.
- The final timestamp is approximately eight minutes after the start.

Browser validation covers:

- 22 rendered leaderboard rows.
- Stable empty status cells for on-track drivers.
- Visible `PIT` and `PIT OUT` transitions.
- Head-to-Head comparison between two selected drivers while events progress.
- No DRS, Overtake Mode, Boost, or Active Aero labels.
- No layout overlap at the normal desktop viewport.

## Acceptance Criteria

- The local replay lasts approximately eight minutes at `1x`.
- A tester can comfortably select and compare drivers between major events.
- All 22 current 2026 drivers and 11 teams appear.
- The replay exercises pit status without fabricating unsupported 2026 systems.
- Production continues to rely exclusively on real API/feed data.
- The dashboard and replay services are left running locally for user validation.

## Out of Scope

- Predictive strategy or pit-loss simulation.
- Realistic team performance modelling.
- Simulation of 2026 electrical or active-aero systems.
- Replacing or augmenting real production feed data.
- Uploading the replay or code changes to GitHub.
