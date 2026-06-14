// WS-G — "How this trajectory was computed" provenance popover.
//
// The most-real layer of the demo (live SGP4 geometry) is the one a viewer is
// most likely to dismiss as a recording. This popover makes the chain legible
// AND externally checkable: it shows every intermediate of
// TLE -> SGP4 -> ECI -> ECEF -> geodetic for a representative satellite,
// computed live by the app's own satellite.js, plus escape-the-app hooks (the
// raw TLE is copyable; a side-by-side exhibit shows the app value vs an
// INDEPENDENT python-sgp4 reference for three pinned satellites).
//
// Honesty limit (G3): this proves only the geometry chain. The link-budget
// magnitudes shown elsewhere stay modeled/standard, and the external gaps stay
// disclosed — see the banner at the top of the popover.

import {
  eciToEcf,
  eciToGeodetic,
  gstime,
  propagate,
  twoline2satrec,
} from "../../vendor/satellite-js-runtime";
import type { RuntimeProjectionResult } from "./runtime-projection";
import type { OrbitClass, RuntimeOrbitRecord, TleRecord } from "./visibility-utils";
import { SGP4_REFERENCE_VECTORS } from "./sgp4-reference-vectors";
import { dispatchSelectedPairOverlayChange } from "./selected-pair-overlay-state";

export interface TrajectoryProvenanceControl {
  readonly root: HTMLElement;
  dispose(): void;
}

interface RepresentativePass {
  readonly satelliteId: string;
  readonly orbitClass: OrbitClass;
  readonly atUtc: string;
  readonly mutualMinElevationDeg: number;
}

let provenanceIdCounter = 0;

const radToDeg = (radians: number): number => (radians * 180) / Math.PI;
const fixed = (value: number, digits: number): string =>
  Number.isFinite(value) ? value.toFixed(digits) : "—";

// Pick the pair-visibility window with the highest mutual minimum elevation:
// the best-geometry pass, so the chain shown is the strongest real example.
function pickRepresentativePass(
  result: RuntimeProjectionResult
): RepresentativePass | null {
  let best: RepresentativePass | null = null;
  for (const window of result.visibilityWindows) {
    const mutualMinElevationDeg = Math.min(
      window.stationAWindow.maxElevationDeg,
      window.stationBWindow.maxElevationDeg
    );
    const startMs = Date.parse(window.intersectionStartUtc);
    const endMs = Date.parse(window.intersectionEndUtc);
    if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) {
      continue;
    }
    if (best === null || mutualMinElevationDeg > best.mutualMinElevationDeg) {
      best = {
        satelliteId: window.satelliteId,
        orbitClass: window.orbitClass,
        // Representative instant: the mutual-visibility window midpoint.
        atUtc: new Date(Math.round((startMs + endMs) / 2)).toISOString(),
        mutualMinElevationDeg,
      };
    }
  }
  return best;
}

// Only the TLE-sourced records carry raw line1/line2 (OMM records do not), and
// the popover's whole point is the literal TLE -> trajectory chain.
function findTleRecord(
  records: ReadonlyArray<RuntimeOrbitRecord> | null,
  satelliteId: string
): TleRecord | undefined {
  return records?.find(
    (record): record is TleRecord =>
      record.satelliteId === satelliteId && "tleLine1" in record
  );
}

// The literal orbital elements as they appear in TLE line 2 (what the skeptic
// can paste into CelesTrak / python-sgp4), not a re-derivation.
function parseTleLine2Elements(line2: string): ReadonlyArray<[string, string]> {
  const ecc = line2.slice(26, 33).trim();
  return [
    ["Inclination i", `${line2.slice(8, 16).trim()} °`],
    ["RAAN Ω", `${line2.slice(17, 25).trim()} °`],
    ["Eccentricity e", ecc ? `0.${ecc}` : "—"],
    ["Arg. of perigee ω", `${line2.slice(34, 42).trim()} °`],
    ["Mean anomaly M", `${line2.slice(43, 51).trim()} °`],
    ["Mean motion n", `${line2.slice(52, 63).trim()} rev/day`],
  ];
}

interface ChainResult {
  readonly positionEciKm: { x: number; y: number; z: number };
  readonly velocityEciKmPerSec: { x: number; y: number; z: number };
  readonly gmstRad: number;
  readonly positionEcefKm: { x: number; y: number; z: number };
  readonly geodetic: { latDeg: number; lonDeg: number; altKm: number };
}

// Live chain via the app's own satellite.js: identical math to what renders the
// moving point on the globe.
function computeChain(line1: string, line2: string, atUtc: string): ChainResult | null {
  const satrec = twoline2satrec(line1, line2);
  const when = new Date(atUtc);
  const propagated = propagate(satrec, when);
  if (!propagated || !propagated.position || !propagated.velocity) {
    return null;
  }
  const gmstRad = gstime(when);
  const ecef = eciToEcf(propagated.position, gmstRad);
  const geodetic = eciToGeodetic(propagated.position, gmstRad);
  return {
    positionEciKm: propagated.position,
    velocityEciKmPerSec: propagated.velocity,
    gmstRad,
    positionEcefKm: ecef,
    geodetic: {
      latDeg: radToDeg(geodetic.latitude),
      lonDeg: radToDeg(geodetic.longitude),
      altKm: geodetic.height,
    },
  };
}

function el(tag: string, className: string, text?: string): HTMLElement {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) {
    node.textContent = text;
  }
  return node;
}

function buildStepRow(label: string, standard: string, value: string): HTMLElement {
  const row = el("div", "v4-projection-side-panel__trace-step");
  row.append(
    el("span", "v4-projection-side-panel__trace-step-label", label),
    el("code", "v4-projection-side-panel__trace-step-value", value),
    el("span", "v4-projection-side-panel__trace-step-standard", standard)
  );
  return row;
}

// app satellite.js vs the committed independent python-sgp4 reference, |Δ| in m.
function buildReferenceExhibit(): HTMLElement {
  const wrap = el("div", "v4-projection-side-panel__trace-reference");
  const ref = SGP4_REFERENCE_VECTORS.reference;
  wrap.append(
    el(
      "p",
      "v4-projection-side-panel__trace-reference-note",
      `Reproducibility check: the app's satellite.js vs ${ref.generator} ` +
        `${ref.generatorVersion} (${ref.algorithm}, ${ref.gravityModel}), an ` +
        `implementation independent of the app. Agreement is the proof.`
    )
  );
  const table = el("table", "v4-projection-side-panel__trace-reference-table");
  const head = el("tr", "");
  for (const heading of ["Satellite", "Time (UTC)", "App position |Δ| vs reference"]) {
    head.append(el("th", "", heading));
  }
  table.append(head);
  let maxDeltaM = 0;
  for (const sample of SGP4_REFERENCE_VECTORS.samples) {
    const chain = computeChain(sample.line1, sample.line2, sample.timeUtc);
    let deltaText = "propagation failed";
    if (chain) {
      const dx = chain.positionEciKm.x - sample.positionEciKm.x;
      const dy = chain.positionEciKm.y - sample.positionEciKm.y;
      const dz = chain.positionEciKm.z - sample.positionEciKm.z;
      const deltaKm = Math.sqrt(dx * dx + dy * dy + dz * dz);
      maxDeltaM = Math.max(maxDeltaM, deltaKm * 1000);
      deltaText = `${(deltaKm * 1000).toFixed(3)} m`;
    }
    const row = el("tr", "");
    row.append(
      el("td", "", sample.label),
      el("td", "", sample.timeUtc.replace(".000Z", "Z")),
      el("td", "v4-projection-side-panel__trace-reference-delta", deltaText)
    );
    table.append(row);
  }
  wrap.append(table);
  wrap.append(
    el(
      "p",
      "v4-projection-side-panel__trace-reference-max",
      `Largest disagreement across all pinned samples: ${maxDeltaM.toFixed(3)} m ` +
        `(tolerance ${SGP4_REFERENCE_VECTORS.toleranceKm} km).`
    )
  );
  return wrap;
}

function buildPopoverBody(
  result: RuntimeProjectionResult,
  pass: RepresentativePass,
  tle: TleRecord
): HTMLElement {
  const body = el("div", "v4-projection-side-panel__trace-body");

  // G3 honesty banner.
  body.append(
    el(
      "p",
      "v4-projection-side-panel__trace-banner",
      "Proves the orbit geometry chain (raw TLE → trajectory) is real and " +
        "independently reproducible. The link-budget magnitudes shown elsewhere " +
        "stay modeled/standard, and the external gaps stay disclosed — this " +
        "popover does not upgrade them."
    )
  );

  // Source block. The CelesTrak snapshot source + fetch time are snapshot-wide
  // (shared across orbit classes), so any freshness entry carries them.
  const freshness = result.dataCompleteness.tleFreshness[0];
  const source = el("div", "v4-projection-side-panel__trace-source");
  source.append(
    el("h4", "v4-projection-side-panel__trace-heading", "1 · Orbit element source"),
    buildStepRow("Satellite", "selected pass", `${pass.satelliteId} (${pass.orbitClass})`),
    buildStepRow("NORAD id", "catalog", tle.noradCatalogId != null ? String(tle.noradCatalogId) : "—"),
    buildStepRow("TLE epoch", "element-set epoch", tle.epochUtc ?? "—"),
    buildStepRow(
      "Snapshot source",
      "CelesTrak",
      freshness
        ? `${freshness.apiClass}${freshness.snapshotFetchedUtc ? ` · fetched ${freshness.snapshotFetchedUtc}` : ""}`
        : "bundled snapshot"
    )
  );
  const tleBlock = el("pre", "v4-projection-side-panel__trace-tle");
  tleBlock.textContent = `${tle.tleLine1}\n${tle.tleLine2}`;
  source.append(tleBlock);
  const copyButton = document.createElement("button");
  copyButton.type = "button";
  copyButton.className = "v4-projection-side-panel__trace-copy";
  copyButton.textContent = "Copy raw TLE";
  let copyResetTimer: ReturnType<typeof setTimeout> | null = null;
  copyButton.addEventListener("click", () => {
    const text = `${tle.tleLine1}\n${tle.tleLine2}`;
    void navigator.clipboard?.writeText(text);
    copyButton.textContent = "Copied";
    if (copyResetTimer !== null) {
      clearTimeout(copyResetTimer);
    }
    copyResetTimer = setTimeout(() => {
      copyResetTimer = null;
      if (copyButton.isConnected) {
        copyButton.textContent = "Copy raw TLE";
      }
    }, 1500);
  });
  source.append(copyButton);
  body.append(source);

  // Parsed elements.
  const elements = el("div", "v4-projection-side-panel__trace-elements");
  elements.append(
    el("h4", "v4-projection-side-panel__trace-heading", "2 · Parsed orbital elements (TLE line 2)")
  );
  for (const [label, value] of parseTleLine2Elements(tle.tleLine2)) {
    elements.append(buildStepRow(label, "TLE", value));
  }
  body.append(elements);

  // Live chain.
  const chain = computeChain(tle.tleLine1, tle.tleLine2, pass.atUtc);
  const chainBlock = el("div", "v4-projection-side-panel__trace-chain");
  chainBlock.append(
    el(
      "h4",
      "v4-projection-side-panel__trace-heading",
      `3 · Live chain @ ${pass.atUtc.replace(".000Z", "Z")} (mutual-visibility window midpoint)`
    )
  );
  if (chain) {
    chainBlock.append(
      buildStepRow(
        "SGP4 → ECI position",
        "satellite.js SGP4 (AIAA 2006)",
        `x ${fixed(chain.positionEciKm.x, 3)}, y ${fixed(chain.positionEciKm.y, 3)}, z ${fixed(chain.positionEciKm.z, 3)} km`
      ),
      buildStepRow(
        "ECI velocity",
        "satellite.js SGP4",
        `x ${fixed(chain.velocityEciKmPerSec.x, 4)}, y ${fixed(chain.velocityEciKmPerSec.y, 4)}, z ${fixed(chain.velocityEciKmPerSec.z, 4)} km/s`
      ),
      buildStepRow("GMST rotation", "Greenwich mean sidereal time", `${fixed(chain.gmstRad, 6)} rad`),
      buildStepRow(
        "ECI → ECEF",
        "TEME → ECEF (gstime)",
        `x ${fixed(chain.positionEcefKm.x, 3)}, y ${fixed(chain.positionEcefKm.y, 3)}, z ${fixed(chain.positionEcefKm.z, 3)} km`
      ),
      buildStepRow(
        "ECEF → geodetic = rendered point (this instant)",
        "WGS84 geodetic",
        `lat ${fixed(chain.geodetic.latDeg, 4)}°, lon ${fixed(chain.geodetic.lonDeg, 4)}°, alt ${fixed(chain.geodetic.altKm, 1)} km`
      )
    );
  } else {
    chainBlock.append(
      el("p", "v4-projection-side-panel__trace-empty", "Propagation produced no position at this instant.")
    );
  }
  body.append(chainBlock);

  // Escape-the-app + reference exhibit.
  const escape = el("div", "v4-projection-side-panel__trace-escape");
  escape.append(
    el("h4", "v4-projection-side-panel__trace-heading", "4 · Check it yourself"),
    el(
      "p",
      "v4-projection-side-panel__trace-escape-note",
      tle.noradCatalogId != null
        ? `Paste the raw TLE above into CelesTrak (NORAD ${tle.noradCatalogId}) or python-sgp4 and you will get the same ECI.`
        : "Paste the raw TLE above into CelesTrak or python-sgp4 and you will get the same ECI."
    ),
    buildReferenceExhibit()
  );
  const links = el("p", "v4-projection-side-panel__trace-links");
  const sourceLink = document.createElement("a");
  sourceLink.href = "https://github.com/shashwatak/satellite-js";
  sourceLink.target = "_blank";
  sourceLink.rel = "noopener noreferrer";
  sourceLink.textContent = "satellite.js source";
  links.append(sourceLink);
  links.append(
    el(
      "span",
      "v4-projection-side-panel__trace-links-note",
      " · retained ITU/3GPP reference PDFs and their sha256 are listed in the downloadable evidence report."
    )
  );
  escape.append(links);
  body.append(escape);

  return body;
}

export function buildTrajectoryProvenanceControl(
  result: RuntimeProjectionResult,
  tleRecords: ReadonlyArray<RuntimeOrbitRecord> | null
): TrajectoryProvenanceControl {
  const root = el("div", "v4-projection-side-panel__trace-control");
  const popoverId = `v4-projection-side-panel-trace-${++provenanceIdCounter}`;

  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.className = "v4-projection-side-panel__trace-trigger";
  trigger.textContent = "How this was computed";
  trigger.setAttribute("aria-haspopup", "dialog");
  trigger.setAttribute("aria-expanded", "false");
  trigger.setAttribute("aria-controls", popoverId);

  const pass = pickRepresentativePass(result);
  const tle = pass ? findTleRecord(tleRecords, pass.satelliteId) : undefined;

  if (!pass || !tle) {
    trigger.disabled = true;
    trigger.title = "No satellite is in the current mutual-visibility window to trace.";
    root.append(trigger);
    return { root, dispose() {} };
  }

  const popover = document.createElement("div");
  popover.id = popoverId;
  popover.className = "v4-projection-side-panel__trace-popover";
  popover.hidden = true;
  popover.setAttribute("role", "dialog");
  popover.setAttribute("aria-modal", "false");
  popover.setAttribute("aria-label", "How this trajectory was computed");

  const header = el("header", "v4-projection-side-panel__trace-header");
  header.append(el("strong", "", "How this trajectory was computed"));
  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.className = "v4-projection-side-panel__trace-close";
  closeButton.setAttribute("aria-label", "Close trajectory provenance");
  closeButton.textContent = "×";
  header.append(closeButton);
  popover.append(header, buildPopoverBody(result, pass, tle));

  const ownerDocument = root.ownerDocument;

  const placePopover = (): void => {
    const ownerWindow = ownerDocument.defaultView;
    if (!ownerWindow) {
      return;
    }
    const marginPx = 12;
    const panel = root.closest<HTMLElement>(".v4-projection-side-panel");
    const panelRect = panel?.getBoundingClientRect();
    const triggerRect = trigger.getBoundingClientRect();
    popover.style.position = "fixed";
    popover.style.left = "0px";
    popover.style.top = "0px";
    const rect = popover.getBoundingClientRect();
    const gapPx = 12;
    const preferredLeft = panelRect
      ? panelRect.left - rect.width - gapPx
      : triggerRect.left - rect.width - gapPx;
    const maxLeft = ownerWindow.innerWidth - rect.width - marginPx;
    const left = Math.min(Math.max(preferredLeft, marginPx), Math.max(marginPx, maxLeft));
    const maxTop = ownerWindow.innerHeight - rect.height - marginPx;
    const top = Math.min(Math.max(triggerRect.bottom - rect.height, marginPx), Math.max(marginPx, maxTop));
    popover.style.left = `${Math.round(left)}px`;
    popover.style.top = `${Math.round(top)}px`;
  };

  const setOpen = (open: boolean, focusTrigger = false): void => {
    popover.hidden = !open;
    trigger.setAttribute("aria-expanded", open ? "true" : "false");
    if (open) {
      popover.dataset.trajectoryProvenanceOpen = "true";
      placePopover();
      closeButton.focus();
    } else {
      delete popover.dataset.trajectoryProvenanceOpen;
      if (focusTrigger) {
        trigger.focus();
      }
    }
    dispatchSelectedPairOverlayChange(ownerDocument);
  };

  const toggle = (event: Event): void => {
    event.stopPropagation();
    setOpen(Boolean(popover.hidden));
  };
  const close = (event: Event): void => {
    event.stopPropagation();
    setOpen(false, true);
  };
  const handleOutsideClick = (event: Event): void => {
    const target = event.target as Node;
    if (!root.contains(target) && !popover.contains(target)) {
      if (!popover.hidden) {
        setOpen(false);
      }
    }
  };
  const handleKeydown = (event: KeyboardEvent): void => {
    if (event.key === "Escape" && !popover.hidden) {
      setOpen(false, true);
    }
  };
  const handleResize = (): void => {
    if (!popover.hidden) {
      placePopover();
    }
  };

  trigger.addEventListener("click", toggle);
  closeButton.addEventListener("click", close);
  ownerDocument.addEventListener("click", handleOutsideClick);
  ownerDocument.addEventListener("keydown", handleKeydown);
  ownerDocument.defaultView?.addEventListener("resize", handleResize);

  root.append(trigger);
  ownerDocument.body.append(popover);

  return {
    root,
    dispose(): void {
      trigger.removeEventListener("click", toggle);
      closeButton.removeEventListener("click", close);
      ownerDocument.removeEventListener("click", handleOutsideClick);
      ownerDocument.removeEventListener("keydown", handleKeydown);
      ownerDocument.defaultView?.removeEventListener("resize", handleResize);
      const wasOpen = !popover.hidden;
      popover.remove();
      if (wasOpen) {
        dispatchSelectedPairOverlayChange(ownerDocument);
      }
    },
  };
}
