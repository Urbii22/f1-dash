# Plan de implementación — Próximas mejoras de alto impacto

**Fecha:** 2026-06-11
**Rama sugerida:** `codex/high-impact-roadmap` (una sub-rama por fase)
**Estado:** Propuesto

---

## Contexto y diagnóstico

f1-dash hoy renderiza únicamente el **estado instantáneo** de la sesión: `useDataStore`
(`dashboard/src/stores/useDataStore.ts`) fusiona los updates del feed y descarta el valor
anterior. Eso limita estructuralmente lo que el dashboard puede contar: no hay evolución de
ritmo, ni historia de stints, ni posibilidad de "rebobinar" con precisión.

Las cuatro mejoras elegidas (por impacto y por sinergia entre ellas) son:

| # | Mejora | Impacto | Depende de |
|---|--------|---------|------------|
| 1 | Historial de vueltas + análisis de ritmo y stints | Muy alto: desbloquea gráficas y análisis que hoy son imposibles | — |
| 2 | Motor de alertas inteligente v2 + notificaciones | Alto: convierte el dashboard en herramienta activa, no pasiva | Parcial de #1 |
| 3 | Timeline de replay con scrubbing y marcadores de eventos | Alto: el replay actual (offset ciego) es la pata más débil de la UX | — |
| 4 | Panel de estrategia (pit window / undercut / degradación) | Alto: feature diferencial frente al f1-dash original | #1 |

El orden de implementación recomendado es **1 → 2 → 3 → 4**. La fase 1 crea la
infraestructura de series temporales que las fases 2 y 4 consumen; la fase 3 es independiente
y puede paralelizarse.

---

## Fase 1 — Historial de vueltas y análisis de ritmo/stints

### Objetivo

Capturar series temporales por piloto (tiempos de vuelta, sectores, compuesto, posición,
gaps) durante la sesión y exponerlas en: (a) una gráfica de ritmo de carrera, (b) una vista
de stints con degradación, (c) un lap chart de posiciones.

### Diseño

#### 1.1 Nuevo store de historial — `dashboard/src/stores/useLapHistoryStore.ts`

```ts
type LapRecord = {
    lap: number;                  // LapCount o NumberOfLaps del piloto
    lapTimeMs: number | null;     // parseado de TimingData.Lines[n].LastLapTime.Value
    sectorsMs: [number | null, number | null, number | null];
    position: number;
    gapToLeaderMs: number | null;
    compound: string | null;      // de TimingAppData.Lines[n].Stints (último stint)
    tyreAge: number | null;       // TotalLaps del stint activo
    pitted: boolean;              // InPit detectado durante la vuelta
    utc: string;                  // timestamp de cierre de vuelta
};

type LapHistoryStore = {
    laps: Record<string /* racingNumber */, LapRecord[]>;
    stints: Record<string, StintRecord[]>;     // derivado, cacheado
    recordLap: (racingNumber: string, record: LapRecord) => void;
    reset: () => void;                          // al cambiar SessionInfo.Meeting/Name
};
```

Notas de diseño:
- Zustand igual que el resto de stores; sin middleware de persistencia en esta fase
  (el historial vive lo que vive la sesión — coherente con el resto de la app).
- `reset()` se dispara cuando cambia `SessionInfo.Path` (nueva sesión), no al reconectar.
- Cota de memoria: ~80 vueltas × 22 pilotos × ~120 bytes ≈ trivial. No hace falta poda.

#### 1.2 Detector de cierre de vuelta — `dashboard/src/lib/lapHistory.ts`

El feed no emite un evento "vuelta completada"; hay que **detectar el flanco**:
`TimingData.Lines[n].NumberOfLaps` incrementa, o `LastLapTime.Value` cambia de valor.

```ts
// API pura y testeable:
export function detectCompletedLaps(
    prev: State | null,
    next: State,
): Array<{ racingNumber: string; record: LapRecord }>;

export function buildStints(laps: LapRecord[]): StintRecord[];
export function parseLapTimeMs(value: string | undefined): number | null; // "1:23.456" → 83456
```

Casos borde que el detector debe cubrir (todos verificables con los replays existentes
`sample-replay/` y el simulador):
- Primer paso por meta (no hay `LastLapTime` previo) → no registrar.
- Vuelta de pit (in/out lap): registrar con `pitted: true`; las gráficas las marcan, no las ocultan.
- Piloto retirado (`Retired`/`Stopped` en `driverStatus.ts`): dejar de registrar.
- Bandera roja: `LastLapTime` puede congelarse; el flanco por `NumberOfLaps` es la fuente primaria.
- Updates parciales del feed (deep-merge): `prev` y `next` ya vienen fusionados por
  `useDataStore`, así que el detector compara estados completos.

#### 1.3 Punto de enganche

En `useStores.ts` / donde se llama a `setState` tras `useDataEngine` (tick de 200 ms,
`UPDATE_MS` en `dashboard/src/hooks/useDataEngine.ts`): antes de aplicar el nuevo estado,
ejecutar `detectCompletedLaps(prevState, nextState)` y volcar los resultados en
`useLapHistoryStore`. **No** hacerlo dentro de componentes React (evita renders y duplicados
con StrictMode — usar un guard por `utc` + `racingNumber` + `lap` como clave idempotente).

#### 1.4 Componentes de visualización

Nueva ruta `dashboard/src/app/dashboard/analysis/page.tsx` + entrada en `Sidebar.tsx`
(icono `LineChart` de lucide-react, ya es dependencia).

- **`components/analysis/RacePaceChart.tsx`** — líneas de tiempo de vuelta por piloto.
  - Eje Y invertido (más rápido arriba), filtro de outliers (> mediana + 5 s se recorta
    con marcador), selección de pilotos reutilizando `useDriverSelectionStore` y
    `FavoriteDrivers` de settings.
  - Implementar con **SVG propio** (sin nueva dependencia de charting): el proyecto ya
    renderiza SVG complejo en `Map.tsx`; un line chart de N series es asumible y mantiene
    el estilo "telemetry-panel" actual. Si durante la implementación el coste se dispara,
    fallback aprobado: `recharts` (única dependencia nueva permitida en esta fase).
- **`components/analysis/StintTimeline.tsx`** — barras horizontales por piloto, un segmento
  por stint, color por compuesto (reutilizar el mapeo de colores de `DriverTire.tsx`),
  con vueltas y delta de degradación (pendiente de regresión lineal de los tiempos del stint,
  excluyendo in/out laps).
- **`components/analysis/PositionChart.tsx`** (lap chart) — posición por vuelta. Mismo SVG base
  que RacePaceChart (extraer `components/analysis/LineChart.tsx` genérico).
- Integración con head-to-head: en `DriverComparisonPanel.tsx`, añadir mini-sparkline de las
  últimas 10 vueltas de cada piloto comparado (consume el mismo store).

### Tareas (orden)

1. `lib/lapHistory.ts`: parsers + `detectCompletedLaps` + `buildStints`, con tests unitarios
   (ver "Testing" abajo — esta fase introduce vitest).
2. `stores/useLapHistoryStore.ts` + enganche en el pipeline de estado + reset por cambio de sesión.
3. Verificación con replay: lanzar `simulator` con `sample-replay/` y comprobar en consola
   (hook `useDevMode`) que los registros cuadran con lo que muestra el LeaderBoard.
4. `LineChart.tsx` genérico (SVG) → `RacePaceChart` → `PositionChart`.
5. `StintTimeline` + cálculo de degradación.
6. Página `/dashboard/analysis`, Sidebar, sparkline en head-to-head.

### Criterios de aceptación

- Con el replay `full-grid`, la página Analysis muestra ritmo/stints/posiciones coherentes
  con el LeaderBoard en todo momento.
- Cambiar de sesión (o reiniciar el simulador) limpia el historial sin recargar la página.
- Ninguna gráfica provoca re-render del LeaderBoard (verificar con React DevTools profiler).

---

## Fase 2 — Motor de alertas inteligente v2 + notificaciones

### Objetivo

Sustituir el `buildSmartAlerts` actual (2 reglas, sin estado) por un motor de reglas con
detección de eventos por flanco, severidades, deduplicación, filtro por pilotos favoritos
y notificaciones del navegador opcionales.

### Diseño

#### 2.1 Motor de eventos — `dashboard/src/lib/alerts/engine.ts`

El defecto del actual `driverInsights.ts` es que evalúa **estado**, no **cambios**: "X is
closing" se re-emite en cada render. El motor v2 compara `prev`/`next` (mismo patrón que
`detectCompletedLaps`) y emite eventos únicos:

```ts
type AlertEvent = {
    id: string;            // determinista: `${rule}.${driver?}.${lap|utc}` → dedupe natural
    rule: AlertRuleId;
    severity: "info" | "warning" | "critical";
    title: string;
    body: string;
    driverNumber?: string;
    utc: string;
};

type AlertRule = {
    id: AlertRuleId;
    evaluate: (ctx: { prev: State | null; next: State; history: LapHistorySnapshot }) => AlertEvent[];
};
```

Reglas v2 (cada una en su archivo bajo `lib/alerts/rules/`):

| Regla | Disparo (flanco) | Severidad |
|-------|------------------|-----------|
| `overtake` | Cambia `TimingData.Lines[n].Position` | info (warning si involucra favorito) |
| `fastest-lap` | `TimingStats.Lines[n].PersonalBestLapTime.Position === 1` cambia de piloto | info |
| `pit-entry` / `pit-exit` | Flanco de `InPit` | info |
| `penalty` | RaceControlMessages nuevo con "PENALTY"/"INVESTIGATION" | warning/critical |
| `flag-change` | `TrackStatus.Status` cambia (SC, VSC, roja) | critical para SC/VSC/roja |
| `weather-shift` | `WeatherData.Rainfall` pasa de 0 a >0, o delta de `TrackTemp` > 5° | warning |
| `closing-in` | Interval < 1.0 s **y** decreciente 3 ticks seguidos (con histéresis: no re-emitir hasta que supere 1.5 s) | info |
| `retirement` | `Retired`/`Stopped` se activa | warning |
| `track-limits` | (migrada de v1) | warning |

#### 2.2 Store y UI

- `stores/useAlertStore.ts`: lista acumulada (cap 100), `unreadCount`, `dismiss`,
  preferencias (reglas activas, "solo favoritos", notificaciones on/off) **persistidas**
  con el mismo mecanismo que `useSettingsStore`.
- Refactor de `components/dashboard/SmartAlerts.tsx`: consumir el store en vez de recalcular;
  añadir feed cronológico con auto-scroll, filtros por severidad, y toast efímero
  (reutilizar `motion`, ya es dependencia) para eventos critical.
- Sección nueva en `/dashboard/settings`: toggles por regla + "solo pilotos favoritos"
  (integra `FavoriteDrivers.tsx` existente).

#### 2.3 Notificaciones del navegador

- `lib/alerts/notifications.ts`: wrapper de la Notification API. Pedir permiso solo desde
  el toggle de settings (nunca on-load). Emitir únicamente severidad ≥ warning y con la
  pestaña oculta (`document.visibilityState === "hidden"`) — el caso de uso real es
  "tengo el dashboard en otro monitor/pestaña".
- Respeta el delay configurado: el motor se alimenta del estado **post-buffer** de
  `useDataEngine`, así que las alertas llegan sincronizadas con lo que el usuario ve
  (crítico para quien usa delay anti-spoiler).

### Tareas (orden)

1. Esqueleto del motor + 3 reglas core (`flag-change`, `pit-entry/exit`, `overtake`) con tests.
2. `useAlertStore` + enganche en el mismo punto del pipeline que la fase 1.
3. Refactor de `SmartAlerts.tsx` + toasts.
4. Resto de reglas + histéresis de `closing-in`.
5. Settings (toggles, favoritos) + persistencia.
6. Notificaciones del navegador.

### Criterios de aceptación

- Con el replay, un Safety Car genera **una** alerta critical (no una por tick).
- Desactivar una regla en settings la silencia inmediatamente y sobrevive a recarga.
- Con la pestaña oculta y permiso concedido, una bandera roja dispara notificación nativa.

---

## Fase 3 — Timeline de replay con scrubbing y marcadores

### Objetivo

Reemplazar el seek por offset ciego (`jumpBy` en `useReplayControlStore.ts`) por una barra
de timeline con: posición actual, duración de la sesión, scrubbing, y marcadores de eventos
(SC, banderas, pits) sobre los que saltar.

### Diseño

#### 3.1 Restricción actual

`useDataEngine` mantiene buffers en memoria (`useBuffer`/`useStatefulBuffer`) alimentados
por el socket; **solo se puede saltar hacia atrás hasta donde alcanza el buffer** y hacia
delante hasta "ahora - delay". El timeline debe reflejar esa ventana honestamente.

Decisión de alcance: **fase 3a (cliente, esta fase)** = timeline sobre la ventana
buffereada. **Fase 3b (futura, fuera de este plan)** = recording server-side en `realtime`
para sesiones completas; queda documentada como extensión pero no se implementa.

#### 3.2 Cambios en buffers — `hooks/useBuffer.ts` / `useStatefulBuffer.ts`

- Exponer `oldestTimestamp()` y `latestTimestamp()` (los buffers ya guardan timestamps
  para el delay; solo hay que exponerlos).
- Aumentar la retención cuando hay replay activo: parámetro `maxAgeMs` (default actual →
  30 min en modo replay). Medir memoria con el replay full-grid antes de fijar el valor.

#### 3.3 Modelo de timeline — `stores/useReplayControlStore.ts` (ampliado)

```ts
type ReplayControlStore = {
    // existente: isPaused, speed, seekOffsetMs...
    windowStartMs: number | null;   // oldest disponible en buffers
    windowEndMs: number | null;     // latest disponible
    cursorMs: number | null;        // posición de reproducción actual
    seekTo: (absoluteMs: number) => void;  // reemplaza el uso directo de jumpBy en la UI
};
```

`useDataEngine` actualiza `windowStart/End/cursor` una vez por tick (200 ms). `seekTo`
se traduce internamente al `seekOffsetMs` ya soportado — el mecanismo de reproducción
no cambia, solo se le pone una regla encima.

#### 3.4 Marcadores de eventos — `lib/replayMarkers.ts`

Deriva marcadores de los datos ya presentes en el estado (sin tocar backend):
- `RaceControlMessages` con flag/SC/VSC/roja → marcador con color por severidad.
- Flancos de `InPit` (reutiliza el detector de la fase 2 si ya está; si no, versión local).
- `SessionStatus` (inicio/fin de sesión, banderas a cuadros).

Cada marcador: `{ utc, type, label, color }`. Solo se muestran los que caen dentro de la
ventana del buffer.

#### 3.5 UI — `components/dashboard/ReplayControlBar.tsx` (rediseño)

- Barra de progreso con la ventana disponible; zona fuera de ventana en gris no clicable.
- Scrubbing con preview del timestamp (tooltip con hora de sesión vía `toTrackTime.ts`).
- Marcadores como ticks clicables (tooltip con label; click = `seekTo`).
- Controles existentes (pausa, velocidad 0.5–5×, ±10 s) se conservan; atajos de teclado:
  espacio = pausa, ←/→ = ±10 s.
- En sesión live sin delay, la barra colapsa a un indicador "LIVE" (estado actual).

### Tareas (orden)

1. Exponer timestamps en buffers + `windowStart/End/cursor` en el store.
2. `seekTo` + clamping a la ventana + tests del clamping.
3. Rediseño de `ReplayControlBar` con scrubbing.
4. `lib/replayMarkers.ts` + render de marcadores.
5. Atajos de teclado + retención ampliada de buffers (con medición de memoria).
6. Validación completa con `start-f1-dash.bat` + simulador a 2× (escenario del spec
   `2026-06-10-slow-2026-validation-replay-design.md`).

### Criterios de aceptación

- Arrastrar el cursor a cualquier punto de la ventana reproduce desde ahí en < 1 s.
- Un click en el marcador de SC muestra el estado del momento del SC (LeaderBoard + Map coherentes).
- Intentar saltar fuera de la ventana hace clamp visible (el cursor se detiene en el borde).

---

## Fase 4 — Panel de estrategia de carrera

### Objetivo

Panel "Strategy" en el dashboard de carrera con: pit window estimado por piloto, calculadora
de undercut/overcut entre los dos pilotos del head-to-head, y proyección de degradación.

> Depende de la fase 1 (historial de vueltas y stints). No empezar antes.

### Diseño

#### 4.1 Motor de cálculo — `dashboard/src/lib/strategy.ts` (puro, testeable)

```ts
// Pace model por piloto/stint a partir del historial (fase 1):
// baseline = mediana de las últimas 5 vueltas limpias; degradación = pendiente
// de regresión del stint actual (s/vuelta).
export function buildPaceModel(laps: LapRecord[], stints: StintRecord[]): PaceModel;

// Pérdida de pit: estimada por circuito a partir de los pits ya ocurridos en la sesión
// (delta entre vuelta de pit y baseline); fallback a constante 22 s si no hay datos.
export function estimatePitLoss(history: LapHistorySnapshot): number;

// Undercut: si A entra ahora y B sigue fuera N vueltas, gap proyectado vuelta a vuelta.
export function projectUndercut(a: PaceModel, b: PaceModel, gapMs: number, pitLossMs: number,
    tyreDeltaMs: number): UndercutProjection;  // { crossoverLap, gapAfterStop, verdict }

// Pit window: vuelta en la que la degradación acumulada supera la pérdida de pit
// frente a neumático nuevo.
export function estimatePitWindow(model: PaceModel, pitLossMs: number,
    lapsRemaining: number): { from: number; to: number } | null;
```

Principios:
- **Todo heurístico y etiquetado como estimación** en la UI ("EST" chip, igual que el
  patrón visual de `data-chip` actual). Nada de presentarlo como dato del feed.
- Deltas entre compuestos (`tyreDeltaMs`): tabla constante conservadora
  (S→M ≈ +0.6 s/vuelta, M→H ≈ +0.5) en `lib/strategy.ts`, ajustable; documentar que es
  aproximación.
- Solo activo cuando `SessionInfo.Type === "Race"` (mismo guard que standings) y a partir
  de la vuelta 5 (datos insuficientes antes).

#### 4.2 UI

- **`components/dashboard/StrategyPanel.tsx`** — nueva sección en la página principal del
  dashboard (tercera fila, junto a SmartAlerts), con:
  - Tabla compacta: piloto | compuesto+edad (reutiliza `DriverTire`) | deg (s/vuelta,
    coloreado) | pit window estimado (rango de vueltas).
  - Ordenable por deg o por ventana; filtro favoritos.
- **Integración head-to-head**: cuando hay 2 pilotos comparados en
  `DriverComparisonPanel.tsx`, bloque "Undercut" con la proyección entre ambos
  (verdict + gap proyectado tras la parada). Es el caso de uso estrella: "¿le funciona
  el undercut a X sobre Y?"
- Página `/dashboard/analysis` (fase 1) gana una pestaña "Strategy" con la proyección
  expandida (gráfica de cruce de líneas con el `LineChart` genérico).

### Tareas (orden)

1. `lib/strategy.ts` con tests sobre fixtures extraídos del replay full-grid
   (vueltas reales → comprobar que el pit loss estimado cae en rango razonable 18–30 s).
2. `StrategyPanel.tsx` (tabla) + guard de tipo de sesión.
3. Bloque undercut en head-to-head.
4. Pestaña Strategy en Analysis con gráfica de cruce.

### Criterios de aceptación

- En el replay de carrera, las ventanas de pit estimadas son plausibles (±5 vueltas de las
  paradas reales que ocurren después en el replay).
- El verdict de undercut cambia coherentemente al avanzar la carrera (más viable cuanto
  mayor la degradación del rival).
- Sin datos suficientes (vuelta < 5, sesión no-Race), el panel muestra estado vacío claro,
  nunca números absurdos.

---

## Infraestructura transversal: testing (se introduce en fase 1)

El proyecto no tiene ningún test. Las fases 1, 2 y 4 introducen lógica pura de cálculo que
es exactamente el tipo de código que más lo necesita.

- Añadir **vitest** a `dashboard/` (`pnpm add -D vitest`), script `"test": "vitest run"`.
- Convención: tests junto al módulo (`lib/lapHistory.test.ts`).
- Fixtures: extraer snapshots de estado reales del replay (`sample-replay/`) a
  `dashboard/src/lib/__fixtures__/` con un script puntual (`tools/`).
- Alcance: **solo lógica pura** (`lib/`). Nada de testing de componentes/E2E en este plan.

---

## Riesgos y mitigaciones

| Riesgo | Mitigación |
|--------|------------|
| El formato del feed varía entre sesiones (arrays vs records, campos ausentes) | Ya hay precedente (`normalizeMessages` en driverInsights); todos los parsers nuevos son defensivos y con test de fixture real |
| Detección de flancos duplicada con React StrictMode (doble efecto en dev) | Ids deterministas + guard idempotente en los stores |
| Memoria de buffers ampliados (fase 3) | Medir con replay full-grid antes de fijar `maxAgeMs`; techo duro configurable |
| Estimaciones de estrategia tomadas como datos oficiales | Etiquetado "EST" sistemático + disclaimer en el panel |
| SVG charts propios crecen en complejidad | Fallback aprobado a `recharts` si `LineChart.tsx` supera ~300 líneas |

## Validación end-to-end por fase

Cada fase se valida con el flujo ya existente: `start-f1-dash.bat` + simulador con
`sample-replay/` (y el escenario slow-2026 para la fase 3), revisando el dashboard en
`localhost:3000/dashboard`. Cierre de cada fase: lint (`pnpm lint`), tests (`pnpm test`),
validación visual con replay, y commit por fase siguiendo el estilo del repo
(`feat: ...` + doc en `docs/superpowers/`).
