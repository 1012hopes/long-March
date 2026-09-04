import type { Map as MlMap } from "maplibre-gl";

type ContourVisibility = "visible" | "none";

type ContourLabelFeature = GeoJSON.Feature<GeoJSON.Point, { elevation?: number }>;
export type ContourLabelCollection = GeoJSON.FeatureCollection<GeoJSON.Point, { elevation?: number }>;
export type TerrainStatus = "local" | "loading" | "ready" | "offline";
export type TerrainMode = "plain" | "river-valley" | "mountain" | "plateau";

export type TerrainUiState = {
  status: TerrainStatus;
  active: boolean;
  pendingActivationRequestId: number | null;
  nextActivationRequestId: number;
};

type RuntimeState = {
  majorContoursPromise: Promise<void> | null;
  midContoursPromise: Promise<void> | null;
  fineContoursPromise: Promise<void> | null;
  onlineTerrainPending: PendingOnlineTerrain | null;
  onlineTerrainReady: boolean;
};

export type OnlineTerrainResult = "ready" | "offline" | "cancelled";

type OnlineTerrainSourceEvent = {
  sourceId?: string;
  isSourceLoaded?: boolean;
};

type OnlineTerrainErrorEvent = {
  sourceId?: string;
};

type PendingOnlineTerrain = {
  promise: Promise<OnlineTerrainResult>;
  resolve: (result: OnlineTerrainResult) => void;
  onSourceData: (event: OnlineTerrainSourceEvent) => void;
  onError: (event: OnlineTerrainErrorEvent) => void;
  settled: boolean;
  timeoutId: ReturnType<typeof setTimeout> | null;
};

const CONTOUR_INSERT_BEFORE = "graticule";
const DETAIL_CONTOUR_ZOOM = 7.2;
const FINE_CONTOUR_ZOOM = 8.5;
const ONLINE_TERRAIN_TIMEOUT_MS = 1800;

const runtimeStates = new WeakMap<MlMap, RuntimeState>();

let contourLabelPromise: Promise<ContourLabelCollection | null> | null = null;

const contourMajorSource = {
  type: "geojson",
  data: "terrain/contour-200.geojson",
} as const;

const contourMidSource = {
  type: "geojson",
  data: "terrain/contour-100.geojson",
} as const;

const contourFineSource = {
  type: "geojson",
  data: "terrain/contour-50.geojson",
} as const;

const contourMajorLayer = {
  id: "contour-major",
  type: "line",
  source: "contourMajor",
  minzoom: 4.6,
  paint: {
    "line-color": "#6F735F",
    "line-width": ["interpolate", ["linear"], ["zoom"], 4.6, 0.32, 8, 0.75, 11, 1.15],
    "line-opacity": ["interpolate", ["linear"], ["zoom"], 4.6, 0.18, 6, 0.38, 9, 0.55],
  },
} as const;

const contourMidLayer = {
  id: "contour-mid",
  type: "line",
  source: "contourMid",
  minzoom: 6.4,
  paint: {
    "line-color": "#858873",
    "line-width": ["interpolate", ["linear"], ["zoom"], 6.4, 0.25, 10, 0.72],
    "line-opacity": ["interpolate", ["linear"], ["zoom"], 6.4, 0, 7.2, 0.3, 10, 0.46],
  },
} as const;

const contourFineLayer = {
  id: "contour-fine",
  type: "line",
  source: "contourFine",
  minzoom: 8.1,
  paint: {
    "line-color": "#989A86",
    "line-width": 0.42,
    "line-opacity": ["interpolate", ["linear"], ["zoom"], 8.1, 0, 9, 0.25, 12, 0.36],
  },
} as const;

const onlineTerrainSource = {
  type: "raster-dem",
  tiles: ["https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"],
  encoding: "terrarium",
  tileSize: 256,
  maxzoom: 13,
  attribution: "Elevation: AWS Terrain Tiles, SRTM and NASADEM derived",
} as const;

const TERRAIN_EXAGGERATION: Record<TerrainMode, number> = {
  plain: 1.15,
  "river-valley": 1.42,
  mountain: 1.28,
  plateau: 1.32,
};

export function createTerrainUiState(): TerrainUiState {
  return {
    status: "local",
    active: false,
    pendingActivationRequestId: null,
    nextActivationRequestId: 1,
  };
}

export function requestTerrainActivation(state: TerrainUiState): { state: TerrainUiState; requestId: number } {
  const requestId = state.nextActivationRequestId;
  return {
    requestId,
    state: {
      ...state,
      status: state.status === "ready" ? "ready" : "loading",
      active: false,
      pendingActivationRequestId: requestId,
      nextActivationRequestId: requestId + 1,
    },
  };
}

export function cancelTerrainActivationRequest(state: TerrainUiState): TerrainUiState {
  if (state.pendingActivationRequestId === null || state.active) return state;
  return {
    ...state,
    status: state.status === "loading" ? "local" : state.status,
    pendingActivationRequestId: null,
  };
}

export function disableTerrain3d(state: TerrainUiState): TerrainUiState {
  return {
    ...state,
    active: false,
    pendingActivationRequestId: null,
  };
}

export function syncTerrainStatus(state: TerrainUiState, status: TerrainStatus): TerrainUiState {
  if (status === "offline") {
    return {
      ...state,
      status,
      active: false,
      pendingActivationRequestId: null,
    };
  }
  if (status === "local") {
    return {
      ...state,
      status,
      active: false,
      pendingActivationRequestId: null,
    };
  }
  if (status === "loading" && state.active) return state;
  return {
    ...state,
    status,
  };
}

export function applyTerrainActivation(state: TerrainUiState, requestId: number): TerrainUiState {
  if (state.pendingActivationRequestId !== requestId) return state;
  return {
    ...state,
    status: "ready",
    active: true,
    pendingActivationRequestId: null,
  };
}

export function terrainExaggerationForMode(mode: TerrainMode): number {
  return TERRAIN_EXAGGERATION[mode];
}

function stateFor(map: MlMap): RuntimeState {
  const existing = runtimeStates.get(map);
  if (existing) return existing;
  const created: RuntimeState = {
    majorContoursPromise: null,
    midContoursPromise: null,
    fineContoursPromise: null,
    onlineTerrainPending: null,
    onlineTerrainReady: false,
  };
  runtimeStates.set(map, created);
  return created;
}

function withMapGuard<T>(map: MlMap, fallback: T, work: () => T): T {
  try {
    return work();
  } catch {
    return fallback;
  }
}

function hasSource(map: MlMap, id: string) {
  return withMapGuard(map, false, () => Boolean(map.getSource(id)));
}

function hasLayer(map: MlMap, id: string) {
  return withMapGuard(map, false, () => Boolean(map.getLayer(id)));
}

function visibilityOf(visible = true): ContourVisibility {
  return visible ? "visible" : "none";
}

function setLayerVisibility(map: MlMap, id: string, visible = true) {
  withMapGuard(map, undefined, () => {
    if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", visibilityOf(visible));
  });
}

function addSourceIfMissing(map: MlMap, id: string, source: object) {
  if (hasSource(map, id)) return;
  withMapGuard(map, undefined, () => {
    map.addSource(id, source as never);
  });
}

function addLayerIfMissing(map: MlMap, layer: { id: string; layout?: Record<string, unknown> }, visible = true) {
  if (hasLayer(map, layer.id)) {
    setLayerVisibility(map, layer.id, visible);
    return;
  }
  withMapGuard(map, undefined, () => {
    map.addLayer(
      {
        ...layer,
        layout: { ...layer.layout, visibility: visibilityOf(visible) },
      } as never,
      CONTOUR_INSERT_BEFORE
    );
  });
}

async function ensureContourLayer(
  map: MlMap,
  promiseKey: "majorContoursPromise" | "midContoursPromise" | "fineContoursPromise",
  sourceId: string,
  source: object,
  layer: { id: string; layout?: Record<string, unknown> },
  visible = true
) {
  const state = stateFor(map);
  if (!state[promiseKey]) {
    state[promiseKey] = Promise.resolve().then(() => {
      addSourceIfMissing(map, sourceId, source);
      addLayerIfMissing(map, layer, visible);
    });
  }
  await state[promiseKey];
  setLayerVisibility(map, layer.id, visible);
}

function removeOnlineTerrainSource(map: MlMap) {
  withMapGuard(map, undefined, () => {
    if (map.getTerrain()) map.setTerrain(null);
    if (map.getSource("terrainDem")) map.removeSource("terrainDem");
  });
}

function finishPendingOnlineTerrain(
  map: MlMap,
  state: RuntimeState,
  pending: PendingOnlineTerrain,
  result: OnlineTerrainResult
) {
  if (pending.settled) return;
  pending.settled = true;
  state.onlineTerrainPending = null;
  state.onlineTerrainReady = result === "ready";
  if (pending.timeoutId !== null) {
    clearTimeout(pending.timeoutId);
    pending.timeoutId = null;
  }
  withMapGuard(map, undefined, () => {
    map.off("sourcedata", pending.onSourceData);
    map.off("error", pending.onError);
  });
  if (result !== "ready") removeOnlineTerrainSource(map);
  pending.resolve(result);
}

export async function loadContourLabels(): Promise<ContourLabelCollection | null> {
  if (!contourLabelPromise) {
    contourLabelPromise = fetch("terrain/contour-labels.geojson")
      .then(async (response) => (response.ok ? ((await response.json()) as ContourLabelCollection) : null))
      .catch(() => null)
      .then((data) => {
        if (!data) contourLabelPromise = null;
        return data;
      });
  }
  return contourLabelPromise;
}

export async function ensureMajorContours(map: MlMap, visible = true): Promise<void> {
  await ensureContourLayer(map, "majorContoursPromise", "contourMajor", contourMajorSource, contourMajorLayer, visible);
}

export async function ensureDetailContours(map: MlMap, zoom: number, visible = true): Promise<void> {
  if (zoom >= DETAIL_CONTOUR_ZOOM) {
    await ensureContourLayer(map, "midContoursPromise", "contourMid", contourMidSource, contourMidLayer, visible);
  }
  if (zoom >= FINE_CONTOUR_ZOOM) {
    await ensureContourLayer(map, "fineContoursPromise", "contourFine", contourFineSource, contourFineLayer, visible);
  }
}

export function cancelOnlineTerrain(map: MlMap): void {
  const state = runtimeStates.get(map);
  if (!state) return;
  if (!state.onlineTerrainPending) {
    return;
  }
  finishPendingOnlineTerrain(map, state, state.onlineTerrainPending, "cancelled");
}

export function resetOnlineTerrain(map: MlMap): void {
  const state = runtimeStates.get(map);
  if (state?.onlineTerrainPending) finishPendingOnlineTerrain(map, state, state.onlineTerrainPending, "cancelled");
  if (state) state.onlineTerrainReady = false;
  removeOnlineTerrainSource(map);
}

export async function ensureOnlineTerrain(map: MlMap): Promise<OnlineTerrainResult> {
  const state = stateFor(map);
  if (state.onlineTerrainReady && hasSource(map, "terrainDem")) return "ready";
  if (state.onlineTerrainPending) return state.onlineTerrainPending.promise;

  let pending: PendingOnlineTerrain;
  const promise = new Promise<OnlineTerrainResult>((resolve) => {
    const onSourceData = (event: OnlineTerrainSourceEvent) => {
      if (event.sourceId === "terrainDem" && event.isSourceLoaded) finishPendingOnlineTerrain(map, state, pending, "ready");
    };

    const onError = (event: OnlineTerrainErrorEvent) => {
      if (event.sourceId === "terrainDem") finishPendingOnlineTerrain(map, state, pending, "offline");
    };

    pending = {
      promise: undefined as never,
      resolve,
      onSourceData,
      onError,
      settled: false,
      timeoutId: null,
    };
  });
  pending!.promise = promise;
  state.onlineTerrainPending = pending!;

  const hooked = withMapGuard(map, false, () => {
    map.on("sourcedata", pending!.onSourceData);
    map.on("error", pending!.onError);
    return true;
  });

  if (!hooked) {
    finishPendingOnlineTerrain(map, state, pending!, "offline");
    return promise;
  }

  if (!hasSource(map, "terrainDem")) {
    const added = withMapGuard(map, false, () => {
      map.addSource("terrainDem", onlineTerrainSource as never);
      return true;
    });
    if (!added) {
      finishPendingOnlineTerrain(map, state, pending!, "offline");
      return promise;
    }
  }

  pending!.timeoutId = setTimeout(() => finishPendingOnlineTerrain(map, state, pending!, "offline"), ONLINE_TERRAIN_TIMEOUT_MS);
  return promise;
}
