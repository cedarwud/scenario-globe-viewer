import {
  Cartesian2,
  Cartesian3,
  Color,
  ConstantProperty,
  ConstantPositionProperty,
  CustomDataSource,
  HorizontalOrigin,
  LabelGraphics,
  LabelStyle,
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
    disableDepthTestDistance: Number.POSITIVE_INFINITY
  });
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
  let disposed = false;
  let dataSourceAttached = false;

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
      if (!viewer.isDestroyed()) {
        viewer.scene.requestRender();
      }
    }
  };
}

export {
  FIRST_INTAKE_OVERLAY_EXPRESSION_DATA_SOURCE_NAME
};
