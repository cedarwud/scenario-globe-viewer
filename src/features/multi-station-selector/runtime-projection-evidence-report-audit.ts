// Evidence-report Audit & evidence tab — standards-conformance table, payload
// checksum, honesty grading, rain-sensitivity sweep, and the buildAuditTab
// assembler. Self-contained (html-helpers + projection only). Behavior guarded
// by the byte-exact golden (runtime-projection-evidence-report-golden.test.mjs).
import {
  computeLinkBudgetMetricsForOrbit,
  type LinkBudgetRainEndpoint,
  type RepresentativeLinkBudget,
  type RuntimeProjectionResult
} from "./runtime-projection";
import { SGP4_REFERENCE_VECTORS } from "./sgp4-reference-vectors";
import {
  type ReportRow,
  escapeHtml,
  formatReportTitleStation,
  formatIsoShort,
  table,
  kvTable,
  callout
} from "./runtime-projection-evidence-report-html-helpers";

interface StandardsConformanceEntry {
  readonly quantity: string;
  readonly formula: string;
  readonly standardSection: string;
  readonly retainedPdf: string;
  readonly pdfSha256: string;
}
const STANDARDS_CONFORMANCE: ReadonlyArray<StandardsConformanceEntry> = [
  {
    quantity: "Free-space path loss",
    formula: "FSPL = 20·log10(d_km) + 20·log10(f_GHz) + 92.45",
    standardSection: "3GPP TR 38.811 §6.6.2 (Eq 6.6-2)",
    retainedPdf: "38811-f40.pdf",
    pdfSha256: "824ea7d359a432778dec9ccdc3a796d801a0f5f881153ebb24f73b1c5b3346ea"
  },
  {
    quantity: "One-way propagation delay",
    formula: "tau = d_slant / c + fixed processing",
    standardSection: "3GPP TR 38.811 §6.6.2 + clause 5.3.1.1",
    retainedPdf: "38811-f40.pdf",
    pdfSha256: "824ea7d359a432778dec9ccdc3a796d801a0f5f881153ebb24f73b1c5b3346ea"
  },
  {
    quantity: "Rain attenuation",
    formula: "A = gammaR · L_E, gammaR = k·R^alpha, L_E = L_R·v0.01",
    standardSection: "ITU-R P.618-14 §2.2.1.1 (Steps 2-9); k/alpha via P.838-3",
    retainedPdf: "R-REC-P.618-14-202308-I!!PDF-E.pdf",
    pdfSha256: "9812e7f34bd8ca0fe71827c1a7ef389761eefe758d0e8862a1c8de4b7065b249"
  },
  {
    quantity: "Gas absorption",
    formula: "A_gas = (gamma_o + gamma_w) · slant path",
    standardSection: "ITU-R P.676-13 Annex 2",
    retainedPdf: "R-REC-P.676-13-202208-I!!PDF-E.pdf",
    pdfSha256: "8c09b2d2c120bdae33f60c2a7abff873374d54075ce0dc71060de8a5507bbe2f"
  },
  {
    quantity: "Satellite antenna pattern",
    formula: "G(theta) roll-off from assumed peak gain + beamwidth",
    standardSection: "ITU-R S.1528-0 Annex 1",
    retainedPdf: "R-REC-S.1528-0-200106-I!!PDF-E.pdf",
    pdfSha256: "a3b3d6b79ce267524594e3cb0d82d0300b1faa1c57f47a21ba90c761312f8d41"
  },
  {
    quantity: "Earth-station antenna pattern",
    formula: "G(phi) sidelobe envelope from assumed diameter",
    standardSection: "ITU-R S.465-6",
    retainedPdf: "R-REC-S.465-6-201001-I!!PDF-E.pdf",
    pdfSha256: "a813d82235c24ad52681634d5d8a1275da621317ddb1a6754cd983643024f98a"
  },
  {
    quantity: "Handover trigger",
    formula: "argmax(received-power proxy) + hysteresis + dwell gate",
    standardSection: "3GPP TR 38.821 §7.3.2.2 + V-MO1 verbal addendum",
    retainedPdf: "38821-g20.pdf",
    pdfSha256: "4ac0c498187d91c17b1a8cb900364e6c692d1ce29619bd243a678c2bfdc67378"
  }
];

// Recorded verification results. These are re-runnable via the named command;
// the date is when each was last recorded, not re-checked at report render time.
const VERIFICATION_STATUS: ReadonlyArray<readonly [string, string, string, string]> = [
  ["Bucket-A coverage gate (g1)", "19 / 19 pass", "npm run verify:g1", "2026-06-15"],
  ["24-hour stability soak", "pass (retained run)", "acceptance soak", "2026-05-16"],
  ["Over-claim wording gate", "pass", "npm test (verify-phase0)", "continuous"],
  ["TLE completeness + baselines", "pass", "npm run verify:tle", "2026-06-15"],
  ["Runtime physics unit suite", "pass", "npm run test:unit", "2026-06-15"]
];

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value) ?? "null";
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  const entries = Object.keys(value as Record<string, unknown>)
    .sort()
    .map(
      (key) =>
        `${JSON.stringify(key)}:${stableStringify(
          (value as Record<string, unknown>)[key]
        )}`
    );
  return `{${entries.join(",")}}`;
}

// FNV-1a 32-bit reproducibility checksum (a determinism marker, not a security
// hash): the same route + window + TLE snapshot reproduces the same value.
function fnv1aChecksum(text: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

function pickRepresentativeLinkBudget(
  result: RuntimeProjectionResult
): RepresentativeLinkBudget | null {
  const byOrbit = result.representativeLinkBudgetByOrbit;
  for (const orbit of ["GEO", "MEO", "LEO"] as const) {
    const entry = byOrbit[orbit];
    if (entry) {
      return entry;
    }
  }
  return null;
}

function resolveProjectionRainRate(result: RuntimeProjectionResult): number | null {
  const rainRateInput = result.dataCompleteness.modeledOutputs.find(
    (output) => output.inputSummary.rainRateMmPerHour !== undefined
  )?.inputSummary.rainRateMmPerHour;
  return typeof rainRateInput === "number" ? rainRateInput : null;
}

function honestyGradingRows(): ReportRow[] {
  return [
    ["Satellite position / trajectory", "Real compute", "SGP4 propagation of public TLE -> ECI -> GMST -> ECEF -> geodetic", "Reproducible; see Raw data + the in-app provenance popover"],
    ["Visibility window / elevation", "Real compute", "Mutual-visibility geometry recomputed per route from the propagated track", "Gated by elevation geometry only"],
    ["Comm time / handover count", "Real compute", "Per-sample serving decision over the window", "Handover count excludes the initial acquisition"],
    ["Slant range / one-way delay", "Standard model", "TR 38.811 §6.6.2 spherical geometry from the SGP4-propagated satellite radius", "Representative geometry, not a ranging measurement"],
    ["FSPL / gas / rain attenuation", "Standard model", "TR 38.811 §6.6.2 / ITU-R P.676-13 / ITU-R P.618-14 at representative geometry", "Modeled, not measured propagation"],
    ["Throughput (Mbps)", "Illustrative proxy", "Clear-sky reference capacity de-rated by atmospheric fade + assumed antenna off-axis loss", "Not a packet-test rate; no EIRP / noise / bandwidth"],
    ["Received power (RSRP proxy)", "Illustrative proxy", "Combined assumed antenna gain minus total path loss", "Relative proxy, not a measured RSRP; EIRP is not available"],
    ["Packet latency / jitter / loss, RF hardware, link-local weather", "External gap", "Not produced by the viewer", "Disclosed pending; not invented"]
  ];
}

function modelBoundaryRows(): ReportRow[] {
  return [
    ["Slant range altitude (S1)", "Improved", "Uses the SGP4-propagated per-satellite geocentric radius (was a nominal class altitude)", "Still a spherical-earth representative geometry"],
    ["Representative elevation (S2)", "Improved", "Uses the instantaneous per-station elevation, binding the worse (lower-elevation) station (was the constant pass maximum)", "One representative leg, not a full two-hop budget"],
    ["Rain latitude (S3)", "Improved", "Rain is computed per station at its own latitude/height and binds the worse station (was the pair-midpoint latitude)", "Driven by the demo rain-rate input, not a measured rain field"],
    ["Throughput / RSRP (S4)", "Disclosed proxy", "Kept as proxies; a Shannon/SNR rate is not computed because EIRP, noise temperature, and bandwidth are not available", "Filling these would be false precision over an unmeasured stack"],
    ["Packet-test KPIs, native RF handover, station RF hardware, link-local weather, surveyed horizon, acceptance thresholds", "External gap", "Out of the viewer's scope; no measured value is produced or claimed", "Disclosed pending; not invented"]
  ];
}

function standardsConformanceRows(
  result: RuntimeProjectionResult
): ReportRow[] {
  const rep = pickRepresentativeLinkBudget(result);
  const rainRate = resolveProjectionRainRate(result);
  const sampleFor = (quantity: string): string => {
    if (!rep || rep.geometrySource !== "sgp4-propagated-representative") {
      return "representative geometry unavailable for this route";
    }
    const orbit = rep.orbitClass;
    if (quantity === "Free-space path loss") {
      return `${orbit}: d=${rep.slantRangeKm.toFixed(1)} km, f=${rep.carrierFrequencyGHz} GHz -> ${rep.freeSpacePathLossDb.toFixed(2)} dB`;
    }
    if (quantity === "One-way propagation delay") {
      return `${orbit}: d=${rep.slantRangeKm.toFixed(1)} km -> ${rep.latencyMs.toFixed(3)} ms (incl. fixed processing)`;
    }
    if (quantity === "Rain attenuation") {
      const binding = rep.rainEndpoints.find((endpoint) => endpoint.stationLabel === rep.rainBindingStation) ?? rep.rainEndpoints[0];
      const rateLabel = rainRate === null ? "n/a" : `${rainRate}`;
      const elevLabel = binding ? binding.elevationDeg.toFixed(1) : rep.representativeElevationDeg.toFixed(1);
      const latLabel = binding ? binding.latitudeDeg.toFixed(1) : "n/a";
      return `${orbit}: R=${rateLabel} mm/h, el=${elevLabel}°, lat=${latLabel}° -> ${rep.rainAttenuationDb.toFixed(2)} dB${rep.rainBindingStation ? ` (binding station ${rep.rainBindingStation})` : " (clear sky)"}`;
    }
    if (quantity === "Gas absorption") {
      return `${orbit}: f=${rep.carrierFrequencyGHz} GHz, el=${rep.representativeElevationDeg.toFixed(1)}° -> ${rep.gasAbsorptionDb.toFixed(3)} dB`;
    }
    if (quantity === "Satellite antenna pattern" || quantity === "Earth-station antenna pattern") {
      return `${orbit}: combined assumed antenna gain ${rep.combinedAntennaGainDb.toFixed(1)} dB`;
    }
    if (quantity === "Handover trigger") {
      return `${result.communicationStats.handoverCount} handovers across ${result.handoverEvents.length} serving events`;
    }
    return "";
  };
  return STANDARDS_CONFORMANCE.map((entry) => [
    entry.quantity,
    { html: `<code>${escapeHtml(entry.formula)}</code>` },
    entry.standardSection,
    sampleFor(entry.quantity)
  ]);
}

function standardsChecksumRows(): ReportRow[] {
  return STANDARDS_CONFORMANCE.filter(
    (entry, index, all) =>
      all.findIndex((other) => other.retainedPdf === entry.retainedPdf) === index
  ).map((entry) => [
    { html: `<code>${escapeHtml(entry.retainedPdf)}</code>` },
    entry.standardSection,
    { html: `<code>${escapeHtml(entry.pdfSha256)}</code>` }
  ]);
}

function rainSensitivityRows(result: RuntimeProjectionResult): {
  readonly rows: ReportRow[];
  readonly orbit: string | null;
} {
  const rep = pickRepresentativeLinkBudget(result);
  if (!rep || rep.geometrySource !== "sgp4-propagated-representative") {
    return { rows: [], orbit: null };
  }
  const endpoints: LinkBudgetRainEndpoint[] = rep.rainEndpoints.map((endpoint) => ({
    stationLabel: endpoint.stationLabel,
    latitudeDeg: endpoint.latitudeDeg,
    heightAboveSeaKm: endpoint.heightAboveSeaKm,
    elevationDeg: endpoint.elevationDeg
  }));
  const baseOptions = {
    representativeElevationDeg: rep.representativeElevationDeg,
    satelliteRadiusKm: rep.satelliteRadiusKm,
    rainEndpoints: endpoints
  };
  const clear = computeLinkBudgetMetricsForOrbit(rep.orbitClass, {
    ...baseOptions,
    rainRateMmPerHour: 0
  }).networkSpeedMbps;
  const rows = [0, 5, 10, 25, 50].map((rate) => {
    const metrics = computeLinkBudgetMetricsForOrbit(rep.orbitClass, {
      ...baseOptions,
      rainRateMmPerHour: rate
    });
    const dropPct =
      clear > 0 ? ((clear - metrics.networkSpeedMbps) / clear) * 100 : 0;
    return [
      `${rate} mm/h`,
      `${metrics.networkSpeedMbps.toFixed(1)} Mbps`,
      `${metrics.jitterMs.toFixed(1)} ms`,
      rate === 0 ? "reference" : `-${dropPct.toFixed(1)}%`
    ];
  });
  return { rows, orbit: rep.orbitClass };
}

export function buildAuditTab(
  result: RuntimeProjectionResult,
  generatedAtUtc: string
): string {
  const rep = pickRepresentativeLinkBudget(result);
  const sensitivity = rainSensitivityRows(result);
  const payloadChecksum = fnv1aChecksum(stableStringify(result));
  const windowLabel = `${formatIsoShort(result.timeWindow.startUtc)} to ${formatIsoShort(result.timeWindow.endUtc)}`;
  const reference = SGP4_REFERENCE_VECTORS.reference;

  const gradingSection = `<h3>Honesty grading matrix</h3>
    ${callout(
      "How to read this report",
      "Every displayed value is tiered by how it is produced: real compute (recomputed geometry/timing), standard model (a published formula at representative geometry), illustrative proxy (a bounded stand-in, not a measured rate), or external gap (not produced, disclosed pending). A standard model is still a model; a proxy is not a measurement."
    )}
    ${table(["Displayed value", "Fidelity", "How it is produced", "Boundary"], honestyGradingRows())}`;

  const boundarySection = `<h3>Model-boundary disclosure</h3>
    <p>Current state of the link-budget geometry after the WS-F model-fidelity pass. S1-S3 were improved using geometry already in hand; S4 and the external gaps remain disclosed proxies / gaps and are not filled with invented numbers.</p>
    ${table(["Boundary", "State", "Current behaviour", "Remaining limit"], modelBoundaryRows())}`;

  const conformanceSection = `<h3>Standards conformance</h3>
    <p>Each modeled quantity, the published formula, its standard clause, and one sample input -> output taken from this route's representative geometry. The magnitudes are modeled / standard-derived, not measured.</p>
    ${table(["Quantity", "Formula", "Standard clause", "Sample input -> output (this route)"], standardsConformanceRows(result))}`;

  const sensitivitySection = `<h3>Rain sensitivity</h3>
    ${
      sensitivity.rows.length > 0
        ? `<p>Modeled throughput proxy and jitter at the route's ${escapeHtml(sensitivity.orbit ?? "")} representative geometry as the rain-rate input is swept. This is the same model the live rain slider drives; the rate is the demo input, not a measured rain field, and the rate -> throughput curve is illustrative (no packet test).</p>
    ${table(["Rain rate", "Throughput proxy", "Jitter", "Change vs clear sky"], sensitivity.rows)}`
        : `<p>No propagated representative geometry was available for this route, so the sensitivity sweep is omitted.</p>`
    }`;

  const reproSection = `<h3>Reproducibility imprint</h3>
    ${kvTable([
      ["Route", { html: `<code>${escapeHtml(result.dataCompleteness.routeMode ?? "tle-first-runtime")}</code>` }],
      ["Stations", `${formatReportTitleStation(result.pair.stationA)} / ${formatReportTitleStation(result.pair.stationB)}`],
      ["Time window", windowLabel],
      ["Shared orbits", result.sharedSupportedOrbits.join(" / ") || "none"],
      ["Visibility windows", result.visibilityWindows.length],
      ["Handover count", result.communicationStats.handoverCount],
      ["Payload checksum (FNV-1a)", { html: `<code>${escapeHtml(payloadChecksum)}</code>` }],
      ["Report generated", generatedAtUtc]
    ])}
    ${callout(
      "Determinism",
      "Re-running computeRuntimeProjection on the same route, time window, and TLE snapshot reproduces this payload checksum. The retained HTML and CSV sha256 are recorded in deliverable/selected-pair-source-evidence/evidence-manifest.json; the report's own generation timestamp is wall-clock and is excluded from the payload checksum."
    )}`;

  const repNote = rep
    ? `Representative geometry source: ${rep.geometrySource} (${rep.representativeSatelliteId} at ${formatIsoShort(rep.representativeSampleUtc)}).`
    : "No representative link budget available for this route.";

  const verificationSection = `<h3>Verification status</h3>
    ${table(["Check", "Result", "Re-run with", "As of"], VERIFICATION_STATUS.map((entry) => [entry[0], entry[1], { html: `<code>${escapeHtml(entry[2])}</code>` }, entry[3]]))}
    <p>SGP4 correctness is cross-checked against an independent ${escapeHtml(reference.generator)} ${escapeHtml(reference.generatorVersion)} (${escapeHtml(reference.algorithm)}, ${escapeHtml(reference.gravityModel)}): ${SGP4_REFERENCE_VECTORS.samples.length} reference vectors, agreement within ${SGP4_REFERENCE_VECTORS.toleranceKm} km. The in-app provenance popover renders the app value vs this reference side by side. ${escapeHtml(repNote)}</p>
    <h3>Retained standards documents</h3>
    <p>The formulas above are grounded in retained 3GPP / ITU-R PDFs (sha256 below; full set and section map in deliverable/3gpp-itu-references/README.md). A standard document grounds a formula; it is not a measurement of this link.</p>
    ${table(["Retained PDF", "Standard / clause", "SHA-256"], standardsChecksumRows())}`;

  return [
    gradingSection,
    boundarySection,
    conformanceSection,
    sensitivitySection,
    reproSection,
    verificationSection
  ].join("\n");
}
