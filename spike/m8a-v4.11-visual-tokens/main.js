// M8A-V4.11 Visual-Token Spike — sandbox only, NOT production code.
// Verifies whether the 5 visual tokens in
// docs/sdd/m8a-v4.11-storyboard-rewrite-proposal.md §Visual Token Spec
// are achievable in Cesium with current primitives.
//
// Sandcastle gallery references (per itri/README.md §Cesium Verification Rule):
//   - polyline-color-dev/main.js   (per-segment polyline coloring)
//   - polyline-dash/main.js        (PolylineDashMaterialProperty)
//   - circles-and-ellipses/main.js (entity ellipse on surface, .withAlpha)
//   - callback-property/main.js    (CallbackProperty for per-frame derivation)
//   - billboards/main.js           (billboard with image, scale, color)
//
// Hardcoded coordinates and clock — no production data flow.

import * as Cesium from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";

// ----- Viewer ---------------------------------------------------------------

const viewer = new Cesium.Viewer("cesiumContainer", {
  baseLayerPicker: false,
  geocoder: false,
  homeButton: false,
  sceneModePicker: false,
  selectionIndicator: false,
  navigationHelpButton: false,
  animation: false,
  timeline: false,
  fullscreenButton: false,
  infoBox: false
});
viewer.scene.globe.enableLighting = false;
viewer.clock.shouldAnimate = true;

// Use a fixed start time so 0.5 Hz / 1 Hz cycles are deterministic for
// frame-budget observation.
const START_TIME = Cesium.JulianDate.fromIso8601("2026-05-03T00:00:00Z");
viewer.clock.startTime = START_TIME.clone();
viewer.clock.currentTime = START_TIME.clone();
viewer.clock.multiplier = 1;
viewer.clock.clockRange = Cesium.ClockRange.UNBOUNDED;

// ----- Spec values (mirror proposal §Visual Token Spec, do not edit) --------

const SPEC = {
  W1: {
    color: "#00d4ff",
    width: 3,
    segments: 8,
    // hardcoded LEO ground track (rising); start at acquisition, end at current
    start: { lon: -130, lat: 10 },
    end: { lon: -110, lat: 30 }
  },
  W2: {
    colorAmber: "#e8b04a",
    colorRed: "#d35a3a",
    width: 3,
    pastSegments: 6,
    futureSegments: 6,
    // hardcoded LEO ground track for past 30s + future 60s prediction
    pastStart: { lon: -50, lat: -10 },
    current: { lon: -30, lat: 0 },
    futureEnd: { lon: 0, lat: 20 },
    fixedWithinWindowFraction: 0.6
  },
  W3a: {
    color: "#5b8db8",
    radiusKm: 1500,
    center: { lon: 60, lat: 0 },
    breatheHz: 0.5,
    alphaMin: 0.3,
    alphaMax: 0.35
  },
  W3b: {
    color: "#5b8db8",
    radiusKm: 800,
    center: { lon: 90, lat: -10 },
    breatheHz: 0.5,
    alphaMin: 0.3,
    alphaMax: 0.35
  },
  W4: {
    colorStrong: "#5bd99c",
    pulseHz: 1,
    minPx: 50,
    maxPx: 200,
    // anchor the candidate ring above ground so screen-space scale is observable
    anchor: { lon: 110, lat: 20, alt: 200_000 }
  },
  W5: {
    color: "#e8c860",
    sizePx: 80,
    alpha: 0.6,
    // GEO altitude 35,786 km
    anchor: { lon: 150, lat: -10, alt: 35_786_000 }
  }
};

// ----- Helpers --------------------------------------------------------------

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function lerpLatLon(start, end, t) {
  return {
    lon: lerp(start.lon, end.lon, t),
    lat: lerp(start.lat, end.lat, t)
  };
}

function lerpColorHex(hexA, hexB, t) {
  const a = Cesium.Color.fromCssColorString(hexA);
  const b = Cesium.Color.fromCssColorString(hexB);
  return new Cesium.Color(
    lerp(a.red, b.red, t),
    lerp(a.green, b.green, t),
    lerp(a.blue, b.blue, t),
    lerp(a.alpha, b.alpha, t)
  );
}

// Generate a soft ring sprite for W4/W5 (transparent center, anti-aliased ring).
function makeRingSprite({ size = 256, ringWidth = 6, color = "#ffffff" } = {}) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - ringWidth / 2 - 2;
  // Outer soft glow
  const gradient = ctx.createRadialGradient(cx, cy, radius - ringWidth, cx, cy, radius + ringWidth);
  gradient.addColorStop(0.0, "rgba(255,255,255,0)");
  gradient.addColorStop(0.5, color);
  gradient.addColorStop(1.0, "rgba(255,255,255,0)");
  ctx.lineWidth = ringWidth * 2;
  ctx.strokeStyle = gradient;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.stroke();
  return canvas.toDataURL("image/png");
}

// ----- W1: Rising arc trail (8 stepped-alpha polyline segments) ------------
//
// Pattern: Addendum 1.3 prescribes 5–8 segment polylines, each with a stepped
// alpha approximating a 0%→100% gradient. Cesium PolylineMaterialProperty does
// not offer per-vertex alpha as a single material, but per-entity polylines
// with .withAlpha() faithfully render the staircase.
// Reference: sandcastle/gallery/circles-and-ellipses (.withAlpha pattern)

function buildW1RisingArc() {
  const segments = SPEC.W1.segments;
  const baseColor = Cesium.Color.fromCssColorString(SPEC.W1.color);
  for (let i = 0; i < segments; i++) {
    const tStart = i / segments;
    const tEnd = (i + 1) / segments;
    const startPt = lerpLatLon(SPEC.W1.start, SPEC.W1.end, tStart);
    const endPt = lerpLatLon(SPEC.W1.start, SPEC.W1.end, tEnd);
    // Stepped alpha 0%→100% (use mid-segment t for the alpha, so segment 0 is
    // not literally 0% / invisible — closer to "ramping in").
    const alpha = (i + 1) / segments;
    viewer.entities.add({
      name: `W1 segment ${i + 1}/${segments}`,
      polyline: {
        positions: Cesium.Cartesian3.fromDegreesArray([
          startPt.lon,
          startPt.lat,
          endPt.lon,
          endPt.lat
        ]),
        width: SPEC.W1.width,
        material: baseColor.withAlpha(alpha),
        clampToGround: true
      }
    });
  }
}

// ----- W2: Fading arc trail (past gradient + future dashed) ----------------
//
// Past 30s: 6 segments, amber→red gradient driven by withinWindowFraction.
// Future 60s: 6 segments, dashed (PolylineDashMaterialProperty).
// Reference: sandcastle/gallery/polyline-color-dev (per-segment) +
//            sandcastle/gallery/polyline-dash (PolylineDashMaterialProperty)

function buildW2FadingArc() {
  const wf = SPEC.W2.fixedWithinWindowFraction;

  // Past portion (amber→red gradient, tail 20% alpha → current 100%)
  const pastSeg = SPEC.W2.pastSegments;
  for (let i = 0; i < pastSeg; i++) {
    const tStart = i / pastSeg;
    const tEnd = (i + 1) / pastSeg;
    const startPt = lerpLatLon(SPEC.W2.pastStart, SPEC.W2.current, tStart);
    const endPt = lerpLatLon(SPEC.W2.pastStart, SPEC.W2.current, tEnd);
    // Color t goes from amber→red as we approach current; at wf=0.6 the
    // current edge is 60% red.
    const colorT = lerp(0, wf, (i + 0.5) / pastSeg);
    const segColor = lerpColorHex(SPEC.W2.colorAmber, SPEC.W2.colorRed, colorT);
    // Alpha 20%(tail) → 100%(current)
    const alpha = lerp(0.2, 1.0, (i + 1) / pastSeg);
    viewer.entities.add({
      name: `W2 past ${i + 1}/${pastSeg}`,
      polyline: {
        positions: Cesium.Cartesian3.fromDegreesArray([
          startPt.lon,
          startPt.lat,
          endPt.lon,
          endPt.lat
        ]),
        width: SPEC.W2.width,
        material: segColor.withAlpha(alpha),
        clampToGround: true
      }
    });
  }

  // Future portion (dashed, lerp toward red as quality decays further)
  const futSeg = SPEC.W2.futureSegments;
  for (let i = 0; i < futSeg; i++) {
    const tStart = i / futSeg;
    const tEnd = (i + 1) / futSeg;
    const startPt = lerpLatLon(SPEC.W2.current, SPEC.W2.futureEnd, tStart);
    const endPt = lerpLatLon(SPEC.W2.current, SPEC.W2.futureEnd, tEnd);
    const colorT = lerp(wf, 1.0, (i + 0.5) / futSeg);
    const segColor = lerpColorHex(SPEC.W2.colorAmber, SPEC.W2.colorRed, colorT);
    const alpha = lerp(1.0, 0.2, (i + 1) / futSeg);
    viewer.entities.add({
      name: `W2 future ${i + 1}/${futSeg}`,
      polyline: {
        positions: Cesium.Cartesian3.fromDegreesArray([
          startPt.lon,
          startPt.lat,
          endPt.lon,
          endPt.lat
        ]),
        width: SPEC.W2.width,
        material: new Cesium.PolylineDashMaterialProperty({
          color: segColor.withAlpha(alpha),
          dashLength: 16
        }),
        clampToGround: true
      }
    });
  }
}

// ----- W3: Breathing disk (0.5 Hz alpha breath on Cesium ellipse) ----------
//
// Pattern: ColorMaterialProperty wrapping a CallbackProperty for color.
// Reference: sandcastle/gallery/callback-property +
//            sandcastle/gallery/circles-and-ellipses

function makeBreathingMaterial(spec) {
  const baseColor = Cesium.Color.fromCssColorString(spec.color);
  const callback = new Cesium.CallbackProperty((time, result) => {
    const sec = Cesium.JulianDate.secondsDifference(time, START_TIME);
    const phase = (Math.sin(2 * Math.PI * spec.breatheHz * sec) + 1) / 2; // 0..1
    const alpha = lerp(spec.alphaMin, spec.alphaMax, phase);
    return baseColor.withAlpha(alpha, result);
  }, false);
  return new Cesium.ColorMaterialProperty(callback);
}

function buildW3BreathingDisks() {
  for (const key of ["W3a", "W3b"]) {
    const spec = SPEC[key];
    viewer.entities.add({
      name: `${key} (${spec.radiusKm} km)`,
      position: Cesium.Cartesian3.fromDegrees(spec.center.lon, spec.center.lat),
      ellipse: {
        semiMinorAxis: spec.radiusKm * 1000,
        semiMajorAxis: spec.radiusKm * 1000,
        material: makeBreathingMaterial(spec)
      },
      label: {
        text: `${key} ${spec.radiusKm} km`,
        font: "12px monospace",
        fillColor: Cesium.Color.WHITE,
        outlineColor: Cesium.Color.BLACK,
        outlineWidth: 2,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        pixelOffset: new Cesium.Cartesian2(0, -10),
        disableDepthTestDistance: Number.POSITIVE_INFINITY
      }
    });
  }
}

// ----- W4: Candidate pulse (1 Hz expanding rings 50→200 px) ----------------
//
// Pattern: 3 phase-shifted billboards (each ring sprite) with screen-space
// scale + alpha driven by CallbackProperty. The base sprite is 256 px;
// scale 50/256→200/256 maps to the spec range.
// Reference: sandcastle/gallery/billboards (scale, color) +
//            sandcastle/gallery/callback-property

const W4_RING_BASE_PX = 256; // base sprite size

function makeW4PulseScale(phaseOffset) {
  return new Cesium.CallbackProperty((time) => {
    const sec = Cesium.JulianDate.secondsDifference(time, START_TIME);
    const phase = ((sec * SPEC.W4.pulseHz) + phaseOffset) % 1; // 0..1 cycle
    const px = lerp(SPEC.W4.minPx, SPEC.W4.maxPx, phase);
    return px / W4_RING_BASE_PX;
  }, false);
}

function makeW4PulseColor(phaseOffset) {
  const baseColor = Cesium.Color.fromCssColorString(SPEC.W4.colorStrong);
  return new Cesium.CallbackProperty((time, result) => {
    const sec = Cesium.JulianDate.secondsDifference(time, START_TIME);
    const phase = ((sec * SPEC.W4.pulseHz) + phaseOffset) % 1;
    // 80% inner → 0% outer
    const alpha = lerp(0.8, 0.0, phase);
    return baseColor.withAlpha(alpha, result);
  }, false);
}

function buildW4CandidatePulse() {
  const ringSprite = makeRingSprite({
    size: W4_RING_BASE_PX,
    ringWidth: 6,
    color: "#ffffff"
  });
  const phases = [0, 1 / 3, 2 / 3];
  for (const phase of phases) {
    viewer.entities.add({
      name: `W4 pulse ring (phase ${phase.toFixed(2)})`,
      position: Cesium.Cartesian3.fromDegrees(
        SPEC.W4.anchor.lon,
        SPEC.W4.anchor.lat,
        SPEC.W4.anchor.alt
      ),
      billboard: {
        image: ringSprite,
        width: W4_RING_BASE_PX,
        height: W4_RING_BASE_PX,
        scale: makeW4PulseScale(phase),
        color: makeW4PulseColor(phase),
        disableDepthTestDistance: Number.POSITIVE_INFINITY
      }
    });
  }
  // Anchor billboard so the pulse has something to wrap around.
  viewer.entities.add({
    name: "W4 candidate anchor",
    position: Cesium.Cartesian3.fromDegrees(
      SPEC.W4.anchor.lon,
      SPEC.W4.anchor.lat,
      SPEC.W4.anchor.alt
    ),
    point: {
      pixelSize: 8,
      color: Cesium.Color.fromCssColorString(SPEC.W4.colorStrong),
      outlineColor: Cesium.Color.WHITE,
      outlineWidth: 1,
      disableDepthTestDistance: Number.POSITIVE_INFINITY
    }
  });
}

// ----- W5: Steady ring (80 px halo, gold, no animation) --------------------
//
// Pattern: single billboard with the ring sprite at fixed scale 80/256.
// Reference: sandcastle/gallery/billboards

function buildW5SteadyRing() {
  const ringSprite = makeRingSprite({
    size: W4_RING_BASE_PX,
    ringWidth: 8,
    color: "#ffffff"
  });
  const baseColor = Cesium.Color.fromCssColorString(SPEC.W5.color);
  viewer.entities.add({
    name: "W5 steady ring",
    position: Cesium.Cartesian3.fromDegrees(
      SPEC.W5.anchor.lon,
      SPEC.W5.anchor.lat,
      SPEC.W5.anchor.alt
    ),
    billboard: {
      image: ringSprite,
      width: W4_RING_BASE_PX,
      height: W4_RING_BASE_PX,
      scale: SPEC.W5.sizePx / W4_RING_BASE_PX,
      color: baseColor.withAlpha(SPEC.W5.alpha),
      disableDepthTestDistance: Number.POSITIVE_INFINITY
    },
    point: {
      pixelSize: 10,
      color: baseColor,
      outlineColor: Cesium.Color.WHITE,
      outlineWidth: 1,
      disableDepthTestDistance: Number.POSITIVE_INFINITY
    }
  });
}

// ----- Camera presets -------------------------------------------------------

const FLY_TO = {
  W1: { lon: -120, lat: 20, alt: 6_000_000 },
  W2: { lon: -25, lat: 5, alt: 7_000_000 },
  W3: { lon: 75, lat: -5, alt: 9_000_000 },
  W4: { lon: 110, lat: 20, alt: 4_000_000 },
  W5: { lon: 150, lat: -10, alt: 60_000_000 },
  ALL: { lon: 0, lat: 0, alt: 30_000_000 }
};

function flyTo(key) {
  const spec = FLY_TO[key];
  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(spec.lon, spec.lat, spec.alt),
    duration: 1.2
  });
}

document.querySelectorAll("#toolbar button[data-fly]").forEach((btn) => {
  btn.addEventListener("click", () => flyTo(btn.dataset.fly));
});

// ----- fps counter ----------------------------------------------------------

const fpsEl = document.getElementById("fps");
let frameCount = 0;
let lastSampleTime = performance.now();
let avgFps = 0;
let fpsBuffer = []; // rolling buffer for 60s harness

viewer.scene.postRender.addEventListener(() => {
  frameCount += 1;
  const now = performance.now();
  const delta = now - lastSampleTime;
  if (delta >= 500) {
    avgFps = (frameCount * 1000) / delta;
    fpsBuffer.push(avgFps);
    if (fpsBuffer.length > 240) fpsBuffer.shift();
    fpsEl.textContent = `fps: ${avgFps.toFixed(1)}`;
    frameCount = 0;
    lastSampleTime = now;
  }
});

// expose for harness
window.__spike = {
  startSampling() {
    fpsBuffer = [];
    return true;
  },
  stopSampling() {
    if (fpsBuffer.length === 0) return { mean: 0, min: 0, max: 0, n: 0 };
    let sum = 0;
    let min = Infinity;
    let max = -Infinity;
    for (const v of fpsBuffer) {
      sum += v;
      if (v < min) min = v;
      if (v > max) max = v;
    }
    return {
      mean: sum / fpsBuffer.length,
      min,
      max,
      n: fpsBuffer.length
    };
  },
  flyTo
};

// ----- Build all tokens ----------------------------------------------------

buildW1RisingArc();
buildW2FadingArc();
buildW3BreathingDisks();
buildW4CandidatePulse();
buildW5SteadyRing();

// Initial camera: ALL view
flyTo("ALL");

// Mark spike ready for harness
window.__spike.ready = true;
console.log("[spike] M8A-V4.11 visual-token spike ready");
