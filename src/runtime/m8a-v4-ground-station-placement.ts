import { Cartesian3, type Viewer } from "cesium";

import { M8A_V4_GROUND_STATION_RUNTIME_PROJECTION } from "./m8a-v4-ground-station-projection";
import { positionToCartesian } from "./m8a-v4-ground-station-cesium-entities";
import type {
  M8aV48HandoverReviewViewModel,
  M8aV48SceneAnchorFallbackReason,
  M8aV48SceneAnchorPlacement,
  M8aV48SceneAnchorProtectionRect,
  M8aV48SceneAnchorRuntimeStatus,
  M8aV49ProductComprehensionRuntime,
  M8aV49SceneNearRenderState
} from "./m8a-v4-product-ux-model";

interface ScenePlacementActor {
  readonly actorId: string;
  readonly orbitClass: string;
  readonly renderPositionEcefMeters: {
    readonly x: number;
    readonly y: number;
    readonly z: number;
  };
}

interface SceneAnnotationPlacementState {
  readonly actors: ReadonlyArray<ScenePlacementActor>;
  readonly productUx: {
    readonly layout: {
      readonly viewportClass: "desktop" | "narrow";
    };
    readonly reviewViewModel: Pick<M8aV48HandoverReviewViewModel, "sceneAnchorState">;
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function rectsIntersect(
  left: M8aV48SceneAnchorProtectionRect,
  right: M8aV48SceneAnchorProtectionRect
): boolean {
  return (
    left.left < right.right &&
    left.right > right.left &&
    left.top < right.bottom &&
    left.bottom > right.top
  );
}

function buildRect(
  left: number,
  top: number,
  width: number,
  height: number
): M8aV48SceneAnchorProtectionRect {
  return {
    left,
    top,
    right: left + width,
    bottom: top + height,
    width,
    height
  };
}

function buildPointProtectionRect(
  x: number,
  y: number,
  width: number,
  height: number
): M8aV48SceneAnchorProtectionRect {
  return buildRect(x - width / 2, y - height / 2, width, height);
}

function buildUnionProtectionRect(
  points: ReadonlyArray<{ x: number; y: number }>,
  padding: number
): M8aV48SceneAnchorProtectionRect | null {
  if (points.length === 0) {
    return null;
  }

  const left = Math.min(...points.map((point) => point.x)) - padding;
  const right = Math.max(...points.map((point) => point.x)) + padding;
  const top = Math.min(...points.map((point) => point.y)) - padding;
  const bottom = Math.max(...points.map((point) => point.y)) + padding;

  return {
    left,
    top,
    right,
    bottom,
    width: right - left,
    height: bottom - top
  };
}

export function projectSceneAnchorPoint(
  viewer: Viewer,
  cartesian: Cartesian3
): {
  x: number;
  y: number;
  projected: boolean;
  inFrontOfCamera: boolean;
} {
  const canvasRect = viewer.scene.canvas.getBoundingClientRect();
  const point = viewer.scene.cartesianToCanvasCoordinates(cartesian);
  const cameraToPoint = Cartesian3.subtract(
    cartesian,
    viewer.camera.positionWC,
    new Cartesian3()
  );
  const inFrontOfCamera =
    Cartesian3.dot(cameraToPoint, viewer.camera.directionWC) > 0;

  if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) {
    return {
      x: canvasRect.left + canvasRect.width / 2,
      y: canvasRect.top + canvasRect.height / 2,
      projected: false,
      inFrontOfCamera
    };
  }

  return {
    x: canvasRect.left + point.x,
    y: canvasRect.top + point.y,
    projected: true,
    inFrontOfCamera
  };
}

function resolveConnectorStart(
  annotationRect: M8aV48SceneAnchorProtectionRect,
  anchorX: number,
  anchorY: number
): {
  x: number;
  y: number;
} {
  const clampedX = clamp(anchorX, annotationRect.left, annotationRect.right);
  const clampedY = clamp(anchorY, annotationRect.top, annotationRect.bottom);
  const distances = [
    {
      x: annotationRect.left,
      y: clampedY,
      distance: Math.abs(anchorX - annotationRect.left)
    },
    {
      x: annotationRect.right,
      y: clampedY,
      distance: Math.abs(anchorX - annotationRect.right)
    },
    {
      x: clampedX,
      y: annotationRect.top,
      distance: Math.abs(anchorY - annotationRect.top)
    },
    {
      x: clampedX,
      y: annotationRect.bottom,
      distance: Math.abs(anchorY - annotationRect.bottom)
    }
  ];

  return distances.reduce((nearest, candidate) =>
    candidate.distance < nearest.distance ? candidate : nearest
  );
}

export function resolveSceneAnnotationPlacement(
  state: SceneAnnotationPlacementState,
  viewer: Viewer
): M8aV48SceneAnchorPlacement {
  const canvas = viewer.scene.canvas;
  const canvasRect = canvas.getBoundingClientRect();
  const width = Math.max(canvasRect.width, 1);
  const height = Math.max(canvasRect.height, 1);
  const canvasLeft = canvasRect.left;
  const canvasTop = canvasRect.top;
  const canvasRight = canvasRect.left + width;
  const canvasBottom = canvasRect.top + height;
  const reviewAnchor = state.productUx.reviewViewModel.sceneAnchorState;
  const anchorActorId = reviewAnchor.selectedActorId ?? "";
  const actor = state.actors.find((candidate) => {
    return candidate.actorId === anchorActorId;
  });
  let anchorX = canvasLeft + width * 0.56;
  let anchorY = canvasTop + height * 0.42;
  let projected = false;
  let inFrontOfCamera = false;

  if (actor) {
    const point = projectSceneAnchorPoint(
      viewer,
      Cartesian3.fromElements(
        actor.renderPositionEcefMeters.x,
        actor.renderPositionEcefMeters.y,
        actor.renderPositionEcefMeters.z
      )
    );

    anchorX = point.x;
    anchorY = point.y;
    projected = point.projected;
    inFrontOfCamera = point.inFrontOfCamera;
  }

  const isNarrow = state.productUx.layout.viewportClass === "narrow";
  const annotationWidth = isNarrow ? 328 : 360;
  const annotationHeight = isNarrow ? 186 : 174;
  const minTop = isNarrow ? 214 : 174;
  const maxTop = Math.max(
    minTop,
    canvasTop + height - annotationHeight - (isNarrow ? 138 : 26)
  );
  const minLeft = canvasLeft + 14;
  const maxLeft = Math.max(
    minLeft,
    canvasRight - annotationWidth - 14
  );
  const placeLeft =
    anchorX > canvasLeft + width * 0.35 ||
    anchorX > canvasRight - annotationWidth - 42;
  const protectionRect = buildPointProtectionRect(
    anchorX,
    anchorY,
    isNarrow ? 112 : 96,
    isNarrow ? 88 : 72
  );
  const endpointPoints = M8A_V4_GROUND_STATION_RUNTIME_PROJECTION.endpoints
    .map((endpoint) =>
      projectSceneAnchorPoint(
        viewer,
        positionToCartesian(endpoint.renderMarker.displayPosition)
      )
    )
    .filter((point) => point.projected && point.inFrontOfCamera);
  const endpointCorridorRect = buildUnionProtectionRect(
    endpointPoints,
    isNarrow ? 42 : 58
  );
  const endpointLabelRects = endpointPoints.map((point) =>
    buildPointProtectionRect(
      point.x,
      point.y,
      isNarrow ? 118 : 156,
      isNarrow ? 46 : 58
    )
  );
  const geoGuardRects = state.actors
    .filter((candidate) => candidate.orbitClass === "geo")
    .map((candidate) =>
      projectSceneAnchorPoint(
        viewer,
        Cartesian3.fromElements(
          candidate.renderPositionEcefMeters.x,
          candidate.renderPositionEcefMeters.y,
          candidate.renderPositionEcefMeters.z
        )
      )
    )
    .filter((point) => point.projected && point.inFrontOfCamera)
    .map((point) =>
      buildPointProtectionRect(
        point.x,
        point.y,
        isNarrow ? 76 : 112,
        isNarrow ? 64 : 96
      )
    );
  const avoidedRects = [
    protectionRect,
    ...(endpointCorridorRect ? [endpointCorridorRect] : []),
    ...endpointLabelRects,
    ...geoGuardRects
  ];
  const candidatePlacements = [
    {
      left: anchorX + (placeLeft ? -annotationWidth - 86 : 86),
      top: anchorY - annotationHeight / 2
    },
    {
      left: anchorX + (placeLeft ? -annotationWidth - 46 : 46),
      top: anchorY - (isNarrow ? 182 : 156)
    },
    {
      left: anchorX - annotationWidth / 2,
      top: anchorY + (isNarrow ? 86 : 74)
    },
    {
      left: anchorX + (placeLeft ? 46 : -annotationWidth - 46),
      top: anchorY - annotationHeight / 2
    }
  ].map((candidate) =>
    buildRect(
      clamp(candidate.left, minLeft, maxLeft),
      clamp(candidate.top, minTop, maxTop),
      annotationWidth,
      annotationHeight
    )
  );
  const annotationRect =
    candidatePlacements.find((candidate) => {
      return avoidedRects.every((avoidRect) => {
        return !rectsIntersect(candidate, avoidRect);
      });
    }) ?? candidatePlacements[0];
  const isInsideViewport =
    anchorX >= canvasLeft &&
    anchorX <= canvasRight &&
    anchorY >= canvasTop &&
    anchorY <= canvasBottom;
  const connectorThresholdPx = isNarrow ? 32 : 24;
  const connectorStart = resolveConnectorStart(
    annotationRect,
    anchorX,
    anchorY
  );
  const connectorLength = Math.hypot(
    anchorX - connectorStart.x,
    anchorY - connectorStart.y
  );
  const connectorAngleDegrees =
    Math.atan2(anchorY - connectorStart.y, anchorX - connectorStart.x) *
    (180 / Math.PI);
  const forceFallback =
    document.documentElement.dataset.m8aV48ForceSceneAnchorFallback === "true";
  let anchorStatus: M8aV48SceneAnchorRuntimeStatus = "geometry-reliable";
  let fallbackReason: M8aV48SceneAnchorFallbackReason | "" = "";

  if (forceFallback) {
    anchorStatus = "fallback";
    fallbackReason = "anchor-not-projected";
  } else if (!projected) {
    anchorStatus = "fallback";
    fallbackReason = "anchor-not-projected";
  } else if (!inFrontOfCamera) {
    anchorStatus = "fallback";
    fallbackReason = "anchor-behind-camera";
  } else if (!isInsideViewport) {
    anchorStatus = "fallback";
    fallbackReason = "anchor-outside-viewport";
  } else if (rectsIntersect(annotationRect, protectionRect)) {
    anchorStatus = "fallback";
    fallbackReason = "protection-rect-obstructed";
  }

  return {
    anchorActorId,
    anchorX,
    anchorY,
    left: annotationRect.left,
    top: annotationRect.top,
    width: annotationWidth,
    height: annotationHeight,
    projected,
    selectedAnchorType:
      anchorStatus === "geometry-reliable"
        ? reviewAnchor.selectedAnchorType
        : "non-scene-fallback",
    selectedActorId:
      anchorStatus === "geometry-reliable" && reviewAnchor.selectedActorId
        ? reviewAnchor.selectedActorId
        : "",
    selectedRelationCueId:
      anchorStatus === "geometry-reliable" && reviewAnchor.selectedRelationCueId
        ? reviewAnchor.selectedRelationCueId
        : "",
    selectedCorridorId:
      anchorStatus === "geometry-reliable" && reviewAnchor.selectedCorridorId
        ? reviewAnchor.selectedCorridorId
        : "",
    anchorStatus,
    fallbackReason,
    connectorStartX: connectorStart.x,
    connectorStartY: connectorStart.y,
    connectorEndX: anchorX,
    connectorEndY: anchorY,
    connectorLength,
    connectorAngleDegrees,
    connectorEndpointDistancePx: 0,
    connectorThresholdPx,
    protectionRect
  };
}

export function resolveV49SceneNearRenderState(
  comprehension: M8aV49ProductComprehensionRuntime,
  review: M8aV48HandoverReviewViewModel,
  placement: M8aV48SceneAnchorPlacement
): M8aV49SceneNearRenderState {
  const activeCopy = comprehension.activeWindowCopy;
  const hasReliableGeometry = placement.anchorStatus === "geometry-reliable";

  if (hasReliableGeometry) {
    return {
      mode: "scene-near-meaning",
      heading: `Orbit focus: ${activeCopy.orbitClassToken}`,
      productLabel: activeCopy.productLabel,
      stateMeaning: activeCopy.firstReadMessage,
      watchCueLabel: activeCopy.watchCueLabel,
      fallbackText: "",
      meaningVisible: true,
      cueVisible: true,
      fallbackVisible: false,
      attachmentClaim:
        "display-context-cue-attachment-only-when-geometry-reliable"
    };
  }

  return {
    mode: "persistent-layer-fallback",
    heading: `Orbit focus: ${activeCopy.orbitClassToken}`,
    productLabel: activeCopy.productLabel,
    stateMeaning: activeCopy.firstReadMessage,
    watchCueLabel: "",
    fallbackText: `${review.stateOrdinalLabel}; no reliable scene attachment - use state summary.`,
    meaningVisible: true,
    cueVisible: false,
    fallbackVisible: true,
    attachmentClaim: "no-scene-attachment-claimed"
  };
}
