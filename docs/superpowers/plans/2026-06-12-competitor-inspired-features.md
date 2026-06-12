# Plan — Funcionalidades inspiradas en competidores (formula-timer.com y formula1dashboard.com)

**Fecha:** 2026-06-12
**Estado:** Propuesto
**Prerrequisitos:** roadmap 2026-06-11 (analysis/alerts/replay/strategy) y session archive — ambos completados.

---

## 0. Análisis competitivo

### formula-timer.com (livetiming + replay + analytics)

Observado en su live timing y documentación pública:

| Funcionalidad | Detalle observado | ¿La tenemos? |
|---|---|---|
| **Replays históricos 2018-presente** | Selector año → GP → sesión; playback play/pause/seek/1-10x; datos completos (timing, tyres, race control, radio) "exactamente como ocurrieron" | ❌ Solo grabamos lo que capturamos en vivo |
| **Columnas personalizables** | Toggle de visibilidad + **drag & drop para reordenar** (handles ⋮⋮) + sort por columna (↕) en el leaderboard | ❌ Leaderboard fijo |
| **Potential Lap (drivers/teams)** | Vuelta teórica por suma de mejores sectores, ranking | ⚠️ Solo en archive (QualiReport), no en live |
| **Long Stints (+6 laps)** | Vista de tandas largas en libres, en vivo | ⚠️ Solo en archive (filtro min-stint) |
| **Top Speed / Best S1/S2/S3** | Rankings por piloto en sesión | ❌ |
| **Speed vs Lap Time** | Scatter velocidad punta vs tiempo de vuelta | ❌ |
| **Lap Times matrix** | Tabla vuelta × piloto con selector de pilotos (comparación lado a lado) | ❌ |
| Panel penalizaciones activas + contador track limits + standings laterales | "NO ACTIVE PENALTIES", contador por piloto | ⚠️ Parcial (TrackViolations, alerts) |
| Cuentas/premium (customize, unlimited replays, no ads) | Modelo freemium | N/A (app personal) |

### formula1dashboard.com (suite de estadísticas de temporada)

| Funcionalidad | Detalle observado | ¿La tenemos? |
|---|---|---|
| **Results** | Clasificación por GP: ganador, pole, fastest lap, gaps, puntos, DNFs | ❌ |
| **Consistency** | Posición media en carrera/sprint/quali con toggle "Exclude DNF" | ❌ |
| **Head To Head de temporada** | SPS/TMS scores, evolución del gap de puntos, h2h de quali (conteo), gap medio a la pole por equipo | ⚠️ Solo h2h live, no de temporada |
| **Race Pace (histórico por GP)** | Top 20 fastest laps, pace evolution con highlight PB/FL, position evolution, speed traps | ⚠️ Equivalente en nuestro archive |
| **Pit Stops** | Fastest stops del año, consistencia, media por GP/equipo/piloto, puntos DHL | ❌ |
| **Used Elements (PU tracker)** | Componentes de unidad de potencia usados/permitidos por piloto (X/Y) | ❌ |
| **Track DNA** | Características de circuitos, mapa de similitud, rankings por curvas/longitud | ❌ |
| Driver/Constructor standings completos | Tablas de campeonato fuera de carrera | ⚠️ Solo ChampionshipPrediction durante carrera |

### Conclusión del análisis

Nuestra ventaja: pipeline live + grabación propia + estrategia/undercut (ninguno de los dos tiene proyección de undercut). Nuestros dos huecos grandes frente a ellos:

1. **Profundidad histórica** — ellos cubren 2018-presente; nosotros solo lo que grabamos desde ayer. La fuente es pública: el archivo estático oficial de live timing de F1.
2. **Personalización del leaderboard** — su tabla es configurable; la nuestra es fija.

Y un tercer eje de menor esfuerzo: **widgets de análisis de sesión** (potential lap, top speed, scatter) que ya casi tenemos por la infraestructura de `lapHistory`.

---

## Selección (4 features, por impacto/esfuerzo)

| # | Feature | Impacto | Esfuerzo | Por qué |
|---|---|---|---|---|
| F1 | **Backfill histórico desde el archivo oficial de F1** (2018-presente) | ★★★★★ | Medio | Multiplica el valor del archive ya construido: cualquier sesión de la historia reciente, replayable e ingerible, sin haberla grabado |
| F2 | **Leaderboard con columnas personalizables** (toggle + orden + persistencia) | ★★★★ | Medio | La feature de UX más visible de formula-timer; mejora el uso diario en cualquier sesión |
| F3 | **Session Insights: potential lap, long stints live, top speed, best sectors, speed vs lap time** | ★★★★ | Bajo | Reutiliza `lapHistory`/`LineChart`; cierra el gap de analytics de sesión en vivo |
| F4 | **Estadísticas de temporada sobre el archive** (results, consistency, season head-to-head, pit stops) | ★★★ | Medio-alto | Convierte el archive acumulado en una suite tipo formula1dashboard; crece sola con cada sesión grabada/backfilleada |

Descartadas y por qué: *Used Elements* (requiere datos FIA mantenidos a mano), *Track DNA* (dataset estático curado, valor bajo para uso personal), *Tech Updates* (editorial), *cuentas/premium* (no aplica), *standings completos fuera de sesión* (cubierto parcialmente por F4 vía resultados acumulados; standings oficiales exactos necesitarían una API externa tipo jolpica — anotado como extensión opcional de F4).

Orden recomendado: **F1 → F3 → F2 → F4** (F1 alimenta de datos históricos a F3/F4; F2 es independiente).

---

## F1 — Backfill histórico desde el archivo oficial de F1

### Objetivo

`archive backfill 2024 "Monaco"` descarga la sesión del archivo estático oficial, la convierte a nuestro formato de grabación (replay-compatible) y la ingiere. Resultado: aparece en `/archive` y es reproducible con `simulator replay`.

### Fuente de datos (conocida y pública)

El live timing oficial publica tras cada sesión un archivo estático:

```
https://livetiming.formula1.com/static/<año>/Index.json                  → meetings del año
https://livetiming.formula1.com/static/<SessionPath>Index.json           → streams disponibles
https://livetiming.formula1.com/static/<SessionPath><Stream>.jsonl       → p.ej. TimingData.jsonl
```

- `SessionPath` es **exactamente** el `SessionInfo.Path` que ya usamos como clave en `sessions.path`.
- Cada `.jsonl` de stream lleva líneas `<offset-relativo><json>` donde el offset es `HH:MM:SS.mmm` desde el inicio de sesión — equivalente al timestamp del feed que ya preservamos.
- Los streams comprimidos (`CarData.z.jsonl`, `Position.z.jsonl`) usan el mismo zlib+base64 que ya decodificamos en `archive/src/telemetry.rs`.

### Diseño

#### 1.1 Módulo `archive/src/backfill.rs`

```rust
pub async fn list_meetings(year: u16) -> Result<Vec<Meeting>>;          // Index.json del año
pub async fn list_sessions(meeting: &Meeting) -> Result<Vec<SessionRef>>;
pub async fn download_session(session: &SessionRef, out_dir: &Path) -> Result<PathBuf>;
```

`download_session`:
1. Baja `Index.json` de la sesión → lista de streams (`Feeds`).
2. Baja los streams que coinciden con nuestros 17 TOPICS (los demás se ignoran).
3. **Fusión multi-stream ordenada por offset**: merge-sort de todas las líneas de todos los
   streams por su offset temporal → secuencia única de updates, igual que llegarían en vivo.
4. Escribe el fichero en nuestro formato (`{}` + type3 con snapshot inicial + type1 feed):
   - El snapshot inicial se construye aplicando la primera línea de cada stream con
     `shared::merge` (el archivo estático no trae snapshot; la primera línea de cada stream
     es el estado completo de ese topic).
   - El offset relativo se convierte a UTC absoluto usando `SessionInfo.StartDate` +
     `GmtOffset` (ambos en el stream `SessionInfo`).
5. Devuelve la ruta; el llamador encadena `ingest_file` (reutilizado tal cual).

#### 1.2 CLI y deps

- `archive backfill <año> [filtro-gp] [--session race|qualifying|practice]`
  → lista interactivamente si hay ambigüedad; `--all` para el año entero.
- Dependencia nueva en `archive`: `reqwest` (ya está en el workspace vía `api`).
- Rate limiting: descarga secuencial con pausa de 500 ms entre streams (cortesía; el
  archivo es estático y cacheado, pero no martillear).
- Los ficheros van a `RECORDINGS_DIR/<año>/...` con un marcador `source=backfill` en
  `sessions.source_file` (la ruta ya lo revela; añadir columna no hace falta).

#### 1.3 UI

- En `/archive` (page.tsx): si la lista está vacía o como acción secundaria, bloque
  "Backfill historical sessions" con las instrucciones del comando (no UI de descarga en
  v1 — es una operación de consola, igual que ingest).
- Extensión opcional v2 (fuera de alcance): endpoint POST en `api` que lance el backfill.

### Casos borde

- Sesiones antiguas (2018-2019) con topics ausentes (sin `ChampionshipPrediction`, etc.) →
  el merge-sort simplemente no los incluye; el ingest ya tolera topics faltantes.
- Offsets duplicados entre streams → orden estable por (offset, nombre de stream).
- Red caída a mitad → fichero parcial detectable (sin SessionStatus final) → `complete=0`;
  re-ejecutar el backfill sobreescribe el fichero y el re-ingest es idempotente.
- Sesiones canceladas/sin datos → Index sin streams → error claro "no data published".

### Tests y aceptación

- Unit: parser de líneas offset+json (fixtures cortos versionados, ~20 líneas de un stream
  real); conversión offset→UTC con GmtOffset positivo y negativo; merge-sort multi-stream.
- Integración (manual, documentada): `archive backfill 2024 Monza --session race` →
  ingest OK → `/archive` muestra la sesión con laps/stints/telemetría coherentes →
  `simulator replay` del fichero reproduce la sesión en el dashboard live.
- Criterio estrella: los tiempos de vuelta del ganador coinciden con los oficiales.

**Estimación:** 2–3 días.

---

## F2 — Leaderboard con columnas personalizables

### Objetivo

Como formula-timer: elegir qué columnas ver, en qué orden, y persistirlo. Sin sort en v1
(el orden por posición es sagrado en un leaderboard live; su "sort" aporta poco y rompe la
lectura de carrera).

### Diseño

#### 2.1 Modelo de columnas

Inventario actual de `components/dashboard/LeaderBoard.tsx` + `driver/Driver.tsx` (cada
celda ya es un componente: `DriverTag`, `DriverGap`, `DriverTire`, `DriverLapTime`,
`DriverMiniSectors`, `DriverCarMetrics`...). Formalizar:

```ts
// dashboard/src/lib/leaderboardColumns.ts
export const LEADERBOARD_COLUMNS = [
  { id: "position",     label: "Pos",          required: true },
  { id: "driver",       label: "Driver",       required: true },
  { id: "tire",         label: "Tyre" },
  { id: "info",         label: "Status" },          // +1/-1, pit, out...
  { id: "gap",          label: "Gap/Interval" },
  { id: "lapTime",      label: "Last/Best Lap" },
  { id: "sectors",      label: "Sectors" },
  { id: "miniSectors",  label: "Mini sectors" },    // ya existe toggle showMiniSectors
  { id: "carMetrics",   label: "RPM/Gear/Speed" },  // ya existe toggle carMetrics
] as const;
```

#### 2.2 Estado y persistencia

- `useSettingsStore` (ya persiste): `leaderboardColumns: { order: ColumnId[]; hidden: ColumnId[] }`.
- Migrar los toggles existentes (`showMiniSectors`, `carMetrics`, `showBestSectors`) a este
  modelo manteniendo compatibilidad: en el `merge` de rehidratación, si no existe
  `leaderboardColumns`, derivarlo de los toggles antiguos.

#### 2.3 UI de configuración

- Icono ⚙ en la cabecera del panel "Live Classification" → popover (Headless UI ya es
  dependencia) con la lista de columnas: checkbox de visibilidad + reordenación.
- Reordenación: botones ↑/↓ en v1 (drag & drop con `motion/react` Reorder como mejora
  opcional v2 — `motion` ya es dependencia, `Reorder.Group` lo da casi gratis).
- `LeaderBoard`/`Driver.tsx` renderizan iterando `order` filtrado por `hidden`, con el
  grid-template generado dinámicamente (hoy es una plantilla fija de Tailwind → pasar a
  `style={{ gridTemplateColumns }}` calculado).

### Casos borde

- Pantallas estrechas: el orden custom aplica igual; el scroll horizontal existente se
  mantiene. `required: true` impide ocultar posición/piloto.
- Presentation mode y la página `driver/[nr]` no se ven afectados (usan sus propios layouts).

### Tests y aceptación

- Vitest del derivador de configuración (migración de toggles antiguos, orden estable,
  required no ocultable).
- E2E con replay: ocultar mini sectors + mover Tyre delante de Gap → recargar → persiste.

**Estimación:** 1,5–2 días.

---

## F3 — Session Insights (analytics de sesión en vivo)

### Objetivo

Pestañas/widgets nuevos en `/dashboard/analysis` (live) replicando los análisis de sesión
de formula-timer: potential lap, long stints, top speed, best sectors y scatter
speed vs lap time. Todo client-side sobre datos que ya tenemos.

### Diseño

#### 3.1 Datos — ampliar `LapRecord` con velocidad punta

- `lib/lapHistory.ts`: añadir `speedTrapKph: number | null` al `LapRecord`, leído de
  `TimingData.Lines[nr].Speeds.ST/FL/I1/I2` en el flanco (mejor de la vuelta; `ST` =
  speed trap principal). Cambio retrocompatible (campo nuevo opcional).
- Espejo en Rust (`archive/src/laps.rs` + columna `speed_trap_kph` en `laps`, migración
  `user_version=2`) para que F4 y el archive lo tengan también.

#### 3.2 Builders puros — `lib/sessionInsights.ts`

```ts
export function buildPotentialLaps(laps: LapsByDriver, drivers): PotentialLapRow[];
// bestLapMs, theoreticalMs (suma de mejores sectores), delta, gapToBestTheoretical
// — generalización del buildQualiRanking existente en QualiReport: extraer y compartir.

export function buildLongStints(laps, stints, minLaps = 6): LongStintRow[];
// por stint ≥ minLaps: compound, laps, avg clean, deg (ya viene de buildStints), best

export function buildTopSpeeds(laps, drivers): TopSpeedRow[];          // max speedTrap por piloto
export function buildBestSectors(laps, drivers, sector: 0|1|2): SectorRow[];
export function buildSpeedVsLapTime(laps, selected): ScatterSeries[]; // x=lapTimeMs, y=speedTrap
```

#### 3.3 UI

- `/dashboard/analysis` gana dos pestañas:
  - **Insights**: grid con 4 tarjetas — Potential Lap (tabla top 10 con delta entre real y
    teórica), Top Speed (ranking con barra), Best Sectors (3 mini-tablas), Long Stints
    (tabla con deg coloreada, enlaza a la pestaña Stints).
  - **Scatter**: Speed vs Lap Time con `LineChart`... no — necesita modo scatter: añadir
    `variant: "line" | "scatter"` a `LineChart` (render de circles en vez de polyline;
    ~30 líneas, reutiliza ejes/tooltip/grid existentes).
- `/archive/[sessionId]` (`ArchiveAnalysis.tsx`) gana la misma pestaña **Insights**
  reutilizando los builders (los datos del API ya tienen el mismo shape; `speedTrapKph`
  llega con la migración de 3.1).
- `QualiReport` pasa a consumir `buildPotentialLaps` (elimina su duplicado interno).

### Tests y aceptación

- Vitest por builder (fixtures de `LapRecord[]`): teórica < real siempre; long stints
  respeta el umbral; scatter ignora vueltas sin speed trap.
- E2E con replay full-grid: pestaña Insights poblada en vivo; misma pestaña en el archive
  tras ingest muestra los mismos números (validación cruzada habitual).

**Estimación:** 1,5–2 días (+0,5 si la migración v2 de SQLite se hace aquí).

---

## F4 — Estadísticas de temporada sobre el archive

### Objetivo

Sección `/archive/season/<año>` tipo formula1dashboard: agregados cross-sesión calculados
desde `archive.sqlite`. Crece sola con cada sesión grabada o backfilleada (F1).

### Diseño

#### 4.1 Endpoints nuevos en `api` (`endpoints/archive.rs`)

| Endpoint | Contenido | SQL base |
|---|---|---|
| `GET /api/archive/seasons/:year/results` | por GP: ganador, podio, fastest lap, gaps | `laps`+`sessions` (kind=Race): última vuelta por piloto → orden final; `MIN(lap_time_ms)` → FL |
| `GET /api/archive/seasons/:year/consistency` | posición media quali/carrera por piloto, toggle DNF | posición final por sesión; DNF = piloto cuyo `MAX(lap)` < `MAX(lap)` global - 2 |
| `GET /api/archive/seasons/:year/head-to-head?a=&b=` | quali h2h (conteo), gap medio de quali, delta de pace medio por GP | best lap por sesión y piloto |
| `GET /api/archive/seasons/:year/pitstops` | paradas más rápidas (pérdida estimada), media por equipo | vueltas `pitted`: in+out sobre baseline (mismo método que `estimatePitLoss`) |
| `GET /api/archive/seasons/:year/fastest-laps` | top N vueltas del año | `MIN(lap_time_ms)` global |

Notas de honestidad de datos (mostrar en UI):
- La "posición final" derivada del timing puede divergir de la clasificación oficial
  (penalizaciones post-carrera). Badge "derived from timing data".
- Pit stop time = pérdida total en pit lane estimada, NO el tiempo de parada DHL (2.0s).
  Etiquetar "pit lane loss (EST)". Es comparable entre equipos, que es lo que importa.
- Cobertura parcial: si solo hay 5 carreras archivadas, los agregados son de esas 5.
  Cada página muestra "based on N archived sessions" con enlace al backfill (F1).

#### 4.2 UI

```
dashboard/src/app/archive/season/[year]/page.tsx    # server component, tabs
dashboard/src/components/archive/season/
├── SeasonResults.tsx        # tabla por GP (ganador/podio/FL) + enlaces a /archive/<id>
├── SeasonConsistency.tsx    # barras de posición media, toggle Exclude DNF
├── SeasonHeadToHead.tsx     # selector 2 pilotos: h2h quali, gaps medios, sparkline por GP
└── SeasonPitStops.tsx       # ranking pérdidas de pit + media por equipo
```

- Entrada en `/archive`: cabecera por año con enlace "Season stats →".
- Todo server-rendered (mismo patrón fetch `API_URL` que el resto del archive).

#### 4.3 Extensión opcional (no incluida): standings oficiales

Para puntos de campeonato exactos (con sprints/penalizaciones) haría falta la API
jolpica-f1 (sucesora de Ergast). Se deja documentado como mejora separada para no acoplar
esta fase a un servicio externo.

### Tests y aceptación

- Las queries de agregación como funciones probadas en `cargo test` contra una DB fixture
  con 2 carreras sintéticas (una con DNF, una con pit stops conocidos).
- E2E: backfillear 2-3 GPs reales (F1) → `/archive/season/2024` muestra resultados que
  cuadran con los oficiales (spot-check del podio).

**Estimación:** 3–4 días.

---

## Transversal

### Secuencia y entregas

```
F1 backfill (2-3d) → F3 insights (1,5-2d) → F2 columnas (1,5-2d) → F4 season stats (3-4d)
Total: 8-11 días. Cada fase: tests + lint + build + validación e2e + commit propio.
```

### Riesgos

| Riesgo | Mitigación |
|---|---|
| El formato del archivo estático oficial varía entre años (2018 vs 2026) | Parser defensivo + probar un GP de 2018, 2021 y 2024 antes de dar F1 por cerrada; streams desconocidos se ignoran |
| Bloqueos/ratelimit del CDN oficial | Descarga secuencial + pausas; reintentos con backoff; es contenido estático cacheado |
| Migración SQLite v2 (`speed_trap_kph`) sobre DBs existentes | Migración aditiva `ALTER TABLE laps ADD COLUMN`; `user_version` ya implementado |
| El grid dinámico del leaderboard rompe el layout en móvil | Probar con preset mobile del preview; el scroll-x existente es la red de seguridad |
| Posiciones derivadas ≠ oficiales en season stats | Badges "derived/EST" sistemáticos (mismo criterio que Strategy) |

### Fuera de alcance (explícito)

- Cuentas de usuario, premium, ads (no aplica a una app personal).
- Used Elements / Track DNA / contenido editorial.
- Standings oficiales vía jolpica (documentado como extensión de F4).
- Drag & drop táctil del leaderboard (v1 con ↑/↓; Reorder de motion como v2).
