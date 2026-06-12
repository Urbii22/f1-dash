# Plan — Inteligencia del fin de semana en vivo ("Weekend Intelligence")

**Fecha:** 2026-06-12
**Estado:** Propuesto
**Reemplaza la dirección de:** `2026-06-12-competitor-inspired-features.md` (se descartan
backfill histórico, replays antiguos y estadísticas de temporada cross-GP).
**Prerrequisitos:** roadmap 2026-06-11 (analysis/alerts/replay/strategy) + session archive — completados.

---

## 0. Reenfoque

Decisión del usuario: **no interesan los datos históricos** (resultados de temporadas
pasadas, replays antiguos, backfill). El interés está en **estadísticas live de cada GP:
tener toda la información de ESE fin de semana mientras ocurre**.

Eso convierte el objetivo en: durante un fin de semana de carrera, capturar y mostrar en
profundidad cada sesión (FP1 → FP2 → FP3 → Quali → Carrera) según pasa, y reunir todo lo
del mismo GP en un sitio. Reutiliza al 100% lo ya construido (`lapHistory`, `archive`,
charts) sin ninguna fuente de datos externa: lo del finde sale del feed live + del archive
que ya graba cada sesión + del schedule que ya tenemos.

### Lo que SÍ aprovechamos del análisis competitivo

De formula-timer (analytics de sesión, lo que el usuario quiere): potential lap, long
stints en vivo, top speed, best sectors, speed vs lap time, evolución de pista. Todo
**acotado al finde en curso**, no a la historia.

### Tres piezas, por prioridad

| # | Pieza | Prioridad | Esfuerzo | Qué aporta |
|---|---|---|---|---|
| F1 | **Session Insights en vivo** | ★★★★★ (núcleo) | Bajo-medio | Análisis profundo de la sesión actual en tiempo real |
| F2 | **Weekend Hub** | ★★★★ | Medio | Reúne todas las sesiones del GP en curso + comparativas entre ellas |
| F3 | **Leaderboard personalizable** | ★★★ (opcional) | Medio | UX del leaderboard live (independiente) |

Orden: **F1 → F2 → F3**. F1 produce los builders que F2 reutiliza. F3 es independiente y
puede ir cuando quieras.

---

## F1 — Session Insights en vivo

### Objetivo

Pestañas nuevas en `/dashboard/analysis` con el análisis profundo de la sesión actual,
actualizándose en vivo: vuelta potencial, tandas largas, top speed, mejores sectores,
scatter velocidad-vs-tiempo y, para quali, deltas y evolución de pista. Las mismas vistas
quedan disponibles para sesiones del archive (mismos builders).

### Fuentes de datos (todas ya en el estado live, verificadas)

| Widget | Fuente | ¿Necesita historial? |
|---|---|---|
| Potential lap (teórica vs real) | `TimingStats.Lines[nr].BestSectors[0..2]` + `PersonalBestLapTime` | No — directo |
| Top speed ranking | `TimingStats.Lines[nr].BestSpeeds.St.Value` (speed trap) | No — directo |
| Best sectors S1/S2/S3 | `TimingStats.Lines[nr].BestSectors[i]` (Value + Position) | No — directo |
| Long stints (+N laps) | `useLapHistoryStore.stints` (ya calculado) | Sí — ya lo tenemos |
| Speed vs lap time (scatter) | tiempo de vuelta + speed trap **por vuelta** | Sí — requiere capturar speedTrap en LapRecord |
| Quali deltas / track evolution | best laps por vuelta (`lapHistory`) + posiciones | Sí — ya lo tenemos |

Conclusión: la mayoría es directa del estado (barato). El único cambio de captura es añadir
`speedTrapKph` al `LapRecord` para el scatter y la evolución de top speed.

### Diseño

#### 1.1 Captura de speed trap por vuelta — `lib/lapHistory.ts`

- Añadir `speedTrapKph: number | null` a `LapRecord` (campo nuevo opcional → retrocompatible
  con datos persistidos y con el detector existente).
- En `detectCompletedLaps`, en el flanco de vuelta, leer
  `parseInt(line.Speeds?.St?.Value)` (km/h, entero). `null` si ausente o 0.
- Espejo en Rust para que el archive lo tenga también:
  - `archive/src/laps.rs`: campo `speed_trap_kph` + lectura de `Speeds/St/Value`.
  - `archive/src/db.rs`: columna `speed_trap_kph INTEGER` en `laps`, migración
    `user_version = 2` (aditiva: `ALTER TABLE laps ADD COLUMN`).
  - `api/src/endpoints/archive.rs`: incluir `speedTrapKph` en la respuesta de `/laps`.
  - `dashboard/src/types/archive.type.ts` y los builders quedan alineados solos (mismo shape).

#### 1.2 Builders puros — `lib/sessionInsights.ts`

```ts
// Potential lap desde el estado (no historial): mejor sector por sector + suma teórica
export function buildPotentialLaps(
  stats: TimingStats["Lines"] | undefined,
  drivers: AnalysisDrivers,
): PotentialLapRow[];   // { nr, label, bestMs, theoreticalMs, deltaMs, gapToBestTheoreticalMs }

export function buildTopSpeeds(
  stats: TimingStats["Lines"] | undefined,
  drivers: AnalysisDrivers,
): TopSpeedRow[];        // { nr, label, kph } ordenado desc, con barra relativa al máximo

export function buildBestSectors(
  stats: TimingStats["Lines"] | undefined,
  drivers: AnalysisDrivers,
): { sector: 0|1|2; rows: SectorRow[] }[];   // ranking por sector con delta al mejor

export function buildLongStints(
  stints: StintsByDriver, laps: LapsByDriver, drivers: AnalysisDrivers, minLaps = 6,
): LongStintRow[];      // { nr, label, compound, laps, avgMs, bestMs, degMsPerLap }

export function buildSpeedVsLapTime(
  laps: LapsByDriver, selected: string[], drivers: AnalysisDrivers,
): ScatterSeries[];     // puntos { x: lapTimeMs, y: speedTrapKph } por piloto, ignora vueltas sin trap
```

- `QualiReport.buildQualiRanking` (en `components/archive/QualiReport.tsx`) se generaliza y
  se mueve aquí como `buildPotentialLaps` variante histórica; el QualiReport pasa a
  consumirlo (elimina duplicación).

#### 1.3 Modo scatter en `LineChart`

- Añadir prop `variant?: "line" | "scatter"` a `components/analysis/LineChart.tsx`.
- `scatter` renderiza `<circle>` por punto en vez de `<polyline>`; ejes, grid, tooltip y
  escalado se reutilizan tal cual. ~30 líneas. (El eje X deja de asumir orden temporal:
  para scatter, dominio = min/max de `x`.)

#### 1.4 UI — `/dashboard/analysis`

Añadir pestañas al `TABS` existente (`pace | positions | stints | strategy`):

- **`insights`** (tarjetas en grid, todas en vivo):
  - *Potential Lap*: tabla top-10, real vs teórica vs delta, ordenable por teórica.
  - *Top Speed*: ranking con barra horizontal (km/h en el speed trap).
  - *Best Sectors*: 3 mini-tablas (S1/S2/S3) con quién manda y delta.
  - *Long Stints*: tabla de tandas ≥ N (selector N), deg coloreada, enlaza a Stints.
- **`speed`**: scatter Speed vs Lap Time con `DriverToggles` (reutiliza selección).
- **`quali`** (solo si `SessionInfo.Type` ∈ {Qualifying, Sprint Qualifying} — si no, oculta):
  vuelta potencial + gap a la pole provisional + evolución del best lap por piloto
  (line chart de best-lap-hasta-la-vuelta-N, muestra la mejora de pista).

Las pestañas se muestran/ocultan según tipo de sesión (un practice no tiene `quali`; una
carrera prioriza pace/positions). Reutiliza el patrón de tabs ya presente.

#### 1.5 Reutilización en archive

`/archive/[sessionId]` (`ArchiveAnalysis.tsx`) gana las mismas pestañas Insights/Speed
alimentadas por los datos del API (que ya traen `speedTrapKph` tras 1.1). Cero lógica nueva.

### Tests y aceptación

- Vitest por builder (fixtures `TimingStats`/`LapRecord[]`): teórica ≤ real siempre;
  top speed ordenado; long stints respeta umbral; scatter descarta vueltas sin trap.
- Rust: test del campo `speed_trap_kph` en `laps.rs` + migración idempotente.
- E2E con replay full-grid: pestaña Insights poblada en vivo; misma pestaña en archive tras
  ingest con los mismos números (validación cruzada).

**Estimación:** 2 días.

---

## F2 — Weekend Hub

### Objetivo

Una vista `/dashboard/weekend` que reúne **todo el GP en curso**: el calendario del finde
con el estado de cada sesión, las sesiones ya disputadas (desde el archive que las grabó),
la sesión en directo, y comparativas entre las sesiones del mismo finde (evolución de pace
FP1→FP2→FP3, quali-sim de libres vs quali real, lo mejor del finde).

Combina tres fuentes que ya existen, sin nada externo:
- **schedule** (`api /api/schedule`) → qué sesiones tiene el finde y cuándo.
- **archive** (`archive.sqlite`) → las sesiones del finde ya completadas y grabadas.
- **live** (estado actual) → la sesión en curso.

### Diseño

#### 2.1 Identificar el "finde actual"

- Del estado live: `SessionInfo.Meeting.Name` + año (de `SessionInfo.Path`, primer
  segmento). Define el meeting actual.
- Si no hay sesión live (entre sesiones del finde): usar el schedule para encontrar el
  meeting cuya ventana de fechas contiene "ahora" (ya tenemos `lib/nextSession.ts` y
  `groupSessionByDay.ts` para esto).

#### 2.2 Backend — filtro por meeting en el archive

- `api/src/endpoints/archive.rs`: añadir `meeting: Option<String>` a `SessionFilters`
  (`... AND meeting=?`). Trivial (el patrón de filtros ya existe).
- Nuevo endpoint de conveniencia `GET /api/archive/weekend?year=&meeting=` que devuelve, en
  una sola llamada: las sesiones de ese meeting + un resumen agregado (best lap, best
  speed trap y best sector del finde, con qué piloto y en qué sesión). Una query por tabla
  con `JOIN sessions` filtrando `year+meeting`. Evita N+1 desde el front.

#### 2.3 UI — `dashboard/src/app/dashboard/weekend/`

```
page.tsx                       # client: orquesta schedule + archive(weekend) + live store
components/weekend/
├── WeekendTimeline.tsx        # las sesiones del finde como fila de tarjetas con estado:
│                              #   done (✓, enlaza a /archive/<id>) · live (● en curso) · upcoming (countdown)
├── WeekendBests.tsx           # "Lo mejor del finde": best lap / best speed trap / best por sector,
│                              #   con piloto + sesión donde se logró (incluye la sesión live en curso)
├── SessionProgression.tsx     # comparativa cross-sesión: para un piloto, su mejor vuelta y
│                              #   top speed en cada sesión del finde (FP1→FP2→FP3→Q→R) — barras/línea
└── QualiSimVsQuali.tsx        # si hay libres + quali en el archive: mejor quali-sim de libres
                               #   (mejor vuelta limpia con poco combustible ~ stints cortos) vs quali real
```

- **WeekendTimeline**: la pieza de orientación. Para cada sesión del schedule del meeting:
  - completada y en archive → tarjeta con resultado breve (pole/ganador o best lap) + link.
  - en curso (coincide con la sesión live) → indicador "LIVE" + link al dashboard.
  - futura → countdown (reutiliza `useCountdown`/`useNextSession`).
- **WeekendBests** mezcla archive (sesiones pasadas) + live (sesión actual vía
  `useLapHistoryStore` + `TimingStats`) para que "lo mejor del finde" incluya lo que está
  pasando ahora mismo.
- **SessionProgression** es la respuesta a "evolución del finde": un piloto, una métrica
  (best lap o top speed), un punto por sesión. Muestra cómo mejora el coche/pista a lo
  largo del finde.

#### 2.4 Entrada

- `Sidebar.tsx`: entrada "Weekend" en Live Timing (es contexto de la sesión en curso).
- Enlace recíproco: desde `/dashboard/analysis` un "← Weekend overview".

### Casos borde

- **Primer GP que usas la app**: el archive no tendrá FP1/FP2 si la app no estuvo
  grabando. El Hub lo refleja honestamente: tarjetas "not recorded" para sesiones pasadas
  sin datos. El caso ideal (dejar la app corriendo todo el finde) acumula todo solo.
- **Sin conexión live y sin archive del finde**: muestra solo el calendario (schedule).
- **Nombres de meeting**: el archive guarda `meeting` (nombre) y el schedule también →
  emparejar por nombre normalizado + año. Documentar el supuesto.

### Tests y aceptación

- Rust: test del endpoint `/weekend` contra DB fixture con 2 sesiones del mismo meeting
  (FP1 + Quali) → agregados correctos.
- Vitest: emparejado schedule↔archive por meeting; cálculo de "best of weekend" mezclando
  fuentes; clasificación de estado de sesión (done/live/upcoming).
- E2E: grabar FP-sim + Quali-sim del mismo meeting sintético → `/dashboard/weekend`
  muestra ambas en la timeline, el "best of weekend" cuadra, y la progresión dibuja 2 puntos.

**Estimación:** 3 días.

---

## F3 — Leaderboard personalizable (opcional)

### Objetivo

Como formula-timer: elegir qué columnas ver en el leaderboard live y en qué orden, con
persistencia. Sin sort por columna en v1 (el orden por posición es la esencia de un
leaderboard de carrera).

### Diseño

- `lib/leaderboardColumns.ts`: inventario de columnas (`position`/`driver` required;
  `tire`, `info`, `gap`, `lapTime`, `sectors`, `miniSectors`, `carMetrics`).
- Persistencia en `useSettingsStore` (`leaderboardColumns: { order, hidden }`), migrando los
  toggles actuales (`showMiniSectors`, `carMetrics`, `showBestSectors`) en la rehidratación.
- Popover ⚙ en la cabecera de "Live Classification" (Headless UI ya es dependencia):
  checkboxes de visibilidad + reordenación con ↑/↓ (drag & drop con `motion` Reorder como
  mejora v2).
- `LeaderBoard`/`Driver.tsx` iteran `order` filtrado por `hidden`; el `grid-template-columns`
  pasa de plantilla fija a `style` calculado.

### Tests y aceptación

- Vitest del derivador de config (migración de toggles, required no ocultable, orden estable).
- E2E: ocultar mini sectors + mover Tyre antes de Gap → recargar → persiste.

**Estimación:** 1,5–2 días.

---

## Transversal

### Secuencia

```
F1 Session Insights (2d) → F2 Weekend Hub (3d) → F3 Leaderboard custom (1,5-2d, opcional)
Total con F3: 6,5–7 días · sin F3: 5 días.
```
Cada fase: tests + lint + build + validación e2e con replay + commit propio (`feat: ...`).

### Riesgos

| Riesgo | Mitigación |
|---|---|
| Migración SQLite v2 (`speed_trap_kph`) sobre DBs existentes | aditiva (`ALTER TABLE`); `user_version` ya implementado; re-`rebuild` repuebla |
| Emparejar schedule↔archive por nombre de meeting falla por variantes | normalizar (lower, sin guiones) + año; fallback: agrupar archive por su propio `meeting` |
| Hub vacío en el primer finde sin grabaciones previas | estados "not recorded"/"upcoming" explícitos; el calendario (schedule) siempre se muestra |
| Scatter/insights recargan mucho en vivo | builders memoizados por estado; los rankings instantáneos son O(pilotos), triviales |
| Speed trap ausente en algunas sesiones/años | `null` tolerado en todos los builders; el widget muestra "—" |

### Fuera de alcance (explícito)

- Todo lo histórico: backfill, replays de temporadas pasadas, stats de temporada cross-GP.
- Standings oficiales de campeonato (ya hay `ChampionshipPrediction` en carrera).
- Sort por columna del leaderboard (v1 conserva orden por posición).
- Mini-sector heatmap agregado (candidato a v2 de F1 si interesa).

### Encaje con lo existente

- `/dashboard/analysis` gana pestañas (no se reescribe).
- `/dashboard/weekend` es ruta nueva dentro del layout live (usa el socket/estado ya montado).
- El archive no cambia de propósito: sigue grabando cada sesión; el Hub simplemente lo lee
  acotado al meeting en curso. Si más adelante quisieras lo histórico, el archive ya está
  ahí — pero no es objetivo ahora.
