# Setup

A short tutorial on how to setup f1-dash via docker compose or kubernetes.

## Components

### dashboard

Techstack: Next.js, TypeSecript

The website/dashboard itself. Gets data from api and realtime service.

envs:
```
NEXT_PUBLIC_LIVE_URL=http://localhost:4000
API_URL=http://localhost:4001

# rybbit tracking script and id
TRACKING_ID=
TRACKING_URL=
```

build envs:
```
SKIP_ENV_VALIDATION=1		# skips env validation, use for docker
NEXT_STANDALONE=1 			# enables nextjs standalone build, use for docker
NEXT_NO_COMPRESS=1 			# disables nextjs compression, use when using proxy compression
```

note: you can't change build variables when using the public f1-dash image. But you can set them when building your own.

### realtime

Techstack: Rust, SignalR, Axum

Connects to f1 over signalr and serves realtime data over websockets to dashboard.

envs:
```
# logging
RUST_LOG=realtime=info

# Address where the webserver opens on with port
ADDRESS=0.0.0.0:4000

# CORS Origin, set to dashboard address
ORIGIN="https://f1-dash.com"

# session recording
RECORDING_ENABLED=true
RECORDINGS_DIR=./recordings
RECORDING_GZIP=true

# (optional) endpoint for simulator
F1_DEV_URL=ws://localhost:8000/ws
```

### api

Techstack: Rust, Axum

Handles all non realtime data depended things like past & future sessions.

envs:
```
# logging
RUST_LOG=api=info

# Address where the webserver opens on with port
ADDRESS=0.0.0.0:4001

# CORS Origin, set to dashboard address
ORIGIN="https://f1-dash.com"
ARCHIVE_DB=./archive.sqlite
```

## Session archive

Realtime records every subscribed session by default in replay-compatible files under `recordings/<year>/`. Set `RECORDING_ENABLED=false` to disable capture, `RECORDINGS_DIR` to move the files, or `RECORDING_GZIP=false` to keep rotated sessions uncompressed.

Start all local services with the archive watcher:

```powershell
.\scripts\start-all.ps1 -WithArchive
```

Manual archive commands:

```powershell
$env:ARCHIVE_DB = ".\archive.sqlite"
cargo run -p archive -- ingest .\recordings
cargo run -p archive -- list
cargo run -p archive -- rebuild "2026/Spanish_Grand_Prix/Race"
cargo run -p archive -- watch
```

Both raw and gzip recordings can be replayed through the live pipeline:

```powershell
$env:ADDRESS = "0.0.0.0:8000"
cargo run -p simulator -- replay .\recordings\2026\Spanish_Grand_Prix_Race.data.txt.gz
```

Set `RECORDING_RETENTION_DAYS` on the archive watcher to delete compressed source recordings older than that number of days, but only after a complete session has been ingested successfully. SQLite history is retained. Running two realtime recorder instances against the same directory is unsupported.

## Platforms

Please not when choosing the dockerimages / choosing which tag, if you use latest or develop, which are moving tags and are not fixed, things might break over time.

### Docker Compose

The root Compose file builds every application image from this repository and starts the archive watcher by default:

```sh
docker compose up --build
```

Local endpoints:

- Dashboard: <http://localhost:3000>
- Realtime API: <http://localhost:4000>
- Data and archive API: <http://localhost:4001>

The dashboard uses `http://api:4001` for server-side requests inside Docker. Browser realtime requests continue to use `http://localhost:4000`. CORS accepts both `http://localhost:3000` and `http://127.0.0.1:3000`.

Named volumes preserve replay recordings, the archive SQLite database, API cache files, and Caddy state. Normal shutdown keeps them:

```sh
docker compose down
```

Only use `docker compose down --volumes` when you intentionally want to erase all persisted dashboard history and cache data.

Copy values from `.env.example` into a local `.env` when you need to change recording behavior. `RECORDING_GZIP=false` keeps recordings uncompressed, and `RECORDING_RETENTION_DAYS` removes old source recordings only after a complete session has been archived.

### Production with Caddy

Production remains optional and uses the same application images. Set a real DNS name pointing to the host:

```sh
F1_DASH_DOMAIN=f1.example.com
CADDY_EMAIL=you@example.com
```

On PowerShell, set those values with `$env:F1_DASH_DOMAIN` and `$env:CADDY_EMAIL`. Then build and start the production overlay:

```sh
docker compose -f compose.yaml -f compose.production.yaml --profile production up -d --build
```

`F1_DASH_DOMAIN` is required and Compose exits with a clear interpolation error when it is missing. Caddy is the only service that publishes host ports in production (`80` and `443`), obtains and renews HTTPS certificates automatically, compresses responses, and proxies same-origin API requests to the private services.

Useful health endpoints after startup:

- `https://f1.example.com/`
- `https://f1.example.com/api/health`
- `https://f1.example.com/api/realtime/health`

Certificates and runtime state stay in Docker named volumes and must not be committed. Local deployment never requires published GHCR images because Compose builds from source by default.

### Kubernetes

There is a kubernetes setup in the `.k8s` folder. This is a more advanced setup expected to run on a server and be accessed from other devices on your local network or even the internet.
This is the way f1-dash.com is hosted. There's no Helm Chart for now just a few yamls. Ingress/Gatway is not included as this is very specific to your setup.
