# Docker Deployment Design

## Goal

Provide one reliable Docker deployment model for two environments:

- Local personal use works with `docker compose up --build` and no domain.
- Production remains optional until a domain exists, then adds Caddy for automatic HTTPS without changing application images.

## Scope

The stack contains five services:

- `web`: Next.js dashboard exposed locally on port `3000`.
- `api`: Rust schedule, standings, results, and archive API.
- `realtime`: Rust live F1 feed and SSE server.
- `archive`: Rust watcher that ingests completed recordings into SQLite.
- `caddy`: Optional production reverse proxy enabled through a Compose profile.

Docker configuration must build all workspace dependencies, use internal service discovery, persist recordings and archive data, report service health, and avoid publishing internal services in production.

## Compose Layout

`compose.yaml` is the local default. It builds images from the repository and exposes:

- Dashboard: `http://localhost:3000`
- Realtime API: `http://localhost:4000`
- Data API: `http://localhost:4001`

The browser-facing realtime URL remains `http://localhost:4000`. Server-side Next.js requests use Docker DNS and call `http://api:4001`; they must never use `localhost` to reach another container.

Named volumes persist:

- Replay recordings shared by `realtime` and `archive`.
- SQLite database shared by `archive` and `api`.
- API cache data where required by the existing disk cache.

The archive watcher starts by default so local recordings become visible in the dashboard automatically.

`compose.production.yaml` adds Caddy and production-only routing. It removes direct public exposure for application services and routes one configured domain to `web`, `/api/realtime`, `/api/current`, `/api/drivers`, and health endpoints as appropriate. Production activation requires `F1_DASH_DOMAIN`; absent configuration leaves the local stack unaffected.

## Images

### Rust

The root multi-stage Dockerfile copies every Cargo workspace member, including `archive`, before compiling release binaries. It exposes separate runtime targets for:

- `api`
- `realtime`
- `archive`

Runtime images use a small Alpine base, include required TLS/runtime libraries, run as a non-root user where practical, and include a healthcheck-capable HTTP client for network services.

### Dashboard

The dashboard image uses Yarn 4 with immutable installs and Next.js standalone output. Build-time public environment values and runtime server-only values are handled separately:

- `NEXT_PUBLIC_LIVE_URL` is embedded for browser use.
- `API_URL` is supplied at runtime for server-side requests.

Compression configuration must follow `NEXT_NO_COMPRESS`: value `1` disables Next.js compression. Production can disable application compression when Caddy owns it; local mode keeps Next.js compression enabled.

## Networking And Origins

Local CORS allows `http://localhost:3000` and `http://127.0.0.1:3000` so both common local URLs work.

Production CORS uses `https://${F1_DASH_DOMAIN}`. The API must actually install its configured CORS layer; defining it without attaching it is insufficient.

Only Caddy publishes ports `80` and `443` in production. Containers communicate through the private Compose network by service name.

## Health And Startup

Healthchecks cover:

- `api`: `/api/health`
- `realtime`: `/api/health`
- `web`: `/`

`depends_on` uses healthy-service conditions where startup ordering matters. Archive watcher health is process-based because it has no HTTP endpoint. Restart policy is `unless-stopped` for personal always-on use.

## Configuration

Tracked example configuration documents:

- Local ports and public realtime URL.
- Optional recording compression and retention.
- Optional production domain and email for Caddy ACME.
- Image registry namespace for GitHub Actions.

No secrets, certificates, SQLite files, recordings, or runtime state are committed.

## CI And Publishing

GitHub Actions separates verification from publishing:

1. Run Rust format, Clippy, and workspace tests.
2. Run dashboard install, lint, tests, dependency audit, and production build.
3. Build Docker targets.
4. Publish only on configured branch/tag events after verification succeeds.

Images publish to the current repository owner rather than the upstream `slowlydev` namespace. Local deployment does not depend on published images because Compose builds from source by default.

## Error Handling

- Missing required production variables causes Compose/Caddy startup to fail with a clear interpolation error.
- Unhealthy dependencies prevent dependent services from being reported ready.
- Persistent data survives container recreation.
- Local and production files remain independently usable; production settings do not silently alter local behavior.

## Verification

Automated static tests validate Docker and Compose invariants without requiring Docker to be installed. When Docker is available, final acceptance also runs:

1. `docker compose config`
2. Image builds for all targets
3. `docker compose up -d --build`
4. Health probes for ports `3000`, `4000`, and `4001`
5. Archive persistence check across restart
6. `docker compose down` without deleting named volumes

Existing Rust and dashboard suites, formatting, lint, Clippy, and Next.js production build must pass.

## Non-Goals

- Selecting or purchasing a production domain.
- Cloud hosting or infrastructure provisioning.
- Authentication or public multi-user hardening.
- Kubernetes deployment.
