// Evidence-report ESTNeT appendix — the report-density landing for the opt-in
// packet-trace panel section (panel-density rule, 2026-07-02: the side panel
// keeps the honesty CLAIM as chips + one-liners; the verbatim honesty TEXT —
// assumptionSet / nonClaims walls plus full provenance metadata — belongs at
// report density, i.e. here).
//
// Opt-in only, mirroring the panel section itself: the tab renders ONLY when
// the report is opened from a surface with the ESTNeT display mode on (the
// Report button appends `estnet=1` to the /report URL; the route fetches the
// fixtures). Without that opt-in the report builder receives no appendix data
// and its output stays byte-identical to the accepted default — the report
// golden (runtime-projection-evidence-report-golden.test.mjs) keeps guarding
// exactly that default surface.
//
// Honesty (R12): everything shown renders verbatim from the fixture JSONs the
// panel itself renders from (same manifest, same URLs, fetched fresh at report
// time) — never re-labeled, never summarized-in-place. A fixture that fails to
// load renders as an explicit load-error row, not a silent omission.
import type {
  PacketTrace,
  PacketTraceManifest,
  PacketTraceManifestEntry
} from "./estnet-trace-panel-section";
import {
  derivationBadgeText,
  latencySemanticOf,
  sourceClassLabel
} from "./estnet-trace-panel-section";
import {
  callout,
  escapeHtml,
  kvTable,
  list,
  table
} from "./runtime-projection-evidence-report-html-helpers";

export interface EstnetReportTraceEntry {
  readonly entry: PacketTraceManifestEntry;
  /** Null exactly when the fixture failed to load; `error` then says why. */
  readonly trace: PacketTrace | null;
  readonly error?: string;
}

export interface EstnetReportAppendixData {
  readonly entries: ReadonlyArray<EstnetReportTraceEntry>;
  /** Top-level failure (manifest unreachable); entries is then empty. */
  readonly error?: string;
}

const MANIFEST_URL = "/fixtures/estnet/manifest.json";

/**
 * Fetches the same manifest + fixtures the panel section renders from. Never
 * throws: failures degrade to explicit error strings so the report route's
 * try/catch never loses the whole report to a missing trace file.
 */
export async function loadEstnetReportAppendixData(): Promise<EstnetReportAppendixData> {
  let manifest: PacketTraceManifest;
  try {
    const response = await fetch(MANIFEST_URL);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    manifest = (await response.json()) as PacketTraceManifest;
    if (!Array.isArray(manifest.traces)) {
      throw new Error("manifest.traces missing");
    }
  } catch (error) {
    return {
      entries: [],
      error: `Could not load the trace manifest (${
        error instanceof Error ? error.message : String(error)
      }).`
    };
  }
  const entries: EstnetReportTraceEntry[] = [];
  for (const entry of manifest.traces) {
    try {
      const response = await fetch(entry.url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const trace = (await response.json()) as PacketTrace;
      // Minimal shape gate: the renderer dereferences these unconditionally
      // (`trace.samples.length`, `trace.summary.*`), so a syntactically valid
      // but malformed fixture must degrade to THIS entry's error row — never
      // take down the whole estnet=1 report render.
      if (
        typeof trace !== "object" ||
        trace === null ||
        typeof trace.pathLabel !== "string" ||
        typeof trace.sourceClass !== "string" ||
        !Array.isArray(trace.samples) ||
        typeof trace.summary !== "object" ||
        trace.summary === null
      ) {
        throw new Error(
          "fixture violates the packet-trace contract (pathLabel/sourceClass/samples/summary)"
        );
      }
      entries.push({ entry, trace });
    } catch (error) {
      entries.push({
        entry,
        trace: null,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
  return { entries };
}

function fmtMs(value: number | null | undefined, digits = 1): string {
  return typeof value === "number" && Number.isFinite(value)
    ? `${value.toFixed(digits)} ms`
    : "—";
}

function traceProvenanceTable(trace: PacketTrace): string {
  const endpoints =
    trace.metadata?.stationA?.id && trace.metadata?.stationB?.id
      ? `${trace.metadata.stationA.id} ↔ ${trace.metadata.stationB.id}`
      : "not declared (no route binding)";
  const satellites = trace.metadata?.satellites
    ? Object.entries(trace.metadata.satellites)
        .map(([orbit, sat]) => `${orbit}: ${sat}`)
        .join(" · ")
    : trace.metadata?.satellite ?? "—";
  return kvTable([
    ["Path", trace.pathLabel],
    ["Source class (verbatim)", trace.sourceClass],
    ["Source class (panel label)", sourceClassLabel(trace.sourceClass)],
    ["Tool provenance", trace.toolProvenance ?? "—"],
    [
      "Latency semantic",
      `${latencySemanticOf(trace)}${trace.latencySemantic ? "" : " (contract default; field omitted)"}`
    ],
    ["Metric derivation", derivationBadgeText(trace)],
    ["Delivered by", trace.metadata?.deliveredBy ?? "—"],
    ["Ingest format", trace.metadata?.ingestFormat ?? "— (adapter-derived)"],
    ["Declared endpoints", endpoints],
    ["Relay satellites", satellites],
    ["Sim epoch", trace.metadata?.simEpochUtc ?? "—"],
    ["Samples", trace.samples.length],
    ["Segments", trace.segments?.length ?? 0],
    ["Handover showcase", trace.handover === true]
  ]);
}

function traceSummaryTable(trace: PacketTrace): string {
  const s = trace.summary;
  const rows: Array<readonly [string, string]> = [
    ["Sent packets", String(s.sentPackets)],
    ["Delivered end-to-end", String(s.deliveredEndToEnd)],
    [
      "Overall packet loss",
      `${((s.overallPacketLossRatio || 0) * 100).toFixed(2)} %`
    ],
    ["Mean latency", fmtMs(s.meanLatencyMs)],
    ["Min / max latency", `${fmtMs(s.minLatencyMs)} / ${fmtMs(s.maxLatencyMs)}`],
    ["Final jitter", fmtMs(s.finalJitterMs, 2)],
    ["Handovers", s.handoverCount != null ? String(s.handoverCount) : "—"]
  ];
  if (s.meanLatencyByOrbitMs) {
    for (const [orbit, mean] of Object.entries(s.meanLatencyByOrbitMs)) {
      rows.push([`Mean latency · ${orbit}`, fmtMs(mean)]);
    }
  }
  return kvTable(rows);
}

/**
 * Renders the appendix tab body. Pure string builder like the sibling tab
 * modules; deterministic for fixed inputs (fixtures are committed files).
 */
export function buildEstnetAppendixTab(data: EstnetReportAppendixData): string {
  const head = callout(
    "Report-density landing for the packet-trace panel section",
    "The side panel shows the packet-trace claim (badges, stat cards, chart, " +
      "one-line summaries); this appendix carries the full verbatim honesty " +
      "text — assumption sets and non-claims — plus provenance metadata for " +
      "every trace in the menu manifest. Everything renders from the fixture " +
      "JSONs themselves; a manifest entry cannot upgrade a trace's tier, and " +
      "no trace in this chain is an operator RF measurement."
  );
  if (data.error) {
    return `${head}${callout("ESTNeT appendix unavailable", data.error, "warn")}`;
  }
  const sections = data.entries
    .map(({ entry, trace, error }) => {
      const title = `<h3>${escapeHtml(`${entry.label} (${entry.id})`)}</h3>`;
      if (!trace) {
        return `${title}${callout(
          "Trace fixture failed to load",
          `${entry.url}: ${error ?? "unknown error"}`,
          "warn"
        )}`;
      }
      const assumptions = `<h4>Assumption set (verbatim)</h4><p class="estnet-assumption-set">${escapeHtml(
        trace.assumptionSet ?? "—"
      )}</p>`;
      const nonClaims = `<h4>Non-claims (verbatim, in fixture order)</h4>${list(
        (trace.nonClaims ?? []).slice()
      )}`;
      const segments =
        trace.segments && trace.segments.length > 0
          ? `<h4>Serving segments</h4>${table(
              ["Orbit", "Satellite", "Start", "End", "Delivered packets"],
              trace.segments.map((seg) => [
                seg.orbitClass,
                seg.satellite,
                `${(seg.startMs / 60000).toFixed(1)} m`,
                `${(seg.endMs / 60000).toFixed(1)} m`,
                seg.deliveredPackets
              ])
            )}`
          : "";
      return `${title}
        <h4>Provenance</h4>${traceProvenanceTable(trace)}
        <h4>Summary metrics</h4>${traceSummaryTable(trace)}
        ${assumptions}
        ${nonClaims}
        ${segments}`;
    })
    .join("");
  return `${head}${sections}`;
}
