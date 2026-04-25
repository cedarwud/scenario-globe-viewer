import {
  Cartesian2,
  Cartesian3,
  Color,
  ConstantProperty,
  ConstantPositionProperty,
  CustomDataSource,
  DistanceDisplayCondition,
  GeometryInstance,
  HorizontalOrigin,
  LabelCollection,
  LabelGraphics,
  LabelStyle,
  Material,
  PointPrimitiveCollection,
  PolylineGeometry,
  PolylineMaterialAppearance,
  Primitive,
  PrimitiveCollection,
  PointGraphics,
  VerticalOrigin,
  type Viewer
} from "cesium";

import type {
  EndpointOverlayNode,
  InfrastructureOverlayNode
} from "../features/overlays";
import type {
  FirstIntakeRuntimeAddressResolution,
  FirstIntakeRuntimeScenarioSurface
} from "../features/scenario";
import {
  clearDocumentTelemetry,
  syncDocumentTelemetry
} from "../features/telemetry/document-telemetry";
import {
  isFirstIntakeFloatingPanelPresentationVisible,
  suppressFirstIntakeFloatingPanelPresentation
} from "./first-intake-presentation-suppression";

const FIRST_INTAKE_OVERLAY_EXPRESSION_DATA_SOURCE_NAME =
  "first-intake-overlay-expression";
const FIRST_INTAKE_OVERLAY_EXPRESSION_TELEMETRY_KEYS = [
  "firstIntakeOverlayExpressionState",
  "firstIntakeOverlayTruthBoundaryLabel",
  "firstIntakeOverlayEndpointExpressionMode",
  "firstIntakeOverlayInfrastructureExpressionMode",
  "firstIntakeOverlayGatewayPoolSemantics",
  "firstIntakeOverlayActiveGatewayClaim",
  "firstIntakeOverlayPanelVisible",
  "firstIntakeOverlayCoordinateFreeEndpointCount",
  "firstIntakeOverlayCoordinateFreeEndpointIds",
  "firstIntakeOverlayOnGlobeInfrastructureNodeCount",
  "firstIntakeOverlayInfrastructureNodeIds",
  "firstIntakeOverlayOrbitContextLayerOwner",
  "firstIntakeOverlayOrbitContextLayerKind",
  "firstIntakeOverlayOrbitContextBoundary",
  "firstIntakeOverlayOrbitContextBandCount",
  "firstIntakeOverlayOrbitContextLabels",
  "firstIntakeOverlayOrbitContextAltitudesMeters",
  "firstIntakeOverlayOrbitContextTruthClaims",
  "firstIntakeOverlayDataSourceAttached",
  "firstIntakeOverlayDataSourceName"
] as const;

export interface FirstIntakeOverlayExpressionEndpointState {
  endpointId: string;
  role: EndpointOverlayNode["role"];
  entityType: string;
  positionMode: string;
  mobilityKind: EndpointOverlayNode["mobilityKind"];
  renderClass: string;
  coordinateMode: "coordinate-free" | "seed-coordinates";
  note?: string;
}

export interface FirstIntakeOverlayExpressionInfrastructureNodeState {
  nodeId: string;
  provider: string;
  nodeType: string;
  precision: InfrastructureOverlayNode["precision"];
  networkRoles: ReadonlyArray<string>;
  sourceAuthority?: string;
}

export interface FirstIntakeOverlayExpressionState {
  scenarioId: string;
  scenarioLabel: string;
  addressQuery: string;
  addressResolution: FirstIntakeRuntimeAddressResolution;
  expressionState: "active-addressed-case";
  truthBoundaryLabel?: string;
  endpointExpressionMode: "runtime-local-panel";
  infrastructureExpressionMode: "globe-pool-markers";
  gatewayPoolSemantics: "eligible-gateway-pool";
  activeGatewayClaim: "not-claimed";
  panelVisible: boolean;
  coordinateFreeEndpointCount: number;
  coordinateFreeEndpointIds: ReadonlyArray<string>;
  onGlobeInfrastructureNodeCount: number;
  infrastructureNodeIds: ReadonlyArray<string>;
  infrastructureDataSourceName: string;
  dataSourceAttached: boolean;
  endpoints: ReadonlyArray<FirstIntakeOverlayExpressionEndpointState>;
  infrastructureNodes: ReadonlyArray<FirstIntakeOverlayExpressionInfrastructureNodeState>;
}

export interface FirstIntakeOverlayExpressionController {
  getState(): FirstIntakeOverlayExpressionState;
  subscribe(
    listener: (state: FirstIntakeOverlayExpressionState) => void
  ): () => void;
  dispose(): void;
}

export interface FirstIntakeOverlayExpressionControllerOptions {
  viewer: Viewer;
  hudFrame: HTMLElement;
  scenarioSurface: FirstIntakeRuntimeScenarioSurface;
}

function createInfrastructurePointStyle(): PointGraphics {
  return new PointGraphics({
    pixelSize: 10,
    color: Color.fromCssColorString("#6dd3ff").withAlpha(0.94),
    outlineColor: Color.fromCssColorString("#04121c").withAlpha(0.94),
    outlineWidth: 2,
    disableDepthTestDistance: Number.POSITIVE_INFINITY
  });
}

// M8A-V3.2 §Composition Priority / §Default Visible Surface Budget: the
// eligible-gateway-pool nodes are priority-5 "secondary inspectable detail".
// Hide their labels beyond ~3000 km so priority-2 aircraft + YKA endpoints
// read first at the default global preset; labels reappear on zoom-in, and
// the entity's description stays available via the Cesium click infobox.
const INFRASTRUCTURE_LABEL_INSPECT_DISTANCE_METERS = 3_000_000;
// M8A-V3.4 display-context: orbit-class altitude bands live with the
// on-globe overlay expression layer, not endpoint relation semantics.
const ORBIT_CONTEXT_LAYER_ID =
  "first-intake-overlay-expression-display-context-orbit-altitude-layer";
const ORBIT_CONTEXT_LAYER_OWNER =
  "first-intake-overlay-expression-controller";
const ORBIT_CONTEXT_LAYER_KIND = "display-context-altitude-band";
const ORBIT_CONTEXT_BOUNDARY =
  "representative-altitude-band-not-satellite-actor";
const ORBIT_CONTEXT_CHIP_TEXT = "display-context";
const ORBIT_CONTEXT_TRUTH_CLAIMS = {
  specificSatelliteIdentity: "not-claimed",
  activeServingSatellite: "not-claimed",
  activeGatewayAssignment: "not-claimed",
  nativeRfHandover: "not-claimed",
  rfBeamGeometry: "not-claimed",
  measurementTruth: "not-claimed",
  pairSpecificGeoTeleport: "not-claimed",
  walkerSyntheticActorPromotion: "not-claimed"
} as const;

interface OrbitContextCoordinateDegrees {
  lat: number;
  lon: number;
}

interface OrbitContextBandDefinition {
  bandId: string;
  orbitClass: "LEO" | "GEO";
  labelText: "LEO context" | "GEO continuity";
  altitudeMeters: number;
  geometryKind:
    | "representative-leo-altitude-band"
    | "representative-geo-continuity-arc";
  latitudeDegrees: number;
  longitudeStartDegrees: number;
  longitudeStopDegrees: number;
  sampleCount: number;
  lineStyle: "dashed" | "solid";
  lineWidthPixels: number;
  lineColorCss: string;
  lineAlpha: number;
  chipBackgroundCss: string;
  labelCoordinate: OrbitContextCoordinateDegrees;
  chipCoordinate: OrbitContextCoordinateDegrees;
  markerCoordinate?: OrbitContextCoordinateDegrees;
}

interface OrbitContextBandMetadata {
  bandId: string;
  orbitClass: "LEO" | "GEO";
  labelText: "LEO context" | "GEO continuity";
  chipText: typeof ORBIT_CONTEXT_CHIP_TEXT;
  altitudeMeters: number;
  geometryKind: OrbitContextBandDefinition["geometryKind"];
  lineStyle: OrbitContextBandDefinition["lineStyle"];
  displayContextBoundary: typeof ORBIT_CONTEXT_BOUNDARY;
}

interface OrbitContextLayerMetadata {
  layerId: typeof ORBIT_CONTEXT_LAYER_ID;
  owner: typeof ORBIT_CONTEXT_LAYER_OWNER;
  layerKind: typeof ORBIT_CONTEXT_LAYER_KIND;
  displayContextBoundary: typeof ORBIT_CONTEXT_BOUNDARY;
  bandCount: number;
  labelTexts: ReadonlyArray<string>;
  altitudeMeters: ReadonlyArray<number>;
  truthClaims: typeof ORBIT_CONTEXT_TRUTH_CLAIMS;
  bands: ReadonlyArray<OrbitContextBandMetadata>;
}

type TaggedOrbitContextPrimitiveCollection = PrimitiveCollection & {
  __firstIntakeOverlayOrbitContext: OrbitContextLayerMetadata;
};

type TaggedOrbitContextLabelCollection = LabelCollection & {
  __firstIntakeOverlayOrbitContextLabels: true;
};

interface OrbitContextPolylinePrimitiveSummary {
  id: {
    layerId: typeof ORBIT_CONTEXT_LAYER_ID;
    bandId: string;
    orbitClass: "LEO" | "GEO";
    displayContextBoundary: typeof ORBIT_CONTEXT_BOUNDARY;
  };
  width: number;
  positions: Cartesian3[];
}

type TaggedOrbitContextPolylinePrimitive = Primitive & {
  __firstIntakeOverlayOrbitContextPolyline: true;
  __firstIntakeOverlayOrbitContextPolylineSummary: OrbitContextPolylinePrimitiveSummary;
};

type TaggedOrbitContextPointCollection = PointPrimitiveCollection & {
  __firstIntakeOverlayOrbitContextPoints: true;
};

const ORBIT_CONTEXT_BANDS: ReadonlyArray<OrbitContextBandDefinition> = [
  {
    bandId: "display-context-leo-altitude-band",
    orbitClass: "LEO",
    labelText: "LEO context",
    altitudeMeters: 1_200_000,
    geometryKind: "representative-leo-altitude-band",
    latitudeDegrees: -26,
    longitudeStartDegrees: -62,
    longitudeStopDegrees: -36,
    sampleCount: 34,
    lineStyle: "dashed",
    lineWidthPixels: 3,
    lineColorCss: "#73e8ff",
    lineAlpha: 0.78,
    chipBackgroundCss: "#06323d",
    labelCoordinate: {
      lat: -26,
      lon: -50
    },
    chipCoordinate: {
      lat: -26,
      lon: -44
    }
  },
  {
    bandId: "display-context-geo-continuity-arc",
    orbitClass: "GEO",
    labelText: "GEO continuity",
    altitudeMeters: 35_786_000,
    geometryKind: "representative-geo-continuity-arc",
    latitudeDegrees: -46,
    longitudeStartDegrees: -44,
    longitudeStopDegrees: -22,
    sampleCount: 30,
    lineStyle: "solid",
    lineWidthPixels: 3.4,
    lineColorCss: "#f1c35f",
    lineAlpha: 0.82,
    chipBackgroundCss: "#4a3307",
    labelCoordinate: {
      lat: -44,
      lon: -30
    },
    chipCoordinate: {
      lat: -44,
      lon: -20
    },
    markerCoordinate: {
      lat: -44,
      lon: -30
    }
  }
];

function createInfrastructureLabelStyle(text: string): LabelGraphics {
  return new LabelGraphics({
    text: new ConstantProperty(text),
    font: "11px sans-serif",
    scale: 0.82,
    style: LabelStyle.FILL_AND_OUTLINE,
    fillColor: Color.WHITE.withAlpha(0.96),
    outlineColor: Color.fromCssColorString("#04121c").withAlpha(0.92),
    outlineWidth: 2,
    showBackground: true,
    backgroundColor: Color.fromCssColorString("#04121c").withAlpha(0.58),
    pixelOffset: new Cartesian2(0, -18),
    horizontalOrigin: HorizontalOrigin.CENTER,
    verticalOrigin: VerticalOrigin.BOTTOM,
    disableDepthTestDistance: Number.POSITIVE_INFINITY,
    distanceDisplayCondition: new ConstantProperty(
      new DistanceDisplayCondition(
        0,
        INFRASTRUCTURE_LABEL_INSPECT_DISTANCE_METERS
      )
    )
  });
}

function createOrbitContextMetadata(): OrbitContextLayerMetadata {
  const bands = ORBIT_CONTEXT_BANDS.map(
    (band): OrbitContextBandMetadata => ({
      bandId: band.bandId,
      orbitClass: band.orbitClass,
      labelText: band.labelText,
      chipText: ORBIT_CONTEXT_CHIP_TEXT,
      altitudeMeters: band.altitudeMeters,
      geometryKind: band.geometryKind,
      lineStyle: band.lineStyle,
      displayContextBoundary: ORBIT_CONTEXT_BOUNDARY
    })
  );

  return {
    layerId: ORBIT_CONTEXT_LAYER_ID,
    owner: ORBIT_CONTEXT_LAYER_OWNER,
    layerKind: ORBIT_CONTEXT_LAYER_KIND,
    displayContextBoundary: ORBIT_CONTEXT_BOUNDARY,
    bandCount: bands.length,
    labelTexts: bands.flatMap((band) => [band.labelText, band.chipText]),
    altitudeMeters: bands.map((band) => band.altitudeMeters),
    truthClaims: ORBIT_CONTEXT_TRUTH_CLAIMS,
    bands
  };
}

function createOrbitContextPosition(
  coordinate: OrbitContextCoordinateDegrees,
  altitudeMeters: number
): Cartesian3 {
  return Cartesian3.fromDegrees(coordinate.lon, coordinate.lat, altitudeMeters);
}

function createOrbitContextArcPositions(
  band: OrbitContextBandDefinition
): Cartesian3[] {
  const positions: Cartesian3[] = [];
  const sampleCount = Math.max(2, band.sampleCount);

  for (let index = 0; index < sampleCount; index += 1) {
    const ratio = index / (sampleCount - 1);
    const lon =
      band.longitudeStartDegrees +
      (band.longitudeStopDegrees - band.longitudeStartDegrees) * ratio;

    positions.push(
      Cartesian3.fromDegrees(lon, band.latitudeDegrees, band.altitudeMeters)
    );
  }

  return positions;
}

function createOrbitContextLineMaterial(
  band: OrbitContextBandDefinition
): Material {
  const color = Color.fromCssColorString(band.lineColorCss).withAlpha(
    band.lineAlpha
  );

  if (band.lineStyle === "dashed") {
    return Material.fromType(Material.PolylineDashType, {
      color,
      gapColor: Color.TRANSPARENT,
      dashLength: 18,
      dashPattern: 255
    });
  }

  return Material.fromType(Material.ColorType, {
    color
  });
}

function createOrbitContextPolylinePrimitive(
  band: OrbitContextBandDefinition
): TaggedOrbitContextPolylinePrimitive {
  const positions = createOrbitContextArcPositions(band);
  const id: OrbitContextPolylinePrimitiveSummary["id"] = {
    layerId: ORBIT_CONTEXT_LAYER_ID,
    bandId: band.bandId,
    orbitClass: band.orbitClass,
    displayContextBoundary: ORBIT_CONTEXT_BOUNDARY
  };
  const primitive = new Primitive({
    geometryInstances: new GeometryInstance({
      id,
      geometry: new PolylineGeometry({
        positions,
        width: band.lineWidthPixels,
        vertexFormat: PolylineMaterialAppearance.VERTEX_FORMAT
      })
    }),
    appearance: new PolylineMaterialAppearance({
      material: createOrbitContextLineMaterial(band),
      translucent: true,
      renderState: {
        depthTest: {
          enabled: false
        },
        depthMask: false
      }
    }),
    asynchronous: false,
    allowPicking: false,
    cull: false,
    releaseGeometryInstances: false
  }) as TaggedOrbitContextPolylinePrimitive;

  primitive.__firstIntakeOverlayOrbitContextPolyline = true;
  primitive.__firstIntakeOverlayOrbitContextPolylineSummary = {
    id,
    width: band.lineWidthPixels,
    positions
  };

  return primitive;
}

function addOrbitContextLabel({
  labels,
  band,
  text,
  coordinate,
  backgroundCss,
  pixelOffset
}: {
  labels: LabelCollection;
  band: OrbitContextBandDefinition;
  text: string;
  coordinate: OrbitContextCoordinateDegrees;
  backgroundCss: string;
  pixelOffset: Cartesian2;
}): void {
  labels.add({
    id: {
      layerId: ORBIT_CONTEXT_LAYER_ID,
      bandId: band.bandId,
      displayContextBoundary: ORBIT_CONTEXT_BOUNDARY
    },
    position: createOrbitContextPosition(coordinate, band.altitudeMeters),
    text,
    font:
      text === ORBIT_CONTEXT_CHIP_TEXT ? "10px sans-serif" : "12px sans-serif",
    fillColor: Color.WHITE.withAlpha(0.96),
    outlineColor: Color.fromCssColorString("#031018").withAlpha(0.94),
    outlineWidth: 2,
    style: LabelStyle.FILL_AND_OUTLINE,
    showBackground: true,
    backgroundColor: Color.fromCssColorString(backgroundCss).withAlpha(
      text === ORBIT_CONTEXT_CHIP_TEXT ? 0.7 : 0.58
    ),
    backgroundPadding:
      text === ORBIT_CONTEXT_CHIP_TEXT
        ? new Cartesian2(6, 3)
        : new Cartesian2(7, 4),
    pixelOffset,
    horizontalOrigin: HorizontalOrigin.CENTER,
    verticalOrigin: VerticalOrigin.CENTER,
    disableDepthTestDistance: Number.POSITIVE_INFINITY,
    distanceDisplayCondition: new DistanceDisplayCondition(0, 90_000_000)
  });
}

function appendOrbitContextBand({
  layer,
  labels,
  points,
  band
}: {
  layer: PrimitiveCollection;
  labels: LabelCollection;
  points: PointPrimitiveCollection;
  band: OrbitContextBandDefinition;
}): void {
  layer.add(createOrbitContextPolylinePrimitive(band));

  addOrbitContextLabel({
    labels,
    band,
    text: band.labelText,
    coordinate: band.labelCoordinate,
    backgroundCss: "#06131c",
    pixelOffset: new Cartesian2(0, -18)
  });
  addOrbitContextLabel({
    labels,
    band,
    text: ORBIT_CONTEXT_CHIP_TEXT,
    coordinate: band.chipCoordinate,
    backgroundCss: band.chipBackgroundCss,
    pixelOffset: new Cartesian2(0, 18)
  });

  if (band.markerCoordinate) {
    points.add({
      id: {
        layerId: ORBIT_CONTEXT_LAYER_ID,
        bandId: band.bandId,
        orbitClass: band.orbitClass,
        displayContextBoundary: ORBIT_CONTEXT_BOUNDARY
      },
      position: createOrbitContextPosition(
        band.markerCoordinate,
        band.altitudeMeters
      ),
      pixelSize: 7,
      color: Color.fromCssColorString(band.lineColorCss).withAlpha(0.78),
      outlineColor: Color.fromCssColorString("#031018").withAlpha(0.96),
      outlineWidth: 2,
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
      distanceDisplayCondition: new DistanceDisplayCondition(0, 90_000_000)
    });
  }
}

function createOrbitContextLayer(
  viewer: Viewer
): TaggedOrbitContextPrimitiveCollection {
  const layer = new PrimitiveCollection() as TaggedOrbitContextPrimitiveCollection;
  const labels = layer.add(
    new LabelCollection({
      scene: viewer.scene
    })
  ) as TaggedOrbitContextLabelCollection;
  const points = layer.add(
    new PointPrimitiveCollection()
  ) as TaggedOrbitContextPointCollection;

  layer.__firstIntakeOverlayOrbitContext = createOrbitContextMetadata();
  labels.__firstIntakeOverlayOrbitContextLabels = true;
  points.__firstIntakeOverlayOrbitContextPoints = true;

  for (const band of ORBIT_CONTEXT_BANDS) {
    appendOrbitContextBand({
      layer,
      labels,
      points,
      band
    });
  }

  return layer;
}

function createOrbitContextTelemetry(): Record<string, string> {
  const metadata = createOrbitContextMetadata();

  return {
    firstIntakeOverlayOrbitContextLayerOwner: metadata.owner,
    firstIntakeOverlayOrbitContextLayerKind: metadata.layerKind,
    firstIntakeOverlayOrbitContextBoundary: metadata.displayContextBoundary,
    firstIntakeOverlayOrbitContextBandCount: String(metadata.bandCount),
    firstIntakeOverlayOrbitContextLabels: JSON.stringify(metadata.labelTexts),
    firstIntakeOverlayOrbitContextAltitudesMeters: JSON.stringify(
      metadata.altitudeMeters
    ),
    firstIntakeOverlayOrbitContextTruthClaims: JSON.stringify(
      metadata.truthClaims
    )
  };
}

function humanizeToken(value: string): string {
  return value
    .split(/[_-]+/g)
    .filter((token) => token.length > 0)
    .map((token) => token[0].toUpperCase() + token.slice(1))
    .join(" ");
}

function describeEndpointRole(role: EndpointOverlayNode["role"]): string {
  return role === "endpoint-a" ? "Endpoint A" : "Endpoint B";
}

function describeEndpointGlobePlacement(
  endpoint: Pick<FirstIntakeOverlayExpressionEndpointState, "coordinateMode" | "positionMode">
): string {
  if (endpoint.coordinateMode === "seed-coordinates") {
    return "Placed on globe from seed coordinates.";
  }

  if (endpoint.positionMode === "mobile-snapshot-required") {
    return "No globe coordinate is shown until a later mobile snapshot seam exists.";
  }

  return "No globe coordinate is shown for this provider-managed anchor.";
}

function describeInfrastructurePoolLine(nodeCount: number): string {
  return `${nodeCount} OneWeb gateway nodes are plotted on-globe as an eligible pool only.`;
}

function createPanelRoot(): HTMLElement {
  const root = document.createElement("section");
  root.className = "hud-panel first-intake-overlay-expression";
  root.dataset.firstIntakeOverlayExpression = "true";
  root.setAttribute("aria-label", "First-intake overlay expression");
  return root;
}

function renderPanel(
  root: HTMLElement,
  state: FirstIntakeOverlayExpressionState
): void {
  const coordinateFreeEndpointIds = JSON.stringify(state.coordinateFreeEndpointIds);
  const infrastructureNodeIds = JSON.stringify(state.infrastructureNodeIds);

  root.dataset.expressionState = state.expressionState;
  root.dataset.truthBoundaryLabel = state.truthBoundaryLabel ?? "";
  root.dataset.endpointExpressionMode = state.endpointExpressionMode;
  root.dataset.infrastructureExpressionMode = state.infrastructureExpressionMode;
  root.dataset.gatewayPoolSemantics = state.gatewayPoolSemantics;
  root.dataset.activeGatewayClaim = state.activeGatewayClaim;
  root.dataset.panelVisible = state.panelVisible ? "true" : "false";
  root.dataset.coordinateFreeEndpointCount = String(
    state.coordinateFreeEndpointCount
  );
  root.dataset.coordinateFreeEndpointIds = coordinateFreeEndpointIds;
  root.dataset.onGlobeInfrastructureNodeCount = String(
    state.onGlobeInfrastructureNodeCount
  );
  root.dataset.infrastructureNodeIds = infrastructureNodeIds;
  root.dataset.dataSourceAttached = state.dataSourceAttached ? "true" : "false";
  root.dataset.dataSourceName = state.infrastructureDataSourceName;

  root.innerHTML = `
    <div class="first-intake-overlay-expression__eyebrow">
      First-Intake Runtime Expression
    </div>
    <h2 class="first-intake-overlay-expression__heading">
      Endpoint semantics stay bounded; infrastructure stays an eligible pool.
    </h2>
    <p class="first-intake-overlay-expression__summary">
      ${describeInfrastructurePoolLine(state.onGlobeInfrastructureNodeCount)}
      Coordinate-free endpoint semantics stay in this runtime-local panel and are not pinned to invented globe coordinates.
    </p>
    <div class="first-intake-overlay-expression__grid">
      ${state.endpoints
        .map(
          (endpoint) => `
            <article class="first-intake-overlay-expression__card" data-endpoint-id="${endpoint.endpointId}">
              <div class="first-intake-overlay-expression__card-label">
                ${describeEndpointRole(endpoint.role)}
              </div>
              <div class="first-intake-overlay-expression__card-title">
                ${humanizeToken(endpoint.entityType)}
              </div>
              <div class="first-intake-overlay-expression__card-detail">
                ${humanizeToken(endpoint.positionMode)}
              </div>
              <div class="first-intake-overlay-expression__card-detail">
                ${describeEndpointGlobePlacement(endpoint)}
              </div>
              ${
                endpoint.note
                  ? `<div class="first-intake-overlay-expression__card-note">${endpoint.note}</div>`
                  : ""
              }
            </article>
          `
        )
        .join("")}
    </div>
    <div class="first-intake-overlay-expression__pool">
      <div class="first-intake-overlay-expression__pool-label">
        Infrastructure Pool
      </div>
      <div class="first-intake-overlay-expression__pool-title">
        OneWeb eligible gateway pool
      </div>
      <div class="first-intake-overlay-expression__pool-detail">
        No active or serving gateway is claimed in this runtime expression.
      </div>
      <div class="first-intake-overlay-expression__pool-detail">
        ${state.infrastructureNodes
          .map((node) => humanizeToken(node.nodeId))
          .join(" • ")}
      </div>
    </div>
  `;
}

function syncTelemetry(state: FirstIntakeOverlayExpressionState): void {
  syncDocumentTelemetry({
    firstIntakeOverlayExpressionState: state.expressionState,
    firstIntakeOverlayTruthBoundaryLabel: state.truthBoundaryLabel,
    firstIntakeOverlayEndpointExpressionMode: state.endpointExpressionMode,
    firstIntakeOverlayInfrastructureExpressionMode:
      state.infrastructureExpressionMode,
    firstIntakeOverlayGatewayPoolSemantics: state.gatewayPoolSemantics,
    firstIntakeOverlayActiveGatewayClaim: state.activeGatewayClaim,
    firstIntakeOverlayPanelVisible: state.panelVisible ? "true" : "false",
    firstIntakeOverlayCoordinateFreeEndpointCount: String(
      state.coordinateFreeEndpointCount
    ),
    firstIntakeOverlayCoordinateFreeEndpointIds: JSON.stringify(
      state.coordinateFreeEndpointIds
    ),
    firstIntakeOverlayOnGlobeInfrastructureNodeCount: String(
      state.onGlobeInfrastructureNodeCount
    ),
    firstIntakeOverlayInfrastructureNodeIds: JSON.stringify(
      state.infrastructureNodeIds
    ),
    ...createOrbitContextTelemetry(),
    firstIntakeOverlayDataSourceAttached: state.dataSourceAttached
      ? "true"
      : "false",
    firstIntakeOverlayDataSourceName: state.infrastructureDataSourceName
  });
}

function notifyListeners(
  listeners: ReadonlySet<(state: FirstIntakeOverlayExpressionState) => void>,
  state: FirstIntakeOverlayExpressionState
): void {
  for (const listener of listeners) {
    listener(state);
  }
}

export function createFirstIntakeOverlayExpressionController({
  viewer,
  hudFrame,
  scenarioSurface
}: FirstIntakeOverlayExpressionControllerOptions): FirstIntakeOverlayExpressionController {
  const addressedEntry = scenarioSurface.getAddressedEntry();
  const resolvedOverlaySeeds =
    addressedEntry.resolvedInputs.resolvedFirstIntakeOverlaySeeds;

  if (!resolvedOverlaySeeds) {
    throw new Error(
      "First-intake overlay expression requires resolved first-intake overlay seeds."
    );
  }

  const endpointState = resolvedOverlaySeeds.resolvedEndpointSeed.endpoints.map(
    (endpoint): FirstIntakeOverlayExpressionEndpointState => ({
      endpointId: endpoint.endpointId,
      role: endpoint.role,
      entityType: endpoint.entityType,
      positionMode: endpoint.positionMode,
      mobilityKind: endpoint.mobilityKind,
      renderClass: endpoint.renderClass,
      coordinateMode: endpoint.coordinates ? "seed-coordinates" : "coordinate-free",
      ...(endpoint.notes ? { note: endpoint.notes } : {})
    })
  );
  const infrastructureState =
    resolvedOverlaySeeds.resolvedInfrastructureSeed.nodes.map(
      (node): FirstIntakeOverlayExpressionInfrastructureNodeState => ({
        nodeId: node.nodeId,
        provider: node.provider,
        nodeType: node.nodeType,
        precision: node.precision,
        networkRoles: [...node.networkRoles],
        ...(node.sourceAuthority
          ? { sourceAuthority: node.sourceAuthority }
          : {})
      })
    );
  const coordinateFreeEndpointIds = endpointState
    .filter((endpoint) => endpoint.coordinateMode === "coordinate-free")
    .map((endpoint) => endpoint.endpointId);
  const infrastructureNodeIds = infrastructureState.map((node) => node.nodeId);
  const panelRoot = createPanelRoot();
  const listeners = new Set<(state: FirstIntakeOverlayExpressionState) => void>();
  const dataSource = new CustomDataSource(
    FIRST_INTAKE_OVERLAY_EXPRESSION_DATA_SOURCE_NAME
  );
  const orbitContextLayer = createOrbitContextLayer(viewer);
  let disposed = false;
  let dataSourceAttached = false;

  viewer.scene.primitives.add(orbitContextLayer);
  viewer.scene.primitives.raiseToTop(orbitContextLayer);

  for (const node of resolvedOverlaySeeds.resolvedInfrastructureSeed.nodes) {
    const entity = dataSource.entities.add({
      id: node.nodeId,
      name: humanizeToken(node.nodeId),
      position: new ConstantPositionProperty(
        Cartesian3.fromDegrees(node.lon, node.lat, 0)
      ),
      point: createInfrastructurePointStyle(),
      label: createInfrastructureLabelStyle(humanizeToken(node.nodeId))
    });
    entity.description = new ConstantProperty(
      `${node.provider} ${humanizeToken(node.nodeType)}`
    );
  }

  const createState = (): FirstIntakeOverlayExpressionState => ({
    scenarioId: addressedEntry.scenarioId,
    scenarioLabel: addressedEntry.definition.label,
    addressQuery: addressedEntry.addressQuery,
    addressResolution: scenarioSurface.getState().addressResolution,
    expressionState: "active-addressed-case",
    truthBoundaryLabel: addressedEntry.resolvedInputs.context?.truthBoundaryLabel,
    endpointExpressionMode: "runtime-local-panel",
    infrastructureExpressionMode: "globe-pool-markers",
    gatewayPoolSemantics: "eligible-gateway-pool",
    activeGatewayClaim: "not-claimed",
    panelVisible: isFirstIntakeFloatingPanelPresentationVisible(panelRoot),
    coordinateFreeEndpointCount: coordinateFreeEndpointIds.length,
    coordinateFreeEndpointIds: [...coordinateFreeEndpointIds],
    onGlobeInfrastructureNodeCount: infrastructureNodeIds.length,
    infrastructureNodeIds: [...infrastructureNodeIds],
    infrastructureDataSourceName:
      FIRST_INTAKE_OVERLAY_EXPRESSION_DATA_SOURCE_NAME,
    dataSourceAttached,
    endpoints: endpointState.map((endpoint) => ({ ...endpoint })),
    infrastructureNodes: infrastructureState.map((node) => ({
      ...node,
      networkRoles: [...node.networkRoles]
    }))
  });

  const syncState = (): FirstIntakeOverlayExpressionState => {
    const nextState = createState();
    renderPanel(panelRoot, nextState);
    syncTelemetry(nextState);
    notifyListeners(listeners, nextState);
    if (!viewer.isDestroyed()) {
      viewer.scene.requestRender();
    }
    return nextState;
  };

  suppressFirstIntakeFloatingPanelPresentation(
    panelRoot,
    "first-intake-overlay-expression"
  );
  hudFrame.appendChild(panelRoot);
  syncState();

  void viewer.dataSources.add(dataSource).then(() => {
    if (disposed || viewer.isDestroyed()) {
      if (!viewer.isDestroyed() && viewer.dataSources.contains(dataSource)) {
        viewer.dataSources.remove(dataSource);
      }
      dataSourceAttached = false;
      return;
    }

    dataSourceAttached = true;
    dataSource.show = true;
    syncState();
  }).catch(() => {
    if (!disposed) {
      dataSourceAttached = false;
      syncState();
    }
  });

  return {
    getState(): FirstIntakeOverlayExpressionState {
      return createState();
    },
    subscribe(
      listener: (state: FirstIntakeOverlayExpressionState) => void
    ): () => void {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    dispose(): void {
      disposed = true;
      listeners.clear();
      panelRoot.remove();
      clearDocumentTelemetry(FIRST_INTAKE_OVERLAY_EXPRESSION_TELEMETRY_KEYS);
      dataSourceAttached = false;
      dataSource.show = false;
      dataSource.entities.removeAll();
      if (!viewer.isDestroyed() && viewer.dataSources.contains(dataSource)) {
        viewer.dataSources.remove(dataSource);
      }
      if (
        !viewer.isDestroyed() &&
        viewer.scene.primitives.contains(orbitContextLayer)
      ) {
        viewer.scene.primitives.remove(orbitContextLayer);
      }
      if (!viewer.isDestroyed()) {
        viewer.scene.requestRender();
      }
    }
  };
}

export {
  FIRST_INTAKE_OVERLAY_EXPRESSION_DATA_SOURCE_NAME
};
