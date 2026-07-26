# Plan de implementación — Archivo de sesiones y análisis post-sesión ("Archive")

**Fecha:** 2026-06-11 (revisado y ampliado el mismo día)
**Decisión de arquitectura:** integrado en esta app (monorepo), NO app separada.
**Estado:** Propuesto
**Prerrequisito:** roadmap 2026-06-11 (lap history, alerts v2, replay timeline, strategy) — completado.

---

## 0. Resumen ejecutivo

Registrar de forma permanente todo lo que llega del feed durante cada sesión y construir una
sección `/archive` de análisis post-sesión: tandas largas de libres, ritmo de clasificación,
análisis posterior de carrera y (fase final) telemetría vuelta a vuelta.

```
                         ┌─ live (sin cambios) ──▶ SSE ──▶ dashboard /dashboard
feed F1 ──▶ realtime ────┤
                         └─ recorder ──▶ recordings/<sesión>.data.txt   (crudo, replay-compatible)
                                              │
                                              ├──▶ simulator replay  (re-ver la sesión en el dashboard live)
                                              │
                                              └──▶ archive ingest ──▶ archive.sqlite
                                                                          │
                                  api /api/archive/* ◀───────────────────┘
                                          │
                                  dashboard /archive  (fetch, sin socket)
```

### Por qué en esta app y no en una separada

- La captura solo puede vivir en `realtime` (único proceso conectado al feed). Una app
  externa dependería de este repo desde el día uno.
- El frontend reutiliza directamente `LineChart`, `StintTimeline`, `RacePaceChart`,
  `lib/lapHistory`, `lib/strategy` y los tipos de `state.type.ts`. App aparte = duplicar
  todo eso y mantenerlo sincronizado a cada cambio del feed.
- Next.js da la separación deseada vía route group `/archive`: bundle propio por
  code-splitting, sin socket, sin `useDataEngine`. Funciona con `realtime` apagado.

### Decisiones de diseño clave (fundamentadas en el código actual)

| # | Decisión | Fundamento |
|---|----------|------------|
| D1 | **Formato de grabación = formato replay del simulador** (líneas SignalR: handshake + completion + feed messages) | `simulator/src/replay/server.rs` ya reproduce ese formato y `tools/make-sample-replay.mjs` lo genera; cada grabación queda automáticamente replayable por el pipeline live completo (timeline, scrubbing, alerts). Un solo formato sirve para replay Y para ingest |
| D2 | **El recorder NO se cuelga del broadcast channel** | `main.rs` crea `broadcast::channel::<String>(16)`: capacidad 16, un receptor lento pierde mensajes (`Lagged`). El recorder usa su propio `mpsc::unbounded_channel` alimentado desde `f1.rs` |
| D3 | **Preservar el timestamp del feed** | `signalr::UpdateArgs.timestamp` (3er argumento de cada FeedMessage) se descarta hoy en `f1.rs`. Es lo que usa `replay/server.rs` (`timestamp_millis`) para el pacing y lo que el ingest usa como reloj canónico de sesión |
| D4 | **Capturar el snapshot inicial explícitamente** | El resultado de `signalr::subscribe()` va directo a `state_service.set_state()` y NUNCA pasa por el broadcast. Sin él la grabación no tiene `SessionInfo` ni `DriverList` |
| D5 | **SQLite como capa de consulta; el crudo como fuente de verdad** | Una carrera real ≈ 50k–200k líneas / 150–600 MB sin comprimir (extrapolando los 3,2 KB/línea del sample full-grid). gzip al rotar → 20–100 MB. SQLite materializa solo lo derivado: pocos MB, consultas < 50 ms |
| D6 | **Derivación de vueltas en Rust = port 1:1 de `lib/lapHistory.ts`** | Los 21 tests de `lapHistory.test.ts` son la especificación ejecutable; se portan como tests de `cargo` con los mismos fixtures y resultados |
| D7 | **Normalizar nombres de topic en el ingest** | El feed real emite `CarData.z`/`Position.z`; los replays sintéticos usan `CarDataZ`/`PositionZ`. El ingest acepta ambos; el recorder graba lo que llega sin tocar |

### Orden y dependencias

```
F0 (refactors previos) → F1 (recorder) → F2 (archive crate + SQLite) → F3 (api) → F4 (UI) → F5 (telemetría, diferible)
```

Cada fase termina con: `cargo test`/`yarn test` + lint + build + validación e2e + commit
(`feat: ...`), siguiendo el ritmo del roadmap anterior. F1 es valiosa por sí sola: desde el
día uno se graban sesiones reales aunque el resto no exista.

---

## Fase 0 — Refactors previos (compartir código entre live y archive)

Pequeños movimientos sin cambio funcional que evitan duplicación después. Hacerlos primero
y en un commit propio (`refactor: ...`) para que las fases siguientes tengan diff limpio.

### 0.1 Mover `merge` a `shared`

- `realtime/src/services/state_service.rs::merge` (deep-merge JSON con la semántica
  especial de arrays indexados por clave numérica) → `shared/src/merge.rs`, `pub fn merge`.
- `state_service.rs` lo importa de `shared`. El crate `archive` (F2) lo reutiliza para
  reconstruir el estado al reproducir una grabación.
- Test en `shared`: portar los casos del `merge` de TS (`dashboard/src/lib/merge.ts` tiene
  la misma semántica) — objetos anidados, arrays-como-objetos, sobrescritura escalar.

### 0.2 Exponer el parser de frames en `signalr`

Hoy `FeedMessage`, `split_messages` y `deserialize` son privados. Añadir API pública:

```rust
// signalr/src/lib.rs
pub struct ParsedFrame {
    pub kind: FrameKind,            // Feed { topic, data, timestamp } | Completion { result } | Other
}
pub fn parse_frames(raw_line: &str) -> Vec<ParsedFrame>;   // maneja RECORD_SEPARATOR y multi-mensaje
```

- `listen()` se reimplementa sobre `parse_frames` (sin cambio de comportamiento).
- El crate `archive` parsea las grabaciones con exactamente el mismo código que el cliente
  live — cero divergencia de formatos.

### 0.3 Extraer builders de series del frontend

- `dashboard/src/lib/analysisSeries.ts`: funciones puras `lapsToPaceSeries`,
  `lapsToPositionSeries` (hoy inline en `RacePaceChart.tsx`/`PositionChart.tsx` vía
  `useMemo`). Los componentes pasan a recibir `LapRecord[]` por props y construir series
  con estos helpers. La página Analysis live no cambia visualmente.
- Tests vitest de los builders (clipping de outliers, series vacías, pilotos sin vueltas).
- Esto permite que en F4 los mismos charts se alimenten de la API sin adaptadores.

**Aceptación F0:** `cargo test` + `yarn test` verdes; dashboard live idéntico (validación
visual rápida con replay); ningún cambio de comportamiento.

---

## Fase 1 — Recorder en `realtime`

### Objetivo

Cada sesión queda grabada en disco en formato replay-compatible, con coste cero para la
latencia del camino live y supervivencia a reconexiones/reinicios de `ingest_f1`.

### 1.1 Formato de fichero (espec.)

Idéntico al que consume `simulator/src/replay/server.rs` (y genera `tools/make-sample-replay.mjs`):

```
línea 1:  {}                                                            ← handshake response
línea 2:  {"type":3,"invocationId":"recorded-subscribe","result":{...}} ← completion con snapshot inicial
línea 3+: {"type":1,"target":"feed","arguments":[<topic>,<data>,<timestamp>]}
```

- `<timestamp>` = el del feed (D3), que el replay usa para el pacing.
- Reconexión a la MISMA sesión (mismo `SessionInfo.Path`): se appendea un nuevo type3 con
  el snapshot de re-suscripción. Es seguro: `replay/server.rs` reescribe los type3 vía
  `rewrite_completion_invocation`, y `signalr::listen` del cliente ignora frames type≠1
  a mitad de stream. El ingest (F2) los trata como "reset de estado" (semántica `set_state`).
- Nombre: `recordings/<año>/<SessionInfo.Path saneado>.data.txt`
  (`2026/Spanish_Grand_Prix_Race.data.txt`; sanear `/ : espacios` → `_`).
- Al rotar (cambio de sesión o shutdown limpio): comprimir a `.data.txt.gz` en background
  (`flate2`). El ingest y el replay-loader aceptan ambos. Reduce una carrera a 20–100 MB.

### 1.2 Integración en el código (puntos exactos)

**`realtime/src/recorder.rs` (nuevo):**

```rust
pub enum RecorderMsg {
    Initial(serde_json::Value),                                  // resultado de subscribe()
    Update { topic: String, data: serde_json::Value, timestamp: String },
    Flush,                                                       // shutdown limpio
}

pub struct RecorderHandle(mpsc::UnboundedSender<RecorderMsg>);   // Clone, barato

pub fn spawn_recorder() -> RecorderHandle;   // task tokio dueña de ficheros y rotación
```

- La task escritora: `BufWriter` + flush cada 1 s (pérdida máxima ≈ 1 s ante crash).
- Rotación: al recibir `Initial`, extrae `SessionInfo.Path`; si difiere del fichero actual
  → cierra (+gzip async) y abre el nuevo; si coincide → append del type3 (reconexión).
- Si aún no se conoce el Path (Initial sin SessionInfo, no debería ocurrir): buffer en
  memoria con tope de 5 000 mensajes y warn.
- Cualquier error de IO: `warn!` y deshabilitar grabación hasta el siguiente `Initial`
  — la grabación JAMÁS tumba ni ralentiza el live (sender unbounded, nunca bloquea).

**`realtime/src/main.rs`:** crear el handle antes del loop de ingest y pasarlo:

```rust
let recorder = recorder::spawn_recorder();
// dentro del loop:
match f1::ingest_f1(state_service.clone(), sender.clone(), recorder.clone()).await { ... }
```

El recorder vive FUERA del loop de reinicio de `ingest_f1` (el loop reinicia en cada cambio
de sesión, ver `main.rs:25-38`) → la rotación de ficheros sobrevive los restarts.

**`realtime/src/f1.rs`:** dos líneas nuevas:

```rust
let initial = signalr::subscribe(&mut client, &TOPICS).await?;
recorder.send(RecorderMsg::Initial(initial.clone()));            // ← D4
state_service.set_state(initial).await?;
// ...en el while:
recorder.send(RecorderMsg::Update { topic: update.topic.clone(),
                                    data: update.data.clone(),
                                    timestamp: update.timestamp.clone() });  // ← D3
```

Nota: hoy `update.timestamp` se descarta al construir `json!({topic: data})` — el broadcast
y el SSE no cambian; solo el recorder consume el timestamp.

**Importante (orden de eventos):** el chequeo de cambio de sesión en `f1.rs`
(`if update.topic == "SessionInfo" ... return Ok(())`) hace `return` ANTES de reenviar ese
update. El recorder debe recibir el update **antes** del chequeo para no perder el último
mensaje de la sesión saliente.

### 1.3 Configuración

| Env | Default | Uso |
|---|---|---|
| `RECORDINGS_DIR` | `./recordings` | raíz de grabaciones |
| `RECORDING_ENABLED` | `true` | kill-switch sin recompilar |
| `RECORDING_GZIP` | `true` | comprimir al rotar |

Añadir a `.env.example` (raíz si existe; documentar en `SETUP.md`) y a
`scripts/start-all.ps1` (bloque de envs de realtime).

### 1.4 Casos borde

- **Crash a mitad de sesión**: fichero válido hasta el último flush; el ingest acepta
  ficheros truncados (línea final partida → se descarta esa línea con warn).
- **Sesión sin nombre todavía** (`SessionInfo` ausente en initial): buffer + warn (ver 1.2).
- **Replays/simulador como fuente**: grabar igualmente (útil para tests); el ingest
  marcará `kind` según `SessionInfo.Type` — los sintéticos se distinguen por Meeting.
- **Disco lleno / dir no escribible**: warn una vez, deshabilitar hasta próximo Initial.
- **Dos instancias de realtime**: fuera de alcance (no soportado hoy tampoco); documentar.

### 1.5 Tests y aceptación

- `cargo test -p realtime`: unit del recorder con fs temporal — rotación por Path,
  append en reconexión, formato de las 3 clases de línea, buffer pre-SessionInfo.
- E2E (manual, guiado): simulador full-grid → realtime grabando → parar → lanzar
  `simulator replay <grabación>` → el dashboard reproduce la sesión grabada con timeline
  y marcadores funcionando. **Criterio: la grabación es indistinguible de un sample-replay.**
- Matar `realtime` (taskkill) a mitad → fichero válido hasta ±1 s del kill.

**Estimación:** 1–1,5 días.

---

## Fase 2 — Crate `archive`: ingest a SQLite

### Objetivo

Convertir grabaciones en tablas consultables. Ingest idempotente, incremental y validado
contra la derivación TS existente.

### 2.1 Estructura del crate

```
archive/
├── Cargo.toml          # deps: shared, signalr, rusqlite(bundled), flate2, base64,
│                       #       serde/serde_json, anyhow, clap, tracing, walkdir
└── src/
    ├── main.rs         # CLI: ingest <fichero|dir> | watch | list | rebuild <session>
    ├── reader.rs       # lectura .data.txt(.gz), parse_frames (de signalr), tolerancia a truncados
    ├── replayer.rs     # reconstruye el estado frame a frame (shared::merge + set en type3)
    ├── laps.rs         # port 1:1 de lib/lapHistory.ts (detector de flancos, pit flags, stints)
    ├── events.rs       # flancos de TrackStatus + RaceControlMessages → tabla events
    ├── telemetry.rs    # F5: inflate CarData.z, muestreo
    ├── db.rs           # esquema, migraciones (PRAGMA user_version), upserts
    └── normalize.rs    # topics (D7), tiempos ("1:23.456"→ms), Stints array|record
```

### 2.2 Pipeline de ingest (por fichero)

1. `reader` itera líneas; type3 → `replayer.set_state(result)`; type1 → normaliza topic
   (D7) y `replayer.apply(topic, data, timestamp)` (= `shared::merge`).
2. Tras cada apply, `laps::Tracker::ingest(&state, timestamp)` — misma máquina de estados
   que `LapHistoryTracker` TS: flanco de `NumberOfLaps`, guard de `LastLapTime` cambiado,
   pit flags armados por `InPit||PitOut`, skip de `Retired/Stopped`.
3. `events::Tracker` registra flancos de `TrackStatus.Status` (SC/VSC/roja/amarilla/verde),
   mensajes nuevos de RaceControl (penalizaciones, track limits) y chequered.
4. `WeatherData` se muestrea 1/min a tabla `weather`.
5. Al EOF: `buildStints` (port del TS) por piloto; upsert de todo en una transacción;
   `sessions.complete = 1` solo si se vio `SessionStatus ∈ {Finished, Finalised, Ends}`.
6. Tiempo canónico: el timestamp del feed (D3). El `utc` de cada vuelta = timestamp del
   frame que disparó el flanco (equivalente al `Heartbeat.Utc` que usa el TS).

### 2.3 Esquema SQLite (v1, migración `user_version = 1`)

```sql
PRAGMA journal_mode = WAL;

CREATE TABLE sessions (
  id INTEGER PRIMARY KEY,
  path TEXT NOT NULL UNIQUE,           -- SessionInfo.Path (clave natural de dedupe)
  year INTEGER NOT NULL,
  meeting TEXT NOT NULL,               -- Meeting.Name
  country TEXT,
  circuit TEXT,
  kind TEXT NOT NULL,                  -- SessionInfo.Type: Practice|Qualifying|Race...
  name TEXT NOT NULL,                  -- SessionInfo.Name: "Practice 1", "Race"...
  start_utc TEXT, end_utc TEXT,
  total_laps INTEGER,
  complete INTEGER NOT NULL DEFAULT 0,
  source_file TEXT NOT NULL,
  ingested_at TEXT NOT NULL
);

CREATE TABLE drivers (
  session_id INTEGER NOT NULL REFERENCES sessions(id),
  nr TEXT NOT NULL,
  tla TEXT, full_name TEXT, team_name TEXT, team_colour TEXT,
  PRIMARY KEY (session_id, nr)
);

CREATE TABLE laps (
  session_id INTEGER NOT NULL REFERENCES sessions(id),
  driver_nr TEXT NOT NULL,
  lap INTEGER NOT NULL,
  lap_time_ms INTEGER,                 -- NULL = sin tiempo fiable (mismo criterio que TS)
  s1_ms INTEGER, s2_ms INTEGER, s3_ms INTEGER,
  position INTEGER,
  gap_leader_ms INTEGER,
  compound TEXT, tyre_age INTEGER,
  pitted INTEGER NOT NULL DEFAULT 0,
  utc TEXT NOT NULL,
  PRIMARY KEY (session_id, driver_nr, lap)
);
CREATE INDEX idx_laps_session ON laps(session_id, lap);

CREATE TABLE stints (
  session_id INTEGER NOT NULL, driver_nr TEXT NOT NULL, stint INTEGER NOT NULL,
  compound TEXT, start_lap INTEGER, end_lap INTEGER,
  best_ms INTEGER, avg_ms INTEGER, deg_ms_per_lap REAL,
  PRIMARY KEY (session_id, driver_nr, stint)
);

CREATE TABLE events (
  session_id INTEGER NOT NULL, utc TEXT NOT NULL,
  kind TEXT NOT NULL,                  -- green|yellow|sc|vsc|red|chequered|penalty|track-limits|pit
  driver_nr TEXT, lap INTEGER, message TEXT,
  PRIMARY KEY (session_id, utc, kind, COALESCE(driver_nr,''))
);

CREATE TABLE weather (
  session_id INTEGER NOT NULL, utc TEXT NOT NULL,
  air_temp REAL, track_temp REAL, rainfall REAL, wind_speed REAL, humidity REAL,
  PRIMARY KEY (session_id, utc)
);

-- F5 (creada desde v1 para no migrar después; vacía hasta entonces)
CREATE TABLE telemetry (
  session_id INTEGER NOT NULL, driver_nr TEXT NOT NULL, ts_ms INTEGER NOT NULL,
  lap INTEGER, speed INTEGER, rpm INTEGER, gear INTEGER, throttle INTEGER, brake INTEGER,
  PRIMARY KEY (session_id, driver_nr, ts_ms)
);
CREATE INDEX idx_tel_lap ON telemetry(session_id, driver_nr, lap);
```

- Idempotencia: re-ingest del mismo fichero borra y reinserta SOLO esa `session_id` en
  una transacción (`rebuild` semántico) — más simple y seguro que upsert fila a fila.
- DB en `ARCHIVE_DB` (default `./archive.sqlite`).

### 2.4 CLI

```
archive ingest <ruta>      # fichero o directorio (recursivo, *.data.txt[.gz])
archive watch              # daemon: ingesta ficheros nuevos/estables (mtime sin cambios 60 s)
archive list               # sesiones en la DB (tabla resumen)
archive rebuild <path>     # re-deriva una sesión desde su source_file
```

`watch` se añade a `scripts/start-all.ps1` como cuarta ventana opcional (`-WithArchive`).

### 2.5 Tests y aceptación

- **Port-tests**: cada caso de `lapHistory.test.ts` (21 tests) replicado en `laps.rs`
  con los mismos fixtures y aserciones. Idem `buildStints` y parsers de tiempos.
- **Fixture de integración**: `sample-replay/synthetic-f1-full-grid.data.txt` ingerido en
  CI local → aserciones sobre nº de vueltas, stints y eventos esperados (valores fijados
  la primera vez tras validación manual).
- **Validación cruzada (criterio estrella)**: correr el replay en el dashboard hasta el
  final, exportar `useLapHistoryStore` (vía consola) y comparar con `SELECT * FROM laps`
  → deben coincidir 1:1 (vuelta, tiempo, compuesto, pitted).
- Re-ingest del mismo fichero → `SELECT count(*)` idénticos antes/después.
- Fichero truncado a mitad de línea → ingest OK con warn, `complete = 0`.

**Estimación:** 2–3 días (el grueso: port fiel de laps.rs y validación cruzada).

---

## Fase 3 — Endpoints REST en `api`

### 3.1 Diseño

Módulo nuevo `api/src/endpoints/archive.rs`; deps nuevas en `api`: `rusqlite(bundled)`.
Conexión read-only (`SQLITE_OPEN_READ_ONLY`), WAL permite lectura concurrente con `watch`.
Cada handler usa `tokio::task::spawn_blocking` (rusqlite es síncrono; las queries son
de milisegundos, no compensa un pool).

| Endpoint | Query params | Respuesta |
|---|---|---|
| `GET /api/archive/sessions` | `year?, kind?` | `[{id, path, year, meeting, country, kind, name, startUtc, complete}]` |
| `GET /api/archive/sessions/:id` | — | sesión + `drivers[]` + resumen weather (min/max/lluvia) |
| `GET /api/archive/sessions/:id/laps` | `driver?` | `{laps: {"1": LapRecord[], "44": ...}}` |
| `GET /api/archive/sessions/:id/stints` | — | `{stints: {"1": StintRecord[], ...}}` |
| `GET /api/archive/sessions/:id/events` | — | `[{utc, kind, driverNr, lap, message}]` |
| `GET /api/archive/sessions/:id/telemetry` | `driver, fromLap, toLap` | F5 |

**Contrato de campos = tipos TS existentes** (`LapRecord`, `StintRecord` de
`lib/lapHistory.ts`), en camelCase:

```json
{ "lap": 23, "lapTimeMs": 83456, "sectorsMs": [28100, 31000, 24356],
  "position": 3, "gapToLeaderMs": 2400, "compound": "MEDIUM",
  "tyreAge": 11, "pitted": false, "utc": "2026-06-14T14:23:11Z" }
```

Así los componentes de F4 consumen la API sin ningún adaptador.

- Errores: 404 sesión inexistente; 503 si la DB no existe aún (mensaje claro "no hay
  sesiones archivadas"). Sin paginación en v1 (una carrera ≈ 1 500 filas de laps; trivial).
- CORS: cubierto por el `cors_layer()` existente — pero NO hace falta: el dashboard
  consume server-side (ver F4).

### 3.2 Tests y aceptación

- `cargo test -p api`: handlers contra una DB fixture generada por `archive ingest` del
  sample full-grid (la fixture se construye en `build.rs` de tests o se versiona pequeña).
- `curl` manual de los 5 endpoints < 50 ms con la DB del replay.

**Estimación:** 1 día.

---

## Fase 4 — Sección `/archive` en el dashboard

### 4.1 Routing y data fetching

Patrón existente: `env.API_URL` es server-only y ya se consume desde server components
(`components/schedule/Schedule.tsx`) y route handlers (`app/dashboard/next-session/route.ts`).
Se sigue exactamente ese patrón → cero CORS, cero exposición de la URL interna:

```
dashboard/src/app/archive/
├── layout.tsx                  # marco visual (mismo look telemetry-panel), SIN useDataEngine ni socket
├── page.tsx                    # server component: lista de sesiones (fetch API_URL, cache: no-store)
└── [sessionId]/
    ├── page.tsx                # server component: fetch sesión+laps+stints+events en paralelo
    │                           #   (Promise.all) → pasa props a <ArchiveAnalysis/>
    └── (client) ArchiveAnalysis.tsx   # "use client": pestañas + charts (datos por props)
```

- Datos inmutables post-sesión → fetch server-side con `cache: "no-store"` en la lista
  (puede crecer) y cache por defecto en el detalle (inmutable).
- F5 (telemetría bajo demanda por piloto/vuelta) añadirá un route handler proxy
  `app/archive/api/telemetry/route.ts` para fetch client-side selectivo.

### 4.2 Componentes

```
dashboard/src/components/archive/
├── SessionCard.tsx        # año/GP/sesión, badge kind (FP/Q/R) + "partial" si !complete
├── SessionPicker.tsx      # agrupado año → meeting (reutiliza groupSessionByDay-style)
├── ArchiveAnalysis.tsx    # pestañas: Pace | Quali | Stints | Positions | Events
├── QualiReport.tsx        # mejores vueltas + best sectors teóricos + delta al mejor
└── EventsLog.tsx          # cronología con colores por kind (reusa paleta de replayMarkers)
```

Reutilizado tal cual gracias a F0.3: `RacePaceChart`, `PositionChart`, `StintTimeline`,
`DriverToggles` (todos aceptando `laps/stints` por props), `LineChart`, colores de
compuesto de `StintTimeline.tsx`, `formatLapTimeMs`.

Pestañas por tipo de sesión:
- **Practice** → Pace (con stint-filter para tandas largas: selector "solo stints ≥ N vueltas"), Stints, Events.
- **Qualifying** → Quali (tabla Q1/Q2/Q3 si `TimingData.SessionPart` está en los datos — si no, mejores vueltas planas), Pace, Events.
- **Race** → Pace, Positions, Stints, Events.

### 4.3 Sidebar y estados vacíos

- `Sidebar.tsx`: entrada "Archive" en la sección **General** (no en Live Timing — no
  depende de la sesión en curso).
- Estado vacío de `/archive` (sin DB o sin sesiones): explica cómo activar la grabación
  (`RECORDING_ENABLED`) y enlaza a SETUP.md.

### 4.4 Tests y aceptación

- Vitest de los builders nuevos (`QualiReport` ranking/deltas como funciones puras).
- `next build`: el chunk de `/dashboard` NO crece (comparar output antes/después).
- E2E: con la grabación del replay ingerida → `/archive` lista la sesión; el detalle
  muestra pace/stints/positions **idénticos** a la página Analysis live al final del
  replay (comparación visual + spot-check numérico).
- `/archive` funcional con `realtime` parado (solo `api` corriendo).

**Estimación:** 2–3 días.

---

## Fase 5 — Telemetría por vuelta (diferible)

### 5.1 Ingest (`archive/src/telemetry.rs`)

- `CarData.z` / `Position.z`: base64 → zlib inflate (`flate2`) → `{Entries: [{Utc, Cars}]}`
  (mismo shape que `dashboard/src/lib/inflate.ts` + `CarDataChannels`: 0=RPM, 2=speed,
  3=gear, 4=throttle, 5=brake).
- Asignación de vuelta: el `laps::Tracker` ya conoce el timestamp de cada flanco → cada
  muestra cae en la vuelta cuyo intervalo `[flanco N-1, flanco N)` la contiene.
- Resolución: completa (~4 Hz) directamente etiquetada por vuelta; con PK
  `(session, driver, ts_ms)` una carrera ≈ 20 coches × 7 200 s × 4 ≈ 570k filas ≈ 25 MB
  de DB — aceptable sin muestrear; si en la práctica crece, fallback documentado a 1 Hz.

### 5.2 API y UI

- `GET .../telemetry?driver=1&lap=23` → `{lap, samples: [{tMs /* desde inicio de vuelta */, speed, throttle, brake, gear}]}`.
- Route handler proxy en el dashboard (4.1) para fetch bajo demanda.
- Pestaña **Telemetry** en `ArchiveAnalysis`: comparador 2 pilotos × vuelta — speed trace
  superpuesto (LineChart), bandas de throttle/brake debajo, delta de tiempo acumulado
  aproximado (integración del delta de velocidad — etiquetado EST).
- **Limitación documentada en la UI**: alineación por *fracción de tiempo de vuelta*, no
  por distancia GPS (no hay vínculo posición→distancia fiable sin más trabajo). Suficiente
  para comparar trazadas de frenada/aceleración; un "distance-aligned" queda como mejora
  futura explícita.

**Estimación:** 2 días.

---

## Transversal

### Scripts y docs

- `scripts/start-all.ps1`: env `RECORDINGS_DIR` en la ventana de realtime; flag
  `-WithArchive` que lanza `archive watch` + pasa `ARCHIVE_DB` a `api`.
- `SETUP.md`: sección "Session archive" (activar, dónde se guarda, cómo re-ingerir,
  cómo re-reproducir una grabación con `simulator replay`).
- `.gitignore` raíz: `recordings/`, `archive.sqlite*`.

### Retención

- `RECORDING_RETENTION_DAYS` (default: sin límite). El `watch` purga `.data.txt.gz` más
  antiguos tras ingest correcto (`complete=1`), nunca antes. La DB no se purga (es pequeña).

### Migraciones de esquema

- `PRAGMA user_version`; `db.rs` aplica migraciones secuenciales al abrir. v1 definida en
  2.3; cualquier cambio futuro = migración nueva, nunca editar la v1.

### Matriz de validación e2e final (antes del último commit)

| Paso | Comprobación |
|---|---|
| 1. simulador full-grid → realtime graba | fichero crece, formato 3-líneas correcto |
| 2. parar realtime a mitad | fichero válido, última línea entera |
| 3. `simulator replay <grabación>` | dashboard live reproduce la grabación (timeline + marcadores OK) |
| 4. `archive ingest` | laps/stints == Analysis live (validación cruzada 2.5) |
| 5. re-ingest | DB sin cambios |
| 6. `api` + `/archive` | lista, detalle, charts; con realtime apagado |
| 7. `yarn test` + `cargo test` + lint + `next build` + `cargo build` | todo verde |

### Riesgos y mitigaciones

| Riesgo | Prob. | Mitigación |
|---|---|---|
| La captura afecta al live | baja | mpsc unbounded + task aparte; IO errors degradan a no-grabar con warn (1.2) |
| Divergencia derivación TS ↔ Rust | media | port-tests 1:1 (2.5) + validación cruzada obligatoria por fase |
| Formato del feed real difiere del sintético (topics con punto, arrays como records) | media | normalize.rs defensivo (D7) + primera grabación real se valida manualmente antes de confiar en el ingest |
| Crecimiento de disco | baja | gzip al rotar + retención opcional; estimación 20–100 MB/carrera comprimida |
| Reconexiones duplican vueltas | media | dedupe por PK natural (session, driver, lap) + ingest transaccional por sesión |
| rusqlite bloquea el runtime de api | baja | spawn_blocking + read-only + queries indexadas |
| Grabaciones de sesiones de prueba ensucian el listado | media | filtro por meeting sintético en la UI + `archive list`/`rebuild` para limpiar |

### Estimación total

| Fase | Días |
|---|---|
| F0 refactors | 0,5 |
| F1 recorder | 1–1,5 |
| F2 archive crate | 2–3 |
| F3 api | 1 |
| F4 UI | 2–3 |
| F5 telemetría | 2 (diferible) |
| **Total (sin F5)** | **6,5–9** |

### Fuera de alcance (explícito)

- Recording multi-instancia / alta disponibilidad.
- Alineación de telemetría por distancia GPS (documentada como mejora futura en F5).
- Cuentas de usuario, compartir análisis, export a CSV (candidatos a roadmap posterior).
- Backfill de sesiones históricas anteriores a la activación del recorder (no existe el
  dato; solo se archiva lo que se graba en vivo a partir de F1).
