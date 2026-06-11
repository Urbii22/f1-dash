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

There is a basic docker compose file in the root of the project. This is a very basic setup only expected to run on a local machine and only expected to be accessed from there.
If you want to host f1-dash on a server or also access it from other devices on your local network then adjustments have to be made like setting the ORIGIN environment variable or setting up a reverse proxy.

### Kubernetes

There is a kubernetes setup in the `.k8s` folder. This is a more advanced setup expected to run on a server and be accessed from other devices on your local network or even the internet.
This is the way f1-dash.com is hosted. There's no Helm Chart for now just a few yamls. Ingress/Gatway is not included as this is very specific to your setup.
