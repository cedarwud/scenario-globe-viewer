import {
  ArcType,
  BillboardGraphics,
  CallbackPositionProperty,
  CallbackProperty,
  Cartesian2,
  Cartesian3,
  Color,
  ColorMaterialProperty,
  ConstantProperty,
  DistanceDisplayCondition,
  EllipseGraphics,
  Entity,
  HorizontalOrigin,
  LabelGraphics,
  LabelStyle,
  ModelGraphics,
  PolylineArrowMaterialProperty,
  PolylineDashMaterialProperty,
  PolylineGraphics,
  VerticalOrigin
} from "cesium";

import type {
  M8aV4GeoPosition,
  M8aV4OrbitActorProjection,
  M8aV4OrbitClass,
  M8aV46dSimulationHandoverWindow
} from "./m8a-v4-ground-station-projection";
import {
  M8A_V46E_RELATION_ROLE_LABELS,
  M8A_V4_LINK_FLOW_TRUTH_BOUNDARY,
  type M8aV4LinkFlowDirection,
  type M8aV4LinkFlowRelationRole,
  type M8aV4RelationRole
} from "./m8a-v4-product-ux-model";

const M8A_V4_ACTOR_GLOW_SIZE_PX = 24;
const M8A_V4_ACTOR_GLOW_MODEL_CENTER_OFFSETS = {
  leo: new Cartesian2(0, 0),
  meo: new Cartesian2(-2, -6),
  geo: new Cartesian2(0, -5)
} satisfies Record<M8aV4OrbitClass, Cartesian2>;

export interface M8aV4ActorEmphasis {
  actorId: string;
  orbitClass: M8aV4OrbitClass;
  emphasis: "representative" | "candidate" | "fallback" | "context";
  modelScale: number;
  labelAlpha: number;
}

export interface ActorRenderHandle {
  actor: M8aV4OrbitActorProjection;
  entity: Entity;
}

export interface RelationRenderHandle {
  role: M8aV4RelationRole;
  entity: Entity;
}

export interface LinkFlowSegmentRenderHandle {
  role: M8aV4LinkFlowRelationRole;
  direction: M8aV4LinkFlowDirection;
  entity: Entity;
}

export interface LinkFlowPulseRenderHandle {
  role: M8aV4LinkFlowRelationRole;
  direction: M8aV4LinkFlowDirection;
  pulseIndex: number;
  entity: Entity;
}

export type EndpointRenderRole = "endpoint-a" | "endpoint-b";

export interface EndpointRenderContext {
  endpointId: string;
  endpointRole: EndpointRenderRole;
  endpointLabel: string;
  sourceCoordinatesRenderable: boolean;
  coordinatePrecision: {
    renderPrecision: string;
  };
  renderMarker: {
    markerId: string;
    displayPosition: M8aV4GeoPosition;
    displayRadiusMeters: number;
    label: string;
    requiredPrecisionBadge: string;
    displayPositionIsSourceTruth: boolean;
  };
  orbitEvidenceChips: ReadonlyArray<{
    chipLabel: string;
  }>;
}

export function positionToCartesian(position: M8aV4GeoPosition): Cartesian3 {
  return Cartesian3.fromDegrees(
    position.lon,
    position.lat,
    position.heightMeters
  );
}

function resolveEndpointColor(
  endpointId: string,
  endpointRole?: EndpointRenderRole
): Color {
  return endpointId === "tw-cht-multi-orbit-ground-infrastructure" ||
    endpointRole === "endpoint-a"
    ? Color.fromCssColorString("#f4fbff")
    : Color.fromCssColorString("#7ee2b8");
}

function resolveActorGlowHex(orbitClass: M8aV4OrbitClass): string {
  switch (orbitClass) {
    case "leo":
      return "#ffffff";
    case "meo":
      return "#d46bff";
    case "geo":
      return "#ffb23f";
  }
}

function createActorGlowImageUri(orbitClass: M8aV4OrbitClass): string {
  const glowColor = resolveActorGlowHex(orbitClass);
  const svg = [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">',
    '<defs><radialGradient id="g" cx="50%" cy="50%" r="50%">',
    '<stop offset="0" stop-color="#ffffff" stop-opacity="0.82"/>',
    `<stop offset="0.34" stop-color="${glowColor}" stop-opacity="0.62"/>`,
    `<stop offset="0.72" stop-color="${glowColor}" stop-opacity="0.24"/>`,
    `<stop offset="1" stop-color="${glowColor}" stop-opacity="0"/>`,
    "</radialGradient></defs>",
    '<circle cx="32" cy="32" r="32" fill="url(#g)"/>',
    "</svg>"
  ].join("");

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function resolveActorGlowModelCenterOffset(
  orbitClass: M8aV4OrbitClass
): Cartesian2 {
  const offset = M8A_V4_ACTOR_GLOW_MODEL_CENTER_OFFSETS[orbitClass];

  return new Cartesian2(offset.x, offset.y);
}

function resolveActorLabelBackgroundColor(): Color {
  return Color.fromCssColorString("#0b1820").withAlpha(0.58);
}

export function resolveActorEmphasis(
  actor: M8aV4OrbitActorProjection,
  simulationWindow: M8aV46dSimulationHandoverWindow
): M8aV4ActorEmphasis {
  const candidateActorIds =
    simulationWindow.candidateContextActorIds as readonly string[];
  const fallbackActorIds =
    simulationWindow.fallbackContextActorIds as readonly string[];
  const emphasis =
    actor.actorId === simulationWindow.displayRepresentativeActorId
      ? "representative"
      : candidateActorIds.includes(actor.actorId)
        ? "candidate"
        : fallbackActorIds.includes(actor.actorId)
          ? "fallback"
          : "context";

  return {
    actorId: actor.actorId,
    orbitClass: actor.orbitClass,
    emphasis,
    modelScale:
      emphasis === "representative"
        ? 1.22
        : emphasis === "candidate"
          ? 1.06
          : 0.9,
    labelAlpha: emphasis === "context" ? 0.62 : 0.94
  };
}

function drawEndpointCircleDataUri(
  radius: number,
  fillCss: string,
  outlineCss: string,
  outlineWidth: number
): string {
  const pad = Math.ceil(outlineWidth) + 1;
  const total = (radius + pad) * 2;
  const canvas = document.createElement("canvas");
  canvas.width = total;
  canvas.height = total;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return "";
  }
  ctx.clearRect(0, 0, total, total);
  ctx.beginPath();
  ctx.arc(total / 2, total / 2, radius, 0, Math.PI * 2);
  ctx.fillStyle = fillCss;
  ctx.fill();
  ctx.strokeStyle = outlineCss;
  ctx.lineWidth = outlineWidth;
  ctx.stroke();
  return canvas.toDataURL();
}

function resolveEndpointCircleCss(endpoint: EndpointRenderContext): {
  readonly fillCss: string;
  readonly outlineCss: string;
} {
  const isSlotA =
    endpoint.endpointRole === "endpoint-a" ||
    endpoint.endpointId === "tw-cht-multi-orbit-ground-infrastructure";
  return isSlotA
    ? { fillCss: "rgba(126,226,184,0.96)", outlineCss: "rgba(2,20,31,0.96)" }
    : { fillCss: "rgba(155,196,232,0.94)", outlineCss: "rgba(2,20,31,0.96)" };
}

function createEndpointBillboardStyle(
  endpoint: EndpointRenderContext
): BillboardGraphics {
  const { fillCss, outlineCss } = resolveEndpointCircleCss(endpoint);
  const dataUri = drawEndpointCircleDataUri(6.5, fillCss, outlineCss, 2);
  return new BillboardGraphics({
    image: new ConstantProperty(dataUri),
    verticalOrigin: new ConstantProperty(VerticalOrigin.CENTER),
    horizontalOrigin: new ConstantProperty(HorizontalOrigin.CENTER),
    disableDepthTestDistance: new ConstantProperty(Number.POSITIVE_INFINITY),
    distanceDisplayCondition: new ConstantProperty(
      new DistanceDisplayCondition(0, 60_000_000)
    )
  });
}

function createEndpointEllipseStyle(
  endpoint: EndpointRenderContext
): EllipseGraphics {
  const color = resolveEndpointColor(endpoint.endpointId, endpoint.endpointRole);

  return new EllipseGraphics({
    semiMajorAxis: new ConstantProperty(endpoint.renderMarker.displayRadiusMeters),
    semiMinorAxis: new ConstantProperty(endpoint.renderMarker.displayRadiusMeters),
    material: color.withAlpha(0.1),
    outline: new ConstantProperty(true),
    outlineColor: new ConstantProperty(color.withAlpha(0.65)),
    height: new ConstantProperty(endpoint.renderMarker.displayPosition.heightMeters)
  });
}

function createEndpointLabelStyle(
  endpoint: EndpointRenderContext
): LabelGraphics {
  const roleLetter =
    endpoint.endpointRole === "endpoint-a" ? "A" : "B";
  const roleColorCss =
    endpoint.endpointRole === "endpoint-a" ? "#ffd166" : "#9bc4e8";
  return new LabelGraphics({
    show: new ConstantProperty(true),
    text: new ConstantProperty(roleLetter),
    font: "bold 14px Inter, system-ui, sans-serif",
    style: LabelStyle.FILL_AND_OUTLINE,
    fillColor: new ConstantProperty(Color.fromCssColorString(roleColorCss)),
    outlineColor: new ConstantProperty(
      Color.fromCssColorString("#02141f").withAlpha(0.96)
    ),
    outlineWidth: 2,
    showBackground: true,
    backgroundColor: new ConstantProperty(
      Color.fromCssColorString("#06121a").withAlpha(0.76)
    ),
    backgroundPadding: new Cartesian2(6, 3),
    pixelOffset: new Cartesian2(12, -14),
    horizontalOrigin: HorizontalOrigin.LEFT,
    verticalOrigin: VerticalOrigin.BOTTOM,
    disableDepthTestDistance: Number.POSITIVE_INFINITY,
    distanceDisplayCondition: new DistanceDisplayCondition(0, 60_000_000)
  });
}

function createActorGlowStyle(actor: M8aV4OrbitActorProjection): BillboardGraphics {
  return new BillboardGraphics({
    image: new ConstantProperty(createActorGlowImageUri(actor.orbitClass)),
    width: new ConstantProperty(M8A_V4_ACTOR_GLOW_SIZE_PX),
    height: new ConstantProperty(M8A_V4_ACTOR_GLOW_SIZE_PX),
    pixelOffset: new ConstantProperty(
      resolveActorGlowModelCenterOffset(actor.orbitClass)
    ),
    disableDepthTestDistance: Number.POSITIVE_INFINITY,
    distanceDisplayCondition: new DistanceDisplayCondition(0, 90_000_000)
  });
}

function createGeoGuardCueStyle(): BillboardGraphics {
  return new BillboardGraphics({
    image: new ConstantProperty(createActorGlowImageUri("geo")),
    width: new ConstantProperty(54),
    height: new ConstantProperty(54),
    color: new ConstantProperty(Color.WHITE.withAlpha(0.38)),
    pixelOffset: new ConstantProperty(resolveActorGlowModelCenterOffset("geo")),
    disableDepthTestDistance: Number.POSITIVE_INFINITY,
    distanceDisplayCondition: new DistanceDisplayCondition(0, 100_000_000)
  });
}

export function shouldRenderActorGlow(actor: M8aV4OrbitActorProjection): boolean {
  return actor.orbitClass !== "leo";
}

export function shouldRenderActorLabel(
  actor: M8aV4OrbitActorProjection,
  simulationWindow: M8aV46dSimulationHandoverWindow
): boolean {
  return actor.actorId === simulationWindow.displayRepresentativeActorId;
}

export function shouldShowGeoGuardCue(
  simulationWindow: M8aV46dSimulationHandoverWindow
): boolean {
  return simulationWindow.windowId !== "geo-continuity-guard";
}

function createActorLabelStyle(
  actor: M8aV4OrbitActorProjection,
  emphasis: M8aV4ActorEmphasis
): LabelGraphics {
  const offset =
    actor.orbitClass === "geo"
      ? new Cartesian2(18, -34)
      : actor.orbitClass === "meo"
        ? new Cartesian2(-18, -34)
        : new Cartesian2(0, -36);

  return new LabelGraphics({
    text: new ConstantProperty(actor.label),
    font: "12px sans-serif",
    scale: 0.9,
    style: LabelStyle.FILL_AND_OUTLINE,
    fillColor: new ConstantProperty(
      Color.WHITE.withAlpha(emphasis.labelAlpha)
    ),
    outlineColor: new ConstantProperty(
      Color.fromCssColorString("#06121a").withAlpha(0.96)
    ),
    outlineWidth: 2,
    showBackground: true,
    backgroundColor: new ConstantProperty(resolveActorLabelBackgroundColor()),
    backgroundPadding: new Cartesian2(8, 4),
    pixelOffset: offset,
    horizontalOrigin: HorizontalOrigin.CENTER,
    verticalOrigin: VerticalOrigin.BOTTOM,
    disableDepthTestDistance: Number.POSITIVE_INFINITY,
    distanceDisplayCondition: new DistanceDisplayCondition(0, 100_000_000)
  });
}

function createActorModelGraphics(
  modelUri: string,
  actor: M8aV4OrbitActorProjection,
  emphasis: M8aV4ActorEmphasis
): ModelGraphics {
  return new ModelGraphics({
    uri: new ConstantProperty(modelUri),
    scale: new ConstantProperty(emphasis.modelScale),
    minimumPixelSize: new ConstantProperty(
      actor.orbitClass === "geo" ? 50 : actor.orbitClass === "meo" ? 58 : 52
    ),
    maximumScale: new ConstantProperty(180_000)
  });
}

function resolveRelationColor(role: M8aV4RelationRole): Color {
  switch (role) {
    case "displayRepresentative":
      return Color.fromCssColorString("#f7d46a").withAlpha(0.76);
    case "candidateContext":
      return Color.fromCssColorString("#7ee2b8").withAlpha(0.46);
    case "fallbackContext":
      return Color.fromCssColorString("#ffd166").withAlpha(0.2);
  }
}

function resolveRelationWidth(role: M8aV4RelationRole): number {
  switch (role) {
    case "displayRepresentative":
      return 2.35;
    case "candidateContext":
      return 1.45;
    case "fallbackContext":
      return 1.1;
  }
}

function resolveLinkFlowColor(
  direction: M8aV4LinkFlowDirection,
  role: M8aV4LinkFlowRelationRole
): Color {
  const base = Color.fromCssColorString(resolveLinkFlowHex(direction));
  const alpha =
    role === "displayRepresentative"
      ? direction === "uplink"
        ? 0.94
        : 0.88
      : direction === "uplink"
        ? 0.48
        : 0.42;

  return base.withAlpha(alpha);
}

function resolveLinkFlowHex(direction: M8aV4LinkFlowDirection): string {
  return direction === "uplink" ? "#f7d46a" : "#60d8ff";
}

function resolveLinkFlowWidth(
  role: M8aV4LinkFlowRelationRole,
  direction: M8aV4LinkFlowDirection
): number {
  if (role === "displayRepresentative") {
    return direction === "uplink" ? 3.6 : 3.25;
  }

  return direction === "uplink" ? 2.25 : 2.05;
}

function resolveLinkFlowPacketDimensions(
  role: M8aV4LinkFlowRelationRole,
  pulseIndex: number
): { width: number; height: number } {
  if (role === "displayRepresentative") {
    return pulseIndex === 0
      ? { width: 52, height: 24 }
      : { width: 42, height: 19 };
  }

  return pulseIndex === 0
    ? { width: 34, height: 16 }
    : { width: 28, height: 13 };
}

function createLinkFlowPacketImageUri(
  direction: M8aV4LinkFlowDirection,
  role: M8aV4LinkFlowRelationRole,
  pulseIndex: number
): string {
  const packetColor = resolveLinkFlowHex(direction);
  const opacity =
    role === "displayRepresentative" ? (pulseIndex === 0 ? 1 : 0.82) : 0.62;
  const text = direction === "uplink" ? "UP" : "DN";
  const svg = [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 42">',
    "<defs>",
    '<filter id="glow" x="-35%" y="-45%" width="170%" height="190%">',
    `<feDropShadow dx="0" dy="0" stdDeviation="3.2" flood-color="${packetColor}" flood-opacity="0.5"/>`,
    "</filter>",
    '<linearGradient id="body" x1="0%" x2="100%" y1="50%" y2="50%">',
    `<stop offset="0" stop-color="${packetColor}" stop-opacity="0.44"/>`,
    `<stop offset="0.55" stop-color="${packetColor}" stop-opacity="0.9"/>`,
    `<stop offset="1" stop-color="#ffffff" stop-opacity="0.96"/>`,
    "</linearGradient>",
    "</defs>",
    `<g opacity="${opacity}">`,
    `<circle cx="10" cy="21" r="2.7" fill="${packetColor}" opacity="0.22"/>`,
    `<circle cx="21" cy="21" r="3.3" fill="${packetColor}" opacity="0.38"/>`,
    `<circle cx="33" cy="21" r="4.1" fill="${packetColor}" opacity="0.58"/>`,
    '<g filter="url(#glow)">',
    '<path d="M38 10 H66 L86 21 L66 32 H38 L48 21 Z" fill="url(#body)" stroke="#06121a" stroke-opacity="0.7" stroke-width="2"/>',
    `<path d="M61 15 L75 21 L61 27" fill="none" stroke="${packetColor}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>`,
    '<path d="M66 15 L80 21 L66 27" fill="none" stroke="#ffffff" stroke-opacity="0.86" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>',
    `<text x="53" y="25" font-family="Arial, sans-serif" font-size="10" font-weight="700" fill="#06121a" fill-opacity="0.82">${text}</text>`,
    "</g>",
    "</g>",
    "</svg>"
  ].join("");

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function createRelationStyle(
  positions: CallbackProperty,
  role: M8aV4RelationRole
): PolylineGraphics {
  return new PolylineGraphics({
    positions,
    width: new ConstantProperty(resolveRelationWidth(role)),
    material: new ColorMaterialProperty(resolveRelationColor(role).withAlpha(0.22)),
    arcType: ArcType.NONE,
    clampToGround: false,
    show: new ConstantProperty(false)
  });
}

function createLinkFlowSegmentStyle(
  positions: CallbackProperty,
  direction: M8aV4LinkFlowDirection,
  role: M8aV4LinkFlowRelationRole
): PolylineGraphics {
  return new PolylineGraphics({
    positions,
    width: new ConstantProperty(resolveLinkFlowWidth(role, direction)),
    material: new PolylineArrowMaterialProperty(
      resolveLinkFlowColor(direction, role)
    ),
    arcType: ArcType.NONE,
    clampToGround: false
  });
}

function createLinkFlowPulseStyle(
  direction: M8aV4LinkFlowDirection,
  role: M8aV4LinkFlowRelationRole,
  pulseIndex: number,
  rotation: CallbackProperty
): BillboardGraphics {
  const dimensions = resolveLinkFlowPacketDimensions(role, pulseIndex);

  return new BillboardGraphics({
    image: new ConstantProperty(
      createLinkFlowPacketImageUri(direction, role, pulseIndex)
    ),
    width: new ConstantProperty(dimensions.width),
    height: new ConstantProperty(dimensions.height),
    rotation,
    alignedAxis: new ConstantProperty(Cartesian3.ZERO),
    disableDepthTestDistance: Number.POSITIVE_INFINITY,
    distanceDisplayCondition: new DistanceDisplayCondition(0, 100_000_000)
  });
}

function createLinkFlowLabelStyle(
  direction: M8aV4LinkFlowDirection
): LabelGraphics {
  return new LabelGraphics({
    text: new ConstantProperty(direction === "uplink" ? "UPLINK" : "DOWNLINK"),
    font: "600 12px sans-serif",
    scale: 0.92,
    style: LabelStyle.FILL_AND_OUTLINE,
    fillColor: new ConstantProperty(resolveLinkFlowColor(direction, "displayRepresentative")),
    outlineColor: new ConstantProperty(
      Color.fromCssColorString("#06121a").withAlpha(0.98)
    ),
    outlineWidth: 2,
    showBackground: true,
    backgroundColor: new ConstantProperty(
      Color.fromCssColorString("#07131b").withAlpha(0.78)
    ),
    backgroundPadding: new Cartesian2(8, 4),
    pixelOffset:
      direction === "uplink" ? new Cartesian2(0, -26) : new Cartesian2(0, 26),
    horizontalOrigin: HorizontalOrigin.CENTER,
    verticalOrigin:
      direction === "uplink" ? VerticalOrigin.BOTTOM : VerticalOrigin.TOP,
    disableDepthTestDistance: Number.POSITIVE_INFINITY,
    distanceDisplayCondition: new DistanceDisplayCondition(0, 100_000_000)
  });
}

export function createEndpointEntityOptions(endpoint: EndpointRenderContext) {
  return {
    id: `m8a-v4-endpoint-${endpoint.endpointId}`,
    name: endpoint.renderMarker.label,
    position: positionToCartesian(endpoint.renderMarker.displayPosition),
    billboard: createEndpointBillboardStyle(endpoint),
    ellipse: createEndpointEllipseStyle(endpoint),
    label: createEndpointLabelStyle(endpoint),
    description: new ConstantProperty(
      `${endpoint.endpointLabel}; ${endpoint.renderMarker.requiredPrecisionBadge}; display context only.`
    )
  };
}

export function createEndpointContextRibbonEntityOptions({
  endpointA,
  endpointB,
  selectedPairActive
}: {
  endpointA: EndpointRenderContext;
  endpointB: EndpointRenderContext;
  selectedPairActive: boolean;
}) {
  return {
    id: "m8a-v4-operator-family-endpoint-context-ribbon",
    name: selectedPairActive
      ? "Selected pair endpoint context ribbon"
      : "Operator-family endpoint context ribbon",
    polyline: new PolylineGraphics({
      positions: new ConstantProperty([
        positionToCartesian(endpointA.renderMarker.displayPosition),
        positionToCartesian(endpointB.renderMarker.displayPosition)
      ]),
      width: new ConstantProperty(1.4),
      material: new PolylineDashMaterialProperty({
        color: new ConstantProperty(
          Color.fromCssColorString("#f4fbff").withAlpha(0.42)
        ),
        gapColor: new ConstantProperty(
          Color.fromCssColorString("#06121a").withAlpha(0.06)
        ),
        dashLength: 20
      }),
      arcType: ArcType.GEODESIC,
      clampToGround: false
    }),
    description: new ConstantProperty(
      selectedPairActive
        ? "Selected pair context ribbon; public registry coordinates; display context only."
        : "Endpoint pair context ribbon; operator-family precision; display context only."
    )
  };
}

export function createActorEntityOptions({
  actor,
  position,
  modelUri,
  emphasis,
  simulationWindow
}: {
  actor: M8aV4OrbitActorProjection;
  position: CallbackPositionProperty;
  modelUri: string;
  emphasis: M8aV4ActorEmphasis;
  simulationWindow: M8aV46dSimulationHandoverWindow;
}) {
  return {
    id: actor.actorId,
    name: actor.label,
    position,
    billboard: shouldRenderActorGlow(actor)
      ? createActorGlowStyle(actor)
      : undefined,
    model: createActorModelGraphics(modelUri, actor, emphasis),
    label: shouldRenderActorLabel(actor, simulationWindow)
      ? createActorLabelStyle(actor, emphasis)
      : undefined,
    description: new ConstantProperty(
      `${actor.label}: ${actor.evidenceClass}; not active satellite; not native RF handover.`
    )
  };
}

export function createRelationEntityOptions(
  role: M8aV4RelationRole,
  positions: CallbackProperty
) {
  return {
    id: `m8a-v46e-simulation-${role}-context-ribbon`,
    name: `V4.6E ${M8A_V46E_RELATION_ROLE_LABELS[role]}`,
    polyline: createRelationStyle(positions, role),
    description: new ConstantProperty(
      "V4.6E simulation display context from the repo-owned projection module."
    ),
    show: false
  };
}

export function createLinkFlowSegmentEntityOptions({
  role,
  direction,
  positions
}: {
  role: M8aV4LinkFlowRelationRole;
  direction: M8aV4LinkFlowDirection;
  positions: CallbackProperty;
}) {
  return {
    id: `m8a-v4-link-flow-${role}-${direction}-segment`,
    name: `V4 link flow ${role} ${direction} segment`,
    polyline: createLinkFlowSegmentStyle(positions, direction, role),
    description: new ConstantProperty(
      `Modeled ${direction} data-flow cue; not packet capture, not measured throughput, not active gateway truth.`
    )
  };
}

export function createLinkFlowPulseEntityOptions({
  role,
  direction,
  pulseIndex,
  position,
  rotation
}: {
  role: M8aV4LinkFlowRelationRole;
  direction: M8aV4LinkFlowDirection;
  pulseIndex: number;
  position: CallbackPositionProperty;
  rotation: CallbackProperty;
}) {
  return {
    id: `m8a-v4-link-flow-${role}-${direction}-pulse-${pulseIndex}`,
    name: `V4 link flow ${role} ${direction} pulse ${pulseIndex + 1}`,
    position,
    billboard: createLinkFlowPulseStyle(
      direction,
      role,
      pulseIndex,
      rotation
    ),
    label:
      role === "displayRepresentative" && pulseIndex === 0
        ? createLinkFlowLabelStyle(direction)
        : undefined,
    description: new ConstantProperty(
      `Moving ${direction} pulse along a modeled ground-station/satellite link; ${M8A_V4_LINK_FLOW_TRUTH_BOUNDARY}.`
    )
  };
}

export function createGeoGuardCueEntityOptions(
  position: CallbackPositionProperty
) {
  return {
    id: "m8a-v46e-simulation-geo-guard-cue",
    name: "V4.6E GEO guard cue",
    position,
    billboard: createGeoGuardCueStyle(),
    description: new ConstantProperty(
      "Low-opacity GEO guard cue; simulation display context only."
    )
  };
}

export function updateActorStyle(
  handle: ActorRenderHandle,
  emphasis: M8aV4ActorEmphasis,
  simulationWindow: M8aV46dSimulationHandoverWindow
): void {
  if (handle.entity.model) {
    handle.entity.model.scale = new ConstantProperty(emphasis.modelScale);
    handle.entity.model.color = undefined;
    handle.entity.model.colorBlendAmount = undefined;
  }

  if (handle.entity.billboard) {
    handle.entity.billboard.image = new ConstantProperty(
      createActorGlowImageUri(handle.actor.orbitClass)
    );
    handle.entity.billboard.width = new ConstantProperty(
      M8A_V4_ACTOR_GLOW_SIZE_PX
    );
    handle.entity.billboard.height = new ConstantProperty(
      M8A_V4_ACTOR_GLOW_SIZE_PX
    );
    handle.entity.billboard.pixelOffset = new ConstantProperty(
      resolveActorGlowModelCenterOffset(handle.actor.orbitClass)
    );
  }

  if (shouldRenderActorLabel(handle.actor, simulationWindow)) {
    if (!handle.entity.label) {
      handle.entity.label = createActorLabelStyle(handle.actor, emphasis);
    }

    handle.entity.label.fillColor = new ConstantProperty(
      Color.WHITE.withAlpha(emphasis.labelAlpha)
    );
  } else {
    handle.entity.label = undefined;
  }
}

export function updateRelationStyle(handle: RelationRenderHandle): void {
  if (!handle.entity.polyline) {
    return;
  }

  handle.entity.polyline.width = new ConstantProperty(
    resolveRelationWidth(handle.role)
  );
  handle.entity.polyline.material = new ColorMaterialProperty(
    resolveRelationColor(handle.role).withAlpha(0.22)
  );
  handle.entity.polyline.show = new ConstantProperty(false);
}

export function updateLinkFlowSegmentStyle(
  handle: LinkFlowSegmentRenderHandle
): void {
  if (!handle.entity.polyline) {
    return;
  }

  handle.entity.polyline.width = new ConstantProperty(
    resolveLinkFlowWidth(handle.role, handle.direction)
  );
  handle.entity.polyline.material = new PolylineArrowMaterialProperty(
    resolveLinkFlowColor(handle.direction, handle.role)
  );
}

export function updateLinkFlowPulseStyle(
  handle: LinkFlowPulseRenderHandle
): void {
  if (!handle.entity.billboard) {
    return;
  }

  const dimensions = resolveLinkFlowPacketDimensions(
    handle.role,
    handle.pulseIndex
  );
  handle.entity.billboard.image = new ConstantProperty(
    createLinkFlowPacketImageUri(
      handle.direction,
      handle.role,
      handle.pulseIndex
    )
  );
  handle.entity.billboard.width = new ConstantProperty(dimensions.width);
  handle.entity.billboard.height = new ConstantProperty(dimensions.height);
}
