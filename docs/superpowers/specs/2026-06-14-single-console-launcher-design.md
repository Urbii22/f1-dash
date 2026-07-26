# Single-Console Launcher Design

**Date:** 2026-06-14
**Status:** Approved

## Goal

Launch the local API, realtime service and Next.js dashboard while keeping only
the original launcher console visible.

## User Experience

- `start-f1-dash.bat` opens one PowerShell console.
- The console builds the required binaries, starts all services in the
  background and reports their URLs and log files.
- The console remains open as a lightweight supervisor while services run.
- Pressing `Ctrl+C` stops the complete process tree and frees the owned ports.
- `stop-f1-dash.bat` remains a supported external stop mechanism.
- The browser still opens automatically after `http://localhost:3000` responds,
  unless `-NoBrowser` is supplied.

## Architecture

`scripts/start-all.ps1` starts each service with `Start-Process` and
`-WindowStyle Hidden`, redirecting standard output and error to service-specific
files under `logs/`. The launcher records the direct process IDs in a runtime
state file so both the supervisor and `scripts/stop-all.ps1` can stop them even
when a service has not opened its port yet.

The dashboard remains a child process tree: Corepack launches Yarn, which
launches Next.js. Shutdown therefore terminates each recorded process and its
descendants before performing the existing port cleanup as a fallback.

## Console Output

After startup the single visible console shows:

- API, realtime and dashboard status and URL.
- The log directory and individual log filenames.
- A message explaining that `Ctrl+C` or `stop-f1-dash.bat` stops all services.
- A periodic health/status line only when a service exits unexpectedly; normal
  operation stays quiet.

## Error Handling

- A process that exits during startup is reported with its exit code and log
  path.
- Failure to reach the dashboard within the existing timeout leaves the
  supervisor open and reports where to inspect the dashboard error log.
- Stale runtime state is ignored when its PIDs no longer exist.
- Existing listeners and alternate-port Next.js instances from this project are
  stopped before launch, preserving current restart behavior.

## Testing

- Unit-test command construction, log paths and runtime-state serialization in
  `scripts/tests/launcher-utils.test.ps1`.
- Parse both PowerShell scripts to catch syntax errors.
- Run the launcher twice to verify idempotent restart.
- Confirm exactly one visible launcher console is created, ports `3000`, `4000`
  and `4001` listen, and `http://localhost:3000` returns HTTP 200.
- Run `stop-f1-dash.bat` and confirm all three ports are released.

## Scope

This change affects only local process orchestration. It does not combine
service log streams, change service ports, alter production deployment or add a
new process manager dependency.
