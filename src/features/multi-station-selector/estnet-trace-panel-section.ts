// Packet-trace panel — opt-in side-panel disclosure section (ESTNeT / network test).
//
// Renders PacketTrace fixtures (contract: scripts/estnet/PACKET-TRACE-CONTRACT.md)
// as a single collapsible `<details>` disclosure. The trace menu is driven by
// `public/fixtures/estnet/manifest.json`: each entry points at one reviewed
// fixture, so a future requirement-side delivery becomes selectable by adding a
// manifest line — no code change. The renderer is latencySemantic-aware
// (`one-way` composed / `rtt` / `none`) and tolerates absent metric channels
// (e.g. ping has no throughput, iperf3 has no latency).
//
// Honesty (R12): provenance badges and non-claims always render from the
// fixture itself (`sourceClass`/`nonClaims`/`assumptionSet`), never from the
// manifest — a manifest entry cannot upgrade a trace's tier, and no trace in
// this chain is an operator RF measurement (the ingest tool refuses the
// operator-measured tier). Committed fixtures are either ESTNeT-simulated
// traces (jitter+loss adapter-derived, end-to-end composed from two one-hop
// RF legs, handover a showcase route preference mirroring `demo-balanced-v1`)
// or REAL machine-local network-test captures (loopback ping / iperf3
// rehearsal, `network-test-derived` — no satellite path involved).
//
// Opt-in only: nothing renders unless the ESTNeT display mode is on, so the
// accepted 19/19 default surface is untouched.

import type { ReplayClock, ReplayClockState } from "../time/replay-clock";
import type {
  RepresentativeLinkBudget,
  RuntimeProjectionResult
} from "./runtime-projection";

export interface PacketTraceSample {
  readonly tMs: number;
  readonly latencyMs: number | null;
  readonly jitterMs?: number | null;
  readonly throughputMbps?: number | null;
  readonly packetLossRatio?: number | null;
  readonly linkUp?: boolean;
  readonly hops?: number | null;
  readonly servingSatellite?: string;
  readonly orbitClass?: string;
}

export interface PacketTraceSegment {
  readonly label: string;
  readonly orbitClass: string;
  readonly satellite: string;
  readonly startMs: number;
  readonly endMs: number;
  readonly deliveredPackets: number;
}

export interface PacketTraceSummary {
  readonly sentPackets: number;
  readonly deliveredEndToEnd: number;
  readonly overallPacketLossRatio: number;
  readonly meanLatencyMs?: number;
  readonly minLatencyMs?: number;
  readonly maxLatencyMs?: number;
  readonly finalJitterMs?: number;
  readonly handoverCount?: number;
  readonly meanLatencyByOrbitMs?: { readonly [orbit: string]: number };
}

export interface PacketTrace {
  readonly schemaVersion: number;
  readonly pathLabel: string;
  readonly sourceClass: string;
  readonly toolProvenance?: string;
  readonly latencySemantic?: string;
  readonly assumptionSet?: string;
  readonly handover?: boolean;
  readonly nonClaims?: ReadonlyArray<string>;
  readonly metadata?: {
    readonly simEpochUtc?: string;
    readonly satellite?: string;
    readonly satellites?: { readonly [orbit: string]: string };
    readonly propagationPerHopMs?: number;
    readonly handoverWindowUtc?: ReadonlyArray<string>;
    readonly ingestFormat?: string;
    readonly deliveredBy?: string;
    readonly stationA?: { readonly id?: string };
    readonly stationB?: { readonly id?: string };
  };
  readonly segments?: ReadonlyArray<PacketTraceSegment>;
  readonly summary: PacketTraceSummary;
  readonly samples: ReadonlyArray<PacketTraceSample>;
}

// `one-way` is the contract default: the two committed adapters omit the field
// and their end-to-end latency is a composed one-way (uplink + downlink).
type LatencySemantic = "one-way" | "rtt" | "none";

export function latencySemanticOf(trace: PacketTrace): LatencySemantic {
  return trace.latencySemantic === "rtt" || trace.latencySemantic === "none"
    ? trace.latencySemantic
    : "one-way";
}

export interface PacketTraceManifestEntry {
  readonly id: string;
  readonly label: string;
  readonly url: string;
  readonly default?: boolean;
  /**
   * Menu-level pair HINTS: the registry station ids of the trace's declared
   * endpoints, mirrored from the fixture so the panel can pre-select a
   * same-pair trace without fetching every fixture. Hints are never the
   * truth — the fixture's own `metadata.stationA/B` is (`verify:estnet`
   * enforces hint == fixture metadata == registry id, both-or-neither).
   */
  readonly stationA?: string;
  readonly stationB?: string;
}

export interface PacketTraceManifest {
  readonly schemaVersion: number;
  readonly traces: ReadonlyArray<PacketTraceManifestEntry>;
}

/** The current route's endpoint station ids (null when unidentified). */
export interface TraceRouteIds {
  readonly stationAId: string | null;
  readonly stationBId: string | null;
}

// Order-agnostic pair match (the latency comparison is direction-free), as an
// exact two-sided assignment — NOT set membership, which would let a
// degenerate same-id endpoint pair (A == B) match any route containing that
// one id (Gemini review finding, 2026-07-02). FAIL CLOSED: an unidentified
// route side never matches a declared pair.
function pairMatchesRoute(
  endpointIdA: string,
  endpointIdB: string,
  route: TraceRouteIds
): boolean {
  if (
    typeof route.stationAId !== "string" ||
    typeof route.stationBId !== "string"
  ) {
    return false;
  }
  return (
    (endpointIdA === route.stationAId && endpointIdB === route.stationBId) ||
    (endpointIdA === route.stationBId && endpointIdB === route.stationAId)
  );
}

function routeIdsOfResult(
  runtimeResult: RuntimeProjectionResult | null | undefined
): TraceRouteIds {
  const idA = runtimeResult?.pair?.stationA?.id;
  const idB = runtimeResult?.pair?.stationB?.id;
  return {
    stationAId: typeof idA === "string" ? idA : null,
    stationBId: typeof idB === "string" ? idB : null
  };
}

/**
 * Picks the manifest entry the section opens with for the current route:
 * a trace whose pair hints match the route pair (order-agnostic) wins over
 * the global default. Tie-breaker when several traces share the pair (the
 * CHT × SANSA pair really carries two): a `default: true` entry first, then
 * manifest order (first wins). Falls back to the global default entry when
 * the route is unidentified or no trace declares this pair. Pure — exported
 * for the unit suite; called once per section build, at manifest load.
 */
export function selectManifestEntryForRoute(
  manifest: PacketTraceManifest,
  route: TraceRouteIds
): PacketTraceManifestEntry {
  const samePair = manifest.traces.filter(
    (entry) =>
      typeof entry.stationA === "string" &&
      typeof entry.stationB === "string" &&
      pairMatchesRoute(entry.stationA, entry.stationB, route)
  );
  if (samePair.length > 0) {
    return samePair.find((entry) => entry.default === true) ?? samePair[0];
  }
  return defaultManifestEntry(manifest);
}

/**
 * One-line disclosure for a route↔trace pair mismatch. Returns the line
 * exactly when the trace declares its own endpoints (fixture metadata — the
 * truth, never manifest hints) and the current route pair does not match
 * them order-agnostically — the same predicate that makes
 * `computeModelOverlay` suppress the viewer-model overlay, so the silence
 * is always explained. Null when the trace declares no endpoints (nothing
 * to reconcile) or the pair matches. Pure — exported for the unit suite.
 */
export function pairCompatibilityDisclosure(
  trace: Pick<PacketTrace, "metadata">,
  route: TraceRouteIds
): string | null {
  const traceIdA = trace.metadata?.stationA?.id;
  const traceIdB = trace.metadata?.stationB?.id;
  if (typeof traceIdA !== "string" || typeof traceIdB !== "string") {
    return null;
  }
  if (pairMatchesRoute(traceIdA, traceIdB, route)) {
    return null;
  }
  return (
    `trace endpoints ${traceIdA} / ${traceIdB} ≠ current route ` +
    `${route.stationAId ?? "unknown"} / ${route.stationBId ?? "unknown"} — ` +
    `viewer-model overlay hidden`
  );
}

const MANIFEST_URL = "/fixtures/estnet/manifest.json";

// ---------------------------------------------------------------------------
// Model ↔ simulator overlay (viewer analytic prediction vs packet trace).
//
// The viewer's own `computeRuntimeProjection` publishes, per orbit, a
// representative one-hop link budget (`representativeLinkBudgetByOrbit`):
// latencyMs = slantRange/c + a fixed per-hop processing add-on, sampled at the
// midpoint of the dominant mutual-visibility window. The trace's end-to-end is
// a two-hop composition (uplink + downlink), so the model prediction drawn
// over the chart is 2 × the representative one-hop latency. The per-hop
// processing add-on is recovered from the budget's own public fields
// (latencyMs − slantRange/c) so this module never duplicates the constant.
//
// The rehearsal ESTNeT scenario additionally serializes each frame at the
// stock 9600 bps PHY (100 B payload + 42 B headers = 142 B/leg); that term
// dominates the model↔trace delta and exists ONLY on the ESTNeT side. The
// same per-leg constant (118.34 ms) is what `estnet:crosscheck` fits with
// µs-level residuals. It is applied only when the trace's own assumptionSet
// declares the 9600 bps PHY — an unknown-PHY delivery gets the total delta
// without a serialization split (no invented decomposition).
//
// R12: both sides are models (analytic geometry vs packet simulation);
// agreement is implementation consistency, never validation against a
// measurement. The disclosure block states this verbatim.
const SPEED_OF_LIGHT_KM_PER_S = 299792.458;
const ESTNET_FRAME_BYTES = 142;
const ESTNET_PHY_BPS = 9600;
const ESTNET_SERIALIZATION_PER_LEG_MS =
  (ESTNET_FRAME_BYTES * 8 * 1000) / ESTNET_PHY_BPS;
const TRACE_HOP_COUNT = 2;

export interface EstnetTracePanelSectionOptions {
  /**
   * Latest runtime projection result the side panel rendered. Enables the
   * model↔simulator overlay (dashed analytic step + delta decomposition).
   * Optional — the section renders without it.
   */
  readonly runtimeResult?: RuntimeProjectionResult | null;
  /**
   * Replay clock to anchor the chart's vertical time cursor to. The cursor
   * maps replay wall-time onto the trace via `metadata.simEpochUtc`
   * (tMs = wallMs − epochMs); while the on-globe replay crosses a handover
   * event, the cursor crosses the same instant on the latency step. Hidden
   * whenever the replay time falls outside the trace's simulated window
   * (e.g. the live wall-clock route vs a pinned trace). Optional.
   */
  readonly replayClock?: ReplayClock | null;
  /**
   * Sink for the strip header title. When provided, the per-trace path
   * label renders THERE (one merged header row: path label + close button)
   * and the chart panel skips its own title row — in the split-screen
   * strip every non-chart row costs plot height. Without it the chart
   * panel keeps a local title row.
   */
  readonly setChartTitle?: (label: string) => void;
}

interface ModelOverlayOrbit {
  readonly orbitClass: string;
  readonly model2HopMs: number;
  readonly modelPropagationMs: number;
  readonly modelProcessingMs: number;
  readonly observedMeanMs: number | null;
  readonly anchor: RepresentativeLinkBudget;
}

interface ModelOverlay {
  readonly perOrbit: ReadonlyArray<ModelOverlayOrbit>;
  readonly serializationApplicable: boolean;
  readonly serialization2LegMs: number;
  /**
   * True when the panel's projection window overlaps the trace's simulated
   * window; false when the model anchors were sampled in a different window
   * (disclosed in the delta block); null when the trace carries no epoch.
   */
  readonly windowAligned: boolean | null;
  readonly projectionWindowLabel: string;
  readonly traceWindowLabel: string | null;
}

function orbitsInTrace(trace: PacketTrace): string[] {
  if (trace.segments && trace.segments.length > 0) {
    const seen: string[] = [];
    for (const seg of trace.segments) {
      if (!seen.includes(seg.orbitClass)) {
        seen.push(seg.orbitClass);
      }
    }
    return seen;
  }
  // schemaVersion 1 carries no per-sample orbit tag; bind from the trace's own
  // satellite/path description, else skip the overlay (no invented binding).
  const label = `${trace.metadata?.satellite ?? ""} ${trace.pathLabel}`;
  const match = label.match(/\b(GEO|MEO|LEO)\b/);
  return match ? [match[1]] : [];
}

function observedMeanLatencyMs(trace: PacketTrace, orbit: string): number | null {
  if (trace.handover && trace.summary.meanLatencyByOrbitMs) {
    const value = trace.summary.meanLatencyByOrbitMs[orbit];
    return isFiniteNumber(value) ? value : null;
  }
  return isFiniteNumber(trace.summary.meanLatencyMs)
    ? trace.summary.meanLatencyMs
    : null;
}

// Exported for the unit suite (pure function; no DOM access).
export function computeModelOverlay(
  trace: PacketTrace,
  runtimeResult: RuntimeProjectionResult | null | undefined
): ModelOverlay | null {
  if (!runtimeResult || latencySemanticOf(trace) !== "one-way") {
    return null;
  }
  // Pair guard: when the trace declares its own endpoints, the viewer-model
  // anchors are only a valid comparison if the panel's CURRENT pair is the
  // same pair (order-agnostic — the latency comparison is direction-free).
  // FAIL CLOSED: declared trace endpoints with unknown route endpoints also
  // suppress the overlay — never compare against an unidentified pair. The
  // suppression is exactly `pairCompatibilityDisclosure` returning non-null,
  // so the panel always explains it (shared pairMatchesRoute predicate).
  if (pairCompatibilityDisclosure(trace, routeIdsOfResult(runtimeResult)) !== null) {
    return null;
  }
  const perOrbit: ModelOverlayOrbit[] = [];
  for (const orbitClass of orbitsInTrace(trace)) {
    const anchor =
      runtimeResult.representativeLinkBudgetByOrbit[
        orbitClass as keyof typeof runtimeResult.representativeLinkBudgetByOrbit
      ];
    if (!anchor || !isFiniteNumber(anchor.latencyMs) || !isFiniteNumber(anchor.slantRangeKm)) {
      continue;
    }
    const oneHopPropagationMs =
      (anchor.slantRangeKm / SPEED_OF_LIGHT_KM_PER_S) * 1000;
    perOrbit.push({
      orbitClass,
      model2HopMs: TRACE_HOP_COUNT * anchor.latencyMs,
      modelPropagationMs: TRACE_HOP_COUNT * oneHopPropagationMs,
      modelProcessingMs: TRACE_HOP_COUNT * (anchor.latencyMs - oneHopPropagationMs),
      observedMeanMs: observedMeanLatencyMs(trace, orbitClass),
      anchor
    });
  }
  if (perOrbit.length === 0) {
    return null;
  }
  // Window alignment: the anchors are representative samples of the panel's
  // CURRENT projection window. When that window does not overlap the trace's
  // simulated window (live wall-clock route vs the pinned trace), the
  // comparison is orbit-representative only — disclosed, never hidden.
  const epochMs = Date.parse(trace.metadata?.simEpochUtc ?? "");
  let windowAligned: boolean | null = null;
  let traceWindowLabel: string | null = null;
  if (Number.isFinite(epochMs) && trace.samples.length > 0) {
    const traceStartMs = epochMs + trace.samples[0].tMs;
    const traceEndMs = epochMs + trace.samples[trace.samples.length - 1].tMs;
    const projStartMs = Date.parse(runtimeResult.timeWindow.startUtc);
    const projEndMs = Date.parse(runtimeResult.timeWindow.endUtc);
    if (Number.isFinite(projStartMs) && Number.isFinite(projEndMs)) {
      windowAligned = traceStartMs <= projEndMs && projStartMs <= traceEndMs;
    }
    traceWindowLabel = `${new Date(traceStartMs).toISOString().slice(0, 16)}Z..${new Date(
      traceEndMs
    )
      .toISOString()
      .slice(0, 16)}Z`;
  }
  return {
    perOrbit,
    serializationApplicable: /9600\s*bps/i.test(trace.assumptionSet ?? ""),
    serialization2LegMs: TRACE_HOP_COUNT * ESTNET_SERIALIZATION_PER_LEG_MS,
    windowAligned,
    projectionWindowLabel: `${runtimeResult.timeWindow.startUtc.slice(0, 16)}Z..${runtimeResult.timeWindow.endUtc.slice(0, 16)}Z`,
    traceWindowLabel
  };
}

const SVGNS = "http://www.w3.org/2000/svg";
// Fallback viewBox size — used when the chart renders into a box it cannot
// measure (hidden strip). Visible renders aspect-fit instead: buildChart
// receives the strip's live flex-box size, so one viewBox unit ≈ one CSS
// pixel and the full-width split-screen strip is filled edge to edge (a
// fixed 1064×340 viewBox letterboxed to a stamp-sized chart in short strips).
const W = 1064;
const H = 340;
const BASE_MARGIN = { l: 56, r: 24, t: 30, b: 30 } as const;
const ORBIT_COLOR: Record<string, string> = {
  GEO: "#4cc2ff",
  MEO: "#7cffb2",
  LEO: "#ffcf5c"
};
const LATENCY_COLOR = "#4cc2ff";
const THROUGHPUT_COLOR = "#7cffb2";
const HANDOVER_COLOR = "#ffcf5c";
const LOSS_COLOR = "#ff6b6b";
const MODEL_COLOR = "#f0f0f0";

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function assertManifestShape(raw: unknown): PacketTraceManifest {
  const manifest = raw as PacketTraceManifest;
  if (!manifest || manifest.schemaVersion !== 1) {
    throw new Error("manifest schemaVersion must be 1");
  }
  if (!Array.isArray(manifest.traces) || manifest.traces.length === 0) {
    throw new Error("manifest.traces must be a non-empty array");
  }
  const seenIds = new Set<string>();
  for (const entry of manifest.traces) {
    if (
      typeof entry?.id !== "string" ||
      entry.id.length === 0 ||
      typeof entry.label !== "string" ||
      entry.label.length === 0 ||
      typeof entry.url !== "string" ||
      !entry.url.startsWith("/fixtures/estnet/")
    ) {
      throw new Error("manifest entry requires id, label, /fixtures/estnet/ url");
    }
    if (seenIds.has(entry.id)) {
      throw new Error(`manifest trace id duplicated: ${entry.id}`);
    }
    seenIds.add(entry.id);
    // Pair hints are both-or-neither, non-empty strings. Deeper truth checks
    // (hint == fixture metadata == registry id) live in verify:estnet — the
    // renderer only guards the shape it consumes.
    const hasHintA = entry.stationA !== undefined;
    const hasHintB = entry.stationB !== undefined;
    if (hasHintA !== hasHintB) {
      throw new Error(`manifest entry ${entry.id}: stationA/stationB hints must be both present or both absent`);
    }
    if (
      hasHintA &&
      (typeof entry.stationA !== "string" ||
        entry.stationA.length === 0 ||
        typeof entry.stationB !== "string" ||
        entry.stationB.length === 0)
    ) {
      throw new Error(`manifest entry ${entry.id}: stationA/stationB hints must be non-empty strings`);
    }
  }
  return manifest;
}

function defaultManifestEntry(
  manifest: PacketTraceManifest
): PacketTraceManifestEntry {
  return manifest.traces.find((entry) => entry.default === true) ?? manifest.traces[0];
}

// Static fixtures — fetched once per URL and cached so the frequent panel
// re-renders (e.g. rain-slider drags) never re-hit the network.
const traceCache = new Map<string, Promise<PacketTrace>>();
let manifestCache: Promise<PacketTraceManifest> | null = null;

function fetchJson<T>(url: string): Promise<T> {
  return fetch(url).then((response) => {
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return response.json() as Promise<T>;
  });
}

function loadManifest(): Promise<PacketTraceManifest> {
  if (manifestCache) {
    return manifestCache;
  }
  const promise = fetchJson<unknown>(MANIFEST_URL).then(assertManifestShape);
  // Drop the cache entry on failure so a later open can retry.
  promise.catch(() => {
    manifestCache = null;
  });
  manifestCache = promise;
  return promise;
}

function loadTrace(url: string): Promise<PacketTrace> {
  const cached = traceCache.get(url);
  if (cached) {
    return cached;
  }
  const promise = fetchJson<PacketTrace>(url);
  promise.catch(() => traceCache.delete(url));
  traceCache.set(url, promise);
  return promise;
}

function fmt(value: number | null | undefined, digits = 1): string {
  return value == null || !Number.isFinite(value)
    ? "—"
    : Number(value).toFixed(digits);
}

function svgEl(name: string, attrs: Record<string, string | number> = {}): SVGElement {
  const node = document.createElementNS(SVGNS, name) as SVGElement;
  for (const [key, value] of Object.entries(attrs)) {
    node.setAttribute(key, String(value));
  }
  return node;
}

// Provenance-tier labels mirror the PACKET-TRACE-CONTRACT §3 enum exactly
// (the operator-measured tier is refused upstream and a legacy
// synthetic-placeholder label was dead code — nothing in the chain produces
// either, so neither is labelable here). An unknown tier renders verbatim,
// never re-labeled.
export function sourceClassLabel(sourceClass: string): string {
  switch (sourceClass) {
    case "external-simulator-derived":
      return "ESTNeT-simulated (not operator-measured)";
    case "requirement-provided-estnet":
      return "requirement-delivered ESTNeT (simulation, not operator-measured)";
    case "network-test-derived":
      return "network-test capture (not an operator RF measurement)";
    default:
      return sourceClass;
  }
}

// Metric-derivation badge per ingest format (PACKET-TRACE-CONTRACT §4). The
// two committed adapters carry no `metadata.ingestFormat` and derive both.
export function derivationBadgeText(trace: PacketTrace): string {
  switch (trace.metadata?.ingestFormat) {
    case "ping":
      return "derived: jitter (over RTT) · no throughput signal";
    case "iperf3":
      return "jitter/loss: tool-reported (UDP) · no latency signal";
    default:
      return "derived: jitter + loss";
  }
}

function buildBadge(text: string, kind?: "sim" | "warn"): HTMLElement {
  const badge = document.createElement("span");
  badge.className = "v4-estnet-trace__badge";
  if (kind) {
    badge.classList.add(`v4-estnet-trace__badge--${kind}`);
  }
  badge.textContent = text;
  return badge;
}

function buildBadges(trace: PacketTrace): HTMLElement {
  const row = document.createElement("div");
  row.className = "v4-estnet-trace__badges";
  row.append(
    buildBadge(sourceClassLabel(trace.sourceClass), "sim"),
    buildBadge(`tool: ${trace.toolProvenance ?? "—"}`)
  );
  const deliveredBy = trace.metadata?.deliveredBy;
  if (deliveredBy) {
    row.append(buildBadge(`delivered by: ${deliveredBy}`));
  }
  if (latencySemanticOf(trace) === "rtt") {
    row.append(buildBadge("latency = RTT (round-trip, not one-way)", "warn"));
  }
  if (trace.handover) {
    row.append(buildBadge("showcase handover (not RF-failure)", "warn"));
  }
  row.append(buildBadge(derivationBadgeText(trace), "warn"));
  return row;
}

function buildCard(label: string, value: string, unit: string, orbit?: string): HTMLElement {
  const card = document.createElement("div");
  card.className = "v4-estnet-trace__card";
  if (orbit) {
    card.classList.add(`v4-estnet-trace__card--${orbit.toLowerCase()}`);
    card.style.setProperty("--orbit-color", ORBIT_COLOR[orbit] ?? "#fff");
  }
  const k = document.createElement("div");
  k.className = "v4-estnet-trace__card-k";
  k.textContent = label;
  const v = document.createElement("div");
  v.className = "v4-estnet-trace__card-v";
  v.textContent = value;
  const u = document.createElement("span");
  u.className = "v4-estnet-trace__card-u";
  u.textContent = unit;
  v.append(" ", u);
  card.append(k, v);
  return card;
}

function finiteThroughputsMbps(trace: PacketTrace): number[] {
  return trace.samples
    .map((sample) => sample.throughputMbps)
    .filter((value): value is number => isFiniteNumber(value) && value > 0);
}

function buildThroughputCard(trace: PacketTrace): HTMLElement | null {
  const throughputs = finiteThroughputsMbps(trace);
  if (throughputs.length === 0) {
    return null;
  }
  const meanMbps = throughputs.reduce((a, b) => a + b, 0) / throughputs.length;
  return meanMbps < 1
    ? buildCard("throughput", fmt(meanMbps * 1000, 2), "kbps")
    : buildCard("throughput", fmt(meanMbps, 2), "Mbps");
}

function buildCards(trace: PacketTrace): HTMLElement {
  const grid = document.createElement("div");
  grid.className = "v4-estnet-trace__cards";
  const s = trace.summary;
  const semantic = latencySemanticOf(trace);
  if (trace.handover && s.meanLatencyByOrbitMs) {
    const byOrbit = s.meanLatencyByOrbitMs;
    const step =
      byOrbit.GEO != null && byOrbit.MEO != null ? byOrbit.GEO - byOrbit.MEO : null;
    grid.append(
      buildCard("GEO latency", fmt(byOrbit.GEO, 1), "ms", "GEO"),
      buildCard("MEO latency", fmt(byOrbit.MEO, 1), "ms", "MEO"),
      buildCard("handover step", `−${fmt(step, 1)}`, "ms"),
      buildCard("handovers", String(s.handoverCount ?? "—"), ""),
      buildCard("packet loss", fmt((s.overallPacketLossRatio || 0) * 100, 2), "%"),
      buildCard("delivered", `${s.deliveredEndToEnd}/${s.sentPackets}`, "pkts")
    );
  } else {
    if (semantic !== "none") {
      grid.append(
        buildCard(
          semantic === "rtt" ? "mean RTT" : "mean latency",
          fmt(s.meanLatencyMs, 1),
          "ms"
        )
      );
    }
    grid.append(buildCard("jitter", fmt(s.finalJitterMs, 2), "ms"));
    grid.append(
      buildCard("packet loss", fmt((s.overallPacketLossRatio || 0) * 100, 2), "%")
    );
    const throughputCard = buildThroughputCard(trace);
    if (throughputCard) {
      grid.append(throughputCard);
    }
    grid.append(buildCard("delivered", `${s.deliveredEndToEnd}/${s.sentPackets}`, "pkts"));
  }
  return grid;
}

function buildLegend(trace: PacketTrace, overlay: ModelOverlay | null): HTMLElement {
  const legend = document.createElement("div");
  legend.className = "v4-estnet-trace__legend";
  const semantic = latencySemanticOf(trace);
  const item = (color: string, text: string, dashed = false): HTMLElement => {
    const span = document.createElement("span");
    span.className = "v4-estnet-trace__legend-item";
    const sw = document.createElement("span");
    sw.className = "v4-estnet-trace__legend-sw";
    if (dashed) {
      sw.classList.add("v4-estnet-trace__legend-sw--dashed");
      sw.style.borderColor = color;
    } else {
      sw.style.background = color;
    }
    span.append(sw, document.createTextNode(text));
    return span;
  };
  if (trace.handover) {
    legend.append(
      item(ORBIT_COLOR.GEO, "latency — GEO relay"),
      item(ORBIT_COLOR.MEO, "latency — MEO relay"),
      item(HANDOVER_COLOR, "handover")
    );
    if (trace.samples.some((sample) => sample.linkUp === false)) {
      legend.append(item(LOSS_COLOR, "re-point loss (disclosed)"));
    }
  } else if (semantic === "none") {
    legend.append(
      item(THROUGHPUT_COLOR, "throughput (tool intervals)"),
      item(LOSS_COLOR, "packet loss / outage")
    );
  } else {
    legend.append(
      item(
        LATENCY_COLOR,
        semantic === "rtt" ? "RTT (round-trip)" : "end-to-end latency"
      )
    );
    if (finiteThroughputsMbps(trace).length > 0) {
      legend.append(item(THROUGHPUT_COLOR, "throughput"));
    }
    legend.append(item(LOSS_COLOR, "packet loss / outage"));
  }
  if (overlay) {
    legend.append(item(MODEL_COLOR, "viewer model (2-hop analytic)", true));
  }
  const hops = trace.samples.find((sample) => sample.hops != null);
  if (hops) {
    const note = document.createElement("span");
    note.className = "v4-estnet-trace__legend-note";
    note.textContent = `${hops.hops} hops (uplink + downlink)`;
    legend.append(note);
  }
  return legend;
}

interface ChartHandle {
  readonly svg: SVGSVGElement;
  /** Maps a trace time (tMs) to an SVG x coordinate. */
  readonly toX: (tMs: number) => number;
  readonly xMinMs: number;
  readonly xMaxMs: number;
  /** viewBox size this chart was laid out for (aspect-fit varies it). */
  readonly w: number;
  readonly h: number;
  /** Plot-area vertical bounds — the replay cursor spans exactly these. */
  readonly plotY0: number;
  readonly plotY1: number;
}

function buildChart(
  trace: PacketTrace,
  overlay: ModelOverlay | null,
  dims?: { readonly w: number; readonly h: number }
): ChartHandle {
  const cw = dims?.w ?? W;
  const ch = dims?.h ?? H;
  // Adaptive vertical margins: a short aspect-fit strip cannot afford 60px
  // of chrome around the plot. Shadows the module fallback on purpose so
  // every layout expression below picks the fitted values.
  const MARGIN = {
    l: BASE_MARGIN.l,
    r: BASE_MARGIN.r,
    t: ch < 220 ? 18 : BASE_MARGIN.t,
    b: ch < 220 ? 20 : BASE_MARGIN.b
  } as const;
  // Very short strips drop the in-plot text layers (segment labels, the
  // "⇄ handover" captions, the model-line caption) — they collide in a
  // few dozen pixels of plot, and the legend row already carries the same
  // semantics. Bands, markers and lines always stay.
  const showPlotLabels = ch >= 110;
  const svg = svgEl("svg", {
    viewBox: `0 0 ${cw} ${ch}`,
    preserveAspectRatio: "xMidYMid meet",
    class: "v4-estnet-trace__svg"
  }) as SVGSVGElement;

  const samples = trace.samples;
  const semantic = latencySemanticOf(trace);
  const xs = samples.map((d) => d.tMs);
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const latencies = samples
    .map((d) => d.latencyMs)
    .filter((value): value is number => isFiniteNumber(value));
  const throughputs = finiteThroughputsMbps(trace);
  // Primary y series: latency when the trace has one; else throughput
  // (iperf3-class `latencySemantic: "none"` traces).
  const hasLatency = semantic !== "none" && latencies.length > 0;
  // Machine-readable y-axis semantic for the panel gate: assert this
  // attribute, never crawl the SVG internals.
  svg.dataset.yAxis = hasLatency ? (semantic === "rtt" ? "rtt" : "ms") : "mbps";
  const overlayLevels =
    hasLatency && overlay ? overlay.perOrbit.map((o) => o.model2HopMs) : [];
  const primaryValues = hasLatency ? [...latencies, ...overlayLevels] : throughputs;
  if (primaryValues.length === 0) {
    svg.dataset.yAxis = "none";
    const empty = svgEl("text", {
      x: cw / 2,
      y: ch / 2,
      "text-anchor": "middle",
      class: "v4-estnet-trace__svg-axis"
    });
    empty.textContent = "no plottable metric channel in this trace";
    svg.append(empty);
    return {
      svg,
      toX: () => MARGIN.l,
      xMinMs: xMin,
      xMaxMs: xMax,
      w: cw,
      h: ch,
      plotY0: MARGIN.t,
      plotY1: ch - MARGIN.b
    };
  }
  let yMin = Math.min(...primaryValues);
  let yMax = Math.max(...primaryValues);
  if (yMax - yMin < (hasLatency ? 1 : 1e-6)) {
    // Pad a flat line (steady-state GEO) so it sits centred and legible.
    const center = (yMax + yMin) / 2;
    const pad = hasLatency ? 5 : Math.max(center * 0.5, 1e-6);
    yMin = center - pad;
    yMax = center + pad;
  }
  const padY = (yMax - yMin) * 0.15 || 5;
  yMin = Math.max(0, yMin - padY);
  yMax = yMax + padY;

  const xScale = (v: number): number =>
    MARGIN.l + ((v - xMin) / ((xMax - xMin) || 1)) * (cw - MARGIN.l - MARGIN.r);
  const yScale = (v: number): number =>
    ch - MARGIN.b - ((v - yMin) / ((yMax - yMin) || 1)) * (ch - MARGIN.t - MARGIN.b);

  const handover = Boolean(trace.handover);
  const segments = trace.segments ?? [];
  // x-axis unit: minutes for the multi-phase handover, seconds for short traces.
  const xUnitDivisor = handover ? 60000 : 1000;
  const xUnitSuffix = handover ? "m" : "s";

  // Orbit segment bands + labels (handover only). Label declutter mirrors the
  // handover-marker rule: every segment keeps its band, but the text is
  // skipped when it would overlap the previous label (dense LEO successions
  // put segment midpoints a few px apart on a 6 h axis and the overlapped
  // strip was unreadable).
  const SEG_MIN_LABEL_GAP_PX = 150;
  // Compact margins put MARGIN.t - 10 above the glyph ascent — clamp the
  // above-plot label row so it never clips at the viewBox top edge.
  const plotLabelY = Math.max(MARGIN.t - 10, 11);
  let lastSegLabelX = -Infinity;
  for (const seg of segments) {
    const x0 = xScale(seg.startMs);
    const x1 = xScale(seg.endMs);
    svg.append(
      svgEl("rect", {
        x: x0,
        y: MARGIN.t,
        width: Math.max(2, x1 - x0),
        height: ch - MARGIN.t - MARGIN.b,
        fill: ORBIT_COLOR[seg.orbitClass] ?? "#888",
        "fill-opacity": 0.06
      })
    );
    if (!showPlotLabels) continue;
    const labelX = (x0 + x1) / 2;
    if (labelX - lastSegLabelX < SEG_MIN_LABEL_GAP_PX) continue;
    lastSegLabelX = labelX;
    const label = svgEl("text", {
      x: labelX,
      y: plotLabelY,
      "text-anchor": "middle",
      fill: ORBIT_COLOR[seg.orbitClass] ?? "#fff",
      class: "v4-estnet-trace__svg-seg-label"
    });
    label.textContent = `${seg.orbitClass} · ${seg.satellite.split(" (")[0]}`;
    svg.append(label);
  }

  // Grid + y labels. Short aspect-fit strips drop to 3 y-gridlines so the
  // labels stay clear of each other in the compressed plot.
  const yDivisions = ch < 220 ? 2 : 4;
  const grid = svgEl("g", { class: "v4-estnet-trace__svg-axis" });
  for (let i = 0; i <= yDivisions; i++) {
    const yv = yMin + ((yMax - yMin) * i) / yDivisions;
    const y = yScale(yv);
    grid.append(svgEl("line", { x1: MARGIN.l, y1: y, x2: cw - MARGIN.r, y2: y }));
    const tx = svgEl("text", { x: MARGIN.l - 8, y: y + 3, "text-anchor": "end" });
    tx.textContent = fmt(yv, hasLatency ? 0 : 2);
    // No room for the standalone unit label in a short strip — fold the
    // unit into the topmost tick instead.
    if (!showPlotLabels && i === yDivisions) {
      tx.textContent += hasLatency ? " ms" : " Mbps";
    }
    grid.append(tx);
  }
  // x labels.
  for (let i = 0; i <= 5; i++) {
    const xv = xMin + ((xMax - xMin) * i) / 5;
    const x = xScale(xv);
    const tx = svgEl("text", { x, y: ch - 9, "text-anchor": "middle" });
    tx.textContent = `${(xv / xUnitDivisor).toFixed(0)}${xUnitSuffix}`;
    grid.append(tx);
  }
  if (showPlotLabels) {
    const yUnit = svgEl("text", {
      x: MARGIN.l - 8,
      y: Math.max(MARGIN.t - 10, 11),
      "text-anchor": "end"
    });
    yUnit.textContent = hasLatency ? (semantic === "rtt" ? "ms (RTT)" : "ms") : "Mbps";
    grid.append(yUnit);
  }
  svg.append(grid);

  if (handover) {
    // Lost-packet shading (the disclosed re-point overrun clusters): one crisp
    // red band per lost sample, so the loss spike sits AT the handover marker.
    samples.forEach((d, i) => {
      if (d.linkUp === false) {
        const x0 = xScale(d.tMs);
        const x1 = i + 1 < samples.length ? xScale(samples[i + 1].tMs) : x0 + 6;
        svg.append(
          svgEl("rect", {
            x: x0,
            y: MARGIN.t,
            width: Math.max(2, x1 - x0),
            height: ch - MARGIN.t - MARGIN.b,
            fill: LOSS_COLOR,
            "fill-opacity": 0.3,
            class: "v4-estnet-trace__svg-loss"
          })
        );
      }
    });
  } else {
    // Loss / outage shading.
    samples.forEach((d, i) => {
      if (d.linkUp === false || (d.packetLossRatio ?? 0) > 0) {
        const x0 = xScale(d.tMs);
        const x1 = i + 1 < samples.length ? xScale(samples[i + 1].tMs) : x0 + 6;
        svg.append(
          svgEl("rect", {
            x: x0,
            y: MARGIN.t,
            width: Math.max(2, x1 - x0),
            height: ch - MARGIN.t - MARGIN.b,
            fill: LOSS_COLOR,
            "fill-opacity": d.linkUp === false ? 0.28 : 0.14,
            class: "v4-estnet-trace__svg-loss"
          })
        );
      }
    });

    // Throughput area (scaled to its own max, drawn low) — only as a secondary
    // channel under a latency line; when throughput IS the primary series it is
    // drawn as the main line below instead.
    if (hasLatency && throughputs.length > 0) {
      const tpMax = Math.max(...throughputs, 1e-9);
      const baseY = ch - MARGIN.b;
      let area = `M ${xScale(samples[0].tMs)} ${baseY}`;
      for (const d of samples) {
        const tp = isFiniteNumber(d.throughputMbps) ? d.throughputMbps : 0;
        const h = (tp / tpMax) * ((ch - MARGIN.t - MARGIN.b) * 0.28);
        area += ` L ${xScale(d.tMs)} ${baseY - h}`;
      }
      area += ` L ${xScale(samples[samples.length - 1].tMs)} ${baseY} Z`;
      svg.append(
        svgEl("path", { d: area, fill: THROUGHPUT_COLOR, "fill-opacity": 0.16, stroke: "none" })
      );
    }
  }

  // Viewer-model overlay: dashed analytic step — one level per serving orbit,
  // spanning each segment (v2) or the whole trace (v1). The gap between the
  // dashed step and the solid trace is decomposed in the disclosure block.
  if (hasLatency && overlay) {
    const byOrbit = new Map(overlay.perOrbit.map((o) => [o.orbitClass, o]));
    const spans: Array<{ x0: number; x1: number; level: ModelOverlayOrbit }> = [];
    if (segments.length > 0) {
      for (const seg of segments) {
        const level = byOrbit.get(seg.orbitClass);
        if (level) {
          spans.push({ x0: xScale(seg.startMs), x1: xScale(seg.endMs), level });
        }
      }
    } else if (overlay.perOrbit.length === 1) {
      spans.push({ x0: xScale(xMin), x1: xScale(xMax), level: overlay.perOrbit[0] });
    }
    for (const span of spans) {
      const y = yScale(span.level.model2HopMs);
      svg.append(
        svgEl("line", {
          x1: span.x0,
          y1: y,
          x2: span.x1,
          y2: y,
          stroke: MODEL_COLOR,
          "stroke-width": 1.8,
          "stroke-dasharray": "7 4",
          "stroke-opacity": 0.85,
          class: "v4-estnet-trace__svg-model-line"
        })
      );
    }
    if (spans.length > 0 && showPlotLabels) {
      // Anchor the caption to the HIGHEST dashed level (highest = furthest
      // from the x-axis), so it never collides with the handover labels that
      // sit along the chart bottom.
      const anchorSpan = spans.reduce((best, span) =>
        span.level.model2HopMs > best.level.model2HopMs ? span : best
      );
      const tx = svgEl("text", {
        x: anchorSpan.x0 + 6,
        y: yScale(anchorSpan.level.model2HopMs) - 5,
        "text-anchor": "start",
        fill: MODEL_COLOR,
        class: "v4-estnet-trace__svg-model-label"
      });
      tx.textContent = "viewer model (2-hop analytic)";
      svg.append(tx);
    }
  }

  // Handover markers. Prefer the fixture's own geometry-true instants
  // (metadata.handoverWindowUtc = absolute AOS/LOS times, mapped through
  // simEpochUtc) — the re-point loss clusters START exactly there, so the
  // marker, the on-globe event pill and the loss band share one instant.
  // Traces without that metadata fall back to segment-gap midpoints.
  if (segments.length > 1) {
    const markerEpochMs = Date.parse(trace.metadata?.simEpochUtc ?? "");
    const declaredMarkerXs = Number.isFinite(markerEpochMs)
      ? (trace.metadata?.handoverWindowUtc ?? [])
          .map((iso) => Date.parse(iso) - markerEpochMs)
          .filter((tMs) => Number.isFinite(tMs) && tMs > xMin && tMs < xMax)
          .map((tMs) => xScale(tMs))
      : [];
    const markerXs =
      declaredMarkerXs.length > 0
        ? declaredMarkerXs
        : segments
            .slice(1)
            .map((seg, i) => xScale((segments[i].endMs + seg.startMs) / 2));
    // Label declutter: every marker keeps its line, but the "⇄ handover" text
    // is skipped when it would overlap the previous label (dense LEO handover
    // successions put boundaries a few px apart on a 6 h axis).
    const MIN_LABEL_GAP_PX = 110;
    let lastLabelX = -Infinity;
    for (const xb of markerXs) {
      svg.append(
        svgEl("line", {
          x1: xb,
          y1: MARGIN.t,
          x2: xb,
          y2: ch - MARGIN.b,
          stroke: HANDOVER_COLOR,
          "stroke-width": 1.4,
          "stroke-dasharray": "5 3",
          class: "v4-estnet-trace__svg-ho-marker"
        })
      );
      if (!showPlotLabels) continue;
      if (xb - lastLabelX < MIN_LABEL_GAP_PX) continue;
      lastLabelX = xb;
      const tx = svgEl("text", {
        x: xb,
        y: ch - MARGIN.b - 4,
        "text-anchor": "middle",
        fill: HANDOVER_COLOR,
        class: "v4-estnet-trace__svg-ho-label"
      });
      tx.textContent = "⇄ handover";
      svg.append(tx);
    }
  }

  // Primary polyline. For the handover trace, split the latency line per orbit
  // segment (and break it across gaps); for flat traces draw one continuous
  // line — latency when present, else throughput.
  if (handover) {
    let cur: string | null = null;
    let path = "";
    let color = "#fff";
    const flush = (): void => {
      if (path) {
        svg.append(
          svgEl("path", { d: path, fill: "none", stroke: color, "stroke-width": 2.4 })
        );
      }
      path = "";
    };
    for (const d of samples) {
      if (d.latencyMs == null) {
        flush();
        cur = null;
        continue;
      }
      const orbit = d.orbitClass ?? "GEO";
      if (orbit !== cur) {
        flush();
        cur = orbit;
        color = ORBIT_COLOR[orbit] ?? "#fff";
        path = `M ${xScale(d.tMs)} ${yScale(d.latencyMs)}`;
      } else {
        path += ` L ${xScale(d.tMs)} ${yScale(d.latencyMs)}`;
      }
    }
    flush();
  } else {
    const primaryOf = (d: PacketTraceSample): number | null =>
      hasLatency
        ? d.latencyMs
        : isFiniteNumber(d.throughputMbps) && d.throughputMbps > 0
          ? d.throughputMbps
          : null;
    const lineColor = hasLatency ? LATENCY_COLOR : THROUGHPUT_COLOR;
    let path = "";
    for (const d of samples) {
      const v = primaryOf(d);
      if (v == null) {
        path += " ";
        continue;
      }
      path += `${path === "" ? "M" : "L"} ${xScale(d.tMs)} ${yScale(v)} `;
    }
    svg.append(
      svgEl("path", { d: path, fill: "none", stroke: lineColor, "stroke-width": 2.2 })
    );
    for (const d of samples) {
      const v = primaryOf(d);
      if (v == null) {
        continue;
      }
      svg.append(
        svgEl("circle", { cx: xScale(d.tMs), cy: yScale(v), r: 2.6, fill: lineColor })
      );
    }
  }

  return {
    svg,
    toX: xScale,
    xMinMs: xMin,
    xMaxMs: xMax,
    w: cw,
    h: ch,
    plotY0: MARGIN.t,
    plotY1: ch - MARGIN.b
  };
}

// Replay-time cursor: a vertical line swept across the chart by the replay
// clock, so the on-globe handover instant and the latency step line up on the
// same x. Anchoring needs the trace's absolute epoch (metadata.simEpochUtc);
// without one there is nothing honest to anchor to and no cursor is drawn.
// Returns an unsubscribe function, or null when no cursor was attached.
function attachReplayCursor(
  handle: ChartHandle,
  trace: PacketTrace,
  replayClock: ReplayClock
): (() => void) | null {
  const epochMs = Date.parse(trace.metadata?.simEpochUtc ?? "");
  if (!Number.isFinite(epochMs) || trace.samples.length === 0) {
    return null;
  }
  const group = svgEl("g", {
    class: "v4-estnet-trace__svg-cursor",
    display: "none"
  });
  const line = svgEl("line", {
    y1: handle.plotY0,
    y2: handle.plotY1,
    stroke: "#ffffff",
    "stroke-width": 1.6,
    "stroke-opacity": 0.85
  });
  const label = svgEl("text", {
    y: handle.plotY0 + 14,
    "text-anchor": "middle",
    fill: "#ffffff",
    class: "v4-estnet-trace__svg-cursor-label"
  });
  group.append(line, label);
  handle.svg.append(group);
  handle.svg.dataset.replayCursor = "outside";

  let lastX = Number.NaN;
  let lastInside: boolean | null = null;
  const update = (state: ReplayClockState): void => {
    const wallMs =
      typeof state.currentTime === "number"
        ? state.currentTime
        : Date.parse(state.currentTime);
    if (!Number.isFinite(wallMs)) {
      return;
    }
    const tMs = wallMs - epochMs;
    const inside = tMs >= handle.xMinMs && tMs <= handle.xMaxMs;
    if (!inside) {
      if (lastInside !== false) {
        group.setAttribute("display", "none");
        handle.svg.dataset.replayCursor = "outside";
        lastInside = false;
      }
      return;
    }
    if (lastInside !== true) {
      group.removeAttribute("display");
      handle.svg.dataset.replayCursor = "inside";
      lastInside = true;
    }
    const x = handle.toX(tMs);
    if (Number.isFinite(lastX) && Math.abs(x - lastX) < 0.25) {
      return;
    }
    lastX = x;
    line.setAttribute("x1", String(x));
    line.setAttribute("x2", String(x));
    // Keep the label inside the plot area near the edges.
    const labelX = Math.min(
      Math.max(x, BASE_MARGIN.l + 34),
      handle.w - BASE_MARGIN.r - 34
    );
    label.setAttribute("x", String(labelX));
    label.textContent = `▶ ${new Date(wallMs).toISOString().slice(11, 19)}Z`;
  };
  update(replayClock.getState());
  return replayClock.onTick(update);
}

// Delta reconciliation: reconciles the dashed viewer-model step with the
// solid trace, per orbit. Serialization is split out only when the trace's
// own assumptionSet declares the stock 9600 bps PHY; otherwise the delta
// stays un-decomposed (honest: no invented terms for an unknown PHY).
//
// Panel-density rule (third pass, 2026-07-02): the reconciliation is
// claim-level evidence and STAYS in the panel — but as visuals, not prose.
// One always-visible card per orbit: orbit-colored Δ figure, sim-vs-model
// sub-line, compact labeled decomposition terms (the anchor provenance
// moves to the terms' hover title). The prose sentences the first pass hid
// behind a collapsed <details> are gone; the two honesty one-liners
// (cross-window caveat, consistency ≠ validation) stay as single muted
// lines under the cards.
function buildModelDeltaBlock(overlay: ModelOverlay): HTMLElement {
  const block = document.createElement("div");
  block.className = "v4-estnet-trace__model-delta";
  block.dataset.modelDelta = "true";

  const header = document.createElement("div");
  header.className = "v4-estnet-trace__model-delta-header";
  const title = document.createElement("span");
  title.className = "v4-estnet-trace__expand-title";
  title.textContent = "Model ↔ simulator Δ";
  header.append(title);
  if (overlay.windowAligned === false) {
    const warn = document.createElement("span");
    warn.className =
      "v4-estnet-trace__delta-chip v4-estnet-trace__delta-chip--warn";
    warn.textContent = "⚠ window mismatch";
    header.append(warn);
  }
  block.append(header);

  const grid = document.createElement("div");
  grid.className = "v4-estnet-trace__delta-grid";
  block.append(grid);

  for (const level of overlay.perOrbit) {
    const observed = level.observedMeanMs;
    const delta = observed != null ? observed - level.model2HopMs : null;

    const card = document.createElement("div");
    card.className = "v4-estnet-trace__delta-card";
    card.dataset.orbit = level.orbitClass;
    card.style.setProperty(
      "--orbit-color",
      ORBIT_COLOR[level.orbitClass] ?? MODEL_COLOR
    );

    const orbitTag = document.createElement("span");
    orbitTag.className = "v4-estnet-trace__delta-card-orbit";
    orbitTag.textContent = level.orbitClass;

    const figure = document.createElement("span");
    figure.className = "v4-estnet-trace__delta-card-figure";
    figure.dataset.deltaFigure = "true";
    figure.textContent = `${
      delta != null && delta >= 0 ? "+" : ""
    }${fmt(delta, 1)} ms`;

    const compare = document.createElement("span");
    compare.className = "v4-estnet-trace__delta-card-compare";
    compare.textContent = `sim ${fmt(observed, 1)} · model ${fmt(level.model2HopMs, 1)} ms`;

    const terms = document.createElement("span");
    terms.className = "v4-estnet-trace__delta-card-terms";
    if (overlay.serializationApplicable && delta != null) {
      const residual =
        delta - overlay.serialization2LegMs + level.modelProcessingMs;
      terms.textContent =
        `serialization +${fmt(overlay.serialization2LegMs, 1)} (stock PHY) · ` +
        `processing −${fmt(level.modelProcessingMs, 1)} (model add-on) · ` +
        `residual ${residual >= 0 ? "+" : ""}${fmt(residual, 1)} (slant sampling)`;
      terms.title =
        `serialization: ${TRACE_HOP_COUNT} legs × ${ESTNET_FRAME_BYTES} B @ ` +
        `${ESTNET_PHY_BPS} bps (ESTNeT stock PHY; not in the viewer model). ` +
        `processing: viewer-model per-hop add-on (not in the ESTNeT scenario). ` +
        `residual anchor: ${level.anchor.representativeSatelliteId} @ ` +
        `${level.anchor.representativeSampleUtc.slice(11, 19)}Z, ` +
        `${fmt(level.anchor.slantRangeKm, 0)} km/hop vs per-packet slant.`;
    } else {
      terms.textContent =
        "Δ not decomposed — the trace declares no stock 9600 bps PHY";
    }

    card.append(orbitTag, figure, compare, terms);
    grid.append(card);
  }

  if (overlay.windowAligned === false) {
    const windowNote = document.createElement("p");
    windowNote.className = "v4-estnet-trace__model-delta-note";
    windowNote.dataset.windowMismatch = "true";
    windowNote.textContent =
      `⚠ cross-window: model sampled in ${overlay.projectionWindowLabel}, ` +
      `trace simulated ${overlay.traceWindowLabel ?? "—"} — ` +
      `orbit-representative only; same-window via the pinned demo route.`;
    block.append(windowNote);
  }

  const note = document.createElement("p");
  note.className = "v4-estnet-trace__model-delta-note";
  note.textContent =
    "Both sides are models (analytic geometry vs packet simulation); agreement " +
    "is implementation consistency, not validation against a measurement.";
  block.append(note);

  return block;
}

// Honesty foot. Panel-density rule (2026-07-02, second pass): the verbatim
// assumptionSet / nonClaims walls are report-density content and do NOT
// render in the panel at all — the panel keeps only the honesty CLAIM (one
// line: title + non-claim count + pointer), and the verbatim text lives
// solely in the report's ESTNeT appendix (opt-in `estnet=1`), where
// verify:estnet:panel asserts it per fixture, character-exact. The first
// pass kept the walls in a collapsed <details>; the standing user rule reads
// stricter — collapsed-but-present is still panel density — so the gate now
// asserts the verbatim text is ABSENT from the panel DOM.
function buildFoot(trace: PacketTrace): HTMLElement {
  const foot = document.createElement("div");
  foot.className = "v4-estnet-trace__foot";

  // Relay identities: the multi-orbit satellites map can be a 20+-name wall
  // (the domestic chain serves 17 LEO birds), so the visible meta line keys
  // off the map's orbit KEYS only (structural — no name parsing, the values
  // are free-form descriptors where a comma is NOT a separator). The full
  // verbatim name list renders in the report appendix's provenance table;
  // the chart's segment labels keep showing each serving satellite in place.
  const meta = trace.metadata;
  if (meta) {
    const metaLine = document.createElement("div");
    metaLine.className = "v4-estnet-trace__meta";
    if (meta.satellites) {
      const orbits = Object.keys(meta.satellites).join(" / ");
      metaLine.textContent = `relays: ${orbits} · sim epoch ${meta.simEpochUtc ?? "—"}`;
    } else if (meta.satellite) {
      metaLine.textContent = `sat: ${meta.satellite} · sim epoch ${meta.simEpochUtc ?? "—"}`;
    }
    if (metaLine.textContent) {
      foot.append(metaLine);
    }
  }

  const honesty = document.createElement("div");
  honesty.className = "v4-estnet-trace__honesty";
  honesty.dataset.honestyPointer = "true";
  const title = document.createElement("span");
  title.className = "v4-estnet-trace__expand-title";
  title.textContent = "Assumptions & non-claims";
  const countChip = document.createElement("span");
  countChip.className = "v4-estnet-trace__delta-chip";
  countChip.textContent = `${trace.nonClaims?.length ?? 0} non-claims`;
  const hint = document.createElement("span");
  hint.className = "v4-estnet-trace__expand-hint";
  hint.textContent = "verbatim → Report · ESTNeT appendix";
  honesty.append(title, countChip, hint);
  foot.append(honesty);

  return foot;
}

// The route↔trace pair-mismatch disclosure line (pairCompatibilityDisclosure).
// Renders right under the badges so the missing dashed model line is explained
// where the reader looks first — never a silent omission.
function buildPairNote(text: string): HTMLElement {
  const note = document.createElement("p");
  note.className = "v4-estnet-trace__pair-note";
  note.dataset.pairMismatch = "true";
  note.textContent = text;
  return note;
}

function buildErrorBlock(what: string, error: unknown): HTMLElement {
  const block = document.createElement("div");
  block.className = "v4-estnet-trace__error";
  block.textContent = `Could not load ${what} (${
    error instanceof Error ? error.message : String(error)
  }). Run the ESTNeT adapter and serve from the dev server.`;
  return block;
}

/**
 * Builds the opt-in packet-trace disclosure section. Returns a `<details>`
 * element styled like the other side-panel disclosures. The trace menu comes
 * from `public/fixtures/estnet/manifest.json`; manifest and traces are fetched
 * lazily and cached module-wide. When `options.runtimeResult` is provided the
 * chart overlays the viewer's own analytic 2-hop latency prediction plus a
 * delta-decomposition disclosure.
 */
// Panel summary card (panel-density fourth pass, 2026-07-03): the side panel
// carries only the CLAIM that simulator/network-test packet evidence exists
// for this surface, plus the two ways to reach it — the bottom dock explorer
// and the report appendix. Everything trace-specific (selector, badges, stat
// cards, chart, Δ cards, honesty pointer) lives in the dock.
export function buildEstnetSummaryCard(options: {
  onOpenExplorer: () => void;
}): HTMLElement {
  const card = document.createElement("div");
  card.className = "v4-estnet-trace-card";
  card.dataset.estnetSummaryCard = "true";

  const title = document.createElement("div");
  title.className = "v4-estnet-trace-card__title";
  title.textContent = "Packet trace (ESTNeT / network test)";

  const line = document.createElement("p");
  line.className = "v4-estnet-trace-card__line";
  line.textContent =
    "Simulator / network-test packet evidence — no operator RF measurement.";

  const actions = document.createElement("div");
  actions.className = "v4-estnet-trace-card__actions";
  const openButton = document.createElement("button");
  openButton.type = "button";
  openButton.className = "v4-estnet-trace-card__open";
  openButton.dataset.estnetOpenDock = "true";
  openButton.textContent = "Open trace explorer";
  openButton.addEventListener("click", options.onOpenExplorer);
  const hint = document.createElement("span");
  hint.className = "v4-estnet-trace__expand-hint";
  hint.textContent = "verbatim → Report · ESTNeT appendix";
  actions.append(openButton, hint);

  card.append(title, line, actions);
  return card;
}

export interface EstnetTraceExplorerHandle {
  /**
   * Narrow column content (intro, trace selector, badges, stat cards, Δ
   * cards, honesty pointer) — lives in the ESTNeT side-panel tab.
   */
  readonly element: HTMLElement;
  /**
   * Wide content (legend + time-series chart) — lives in the thin bottom
   * chart strip, the only piece that needs BOTH width and the globe
   * simultaneously (replay-cursor ↔ handover correspondence).
   */
  readonly chartPanel: HTMLElement;
  dispose(): void;
}

export function buildEstnetTraceExplorerContent(
  options: EstnetTracePanelSectionOptions = {}
): EstnetTraceExplorerHandle {
  const body = document.createElement("div");
  body.className = "v4-estnet-trace v4-estnet-trace__explorer";

  // One line only (panel-density rule): the tier/derivation specifics render
  // per trace as badges, and the full prose lives in the report's ESTNeT
  // appendix — the panel keeps the honesty claim, not the honesty text.
  const intro = document.createElement("p");
  intro.className = "v4-estnet-trace__intro";
  intro.textContent =
    "Everything below renders from the selected trace fixture — no trace here " +
    "is an operator RF measurement.";
  body.append(intro);

  // Trace selector — populated from the manifest.
  const toggle = document.createElement("div");
  toggle.className = "v4-estnet-trace__toggle";
  toggle.setAttribute("role", "tablist");
  body.append(toggle);

  // Render mount — replaced on each trace switch.
  const mount = document.createElement("div");
  mount.className = "v4-estnet-trace__mount";
  mount.dataset.loading = "true";
  body.append(mount);

  // Chart mount — same per-trace lifecycle, rendered into the strip.
  const chartPanel = document.createElement("div");
  chartPanel.className = "v4-estnet-trace v4-estnet-trace__chart-panel";
  const chartMount = document.createElement("div");
  chartMount.className = "v4-estnet-trace__chart-mount";
  chartMount.dataset.loading = "true";
  chartPanel.append(chartMount);

  let disposed = false;
  let renderToken = 0;
  let activeId: string | null = null;
  let detachReplayCursor: (() => void) | null = null;
  const buttons = new Map<string, HTMLButtonElement>();
  // Resolved once per section build: the pre-selection and the mismatch
  // disclosure both key off this, never off later interactions.
  const route = routeIdsOfResult(options.runtimeResult);

  const syncToggle = (): void => {
    for (const [id, button] of buttons) {
      const active = id === activeId;
      button.classList.toggle("v4-estnet-trace__toggle-btn--active", active);
      button.setAttribute("aria-selected", active ? "true" : "false");
    }
  };

  const renderTrace = (entry: PacketTraceManifestEntry): void => {
    activeId = entry.id;
    syncToggle();
    const token = ++renderToken;
    mount.dataset.loading = "true";
    mount.dataset.variant = entry.id;
    chartMount.dataset.loading = "true";
    chartMount.dataset.variant = entry.id;
    loadTrace(entry.url)
      .then((trace) => {
        // A newer selection (or disposal) supersedes this render.
        if (disposed || token !== renderToken) {
          return;
        }
        delete mount.dataset.loading;
        delete chartMount.dataset.loading;
        mount.dataset.pathLabel = trace.pathLabel;
        const overlay = computeModelOverlay(trace, options.runtimeResult);
        const pairNote = options.runtimeResult
          ? pairCompatibilityDisclosure(trace, route)
          : null;
        // Wide strip: path title + legend + the chart itself. Mounted first
        // with the fallback viewBox, then aspect-fit: measure the flex box
        // the svg actually received and rebuild the chart at that size
        // (~1 viewBox unit per CSS pixel), so the full-width split-screen
        // strip is filled instead of letterboxing a fixed 1064×340 chart.
        // A hidden strip (recompute while the user keeps it closed) measures
        // 0×0 and keeps the fallback — the reopen path re-renders visible.
        let chart = buildChart(trace, overlay);
        if (options.setChartTitle) {
          // Merged header row: the path label replaces the strip's generic
          // title, so the strip spends no row on a separate chart title.
          options.setChartTitle(trace.pathLabel);
          chartMount.replaceChildren(buildLegend(trace, overlay), chart.svg);
        } else {
          const chartTitle = document.createElement("div");
          chartTitle.className = "v4-estnet-trace__chart-title";
          chartTitle.textContent = trace.pathLabel;
          chartMount.replaceChildren(
            chartTitle,
            buildLegend(trace, overlay),
            chart.svg
          );
        }
        const fitW = Math.round(chartMount.clientWidth);
        const fitH = Math.round(chart.svg.getBoundingClientRect().height);
        if (
          fitW >= 320 &&
          fitH >= 56 &&
          (fitW !== chart.w || fitH !== chart.h)
        ) {
          const fitted = buildChart(trace, overlay, { w: fitW, h: fitH });
          chart.svg.replaceWith(fitted.svg);
          chart = fitted;
        }
        detachReplayCursor?.();
        detachReplayCursor = options.replayClock
          ? attachReplayCursor(chart, trace, options.replayClock)
          : null;
        // Narrow column (side-panel tab): everything except the chart.
        mount.replaceChildren(
          buildBadges(trace),
          ...(pairNote ? [buildPairNote(pairNote)] : []),
          buildCards(trace),
          ...(overlay ? [buildModelDeltaBlock(overlay)] : []),
          buildFoot(trace)
        );
      })
      .catch((error) => {
        if (disposed || token !== renderToken) {
          return;
        }
        delete mount.dataset.loading;
        delete chartMount.dataset.loading;
        detachReplayCursor?.();
        detachReplayCursor = null;
        // A stale path label above an error block would misattribute it.
        options.setChartTitle?.("Packet trace — time series");
        mount.replaceChildren(buildErrorBlock(`the "${entry.label}" trace fixture`, error));
        chartMount.replaceChildren(
          buildErrorBlock(`the "${entry.label}" trace fixture`, error)
        );
      });
  };

  loadManifest()
    .then((manifest) => {
      if (disposed) {
        return;
      }
      for (const entry of manifest.traces) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "v4-estnet-trace__toggle-btn";
        button.dataset.variant = entry.id;
        button.textContent = entry.label;
        button.setAttribute("role", "tab");
        button.addEventListener("click", () => {
          if (entry.id !== activeId) {
            renderTrace(entry);
          }
        });
        toggle.append(button);
        buttons.set(entry.id, button);
      }
      // Pre-select the route's own trace when one exists (pair hints), else
      // the global default — computed once here, never re-derived on
      // interaction.
      renderTrace(selectManifestEntryForRoute(manifest, route));
    })
    .catch((error) => {
      if (disposed) {
        return;
      }
      delete mount.dataset.loading;
      delete chartMount.dataset.loading;
      mount.replaceChildren(buildErrorBlock("the trace manifest", error));
      chartMount.replaceChildren(buildErrorBlock("the trace manifest", error));
    });

  const dispose = (): void => {
    disposed = true;
    renderToken++;
    detachReplayCursor?.();
    detachReplayCursor = null;
  };

  return { element: body, chartPanel, dispose };
}
