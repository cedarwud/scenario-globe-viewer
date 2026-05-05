import {
  CallbackPositionProperty,
  CallbackProperty,
  Cartesian2,
  Cartesian3,
  Cartographic,
  Color,
  ColorMaterialProperty,
  ConstantProperty,
  CustomDataSource,
  DistanceDisplayCondition,
  Entity,
  HorizontalOrigin,
  JulianDate,
  LabelStyle,
  Math as CesiumMath,
  PolylineDashMaterialProperty,
  ReferenceFrame,
  VerticalOrigin,
  type Viewer
} from "cesium";

import type { M8aV46dSimulationHandoverWindowId } from "./m8a-v4-ground-station-projection";

export const M8A_V411_VISUAL_TOKENS_VERSION =
  "m8a-v4.11-visual-tokens-conv1-runtime.v1";

export const M8A_V411_VISUAL_TOKEN_DATA_SOURCE_NAME =
  "m8a-v4.11-visual-tokens-conv1";

export const M8A_V411_W3_DISK_RADIUS_METERS = 800_000;

export const M8A_V411_VISUAL_TOKEN_DEPTH_DISTANCES = {
  w1MaxMeters: 60_000_000,
  w2MaxMeters: 60_000_000,
  w3MaxMeters: 60_000_000,
  w4MaxMeters: 35_000_000,
  w5MaxMeters: 90_000_000
} as const;

const W1_TOKEN_COLOR_HEX = "#00d4ff";
const W2_TOKEN_AMBER_HEX = "#e8b04a";
const W2_TOKEN_RED_HEX = "#d35a3a";
const W3_TOKEN_DISK_HEX = "#5b8db8";
const W4_TOKEN_STRONG_HEX = "#5bd99c";
const W5_TOKEN_RING_HEX = "#e8c860";

const W1_SEGMENT_COUNT = 8;
const W2_PAST_SEGMENT_COUNT = 6;
const W2_FUTURE_SEGMENT_COUNT = 6;

const W1_PAST_SECONDS = 50;
const W2_PAST_SECONDS = 30;
const W2_FUTURE_SECONDS = 60;

const LEO_GROUND_TRACK_DEG_PER_SECOND = 0.063;
const W1_TRAIL_BEARING_RADIANS = CesiumMath.toRadians(80);
const W2_TRAIL_BEARING_RADIANS = CesiumMath.toRadians(80);

const W3_BREATHE_HZ = 0.5;
const W3_ALPHA_MIN = 0.3;
const W3_ALPHA_MAX = 0.35;

const W4_RING_SPRITE_SIZE = 256;
export const M8A_V411_W4_CANDIDATE_ENTRY_CUE_DURATION_MS = 1500;
export const M8A_V411_W4_CANDIDATE_ENTRY_MAX_RADIUS_PX = 120;
export const M8A_V411_W4_CANDIDATE_HALO_RADIUS_PX = 54;
export const M8A_V411_W4_CANDIDATE_LABEL_COPY = "候選 LEO";
export const M8A_V411_CJK_FONT_FACE = "Noto Sans TC M8A V411 Subset";
export const M8A_V411_CJK_FONT_FAMILY =
  `"${M8A_V411_CJK_FONT_FACE}", "Noto Sans TC", "Source Han Sans TC", ` +
  `"Microsoft JhengHei", "PingFang TC", sans-serif`;
export const M8A_V411_W4_CANDIDATE_LABEL_FONT =
  `600 15px ${M8A_V411_CJK_FONT_FAMILY}`;
export const M8A_V411_W4_CANDIDATE_TOKEN_BEHAVIOR =
  "entry-cue-once-then-stable-candidate-halo";
const W4_CANDIDATE_ENTRY_START_RADIUS_PX = 42;
const W4_CANDIDATE_ENTRY_ALPHA_MAX = 0.52;
const W4_CANDIDATE_HALO_ALPHA = 0.74;

const W5_RING_SIZE_PX = 80;
const W5_RING_ALPHA = 0.6;

const W2_WITHIN_WINDOW_FRACTION = 0.6;

export type M8aV411VisualTokenWindowId = M8aV46dSimulationHandoverWindowId;

export interface M8aV411VisualTokenActor {
  actorId: string;
  positionEcefMeters: { x: number; y: number; z: number };
}

export interface M8aV411VisualTokenInputs {
  activeWindowId: M8aV411VisualTokenWindowId;
  focusActor: M8aV411VisualTokenActor | null;
  diagnosticsRoot?: HTMLElement;
}

export type M8aV411W4CandidateCueMode =
  | "inactive"
  | "entry-cue"
  | "steady-candidate-halo"
  | "reduced-motion-steady-candidate-halo";

export interface M8aV411W4CandidateTokenState {
  behavior: typeof M8A_V411_W4_CANDIDATE_TOKEN_BEHAVIOR;
  cueMode: M8aV411W4CandidateCueMode;
  entryCueActive: boolean;
  entryCueCompleted: boolean;
  entryCueDurationMs: number;
  entryCueElapsedMs: number;
  entryCueMaxRadiusPx: number;
  haloRadiusPx: number;
  label: typeof M8A_V411_W4_CANDIDATE_LABEL_COPY;
  permanentPulse: false;
  pulseHz: "one-shot-entry-only";
  reducedMotion: boolean;
  servingClaim: "not-active-serving-satellite";
}

export interface M8aV411VisualTokenController {
  update(inputs: M8aV411VisualTokenInputs): void;
  getDataSourceName(): string;
  getActiveTokenId(): "W1" | "W2" | "W3" | "W4" | "W5" | null;
  getW4CandidateTokenState(): M8aV411W4CandidateTokenState;
  dispose(): void;
}

interface MutableVisualState {
  activeTokenId: "W1" | "W2" | "W3" | "W4" | "W5" | null;
  focusLonDeg: number | null;
  focusLatDeg: number | null;
  focusHeightMeters: number | null;
  startTime: JulianDate;
  w4EntryCueStartedAtMs: number | null;
  w4EntryCueCompletedAtMs: number | null;
  w4ReducedMotion: boolean;
  diagnosticsRoot: HTMLElement | null;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function readNowMs(): number {
  return window.performance?.now?.() ?? Date.now();
}

function readReducedMotionPreference(): boolean {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
}

function lerpColorHex(hexA: string, hexB: string, t: number): Color {
  const a = Color.fromCssColorString(hexA);
  const b = Color.fromCssColorString(hexB);
  return new Color(
    lerp(a.red, b.red, t),
    lerp(a.green, b.green, t),
    lerp(a.blue, b.blue, t),
    lerp(a.alpha, b.alpha, t)
  );
}

function projectGroundPoint(
  centerLonDeg: number,
  centerLatDeg: number,
  bearingRadians: number,
  groundDistanceDegrees: number
): { lonDeg: number; latDeg: number } {
  const dLat = groundDistanceDegrees * Math.cos(bearingRadians);
  const dLon =
    groundDistanceDegrees *
    Math.sin(bearingRadians) /
    Math.max(0.05, Math.cos(CesiumMath.toRadians(centerLatDeg)));
  return {
    lonDeg: centerLonDeg + dLon,
    latDeg: centerLatDeg + dLat
  };
}

function makeRingSprite({
  size,
  ringWidth,
  color
}: {
  size: number;
  ringWidth: number;
  color: string;
}): string {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return "";
  }
  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - ringWidth / 2 - 2;
  const gradient = ctx.createRadialGradient(
    cx,
    cy,
    radius - ringWidth,
    cx,
    cy,
    radius + ringWidth
  );
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

function ecefToCartographic(ecef: {
  x: number;
  y: number;
  z: number;
}): Cartographic {
  const cartographic = Cartographic.fromCartesian(
    new Cartesian3(ecef.x, ecef.y, ecef.z)
  );
  return cartographic;
}

export function installM8aV411VisualTokens(
  viewer: Viewer
): M8aV411VisualTokenController {
  const dataSource = new CustomDataSource(
    M8A_V411_VISUAL_TOKEN_DATA_SOURCE_NAME
  );

  const state: MutableVisualState = {
    activeTokenId: null,
    focusLonDeg: null,
    focusLatDeg: null,
    focusHeightMeters: null,
    startTime: JulianDate.now(),
    w4EntryCueStartedAtMs: null,
    w4EntryCueCompletedAtMs: null,
    w4ReducedMotion: readReducedMotionPreference(),
    diagnosticsRoot: null
  };

  const w1Entities: Entity[] = [];
  for (let i = 0; i < W1_SEGMENT_COUNT; i += 1) {
    const segmentIndex = i;
    const stepAlpha = (segmentIndex + 1) / W1_SEGMENT_COUNT;
    const baseColor = Color.fromCssColorString(W1_TOKEN_COLOR_HEX);
    const positions = new CallbackProperty(() => {
      if (
        state.focusLonDeg === null ||
        state.focusLatDeg === null
      ) {
        return [];
      }
      const totalDeg =
        W1_PAST_SECONDS * LEO_GROUND_TRACK_DEG_PER_SECOND;
      const tStart = segmentIndex / W1_SEGMENT_COUNT;
      const tEnd = (segmentIndex + 1) / W1_SEGMENT_COUNT;
      const startOffset = totalDeg * (1 - tStart);
      const endOffset = totalDeg * (1 - tEnd);
      const startPoint = projectGroundPoint(
        state.focusLonDeg,
        state.focusLatDeg,
        W1_TRAIL_BEARING_RADIANS + Math.PI,
        startOffset
      );
      const endPoint = projectGroundPoint(
        state.focusLonDeg,
        state.focusLatDeg,
        W1_TRAIL_BEARING_RADIANS + Math.PI,
        endOffset
      );
      return Cartesian3.fromDegreesArray([
        startPoint.lonDeg,
        startPoint.latDeg,
        endPoint.lonDeg,
        endPoint.latDeg
      ]);
    }, false);
    const entity = dataSource.entities.add({
      id: `m8a-v4.11-w1-rising-arc-segment-${segmentIndex}`,
      name: `M8A-V4.11 W1 rising arc segment ${segmentIndex + 1}/${W1_SEGMENT_COUNT}`,
      polyline: {
        positions,
        width: 3,
        material: baseColor.withAlpha(stepAlpha),
        clampToGround: true,
        distanceDisplayCondition: new DistanceDisplayCondition(
          0,
          M8A_V411_VISUAL_TOKEN_DEPTH_DISTANCES.w1MaxMeters
        )
      },
      show: false
    });
    w1Entities.push(entity);
  }

  const w2Entities: Entity[] = [];
  for (let i = 0; i < W2_PAST_SEGMENT_COUNT; i += 1) {
    const segmentIndex = i;
    const colorT = lerp(
      0,
      W2_WITHIN_WINDOW_FRACTION,
      (segmentIndex + 0.5) / W2_PAST_SEGMENT_COUNT
    );
    const segColor = lerpColorHex(W2_TOKEN_AMBER_HEX, W2_TOKEN_RED_HEX, colorT);
    const alpha = lerp(0.2, 1.0, (segmentIndex + 1) / W2_PAST_SEGMENT_COUNT);
    const positions = new CallbackProperty(() => {
      if (
        state.focusLonDeg === null ||
        state.focusLatDeg === null
      ) {
        return [];
      }
      const totalDeg =
        W2_PAST_SECONDS * LEO_GROUND_TRACK_DEG_PER_SECOND;
      const tStart = segmentIndex / W2_PAST_SEGMENT_COUNT;
      const tEnd = (segmentIndex + 1) / W2_PAST_SEGMENT_COUNT;
      const startOffset = totalDeg * (1 - tStart);
      const endOffset = totalDeg * (1 - tEnd);
      const startPoint = projectGroundPoint(
        state.focusLonDeg,
        state.focusLatDeg,
        W2_TRAIL_BEARING_RADIANS + Math.PI,
        startOffset
      );
      const endPoint = projectGroundPoint(
        state.focusLonDeg,
        state.focusLatDeg,
        W2_TRAIL_BEARING_RADIANS + Math.PI,
        endOffset
      );
      return Cartesian3.fromDegreesArray([
        startPoint.lonDeg,
        startPoint.latDeg,
        endPoint.lonDeg,
        endPoint.latDeg
      ]);
    }, false);
    const entity = dataSource.entities.add({
      id: `m8a-v4.11-w2-fading-arc-past-${segmentIndex}`,
      name: `M8A-V4.11 W2 fading arc past ${segmentIndex + 1}/${W2_PAST_SEGMENT_COUNT}`,
      polyline: {
        positions,
        width: 3,
        material: segColor.withAlpha(alpha),
        clampToGround: true,
        distanceDisplayCondition: new DistanceDisplayCondition(
          0,
          M8A_V411_VISUAL_TOKEN_DEPTH_DISTANCES.w2MaxMeters
        )
      },
      show: false
    });
    w2Entities.push(entity);
  }
  for (let i = 0; i < W2_FUTURE_SEGMENT_COUNT; i += 1) {
    const segmentIndex = i;
    const colorT = lerp(
      W2_WITHIN_WINDOW_FRACTION,
      1.0,
      (segmentIndex + 0.5) / W2_FUTURE_SEGMENT_COUNT
    );
    const segColor = lerpColorHex(W2_TOKEN_AMBER_HEX, W2_TOKEN_RED_HEX, colorT);
    const alpha = lerp(1.0, 0.2, (segmentIndex + 1) / W2_FUTURE_SEGMENT_COUNT);
    const positions = new CallbackProperty(() => {
      if (
        state.focusLonDeg === null ||
        state.focusLatDeg === null
      ) {
        return [];
      }
      const totalDeg =
        W2_FUTURE_SECONDS * LEO_GROUND_TRACK_DEG_PER_SECOND;
      const tStart = segmentIndex / W2_FUTURE_SEGMENT_COUNT;
      const tEnd = (segmentIndex + 1) / W2_FUTURE_SEGMENT_COUNT;
      const startOffset = totalDeg * tStart;
      const endOffset = totalDeg * tEnd;
      const startPoint = projectGroundPoint(
        state.focusLonDeg,
        state.focusLatDeg,
        W2_TRAIL_BEARING_RADIANS,
        startOffset
      );
      const endPoint = projectGroundPoint(
        state.focusLonDeg,
        state.focusLatDeg,
        W2_TRAIL_BEARING_RADIANS,
        endOffset
      );
      return Cartesian3.fromDegreesArray([
        startPoint.lonDeg,
        startPoint.latDeg,
        endPoint.lonDeg,
        endPoint.latDeg
      ]);
    }, false);
    const entity = dataSource.entities.add({
      id: `m8a-v4.11-w2-fading-arc-future-${segmentIndex}`,
      name: `M8A-V4.11 W2 fading arc future ${segmentIndex + 1}/${W2_FUTURE_SEGMENT_COUNT}`,
      polyline: {
        positions,
        width: 3,
        material: new PolylineDashMaterialProperty({
          color: segColor.withAlpha(alpha),
          dashLength: 16
        }),
        clampToGround: true,
        distanceDisplayCondition: new DistanceDisplayCondition(
          0,
          M8A_V411_VISUAL_TOKEN_DEPTH_DISTANCES.w2MaxMeters
        )
      },
      show: false
    });
    w2Entities.push(entity);
  }

  const w3DiskBaseColor = Color.fromCssColorString(W3_TOKEN_DISK_HEX);
  const w3MaterialCallback = new CallbackProperty((time, result) => {
    const evalTime = time ?? JulianDate.now();
    const sec = JulianDate.secondsDifference(evalTime, state.startTime);
    const phase = (Math.sin(2 * Math.PI * W3_BREATHE_HZ * sec) + 1) / 2;
    const alpha = lerp(W3_ALPHA_MIN, W3_ALPHA_MAX, phase);
    return w3DiskBaseColor.withAlpha(alpha, result);
  }, false);
  const w3PositionCallback = new CallbackPositionProperty(() => {
    if (
      state.focusLonDeg === null ||
      state.focusLatDeg === null
    ) {
      return Cartesian3.fromDegrees(0, 0, 0);
    }
    return Cartesian3.fromDegrees(state.focusLonDeg, state.focusLatDeg, 0);
  }, false, ReferenceFrame.FIXED);
  const w3Entity = dataSource.entities.add({
    id: "m8a-v4.11-w3-breathing-disk",
    name: "M8A-V4.11 W3 breathing disk (800 km)",
    position: w3PositionCallback,
    ellipse: {
      semiMajorAxis: M8A_V411_W3_DISK_RADIUS_METERS,
      semiMinorAxis: M8A_V411_W3_DISK_RADIUS_METERS,
      material: new ColorMaterialProperty(w3MaterialCallback),
      height: 0,
      distanceDisplayCondition: new DistanceDisplayCondition(
        0,
        M8A_V411_VISUAL_TOKEN_DEPTH_DISTANCES.w3MaxMeters
      )
    },
    show: false
  });

  const w4EntryCueSpriteUri = makeRingSprite({
    size: W4_RING_SPRITE_SIZE,
    ringWidth: 5,
    color: "#ffffff"
  });
  const w4HaloSpriteUri = makeRingSprite({
    size: W4_RING_SPRITE_SIZE,
    ringWidth: 6,
    color: "#ffffff"
  });
  const w4BaseColor = Color.fromCssColorString(W4_TOKEN_STRONG_HEX);
  const w4PositionCallback = new CallbackPositionProperty(
    () => {
      if (
        state.focusLonDeg === null ||
        state.focusLatDeg === null ||
        state.focusHeightMeters === null
      ) {
        return Cartesian3.fromDegrees(0, 0, 0);
      }
      return Cartesian3.fromDegrees(
        state.focusLonDeg,
        state.focusLatDeg,
        state.focusHeightMeters
      );
    },
    false,
    ReferenceFrame.FIXED
  );
  const resolveW4EntryCueElapsedMs = (): number => {
    if (state.w4EntryCueStartedAtMs === null) {
      return M8A_V411_W4_CANDIDATE_ENTRY_CUE_DURATION_MS;
    }
    return Math.max(0, readNowMs() - state.w4EntryCueStartedAtMs);
  };
  const isW4EntryCueActive = (): boolean => {
    return (
      state.activeTokenId === "W4" &&
      !state.w4ReducedMotion &&
      state.w4EntryCueStartedAtMs !== null &&
      resolveW4EntryCueElapsedMs() <
        M8A_V411_W4_CANDIDATE_ENTRY_CUE_DURATION_MS
    );
  };
  const w4EntryScaleCallback = new CallbackProperty(() => {
    const progress = clamp01(
      resolveW4EntryCueElapsedMs() /
        M8A_V411_W4_CANDIDATE_ENTRY_CUE_DURATION_MS
    );
    const radiusPx = lerp(
      W4_CANDIDATE_ENTRY_START_RADIUS_PX,
      M8A_V411_W4_CANDIDATE_ENTRY_MAX_RADIUS_PX,
      progress
    );
    return (radiusPx * 2) / W4_RING_SPRITE_SIZE;
  }, false);
  const w4EntryColorCallback = new CallbackProperty((_time, result) => {
    const progress = clamp01(
      resolveW4EntryCueElapsedMs() /
        M8A_V411_W4_CANDIDATE_ENTRY_CUE_DURATION_MS
    );
    return w4BaseColor.withAlpha(
      lerp(W4_CANDIDATE_ENTRY_ALPHA_MAX, 0, progress),
      result
    );
  }, false);
  const w4EntryShowCallback = new CallbackProperty(
    () => isW4EntryCueActive(),
    false
  );
  const w4EntryCueEntity = dataSource.entities.add({
    id: "m8a-v4.11-w4-candidate-entry-cue",
    name: "M8A-V4.11 W4 candidate entry cue (one restrained ripple)",
    position: w4PositionCallback,
    billboard: {
      image: w4EntryCueSpriteUri,
      width: W4_RING_SPRITE_SIZE,
      height: W4_RING_SPRITE_SIZE,
      show: w4EntryShowCallback,
      scale: w4EntryScaleCallback,
      color: w4EntryColorCallback,
      distanceDisplayCondition: new DistanceDisplayCondition(
        0,
        M8A_V411_VISUAL_TOKEN_DEPTH_DISTANCES.w4MaxMeters
      )
    },
    show: false
  });
  const w4HaloEntity = dataSource.entities.add({
    id: "m8a-v4.11-w4-candidate-halo",
    name: "M8A-V4.11 W4 steady candidate halo",
    position: w4PositionCallback,
    billboard: {
      image: w4HaloSpriteUri,
      width: W4_RING_SPRITE_SIZE,
      height: W4_RING_SPRITE_SIZE,
      scale:
        (M8A_V411_W4_CANDIDATE_HALO_RADIUS_PX * 2) /
        W4_RING_SPRITE_SIZE,
      color: w4BaseColor.withAlpha(W4_CANDIDATE_HALO_ALPHA),
      distanceDisplayCondition: new DistanceDisplayCondition(
        0,
        M8A_V411_VISUAL_TOKEN_DEPTH_DISTANCES.w4MaxMeters
      )
    },
    show: false
  });
  const w4LabelEntity = dataSource.entities.add({
    id: "m8a-v4.11-w4-candidate-label",
    name: `M8A-V4.11 W4 ${M8A_V411_W4_CANDIDATE_LABEL_COPY} label`,
    position: w4PositionCallback,
    label: {
      text: M8A_V411_W4_CANDIDATE_LABEL_COPY,
      font: M8A_V411_W4_CANDIDATE_LABEL_FONT,
      style: LabelStyle.FILL_AND_OUTLINE,
      fillColor: Color.fromCssColorString("#dfffee").withAlpha(0.98),
      outlineColor: Color.fromCssColorString("#06120e").withAlpha(0.9),
      outlineWidth: 3,
      showBackground: true,
      backgroundColor: Color.fromCssColorString("#08261d").withAlpha(0.72),
      backgroundPadding: new Cartesian2(8, 4),
      pixelOffset: new Cartesian2(0, -72),
      horizontalOrigin: HorizontalOrigin.CENTER,
      verticalOrigin: VerticalOrigin.BOTTOM,
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
      distanceDisplayCondition: new DistanceDisplayCondition(
        0,
        M8A_V411_VISUAL_TOKEN_DEPTH_DISTANCES.w4MaxMeters
      )
    },
    show: false
  });
  void document.fonts
    ?.load?.(M8A_V411_W4_CANDIDATE_LABEL_FONT, M8A_V411_W4_CANDIDATE_LABEL_COPY)
    .then(() => {
      if (w4LabelEntity.label) {
        w4LabelEntity.label.font = new ConstantProperty(
          M8A_V411_W4_CANDIDATE_LABEL_FONT
        );
        w4LabelEntity.label.text = new ConstantProperty(
          M8A_V411_W4_CANDIDATE_LABEL_COPY
        );
      }
    })
    .catch(() => {
      // The runtime smoke asserts glyph readiness; keep token behavior unchanged here.
    });
  const w5RingSpriteUri = makeRingSprite({
    size: W4_RING_SPRITE_SIZE,
    ringWidth: 8,
    color: "#ffffff"
  });
  const w5BaseColor = Color.fromCssColorString(W5_TOKEN_RING_HEX);
  const w5PositionCallback = new CallbackPositionProperty(
    () => {
      if (
        state.focusLonDeg === null ||
        state.focusLatDeg === null ||
        state.focusHeightMeters === null
      ) {
        return Cartesian3.fromDegrees(0, 0, 0);
      }
      return Cartesian3.fromDegrees(
        state.focusLonDeg,
        state.focusLatDeg,
        state.focusHeightMeters
      );
    },
    false,
    ReferenceFrame.FIXED
  );
  const w5Entity = dataSource.entities.add({
    id: "m8a-v4.11-w5-steady-ring",
    name: "M8A-V4.11 W5 steady ring (GEO halo)",
    position: w5PositionCallback,
    billboard: {
      image: w5RingSpriteUri,
      width: W4_RING_SPRITE_SIZE,
      height: W4_RING_SPRITE_SIZE,
      scale: W5_RING_SIZE_PX / W4_RING_SPRITE_SIZE,
      color: w5BaseColor.withAlpha(W5_RING_ALPHA),
      distanceDisplayCondition: new DistanceDisplayCondition(
        0,
        M8A_V411_VISUAL_TOKEN_DEPTH_DISTANCES.w5MaxMeters
      )
    },
    show: false
  });

  let w4EntryCueTimeoutId: number | undefined;
  let w4EntryCueFrameId: number | undefined;

  const getW4CandidateTokenState = (): M8aV411W4CandidateTokenState => {
    const reducedMotion = readReducedMotionPreference();
    state.w4ReducedMotion = reducedMotion;
    const isW4 = state.activeTokenId === "W4";
    const elapsedMs = isW4 ? resolveW4EntryCueElapsedMs() : 0;
    const entryCueActive = isW4EntryCueActive();
    const entryCueCompleted =
      isW4 &&
      (reducedMotion ||
        elapsedMs >= M8A_V411_W4_CANDIDATE_ENTRY_CUE_DURATION_MS ||
        state.w4EntryCueCompletedAtMs !== null);
    const cueMode: M8aV411W4CandidateCueMode = !isW4
      ? "inactive"
      : reducedMotion
        ? "reduced-motion-steady-candidate-halo"
        : entryCueActive
          ? "entry-cue"
          : "steady-candidate-halo";

    return {
      behavior: M8A_V411_W4_CANDIDATE_TOKEN_BEHAVIOR,
      cueMode,
      entryCueActive,
      entryCueCompleted,
      entryCueDurationMs: M8A_V411_W4_CANDIDATE_ENTRY_CUE_DURATION_MS,
      entryCueElapsedMs: Math.round(
        Math.min(
          elapsedMs,
          M8A_V411_W4_CANDIDATE_ENTRY_CUE_DURATION_MS
        )
      ),
      entryCueMaxRadiusPx: M8A_V411_W4_CANDIDATE_ENTRY_MAX_RADIUS_PX,
      haloRadiusPx: M8A_V411_W4_CANDIDATE_HALO_RADIUS_PX,
      label: M8A_V411_W4_CANDIDATE_LABEL_COPY,
      permanentPulse: false,
      pulseHz: "one-shot-entry-only",
      reducedMotion,
      servingClaim: "not-active-serving-satellite"
    };
  };

  const syncW4CandidateDiagnosticsDataset = (): void => {
    const root = state.diagnosticsRoot;

    if (!root) {
      return;
    }

    const tokenState = getW4CandidateTokenState();
    root.dataset.m8aV411VisualTokenActiveId =
      state.activeTokenId ?? "none";
    root.dataset.m8aV411VisualTokenW4Behavior = tokenState.behavior;
    root.dataset.m8aV411VisualTokenW4CueMode = tokenState.cueMode;
    root.dataset.m8aV411VisualTokenW4EntryCueActive = String(
      tokenState.entryCueActive
    );
    root.dataset.m8aV411VisualTokenW4EntryCueCompleted = String(
      tokenState.entryCueCompleted
    );
    root.dataset.m8aV411VisualTokenW4EntryCueDurationMs = String(
      tokenState.entryCueDurationMs
    );
    root.dataset.m8aV411VisualTokenW4EntryCueElapsedMs = String(
      tokenState.entryCueElapsedMs
    );
    root.dataset.m8aV411VisualTokenW4EntryMaxRadiusPx = String(
      tokenState.entryCueMaxRadiusPx
    );
    root.dataset.m8aV411VisualTokenW4HaloRadiusPx = String(
      tokenState.haloRadiusPx
    );
    root.dataset.m8aV411VisualTokenW4Label = tokenState.label;
    root.dataset.m8aV411VisualTokenW4PermanentPulse = String(
      tokenState.permanentPulse
    );
    root.dataset.m8aV411VisualTokenW4PulseHz = tokenState.pulseHz;
    root.dataset.m8aV411VisualTokenW4ReducedMotion = String(
      tokenState.reducedMotion
    );
    root.dataset.m8aV411VisualTokenW4ServingClaim =
      tokenState.servingClaim;
    root.dataset.m8aV411VisualTokenW4AlarmColor = "false";
  };

  const clearW4EntryCueTimers = (): void => {
    if (w4EntryCueTimeoutId !== undefined) {
      window.clearTimeout(w4EntryCueTimeoutId);
      w4EntryCueTimeoutId = undefined;
    }

    if (w4EntryCueFrameId !== undefined) {
      window.cancelAnimationFrame(w4EntryCueFrameId);
      w4EntryCueFrameId = undefined;
    }
  };

  const finishW4EntryCue = (startedAtMs: number): void => {
    if (
      state.activeTokenId !== "W4" ||
      state.w4EntryCueStartedAtMs !== startedAtMs
    ) {
      return;
    }

    state.w4EntryCueCompletedAtMs = readNowMs();
    w4EntryCueEntity.show = false;
    syncW4CandidateDiagnosticsDataset();

    if (!viewer.isDestroyed()) {
      viewer.scene.requestRender();
    }
  };

  const requestW4EntryCueFrame = (startedAtMs: number): void => {
    if (
      state.activeTokenId !== "W4" ||
      state.w4ReducedMotion ||
      state.w4EntryCueStartedAtMs !== startedAtMs ||
      resolveW4EntryCueElapsedMs() >=
        M8A_V411_W4_CANDIDATE_ENTRY_CUE_DURATION_MS
    ) {
      w4EntryCueFrameId = undefined;
      return;
    }

    if (!viewer.isDestroyed()) {
      viewer.scene.requestRender();
    }

    w4EntryCueFrameId = window.requestAnimationFrame(() => {
      requestW4EntryCueFrame(startedAtMs);
    });
  };

  const startW4EntryCue = (): void => {
    clearW4EntryCueTimers();
    state.w4ReducedMotion = readReducedMotionPreference();

    if (state.w4ReducedMotion) {
      state.w4EntryCueStartedAtMs = null;
      state.w4EntryCueCompletedAtMs = readNowMs();
      w4EntryCueEntity.show = false;
      w4HaloEntity.show = true;
      w4LabelEntity.show = true;
      syncW4CandidateDiagnosticsDataset();
      return;
    }

    const startedAtMs = readNowMs();
    state.w4EntryCueStartedAtMs = startedAtMs;
    state.w4EntryCueCompletedAtMs = null;
    w4EntryCueEntity.show = true;
    w4HaloEntity.show = true;
    w4LabelEntity.show = true;
    w4EntryCueTimeoutId = window.setTimeout(() => {
      w4EntryCueTimeoutId = undefined;
      finishW4EntryCue(startedAtMs);
    }, M8A_V411_W4_CANDIDATE_ENTRY_CUE_DURATION_MS);
    requestW4EntryCueFrame(startedAtMs);
    syncW4CandidateDiagnosticsDataset();
  };

  const setTokenVisible = (
    tokenId: "W1" | "W2" | "W3" | "W4" | "W5" | null
  ): void => {
    const previousTokenId = state.activeTokenId;
    state.w4ReducedMotion = readReducedMotionPreference();
    state.activeTokenId = tokenId;
    for (const entity of w1Entities) {
      entity.show = tokenId === "W1";
    }
    for (const entity of w2Entities) {
      entity.show = tokenId === "W2";
    }
    w3Entity.show = tokenId === "W3";
    const showW4 = tokenId === "W4";
    w4HaloEntity.show = showW4;
    w4LabelEntity.show = showW4;
    w4EntryCueEntity.show = showW4 && isW4EntryCueActive();
    w5Entity.show = tokenId === "W5";

    if (tokenId === "W4" && previousTokenId !== "W4") {
      startW4EntryCue();
    } else if (tokenId !== "W4" && previousTokenId === "W4") {
      clearW4EntryCueTimers();
      state.w4EntryCueStartedAtMs = null;
      state.w4EntryCueCompletedAtMs = null;
      w4EntryCueEntity.show = false;
    }

    syncW4CandidateDiagnosticsDataset();
  };

  let dataSourceAttached = false;
  void viewer.dataSources.add(dataSource).then(() => {
    if (!viewer.isDestroyed()) {
      dataSourceAttached = true;
      dataSource.show = true;
      viewer.scene.requestRender();
    }
  });

  const update = (inputs: M8aV411VisualTokenInputs): void => {
    state.diagnosticsRoot = inputs.diagnosticsRoot ?? state.diagnosticsRoot;

    if (inputs.focusActor) {
      const cartographic = ecefToCartographic(
        inputs.focusActor.positionEcefMeters
      );
      state.focusLonDeg = CesiumMath.toDegrees(cartographic.longitude);
      state.focusLatDeg = CesiumMath.toDegrees(cartographic.latitude);
      state.focusHeightMeters = cartographic.height;
    } else {
      state.focusLonDeg = null;
      state.focusLatDeg = null;
      state.focusHeightMeters = null;
    }

    switch (inputs.activeWindowId) {
      case "leo-acquisition-context":
        setTokenVisible("W1");
        break;
      case "leo-aging-pressure":
        setTokenVisible("W2");
        break;
      case "meo-continuity-hold":
        setTokenVisible("W3");
        break;
      case "leo-reentry-candidate":
        setTokenVisible("W4");
        break;
      case "geo-continuity-guard":
        setTokenVisible("W5");
        break;
      default:
        setTokenVisible(null);
        break;
    }

    if (!viewer.isDestroyed()) {
      viewer.scene.requestRender();
    }
  };

  const dispose = (): void => {
    clearW4EntryCueTimers();
    if (dataSourceAttached && !viewer.isDestroyed()) {
      viewer.dataSources.remove(dataSource, true);
    }
    dataSourceAttached = false;
  };

  return {
    update,
    getDataSourceName: () => M8A_V411_VISUAL_TOKEN_DATA_SOURCE_NAME,
    getActiveTokenId: () => state.activeTokenId,
    getW4CandidateTokenState,
    dispose
  };
}
