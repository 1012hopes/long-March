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
  onlineTerrainReady: boolean;
};

export type OnlineTerrainResult = "ready" | "offline" | "cancelled";

// 3D 地形使用本地预提取的 DEM 金字塔（public/terrain/dem/，
// 由 scripts/build-dem-pyramid.mjs 从 AWS Terrain Tiles 生成），
// 即时就绪、离线可用，无需等待境外瓦片下载。
const localTerrainSource = {
  type: "raster-dem",
  tiles: ["terrain/dem/{z}/{x}/{y}.png"],
  encoding: "terrarium",
  tileSize: 256,
  minzoom: 5,
  maxzoom: 8,
  attribution: "Elevation: AWS Terrain Tiles, SRTM and NASADEM derived",
} as const;

const CONTOUR_INSERT_BEFORE = "graticule";
const DETAIL_CONTOUR_ZOOM = 7.2;
const FINE_CONTOUR_ZOOM = 8.5;

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

// 夸张度按观展距离调校：总览距离下垂直起伏需要 ~2 倍才可感知，
// 节点/巡航距离下河谷需更强，避免「开了 3D 却像平面」。
const TERRAIN_EXAGGERATION: Record<TerrainMode, number> = {
  plain: 2.0,
  "river-valley": 2.4,
  mountain: 2.2,
  plateau: 2.3,
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

// 本地 DEM 即时就绪：注册源后立即返回，瓦片由 MapLibre 渲染时按需从本地读取。
// cancelOnlineTerrain 保留导出以兼容 MapCanvas 的 effect 清理调用——本地没有长任务可取消。
export function cancelOnlineTerrain(_map: MlMap): void {
  /* 无待取消任务 */
}

/** 「当今地形」对比图使用的 DEM 动态山体阴影层（光照随视角/时间实时渲染）。
 *  也用于档案图 3D 模式：可用 opts 控制强度与可见性（档案图 2D 时隐藏以保持纸面风格）。 */
export const COMPARE_HILLSHADE_LAYER_ID = "compare-dem-hillshade";

export function ensureCompareHillshade(
  map: MlMap,
  opts: { exaggeration?: number; visible?: boolean; shadowColor?: string } = {}
): void {
  withMapGuard(map, undefined, () => {
    if (!hasSource(map, "terrainDem")) map.addSource("terrainDem", localTerrainSource as never);
    stateFor(map).onlineTerrainReady = true;
    if (!hasLayer(map, COMPARE_HILLSHADE_LAYER_ID)) {
      map.addLayer(
        {
          id: COMPARE_HILLSHADE_LAYER_ID,
          type: "hillshade",
          source: "terrainDem",
          paint: {
            "hillshade-exaggeration": opts.exaggeration ?? 0.45,
            "hillshade-shadow-color": opts.shadowColor ?? "#6B5748",
            "hillshade-highlight-color": "#FFFDF4",
            "hillshade-accent-color": "#93816F",
          },
          layout: { visibility: opts.visible === false ? "none" : "visible" },
        },
        CONTOUR_INSERT_BEFORE
      );
    } else if (opts.visible !== undefined) {
      map.setLayoutProperty(COMPARE_HILLSHADE_LAYER_ID, "visibility", opts.visible ? "visible" : "none");
    }
  });
}

export function resetOnlineTerrain(map: MlMap): void {
  const state = runtimeStates.get(map);
  if (state) state.onlineTerrainReady = false;
  removeOnlineTerrainSource(map);
}

export async function ensureOnlineTerrain(map: MlMap): Promise<OnlineTerrainResult> {
  const state = stateFor(map);
  if (state.onlineTerrainReady && hasSource(map, "terrainDem")) return "ready";
  const added = withMapGuard(map, false, () => {
    if (!hasSource(map, "terrainDem")) map.addSource("terrainDem", localTerrainSource as never);
    return true;
  });
  if (!added) return "offline";
  state.onlineTerrainReady = true;
  return "ready";
}
