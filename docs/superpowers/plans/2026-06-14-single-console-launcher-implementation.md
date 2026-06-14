# Single-Console Launcher Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Run API, realtime and dashboard under one visible supervisor console with hidden child processes, separate logs and coordinated shutdown.

**Architecture:** Extend the existing PowerShell launcher helpers with testable runtime-state and process-tree functions. Replace per-service PowerShell windows with hidden `Start-Process` calls whose PIDs are persisted, then keep `start-all.ps1` alive as the supervisor and update `stop-all.ps1` to consume the same state before port fallback cleanup.

**Tech Stack:** Windows PowerShell 5.1, `Start-Process`, CIM process metadata, JSON runtime state, existing Rust/Next.js services.

---

### Task 1: Testable launcher runtime helpers

**Files:**
- Modify: `scripts/launcher-utils.ps1`
- Modify: `scripts/tests/launcher-utils.test.ps1`

- [ ] **Step 1: Write failing tests**

Add assertions that `Get-ServiceLogPaths` returns distinct stdout/stderr files,
that runtime state round-trips through JSON, and that process-tree selection
returns a root PID plus descendants without unrelated processes.

- [ ] **Step 2: Run tests to verify RED**

Run: `powershell -NoProfile -File scripts/tests/launcher-utils.test.ps1`
Expected: FAIL because the new helper functions do not exist.

- [ ] **Step 3: Implement minimal helpers**

Implement `Get-ServiceLogPaths`, `Write-LauncherState`, `Read-LauncherState`,
`Get-ProcessTreeIds` and `Stop-ProcessTree` in `launcher-utils.ps1`.

- [ ] **Step 4: Run tests to verify GREEN**

Run: `powershell -NoProfile -File scripts/tests/launcher-utils.test.ps1`
Expected: PASS.

### Task 2: Single visible supervisor

**Files:**
- Modify: `scripts/start-all.ps1`

- [ ] **Step 1: Replace service windows**

Create `logs/`, start API/realtime/dashboard with hidden windows and redirected
stdout/stderr, persist their direct PIDs, and retain current environment values.

- [ ] **Step 2: Add startup health checks**

Poll ports/processes, report early exits with error-log paths, and preserve the
browser open behavior after dashboard HTTP 200.

- [ ] **Step 3: Add supervisor loop and cleanup**

Keep the original console alive, detect unexpected child exits, and stop all
recorded process trees in `finally` when the user presses `Ctrl+C`.

- [ ] **Step 4: Parse script**

Run PowerShell parser against `scripts/start-all.ps1`.
Expected: zero syntax errors.

### Task 3: Coordinated external stop

**Files:**
- Modify: `scripts/stop-all.ps1`

- [ ] **Step 1: Stop recorded process trees**

Read `.runtime/launcher-state.json`, stop each service tree, remove stale state,
then run the existing port cleanup as fallback.

- [ ] **Step 2: Parse script**

Run PowerShell parser against `scripts/stop-all.ps1`.
Expected: zero syntax errors.

### Task 4: End-to-end verification

**Files:**
- Verify: `scripts/start-all.ps1`
- Verify: `scripts/stop-all.ps1`

- [ ] **Step 1: Run unit and dashboard tests**

Run `scripts/tests/launcher-utils.test.ps1` and `corepack yarn test`.
Expected: all tests pass.

- [ ] **Step 2: Launch in one-console mode**

Start launcher as one PowerShell process, confirm it remains alive and no child
PowerShell service windows are created. Confirm ports 3000/4000/4001 listen and
dashboard returns HTTP 200.

- [ ] **Step 3: Verify external stop**

Run `scripts/stop-all.ps1`, confirm the supervisor exits and all owned ports are
released.

- [ ] **Step 4: Commit and push**

Commit the scoped launcher change and push `codex/modern-tech-ui`.
