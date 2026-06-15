# Docker Deployment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a source-built local Docker Compose stack and an optional Caddy-backed production overlay for the dashboard, APIs, realtime recorder, and archive watcher.

**Architecture:** A root multi-stage Rust image provides separate `api`, `realtime`, and `archive` targets, while the dashboard keeps a Yarn 4 standalone Next.js image. `compose.yaml` is the self-contained local stack with persistent named volumes; `compose.production.yaml` removes direct application ports, changes public origins/build values, and enables Caddy as the only public entrypoint.

**Tech Stack:** Docker multi-stage builds, Docker Compose, Caddy 2, Rust/Axum, Next.js 16, Yarn 4, PowerShell static validation, GitHub Actions/GHCR.

---

### Task 1: Encode Deployment Invariants

**Files:**
- Create: `scripts/tests/docker-deployment.test.ps1`

- [ ] Write assertions for five Compose services, source builds, local ports, service DNS, healthchecks, restart policies, persistent volumes, production port reset, required domain interpolation, Caddy routes, Rust image targets, dashboard standalone settings, CORS attachment, and CI verification/publishing separation.
- [ ] Run `pwsh -NoProfile -File scripts/tests/docker-deployment.test.ps1` and verify it fails because the production overlay and required targets do not exist.
- [ ] Commit the failing specification test with this plan.

### Task 2: Build Runtime Images

**Files:**
- Modify: `dockerfile`
- Modify: `dashboard/dockerfile`
- Modify: `dashboard/next.config.ts`
- Modify: `docker-bake.hcl`

- [ ] Copy every Cargo workspace member, build the three release binaries, and create non-root Alpine runtime targets with CA certificates and `wget`.
- [ ] Make the dashboard use Yarn 4 immutable installs, build-time `NEXT_PUBLIC_LIVE_URL`, standalone output, and correct `NEXT_NO_COMPRESS=1` behavior.
- [ ] Add the archive image to Bake groups and targets.
- [ ] Run the static deployment test and confirm only Compose/CI-related assertions remain failing.
- [ ] Run `cargo test --workspace`, dashboard tests, lint, and build.
- [ ] Commit the image changes.

### Task 3: Define Local And Production Compose

**Files:**
- Modify: `compose.yaml`
- Create: `compose.production.yaml`
- Create: `Caddyfile`
- Create: `.env.example`

- [ ] Define source builds for `web`, `api`, `realtime`, and `archive`, local ports 3000/4000/4001, local origins, internal DNS, healthchecks, healthy dependencies, `unless-stopped`, and named volumes for recordings, SQLite, API cache, and Caddy state.
- [ ] Add a production overlay that resets application ports, requires `F1_DASH_DOMAIN`, sets HTTPS origins/public URL, disables Next.js compression at build time, and enables Caddy through the `production` profile.
- [ ] Route dashboard traffic and realtime/API paths through Caddy, including distinct realtime and API health paths.
- [ ] Run the static deployment test and verify Compose/Caddy assertions pass.
- [ ] Commit the Compose configuration.

### Task 4: Attach API CORS

**Files:**
- Modify: `api/src/main.rs`

- [ ] Add an Axum router test that sends an OPTIONS request from an allowed origin and expects `access-control-allow-origin`.
- [ ] Run `cargo test -p api cors` and verify the test fails because the layer is not installed.
- [ ] Attach `cors_layer()?` to the API router.
- [ ] Run `cargo test -p api cors` and then `cargo test --workspace`.
- [ ] Commit the CORS fix.

### Task 5: Separate Verification And Publishing

**Files:**
- Create: `.github/workflows/verify.yaml`
- Modify: `.github/workflows/release.yaml`

- [ ] Add Rust format, Clippy, workspace tests, dashboard immutable install, lint, tests, audit, production build, static deployment validation, and Docker target builds to verification.
- [ ] Make publishing depend on the same verification jobs, publish four images only on `develop` and version tags, and derive the GHCR namespace from `github.repository_owner`.
- [ ] Run the static deployment test and inspect workflow diffs.
- [ ] Commit CI changes.

### Task 6: Document Operation And Persistence

**Files:**
- Modify: `SETUP.md`
- Modify: `README.md`
- Modify: `.gitignore`

- [ ] Document `docker compose up --build`, local URLs, persisted state, optional recording settings, production overlay invocation, required domain/email, health checks, and safe shutdown without deleting volumes.
- [ ] Ensure runtime state, certificates, recordings, SQLite files, and local environment files remain ignored while `.env.example` stays tracked.
- [ ] Run the static deployment test and documentation/configuration checks.
- [ ] Commit documentation changes.

### Task 7: Final Verification

**Files:**
- Verify all modified files.

- [ ] Run `cargo fmt --all -- --check`, `cargo clippy --workspace --all-targets -- -D warnings`, and `cargo test --workspace`.
- [ ] Run dashboard immutable install, tests, lint, audit, and production build with local Docker environment values.
- [ ] Run `pwsh -NoProfile -File scripts/tests/docker-deployment.test.ps1`.
- [ ] Run `docker compose config`, image builds, stack health probes, persistence restart, and `docker compose down` when Docker is available; otherwise record that limitation explicitly.
- [ ] Review `git diff --check`, repository status, and the design requirement checklist before completion.

