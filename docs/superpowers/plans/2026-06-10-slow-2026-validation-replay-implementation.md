# Slow 2026 Validation Replay Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce and run an approximately eight-minute synthetic 2026 replay with 22 drivers, real pit-status fields, and no simulated DRS or unsupported 2026 modes.

**Architecture:** The replay generator owns deterministic fixture data and a timestamped scenario table. The Rust simulator extracts timestamps from outgoing feed frames and sleeps for the real delta between events, with `REPLAY_SPEED` available for automated validation. A Node validator parses the generated fixture and protects its grid, rules, pit-transition, and duration contracts.

**Tech Stack:** Node.js ESM, Rust/Tokio/Axum, Formula 1 SignalR-compatible replay messages, Next.js dashboard.

---

### Task 1: Add a Replay Contract Validator

**Files:**
- Create: `tools/validate-sample-replay.mjs`

- [ ] Write a validator that reads `sample-replay/synthetic-f1-full-grid.data.txt`, splits record-separator frames, and asserts the initial state and all updates.
- [ ] Assert exactly 22 drivers, 11 unique teams, expected 2026 assignments, no Tsunoda or Kick Sauber, and presence of Audi, Cadillac, Lindblad, Bottas, and Perez.
- [ ] Assert no car-data channel `45`, no race-control DRS text, at least two complete `InPit -> PitOut -> neutral` sequences, minimum pit-state durations, and a final elapsed timestamp between 450 and 510 seconds.
- [ ] Run `node tools/validate-sample-replay.mjs` and verify it fails against the current 20-driver fixture.

### Task 2: Make the Simulator Respect Replay Time

**Files:**
- Modify: `simulator/src/replay/server.rs`

- [ ] Add Rust unit tests for extracting the timestamp from feed argument index `2`, calculating non-negative adjacent delays, and applying `REPLAY_SPEED`.
- [ ] Run `cargo test -p simulator replay::server` and verify the new tests fail before implementation.
- [ ] Implement timestamp parsing without adding a date library by converting the ISO time-of-day portion to milliseconds; the fixture stays within one day.
- [ ] Before each update after the first timestamped frame, sleep for the timestamp delta divided by `REPLAY_SPEED`; use `1` by default and retain a minimal 100 ms fallback for frames without timestamps.
- [ ] Run `cargo test -p simulator replay::server` and verify all tests pass.

### Task 3: Generate the Slow 2026 Scenario

**Files:**
- Modify: `tools/make-sample-replay.mjs`
- Regenerate: `sample-replay/synthetic-f1-full-grid.data.txt`

- [ ] Replace the driver fixture with the approved 22-driver/11-team 2026 field.
- [ ] Remove channel `45` and all DRS messages.
- [ ] Replace tick-number event conditions with a deterministic timeline spanning about 480 seconds.
- [ ] Emit routine frames every 10 seconds, with stable opening running, yellow/green phases, a position exchange, two separated pit sequences, track limits, one late retirement, and session finish.
- [ ] Keep each pit state for at least 20 seconds and each pit-out state for at least 20 seconds before clearing it.
- [ ] Regenerate with `node tools/make-sample-replay.mjs`.
- [ ] Run `node tools/validate-sample-replay.mjs` and verify it passes.

### Task 4: Verify the Dashboard Stack

**Files:**
- No production dashboard changes expected.

- [ ] Run the replay validator, simulator tests, dashboard unit tests, dashboard lint, and dashboard production build.
- [ ] Stop only processes occupying the local replay ports `4000` and `8000`; leave unrelated processes untouched.
- [ ] Launch `simulator replay sample-replay/synthetic-f1-full-grid.data.txt` on `127.0.0.1:8000`.
- [ ] Launch `realtime` on `127.0.0.1:4000` with `F1_DEV_URL=ws://127.0.0.1:8000/ws`.
- [ ] Ensure the dashboard remains available at `http://127.0.0.1:3000/dashboard`.
- [ ] Reload the in-app browser and verify 22 rows, no DRS labels, selectable Head-to-Head drivers, and the first pit event appearing at its scheduled time.
- [ ] Leave the local replay stack running for user validation and report the URL.
