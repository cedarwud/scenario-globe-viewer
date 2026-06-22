// ESTNeT packet-trace panel — opt-in (`?estnet=1`) side-panel disclosure section.
//
// Ports the two standalone preview pages (`public/estnet-trace-panel.html`,
// `public/estnet-handover-trace-panel.html`) into the V4 ground-station side
// panel as a single collapsible `<details>` disclosure with an in-panel toggle
// that switches between the two real ESTNeT traces for the canonical CHT × SANSA
// demo pair:
//   - GEO steady-state (schemaVersion 1, ABS-2A flat ~493.9 ms line)
//   - GEO↔MEO handover  (schemaVersion 2, APSTAR-7 ⇄ GSAT0102, latency steps)
//
// Honesty (R12): both fixtures are external-simulator-derived (ESTNeT v1.0,
// NOT operator-measured), jitter+loss are adapter-derived, the end-to-end is a
// composition of two one-hop RF legs, and the handover is a showcase route
// preference (mirrors `demo-balanced-v1`), NOT an RF-failure handover. Those
// disclosures travel in the fixture (`sourceClass`/`nonClaims`/`assumptionSet`)
// and are rendered verbatim — this section never upgrades the provenance tier.
//
// Opt-in only: nothing renders unless `?estnet=1` is present, so the accepted
// 19/19 default surface is untouched.

interface PacketTraceSample {
  readonly tMs: number;
  readonly latencyMs: number | null;
  readonly jitterMs?: number;
  readonly throughputMbps?: number;
  readonly packetLossRatio?: number;
  readonly linkUp?: boolean;
  readonly hops?: number;
  readonly servingSatellite?: string;
  readonly orbitClass?: string;
}

interface PacketTraceSegment {
  readonly label: string;
  readonly orbitClass: string;
  readonly satellite: string;
  readonly startMs: number;
  readonly endMs: number;
  readonly deliveredPackets: number;
}

interface PacketTraceSummary {
  readonly sentPackets: number;
  readonly deliveredEndToEnd: number;
  readonly overallPacketLossRatio: number;
  readonly meanLatencyMs: number;
  readonly minLatencyMs?: number;
  readonly maxLatencyMs?: number;
  readonly finalJitterMs?: number;
  readonly handoverCount?: number;
  readonly meanLatencyByOrbitMs?: { readonly [orbit: string]: number };
}

interface PacketTrace {
  readonly schemaVersion: number;
  readonly pathLabel: string;
  readonly sourceClass: string;
  readonly toolProvenance?: string;
  readonly assumptionSet?: string;
  readonly handover?: boolean;
  readonly nonClaims?: ReadonlyArray<string>;
  readonly metadata?: {
    readonly simEpochUtc?: string;
    readonly satellite?: string;
    readonly satellites?: { readonly [orbit: string]: string };
    readonly propagationPerHopMs?: number;
    readonly handoverWindowUtc?: ReadonlyArray<string>;
  };
  readonly segments?: ReadonlyArray<PacketTraceSegment>;
  readonly summary: PacketTraceSummary;
  readonly samples: ReadonlyArray<PacketTraceSample>;
}

type TraceVariant = "handover" | "geo";

const FIXTURE_URLS: Record<TraceVariant, string> = {
  handover: "/fixtures/estnet/cht-sansa-handover-packet-trace.json",
  geo: "/fixtures/estnet/cht-sansa-abs2a-packet-trace.json"
};

const DEFAULT_VARIANT: TraceVariant = "handover";

const SVGNS = "http://www.w3.org/2000/svg";
const W = 1064;
const H = 340;
const MARGIN = { l: 56, r: 24, t: 30, b: 30 } as const;
const ORBIT_COLOR: Record<string, string> = {
  GEO: "#4cc2ff",
  MEO: "#7cffb2",
  LEO: "#ffcf5c"
};
const LATENCY_COLOR = "#4cc2ff";
const THROUGHPUT_COLOR = "#7cffb2";
const HANDOVER_COLOR = "#ffcf5c";
const LOSS_COLOR = "#ff6b6b";

// Static fixtures — fetched once per URL and cached so the frequent panel
// re-renders (e.g. rain-slider drags) never re-hit the network.
const traceCache = new Map<string, Promise<PacketTrace>>();

function loadTrace(url: string): Promise<PacketTrace> {
  const cached = traceCache.get(url);
  if (cached) {
    return cached;
  }
  const promise = fetch(url).then((response) => {
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return response.json() as Promise<PacketTrace>;
  });
  // Drop the cache entry on failure so a later open can retry.
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

function sourceClassLabel(sourceClass: string): string {
  switch (sourceClass) {
    case "external-simulator-derived":
      return "ESTNeT-simulated (not operator-measured)";
    case "synthetic-placeholder":
      return "synthetic placeholder";
    default:
      // These fixtures are always external-simulator-derived; no measured-tier
      // label is ever emitted by this section.
      return sourceClass;
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
  if (trace.handover) {
    row.append(buildBadge("showcase handover (not RF-failure)", "warn"));
  }
  row.append(buildBadge("derived: jitter + loss", "warn"));
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

function buildCards(trace: PacketTrace): HTMLElement {
  const grid = document.createElement("div");
  grid.className = "v4-estnet-trace__cards";
  const s = trace.summary;
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
    const firstThroughput = trace.samples.find(
      (sample) => (sample.throughputMbps ?? 0) > 0
    );
    const throughputKbps = (firstThroughput?.throughputMbps ?? 0) * 1000;
    grid.append(
      buildCard("mean latency", fmt(s.meanLatencyMs, 1), "ms"),
      buildCard("jitter (RFC-3550)", fmt(s.finalJitterMs, 2), "ms"),
      buildCard("packet loss", fmt((s.overallPacketLossRatio || 0) * 100, 2), "%"),
      buildCard("throughput", fmt(throughputKbps, 2), "kbps"),
      buildCard("delivered", `${s.deliveredEndToEnd}/${s.sentPackets}`, "pkts")
    );
  }
  return grid;
}

function buildLegend(trace: PacketTrace): HTMLElement {
  const legend = document.createElement("div");
  legend.className = "v4-estnet-trace__legend";
  const item = (color: string, text: string): HTMLElement => {
    const span = document.createElement("span");
    span.className = "v4-estnet-trace__legend-item";
    const sw = document.createElement("span");
    sw.className = "v4-estnet-trace__legend-sw";
    sw.style.background = color;
    span.append(sw, document.createTextNode(text));
    return span;
  };
  if (trace.handover) {
    legend.append(
      item(ORBIT_COLOR.GEO, "latency — GEO relay"),
      item(ORBIT_COLOR.MEO, "latency — MEO relay"),
      item(HANDOVER_COLOR, "handover")
    );
  } else {
    legend.append(
      item(LATENCY_COLOR, "end-to-end latency"),
      item(THROUGHPUT_COLOR, "throughput"),
      item(LOSS_COLOR, "packet loss / outage")
    );
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

function buildChart(trace: PacketTrace): SVGSVGElement {
  const svg = svgEl("svg", {
    viewBox: `0 0 ${W} ${H}`,
    preserveAspectRatio: "xMidYMid meet",
    class: "v4-estnet-trace__svg"
  }) as SVGSVGElement;

  const samples = trace.samples;
  const xs = samples.map((d) => d.tMs);
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const latencies = samples
    .filter((d) => d.latencyMs != null)
    .map((d) => d.latencyMs as number);
  let yMin = Math.min(...latencies);
  let yMax = Math.max(...latencies);
  if (yMax - yMin < 1) {
    // Pad a flat line (steady-state GEO) so it sits centred and legible.
    const center = (yMax + yMin) / 2;
    yMin = center - 5;
    yMax = center + 5;
  }
  const padY = (yMax - yMin) * 0.15 || 5;
  yMin = Math.max(0, yMin - padY);
  yMax = yMax + padY;

  const xScale = (v: number): number =>
    MARGIN.l + ((v - xMin) / ((xMax - xMin) || 1)) * (W - MARGIN.l - MARGIN.r);
  const yScale = (v: number): number =>
    H - MARGIN.b - ((v - yMin) / ((yMax - yMin) || 1)) * (H - MARGIN.t - MARGIN.b);

  const handover = Boolean(trace.handover);
  const segments = trace.segments ?? [];
  // x-axis unit: minutes for the multi-phase handover, seconds for the GEO line.
  const xUnitDivisor = handover ? 60000 : 1000;
  const xUnitSuffix = handover ? "m" : "s";

  // Orbit segment bands + labels (handover only).
  for (const seg of segments) {
    const x0 = xScale(seg.startMs);
    const x1 = xScale(seg.endMs);
    svg.append(
      svgEl("rect", {
        x: x0,
        y: MARGIN.t,
        width: Math.max(2, x1 - x0),
        height: H - MARGIN.t - MARGIN.b,
        fill: ORBIT_COLOR[seg.orbitClass] ?? "#888",
        "fill-opacity": 0.06
      })
    );
    const label = svgEl("text", {
      x: (x0 + x1) / 2,
      y: MARGIN.t - 10,
      "text-anchor": "middle",
      fill: ORBIT_COLOR[seg.orbitClass] ?? "#fff",
      class: "v4-estnet-trace__svg-seg-label"
    });
    label.textContent = `${seg.orbitClass} · ${seg.satellite.split(" (")[0]}`;
    svg.append(label);
  }

  // Grid + y labels.
  const grid = svgEl("g", { class: "v4-estnet-trace__svg-axis" });
  for (let i = 0; i <= 4; i++) {
    const yv = yMin + ((yMax - yMin) * i) / 4;
    const y = yScale(yv);
    grid.append(svgEl("line", { x1: MARGIN.l, y1: y, x2: W - MARGIN.r, y2: y }));
    const tx = svgEl("text", { x: MARGIN.l - 8, y: y + 3, "text-anchor": "end" });
    tx.textContent = fmt(yv, 0);
    grid.append(tx);
  }
  // x labels.
  for (let i = 0; i <= 5; i++) {
    const xv = xMin + ((xMax - xMin) * i) / 5;
    const x = xScale(xv);
    const tx = svgEl("text", { x, y: H - 9, "text-anchor": "middle" });
    tx.textContent = `${(xv / xUnitDivisor).toFixed(0)}${xUnitSuffix}`;
    grid.append(tx);
  }
  const yUnit = svgEl("text", { x: MARGIN.l - 8, y: MARGIN.t - 10, "text-anchor": "end" });
  yUnit.textContent = "ms";
  grid.append(yUnit);
  svg.append(grid);

  if (!handover) {
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
            height: H - MARGIN.t - MARGIN.b,
            fill: LOSS_COLOR,
            "fill-opacity": d.linkUp === false ? 0.28 : 0.14
          })
        );
      }
    });

    // Throughput area (scaled to its own max, drawn low).
    const throughputs = samples.map((d) => d.throughputMbps ?? 0);
    const tpMax = Math.max(...throughputs, 1e-9);
    const baseY = H - MARGIN.b;
    let area = `M ${xScale(samples[0].tMs)} ${baseY}`;
    for (const d of samples) {
      const h = ((d.throughputMbps ?? 0) / tpMax) * ((H - MARGIN.t - MARGIN.b) * 0.28);
      area += ` L ${xScale(d.tMs)} ${baseY - h}`;
    }
    area += ` L ${xScale(samples[samples.length - 1].tMs)} ${baseY} Z`;
    svg.append(
      svgEl("path", { d: area, fill: THROUGHPUT_COLOR, "fill-opacity": 0.16, stroke: "none" })
    );
  }

  // Handover boundary markers (between consecutive segments).
  for (let i = 1; i < segments.length; i++) {
    const xb = xScale((segments[i - 1].endMs + segments[i].startMs) / 2);
    svg.append(
      svgEl("line", {
        x1: xb,
        y1: MARGIN.t,
        x2: xb,
        y2: H - MARGIN.b,
        stroke: HANDOVER_COLOR,
        "stroke-width": 1.4,
        "stroke-dasharray": "5 3"
      })
    );
    const tx = svgEl("text", {
      x: xb,
      y: H - MARGIN.b - 4,
      "text-anchor": "middle",
      fill: HANDOVER_COLOR,
      class: "v4-estnet-trace__svg-ho-label"
    });
    tx.textContent = "⇄ handover";
    svg.append(tx);
  }

  // Latency polyline. For the handover trace, split the line per orbit segment
  // (and break it across gaps); for the GEO trace draw one continuous line.
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
    let path = "";
    for (const d of samples) {
      if (d.latencyMs == null) {
        path += " ";
        continue;
      }
      path += `${path === "" ? "M" : "L"} ${xScale(d.tMs)} ${yScale(d.latencyMs)} `;
    }
    svg.append(
      svgEl("path", { d: path, fill: "none", stroke: LATENCY_COLOR, "stroke-width": 2.2 })
    );
    for (const d of samples) {
      if (d.latencyMs == null) {
        continue;
      }
      svg.append(
        svgEl("circle", { cx: xScale(d.tMs), cy: yScale(d.latencyMs), r: 2.6, fill: LATENCY_COLOR })
      );
    }
  }

  return svg;
}

function buildFoot(trace: PacketTrace): HTMLElement {
  const foot = document.createElement("div");
  foot.className = "v4-estnet-trace__foot";

  const assumptions = document.createElement("p");
  assumptions.className = "v4-estnet-trace__assumptions";
  const strong = document.createElement("strong");
  strong.textContent = "Assumptions: ";
  assumptions.append(strong, document.createTextNode(trace.assumptionSet ?? "—"));
  foot.append(assumptions);

  if (trace.nonClaims && trace.nonClaims.length > 0) {
    const list = document.createElement("ul");
    list.className = "v4-estnet-trace__nonclaims";
    for (const claim of trace.nonClaims) {
      const li = document.createElement("li");
      li.textContent = claim;
      list.append(li);
    }
    foot.append(list);
  }

  const meta = trace.metadata;
  if (meta) {
    const metaLine = document.createElement("div");
    metaLine.className = "v4-estnet-trace__meta";
    if (meta.satellites) {
      const orbits = Object.entries(meta.satellites)
        .map(([orbit, sat]) => `${orbit}: ${sat}`)
        .join(" · ");
      metaLine.textContent = `relays: ${orbits} · sim epoch ${meta.simEpochUtc ?? "—"}`;
    } else if (meta.satellite) {
      metaLine.textContent = `sat: ${meta.satellite} · sim epoch ${meta.simEpochUtc ?? "—"}`;
    }
    if (metaLine.textContent) {
      foot.append(metaLine);
    }
  }

  return foot;
}

function buildErrorBlock(variant: TraceVariant, error: unknown): HTMLElement {
  const block = document.createElement("div");
  block.className = "v4-estnet-trace__error";
  block.textContent = `Could not load the ${variant} trace fixture (${
    error instanceof Error ? error.message : String(error)
  }). Run the ESTNeT adapter and serve from the dev server.`;
  return block;
}

/**
 * Builds the opt-in ESTNeT packet-trace disclosure section. Returns a
 * `<details>` element styled like the other side-panel disclosures, with an
 * in-body toggle that switches between the GEO steady-state and GEO↔MEO
 * handover traces. The traces are fetched lazily and cached module-wide.
 */
export function buildEstnetTracePanelSection(): HTMLDetailsElement {
  const details = document.createElement("details");
  details.className = "v4-projection-side-panel__details v4-estnet-trace";
  details.dataset.disclosure = "estnet-packet-trace";

  const summary = document.createElement("summary");
  summary.className = "v4-projection-side-panel__details-summary";
  summary.textContent = "ESTNeT packet trace";

  const body = document.createElement("div");
  body.className = "v4-projection-side-panel__details-body";

  const intro = document.createElement("p");
  intro.className = "v4-estnet-trace__intro";
  intro.textContent =
    "Real ESTNeT (OMNeT++/INET) packet trace for the canonical CHT × SANSA demo path, " +
    "GS-A → satellite → GS-B. Simulation, not operator-measured.";
  body.append(intro);

  // Variant toggle.
  let variant: TraceVariant = DEFAULT_VARIANT;
  const toggle = document.createElement("div");
  toggle.className = "v4-estnet-trace__toggle";
  toggle.setAttribute("role", "tablist");
  const buttons: Record<TraceVariant, HTMLButtonElement> = {} as Record<
    TraceVariant,
    HTMLButtonElement
  >;
  const variantLabels: Record<TraceVariant, string> = {
    handover: "GEO↔MEO handover",
    geo: "GEO steady-state"
  };
  (Object.keys(FIXTURE_URLS) as TraceVariant[]).forEach((key) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "v4-estnet-trace__toggle-btn";
    button.dataset.variant = key;
    button.textContent = variantLabels[key];
    button.setAttribute("role", "tab");
    toggle.append(button);
    buttons[key] = button;
  });
  body.append(toggle);

  // Render mount — replaced on each variant switch.
  const mount = document.createElement("div");
  mount.className = "v4-estnet-trace__mount";
  body.append(mount);

  details.append(summary, body);

  let disposed = false;
  let renderToken = 0;

  const syncToggle = (): void => {
    (Object.keys(buttons) as TraceVariant[]).forEach((key) => {
      const active = key === variant;
      buttons[key].classList.toggle("v4-estnet-trace__toggle-btn--active", active);
      buttons[key].setAttribute("aria-selected", active ? "true" : "false");
    });
  };

  const renderVariant = (next: TraceVariant): void => {
    variant = next;
    syncToggle();
    const token = ++renderToken;
    mount.dataset.loading = "true";
    mount.dataset.variant = next;
    loadTrace(FIXTURE_URLS[next])
      .then((trace) => {
        // A newer toggle click (or disposal) supersedes this render.
        if (disposed || token !== renderToken) {
          return;
        }
        delete mount.dataset.loading;
        mount.dataset.pathLabel = trace.pathLabel;
        mount.replaceChildren(
          buildBadges(trace),
          buildCards(trace),
          buildLegend(trace),
          buildChart(trace),
          buildFoot(trace)
        );
      })
      .catch((error) => {
        if (disposed || token !== renderToken) {
          return;
        }
        delete mount.dataset.loading;
        mount.replaceChildren(buildErrorBlock(next, error));
      });
  };

  (Object.keys(buttons) as TraceVariant[]).forEach((key) => {
    buttons[key].addEventListener("click", () => {
      if (key !== variant) {
        renderVariant(key);
      }
    });
  });

  renderVariant(DEFAULT_VARIANT);

  // Disposal hook honoured by the side panel's renderResult/dispose sweep.
  (details as unknown as { __disposeHelp: () => void }).__disposeHelp = () => {
    disposed = true;
    renderToken++;
  };

  return details;
}
