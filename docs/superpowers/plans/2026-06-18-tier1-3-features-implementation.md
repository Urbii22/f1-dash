# Plan — 9 mejoras (Tiers 1–3): datos, análisis y plataforma

**Fecha:** 2026-06-18
**Estado:** Propuesto
**Rama:** `codex/modern-tech-ui`
**Prerrequisitos:** "Always-on companion" A+B (commit `228b302`) y rediseño UI fases 1–6
(rama actual). Todo lo nuevo respeta el `UiModeBoundary` (legacy / simple / detailed).

---

## 0. Alcance y fuentes (verificado en código)

Las 9 implementaciones, agrupadas por la fuente de datos que las hace viables:

| # | Feature | Tier | Fuente del dato | Estado del dato |
|---|---|---|---|---|
| 1 | Endpoints Jolpica que faltan (pitstops, laps, sprint) | 1 | Jolpica/Ergast | proxy nuevo, patrón ya existe |
| 2 | Calculadora de permutaciones de campeonato | 1 | standings + calendario (ya proxeados) | cómputo puro, 0 dato nuevo |
| 3 | Timeline de estrategia de neumáticos (archivo) | 1 | SQLite `stints` (ya existe) | solo UI |
| 4 | Panel "Batallas en pista" (live) | 2 | `TimingData.IntervalToPositionAhead` (live) | solo UI/lib |
| 5 | Headshots + banderas | 2 | `DriverList.HeadshotUrl`/`CountryCode` + assets | enriquecer UI |
| 6 | Predicción de campeonato en vivo | 2 | topic `ChampionshipPrediction` (live) | topic ya suscrito |
| 7 | Timeline de race control (archivo) | 2 | SQLite `events` (ya existe) | solo UI |
| 8 | Completar PWA (service worker) | 3 | `manifest.json` ya existe | infra front |
| 9 | Export/share de análisis (PNG/CSV) | 3 | datos de cliente | infra front |

**Regla de oro del repo (de la memoria del proyecto):** TDD tarea-a-tarea, un commit por
tarea numerada, commit-checkpoint vacío al cerrar fase. Cada fase está **gateada** por
test + lint + tsc + build en verde antes de la siguiente.

### Comandos de verificación

Rust (raíz):
```
cargo test -p api
cargo build -p api
```

Dashboard (desde `dashboard/`):
```
corepack yarn test
corepack yarn lint
corepack yarn tsc --noEmit          # vitest NO typechequea; next build solo typechequea app/
$env:API_URL='http://localhost:4001'; $env:NEXT_PUBLIC_LIVE_URL='http://localhost:4000'; corepack yarn build
```

**Gotchas heredados (aplican a todas las fases UI):**
- ESLint estricto: prohíbe `setState` en effect y leer/escribir un `ref` durante el render.
  Evitar patrones "valor previo" entre renders. Lint tras CADA tarea.
- Tests jsdom: `components/dashboard/Map.tsx` (maplibre/webgl) debe ir `vi.mock`-eado.
- `test/setup.ts` fuerza `prefers-reduced-motion` → Motion salta animaciones; aserta
  visibilidad directa, usa `waitFor(() => expect(queryByRole).toBeNull())` para salidas.
- Parar `next dev` y borrar `.next` antes de `next build` (si no, falla por `routes.d.ts`).
- Toda vista nueva debe enchufarse a `UiModeBoundary` con sus 3 variantes (o reutilizar una).

---

## Mapa de fases

```
A · Data layer Jolpica (pitstops/laps/sprint)      → feature 1     [Rust + fetchers TS]
B · Permutaciones de campeonato                    → feature 2     [lib TS + UI]
C · Results browser enriquecido                    → consume A      [UI]
D · Timelines de archivo (neumáticos + RC)         → features 3,7   [UI]
E · Mejoras en vivo (batallas + predicción)        → features 4,6   [lib + UI]
F · Identidad visual (headshots + banderas)        → feature 5      [UI]
G · Plataforma (PWA + export/share)                → features 8,9   [infra]
```

Orden recomendado: A → B → C → D → E → F → G.
A va primero porque desbloquea C. B es independiente (puede paralelizarse). F y G son
pulido y no bloquean nada.

---

## Fase A — Data layer: expansión del proxy Jolpica (feature 1)

**Objetivo:** exponer pit stops, lap times y sprint desde el `api` Rust, con el mismo
patrón `cached_get` + normalizador + test que ya existe en `f1data.rs`.

**Contexto verificado:** `api/src/endpoints/f1data.rs` ya tiene `cached_get(path)` con
`#[io_cached(disk=true, time=3600)]` y `?limit=100` hardcodeado. Los normalizadores son
funciones puras testeadas contra fixtures. Hay que respetar esa estructura.

### A.1 — Endpoint pit stops
- **Test primero:** `norm_pitstops` contra fixture `MRData/RaceTable/Races[0]/PitStops`.
  Campos por parada: `driverId`, `lap`, `stop` (nº parada), `duration` (s), `time` (hora).
- Normalizador `norm_pitstops(&Value) -> Value` → `{ season, round, raceName, stops: [...] }`.
  Agregar también `byDriver` o dejar plano y agrupar en TS (preferible plano + helper TS).
- Handler `pitstops(Query<RoundQuery>)` → path `/{season}/{round}/pitstops`.
- Ruta en `main.rs`: `GET /api/f1/pitstops`.
- Cabe en un solo fetch (≤ ~60 paradas < limit 100).

### A.2 — Endpoint lap times (con paginación)
- **Riesgo real:** una carrera tiene ~20 pilotos × ~60 vueltas ≈ 1200 filas. El
  `?limit=100` actual trunca. Ergast/Jolpica permite `limit` alto pero conviene paginar.
- **Test primero:** `norm_laps` contra fixture multi-vuelta; y test de fusión de páginas.
- Nuevo helper `cached_get_paged(path, page_size)` que hace loop con `offset` leyendo
  `MRData.total` hasta completar, concatenando `Races[0].Laps`. Cachear el resultado
  fusionado (no cada página).
- Normalizador `norm_laps` → `{ season, round, laps: [{ lap, timings: [{ driverId,
  position, time }] }] }` (estructura nativa de Ergast: por vuelta, lista de pilotos).
- Handler `laps(Query<RoundQuery>)` → `/{season}/{round}/laps`.
- Ruta `GET /api/f1/laps`.
- TTL largo para rondas cerradas (el dato es inmutable); el `time=3600` actual sirve, pero
  considerar subirlo para laps históricos.

### A.3 — Endpoint sprint
- **Test primero:** `norm_sprint` (estructura idéntica a `norm_results` pero clave
  `SprintResults`). Reutilizar `race_meta` + mapeo de filas.
- Handler `sprint(Query<RoundQuery>)` → `/{season}/{round}/sprint`.
- Ruta `GET /api/f1/sprint`. Devuelve `null` si la ronda no tuvo sprint (igual que results).

### A.4 — Fetchers + tipos en el dashboard
- `dashboard/src/lib/f1data.ts`: añadir tipos `PitStop`, `RacePitStops`, `LapTiming`,
  `RaceLaps`, `SprintResult` y fetchers `getPitStops`, `getLapTimes`, `getSprint`
  (mismo patrón `getJson<T>` con `revalidate: 300`).
- Helpers puros testeados:
  - `pitStopsByDriver(stops)` → agrupado + nº de paradas + total parado.
  - `rankPitStops(stops)` → ordenado por `duration` (mejor parada de la carrera).
  - `lapChartSeries(raceLaps)` → series posición-por-vuelta para gráfico (reusa el
    `LineChart` de `components/analysis`).
- Tests en `f1data.test.ts` (ya existe) con fixtures.

**Verificación A:** `cargo test -p api` + `cargo build -p api`; dashboard `test`+`lint`+`tsc`.
**Commits:** A.1, A.2, A.3, A.4 + checkpoint vacío.
**Riesgos:** paginación de laps (mitigado en A.2); rate-limit Jolpica (mitigado por caché
disco existente). Sin tocar UI todavía → fase de bajo riesgo.

---

## Fase B — Calculadora de permutaciones de campeonato (feature 2)

**Objetivo:** "¿puede X aún ser campeón?", puntos para sentenciar, escenarios de clinch.
**Cero datos nuevos:** standings (`getDriverStandings`/`getConstructorStandings`) y
calendario (`getSeason`, con fechas → rondas restantes) ya están proxeados.

### B.1 — Lib pura `lib/championshipScenarios.ts`
- **Test primero** (`championshipScenarios.test.ts`).
- Entradas: standings actuales, nº de rondas restantes, flags de sprint restantes.
- Sistema de puntos como constantes (25-18-15…-1 + 1 FL; sprint 8-7…-1). Configurable.
- Funciones:
  - `maxPointsRemaining(rounds, sprints)` → tope teórico por piloto.
  - `canStillWin(driver, leader, remaining)` → bool + `pointsNeededToClinch`.
  - `clinchScenarios(standings, remaining)` → por líder: "campeón si saca ≥N pts" /
    "matemáticamente campeón".
  - Variante constructores (1-2 del equipo suman).
- Casos borde testeados: empate a puntos (desempata por victorias), temporada cerrada
  (remaining=0), datos faltantes (`points: null`).

### B.2 — UI en standings + home
- Banner/sección "Championship picture" en `dashboard/standings/page.tsx` (server comp).
  Variantes simple/detailed vía sus views new-ui; legacy con bloque compacto.
- En home (`(nav)/page.tsx`): chip "X puede sentenciar en [GP]" cuando aplique.
- Sin live: usa standings oficiales. Con live: puede combinar con `ChampionshipPrediction`
  (enlaza con fase E pero no depende de ella).

**Verificación B:** dashboard `test`+`lint`+`tsc`+`build`.
**Commits:** B.1, B.2 + checkpoint.
**Riesgos:** reglas de desempate y puntos sprint (mitigado por constantes + tests). Bajo.

---

## Fase C — Results browser enriquecido (consume Fase A)

**Objetivo:** sacar partido de A en `results/[round]` y home.
**Prerrequisito:** Fase A en verde.

### C.1 — Resultados de sprint
- En `results/[round]/page.tsx`: si `getSprint(round)` no es null, pestaña/sección "Sprint"
  junto a Carrera y Qualy. Reusa el componente de tabla de resultados existente.

### C.2 — Ranking de paradas
- Panel "Pit stops" con `rankPitStops` (mejor parada, media por equipo, nº paradas por
  piloto). Tabla ordenable. Reusa estilo `data-chip`.

### C.3 — Lap chart histórico (position chart)
- Gráfico posición-por-vuelta de la carrera con `lapChartSeries` + `LineChart`.
  Selector de pilotos (reusa `useDriverSelectionStore` o uno local de la página).
- Eje Y invertido (P1 arriba). Resaltar líder/podio.

**Verificación C:** dashboard `test`+`lint`+`tsc`+`build`.
**Commits:** C.1, C.2, C.3 + checkpoint.
**Riesgos:** volumen de datos de laps en cliente (mitigado: server fetch + caché; render
solo pilotos seleccionados). Medio-bajo.

---

## Fase D — Timelines de archivo: neumáticos + race control (features 3, 7)

**Objetivo:** dar profundidad al archivo. El new-ui de archivo es flaco (2 ficheros).
**Contexto verificado:** API archivo ya sirve `/stints` (compound/start/end/laps/best/avg/
deg) y `/events` (race control). `lib/archive.ts` ya los consume en parte.

### D.1 — Strategy timeline (neumáticos)
- **Test primero:** lib `lib/strategyTimeline.ts` que de `stints` por piloto produce
  segmentos `{ driverNr, compound, startLap, endLap, lapCount }` normalizados a la
  longitud total de carrera.
- Componente `StrategyTimeline` (estilo gráfico oficial F1): una fila por piloto, barras
  por stint coloreadas por compuesto (assets en `public/tires`), marca de parada en los
  límites. Tooltip con deg ms/lap y mejor vuelta del stint.
- Integrar en `archive/[sessionId]` (vía `ArchiveViews`), respetando UiModeBoundary.

### D.2 — Race control timeline
- **Test primero:** lib que ordena `events` por UTC y los mapea a lap (cruzando con
  `laps.utc` o `LapCount` si está). Clasifica por tipo (bandera/SC/VSC/investigación/
  penalización/track limits) reusando la lógica de `raceControlVisual.ts` si encaja.
- Componente `RaceControlTimeline`: cronología con iconos por tipo, alineada al lap chart
  del archivo si existe. Reemplaza/complementa el `EventsLog` actual.

**Verificación D:** dashboard `test`+`lint`+`tsc`+`build`.
**Commits:** D.1, D.2 + checkpoint.
**Riesgos:** mapear UTC→lap si faltan timestamps (mitigado: fallback a orden temporal sin
lap). Medio.

---

## Fase E — Mejoras en vivo: batallas + predicción (features 4, 6)

**Objetivo:** explotar dos datos live infrautilizados.

### E.1 — Panel "Batallas en pista"
- **Test primero:** `lib/battles.ts` → de `TimingData.Lines` saca pares en pelea:
  `IntervalToPositionAhead < BATTLE_THRESHOLD` (1.0 s), excluyendo pit/retired/stopped,
  con dirección (`Catching`). Ordena por cercanía. Reusa helpers de `alerts/rules.ts`
  (`inPitCycle`, `parseSeconds`).
- Componente `BattlesPanel`: lista de duelos `ATACANTE → DEFENSOR · gap · ▲cerrando`,
  con colores de equipo. Enchufar como panel detailed (workspace redimensionable) y como
  sección colapsable en simple.

### E.2 — Predicción de campeonato en vivo
- **Test primero:** view-model que combina `ChampionshipPrediction` (topic ya suscrito en
  `realtime/f1.rs`, tipado en `state.type.ts`) → filas piloto/equipo con `CurrentPoints`,
  `PredictedPoints`, `CurrentPosition`, `PredictedPosition` y delta.
- Componente que muestra, durante carrera, "si acaba así: P{actual}→P{previsto},
  {pts}→{pts previstos}". Integrar en la vista de standings live y/o panel detailed.
- Si está disponible, alimenta el banner de la Fase B con el escenario real en curso.

**Verificación E:** dashboard `test`+`lint`+`tsc`+`build`. Probar con replay
(`simulator -- replay`) de una grabación de carrera.
**Commits:** E.1, E.2 + checkpoint.
**Riesgos:** `ChampionshipPrediction` solo llega en carrera (no quali/practice) → la vista
debe degradar a vacío con mensaje. Bajo.

---

## Fase F — Identidad visual: headshots + banderas (feature 5)

**Objetivo:** enriquecer standings/driver/results con cara del piloto y bandera de país.
**Contexto verificado:** `DriverList` live trae `HeadshotUrl` y `CountryCode`; existen
assets `public/flags`, `public/country-flags`, `public/team-logos`. Jolpica da
`nationality` (texto) por piloto.

### F.1 — Helper de identidad
- **Test primero:** `lib/driverIdentity.ts` (o extender el existente) que resuelve:
  nacionalidad/código país → ruta de bandera local; piloto → headshot (URL live si hay,
  placeholder si no). Mapa `nationality → countryCode` para el lado Jolpica (que no da
  código ISO, solo demónimo "British"/"Dutch").
- Fallbacks robustos (sin romper si falta asset).

### F.2 — Aplicar en UI
- Avatar + bandera en filas de standings, cabecera de `driver/[driverId]`, y resultados.
- Componente `<DriverBadge>` reutilizable (tla, color equipo, headshot, bandera).
- `next/image` con tamaños fijos para no romper layout (CLS).

**Verificación F:** dashboard `test`+`lint`+`tsc`+`build`.
**Commits:** F.1, F.2 + checkpoint.
**Riesgos:** mapa demónimo→ISO incompleto (mitigado: tabla explícita + fallback). Bajo.

---

## Fase G — Plataforma: PWA + export/share (features 8, 9)

**Objetivo:** instalable/offline y compartir análisis.
**Contexto verificado:** `public/manifest.json` ya existe; falta service worker.

### G.1 — Service worker / PWA
- Añadir SW (manual o `@serwist/next` / `next-pwa`, según política de deps del repo —
  preferir mínimo manual si se quiere evitar dependencia).
- Cachear app-shell + GET de `/api/f1/standings/*` y `/api/schedule` (stale-while-
  revalidate) para standings/calendario offline.
- Verificar `manifest.json` (iconos en `public/icons`), `display`, `theme_color`,
  `start_url`. Banner/control de "Instalar app" opcional.
- **Test:** smoke E2E (Playwright) de que el SW registra y la home carga offline tras
  primera visita. NO cachear WS live ni telemetría.

### G.2 — Export/share de análisis
- **Test primero:** lib `lib/exportChart.ts` → CSV de cualquier `ChartSeries[]`
  (puro, testeable).
- Botón "Export" en paneles de análisis del archivo: CSV (datos) y PNG (captura del SVG
  vía serialización canvas; sin libs pesadas). "Copiar enlace" del análisis (deep-link
  con sessionId + pilotos seleccionados en query params → la página ya puede hidratar
  selección desde la URL).

**Verificación G:** dashboard `test`+`lint`+`tsc`+`build` + E2E SW.
**Commits:** G.1, G.2 + checkpoint.
**Riesgos:** SW puede cachear de más y servir HTML viejo (mitigar: versionar caché,
network-first para HTML). Medio — por eso va al final.

---

## Resumen de archivos por fase

| Fase | Crea / toca (principal) |
|---|---|
| A | `api/src/endpoints/f1data.rs`, `api/src/main.rs`, `dashboard/src/lib/f1data.ts` (+tests) |
| B | `lib/championshipScenarios.ts`, `standings/page.tsx`, `(nav)/page.tsx` (+tests) |
| C | `results/[round]/page.tsx`, componentes results + chart (+tests) |
| D | `lib/strategyTimeline.ts`, `lib/*raceControl*`, `new-ui/archive/*` (+tests) |
| E | `lib/battles.ts`, view-model predicción, paneles `new-ui/live/*` (+tests) |
| F | `lib/driverIdentity.ts`, `<DriverBadge>`, standings/driver/results (+tests) |
| G | service worker, `manifest.json`, `lib/exportChart.ts`, botones export (+tests/E2E) |

## Orden de ejecución y paralelización
- **Secuencial obligatorio:** A → C (C consume A).
- **Independientes** (pueden intercalarse): B, D, F, G no dependen de A.
- **E** se beneficia de B (banner combinado) pero no la bloquea.
- Recomendado de principio a fin: **A, B, C, D, E, F, G**, un commit por tarea, checkpoint
  vacío por fase, gate de test+lint+tsc+build entre fases.

## Definición de "hecho" (global)
- Cada lib nueva con tests unitarios (TDD).
- `corepack yarn test` + `lint` + `tsc --noEmit` en verde.
- `build` de producción OK (parar `next dev`, borrar `.next`).
- Rust: `cargo test -p api` + `cargo build` en verde.
- Toda UI nueva presente en las 3 variantes de `UiModeBoundary` (o reusa una existente).
- Sin regresiones en las 473 unit + E2E existentes.
