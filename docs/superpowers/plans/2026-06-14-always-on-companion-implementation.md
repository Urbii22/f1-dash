# Plan — Compañero "siempre útil" (Weekend Hub v2 + datos de temporada)

**Fecha:** 2026-06-14
**Estado:** Propuesto
**Reemplaza la dirección de:** `2026-06-12-live-weekend-intelligence-implementation.md` (F2 Weekend Hub).
**Revierte una decisión previa:** Weekend Intelligence descartó a propósito lo histórico
y de temporada. Este plan lo recupera: es justo lo que llena el tiempo sin sesión.
**Prerrequisitos:** F1 Session Insights (completado 2026-06-14). F2/F3 del plan anterior
se reabsorben aquí.

---

## 0. Reenfoque

**Problema (del usuario):** la app está muy centrada en cuando hay sesión en directo, pero
la mayor parte del tiempo no hay ninguna. Entre eventos la app se queda casi vacía.

**Diagnóstico (verificado en código):**

| Dato | Fuente hoy | ¿Sin sesión? |
|---|---|---|
| Calendario | `api` feed iCal (`schedule.rs`) | ✅ |
| Sesiones grabadas | archive local | ⚠️ solo lo grabado |
| Standings mundial | `ChampionshipPrediction` (estado **live**) | ❌ solo en carrera |
| Resultados pasados | — | ❌ |
| Stats de temporada | — | ❌ |

`dashboard/src/app/dashboard/standings/page.tsx` lo dice literalmente: *"only available
during a race"*.

**Decisión del usuario:** introducir **Jolpica/Ergast** como fuente externa y construir 4
capacidades para el estado "sin directo":
1. Standings siempre visibles (pilotos + constructores).
2. Explorador de resultados de carreras pasadas.
3. **Weekend Hub como home** útil (próximo GP, calendario, último resultado, lo grabado).
4. Perfiles y head-to-head de temporada.

**Fuente de datos: Jolpica-F1** (`https://api.jolpi.ca/ergast/f1`), sucesora mantenida de
Ergast. Verificado en vivo (2026-06-14): devuelve el sobre clásico `MRData` con
`StandingsTable`/`RaceTable`, temporada actual e históricos, con paginación. Tiene rate
limits (≈4 req/s ráfaga, ~500/h sostenido sin auth) → **proxy + caché en el `api`**.

---

## A. Backbone de datos (habilita todo lo demás)

### A.1 Proxy con caché en el `api` Rust — `api/src/endpoints/f1data.rs`

Reutiliza el patrón ya presente en `schedule.rs`: `reqwest` + `#[io_cached(disk=true)]`
(ambas ya son dependencias del crate). Un fetch genérico cacheado + handlers tipados que
**normalizan** `MRData` a shapes camelCase limpios (el front no toca rarezas de Ergast).

```
async fn jolpi(path: &str) -> anyhow::Result<serde_json::Value>   // GET base+path, json
#[io_cached(disk, ttl) ] async fn cached_jolpi(key: String) -> Value
```

TTL por tipo:
- Temporada en curso (standings, último resultado): **TTL corto** (p.ej. 30–60 min).
- Histórico (temporadas cerradas, resultados de rondas pasadas): **TTL largo** (p.ej. 30 d).
  Se distingue por si `season < año_actual` o la ronda ya terminó.

Endpoints expuestos (montados en `api/src/main.rs`):

| Ruta | Jolpica origen | Normaliza a |
|---|---|---|
| `GET /api/f1/standings/drivers?season=` | `/{season}/driverStandings` | `DriverStandingRow[]` |
| `GET /api/f1/standings/constructors?season=` | `/{season}/constructorStandings` | `ConstructorStandingRow[]` |
| `GET /api/f1/season?season=` | `/{season}` | `SeasonRound[]` (con flags) |
| `GET /api/f1/results?season=&round=` | `/{season}/{round}/results` | `RaceResult` |
| `GET /api/f1/qualifying?season=&round=` | `/{season}/{round}/qualifying` | `QualiResult` |
| `GET /api/f1/driver/{driverId}?season=` | `/{season}/drivers/{id}/results` | `DriverSeason` |

`season` por defecto = año actual (de `chrono::Utc::now().year()`), con override por query
para históricos. Errores de Jolpica → 502 con cuerpo `{error}`; caché evita martillear.

**Tests (Rust):** normalizadores puros sobre fixtures `MRData` (standings, results,
qualifying). Cero llamadas de red en test (fixtures JSON embebidos).

### A.2 Cliente en el dashboard — `lib/f1data.ts`

- Tipos espejo de los shapes normalizados (`DriverStandingRow`, `RaceResult`, …).
- Helpers de fetch **server-side** (estos datos son estáticos-ish → server components y
  route handlers, no stores client). Se llama al `api` vía `API_URL` (igual que schedule/
  archive ya hacen server-side), sin CORS.
- `lib/f1data.test.ts`: helpers de derivación (p.ej. líder del mundial, gap a líder,
  emparejar ronda↔resultado) sobre fixtures.

---

## B. Standings siempre visibles

`/dashboard/standings` deja de depender del estado live.

- Server component que pide `/api/f1/standings/drivers` y `/constructors` (temporada actual)
  y los renderiza siempre (pilotos + constructores, puntos, victorias, gap a líder).
- Selector de temporada (dropdown de años) para ver standings históricos.
- **Durante una carrera en directo**: si hay `ChampionshipPrediction`, mostrar una pestaña/
  banda "Predicción en vivo" además del oficial (lo mejor de ambos). Reutiliza el componente
  actual para esa parte.
- Entrada también desde `NoLiveSession` (el enlace "Standings →" ya existe) y desde el Hub.

**Tests:** orden estable por posición; cálculo de gap; fallback sin datos. E2E: la página
muestra standings sin sesión activa.

---

## C. Explorador de resultados de carreras pasadas

Nueva ruta `dashboard/src/app/results/`:

- `page.tsx`: lista de GPs de la temporada (de `/api/f1/season`), cada uno con estado
  (disputado / próximo) y, si disputado, **podio** (top-3 de `/api/f1/results`). Selector de
  temporada para históricos.
- `[round]/page.tsx`: detalle de un GP — resultado de carrera (pos, piloto, equipo, tiempo/
  gap, puntos, estado), parrilla de salida, **clasificación** (Q1/Q2/Q3) y vuelta rápida.
- Enlace cruzado: si la app **grabó** ese finde (match por meeting+año contra el archive),
  botón "Análisis post-sesión →" a `/archive/[id]` (telemetría/insights ya existentes).

Componentes en `components/results/` (`SeasonResultsList`, `RaceResultTable`,
`QualiResultTable`, `GridList`). Tablas presentacionales puras → fáciles de testear.

**Tests:** render de resultado con fixture; match round↔archive; estados disputado/próximo.

---

## D. Weekend Hub como home (lo ata todo)

Reframe de la portada para cuando **no** hay directo. La home actual `app/(nav)/page.tsx`
gana (o se añade `/hub`) una vista que combina 3 fuentes que ya existirán:

- **Próximo GP + countdown** (reutiliza `useNextSession`/`useCountdown` y el patrón de
  `NoLiveSession`).
- **Calendario de la temporada** con estado por ronda: disputada (→ resultado, enlaza a
  `/results/[round]`), en curso (● LIVE → `/dashboard`), próxima (countdown). De
  `/api/f1/season`.
- **Líderes del mundial** (top-3 pilotos + top-3 constructores) de B, enlaza a standings.
- **Último resultado** (podio del último GP) de C.
- **Del finde, si la app grabó algo**: tarjetas a las sesiones del archive del meeting en
  curso/último (match por meeting+año). Esto es el F2 original, ahora alimentado también por
  Jolpica cuando no hubo grabación ("not recorded" → resultado oficial igualmente).

Cuando **sí** hay sesión live, el Hub muestra una banda "● En directo" que lleva al
dashboard; el dashboard live no cambia.

**Tests:** clasificación de estado de ronda (done/live/upcoming); selección de "meeting
actual" (live → si no, por ventana de fechas del schedule, ya hay `lib/nextSession.ts`).
E2E: con backend sin sesión, la home muestra próximo GP, calendario, líderes y último podio.

---

## E. Perfiles y head-to-head de temporada

- `dashboard/src/app/driver/[driverId]/page.tsx`: ficha de piloto en una temporada —
  posición en el mundial, puntos, mejores resultados, resultado por GP (de
  `/api/f1/driver/{id}`). Equipo y compañero.
- **Head-to-head de temporada** `dashboard/src/app/h2h/page.tsx`: elegir 2 pilotos y comparar
  acumulado de la temporada (quali H2H, carrera H2H, puntos, podios, mejores/peores). Es el
  hermano "temporada" del head-to-head live que ya construiste (reutiliza la idea de
  `useHeadToHeadStore` pero con datos de temporada, no de la sesión).

Builders puros en `lib/seasonH2H.ts` (a partir de resultados por ronda) + tests. UI con
barras comparativas (reusa el estilo de `components/qualifying`/`analysis`).

---

## Secuencia y estimación

```
A Backbone (1–1,5 d)  →  B Standings (0,5–1 d)  →  C Resultados (1–1,5 d)
   →  D Weekend Hub home (1–1,5 d)  →  E Perfiles + H2H temporada (1,5–2 d)
```
Total ≈ 5,5–7,5 días. A es bloqueante; B/C/D/E entregables independientes y commit propio.
Recomendado empezar por **A + B** (desbloquea y da un win inmediato: standings siempre).

## Transversal

- **Caché/rate limit:** todo pasa por el proxy con `io_cached` disco; nunca fetch directo a
  Jolpica desde el navegador. Respeta los límites y da velocidad offline.
- **Año "actual":** el feed live/recordings hablan de 2026; Jolpica usa el año real. El
  backbone parametriza `season` y por defecto usa el año actual de `api`; el front pasa el
  año del contexto (schedule/SessionInfo) cuando aplica. Documentar el supuesto.
- **Desacople:** el front solo conoce los shapes normalizados del `api`, no `MRData`. Si un
  día se cambia de fuente, solo cambia `f1data.rs`.
- **Degradación:** si Jolpica cae, cada vista muestra estado vacío honesto + (si hay) caché
  previa; la app live sigue intacta (fuente independiente).
- **Cada fase:** tests (vitest + Rust) + lint + build + verificación e2e con el backend real
  (datos Jolpica reales) + commit `feat: …`.

## Fuera de alcance (por ahora)

- Telemetría histórica de terceros (la telemetría sigue siendo solo de lo que la app grabó).
- Predicciones/ML. Cuentas de usuario. Notificaciones push.
- Reescribir el dashboard live (intacto; este plan es todo "fuera de directo").
