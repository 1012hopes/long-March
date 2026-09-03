import type { Map as MlMap } from "maplibre-gl";

type ContourVisibility = "visible" | "none";

type ContourLabelFeature = GeoJSON.Feature<GeoJSON.Point, { elevation?: number }>;
export type ContourLabelCollection = GeoJSON.FeatureCollection<GeoJSON.Point, { elevation?: number }>;

type RuntimeState = {
  majorContoursPromise: Promise<void> | null;
  midContoursPromise: Promise<void> | null;
  fineContoursPromise: Promise<void> | null;
  onlineTerrainPromise: Promise<"ready" | "offline"> | null;
  onlineTerrainReady: boolean;
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

function stateFor(map: MlMap): RuntimeState {
  const existing = runtimeStates.get(map);
  if (existing) return existing;
  const created: RuntimeState = {
    majorContoursPromise: null,
    midContoursPromise: null,
    fineContoursPromise: null,
    onlineTerrainPromise: null,
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

export async function ensureOnlineTerrain(map: MlMap): Promise<"ready" | "offline"> {
  const state = stateFor(map);
  if (state.onlineTerrainReady && hasSource(map, "terrainDem")) return "ready";
  if (state.onlineTerrainPromise) return state.onlineTerrainPromise;

  state.onlineTerrainPromise = new Promise<"ready" | "offline">((resolve) => {
    let settled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const finish = (result: "ready" | "offline") => {
      if (settled) return;
      settled = true;
      state.onlineTerrainPromise = null;
      state.onlineTerrainReady = result === "ready";
      if (timeoutId !== null) clearTimeout(timeoutId);
      withMapGuard(map, undefined, () => {
        map.off("sourcedata", onSourceData);
        map.off("error", onError);
      });
      if (result === "offline") removeOnlineTerrainSource(map);
      resolve(result);
    };

    const onSourceData = (event: { sourceId?: string; isSourceLoaded?: boolean }) => {
      if (event.sourceId === "terrainDem" && event.isSourceLoaded) finish("ready");
    };

    const onError = (event: { sourceId?: string }) => {
      if (event.sourceId === "terrainDem") finish("offline");
    };

    const hooked = withMapGuard(map, false, () => {
      map.on("sourcedata", onSourceData);
      map.on("error", onError);
      return true;
    });

    if (!hooked) {
      finish("offline");
      return;
    }

    if (!hasSource(map, "terrainDem")) {
      const added = withMapGuard(map, false, () => {
        map.addSource("terrainDem", onlineTerrainSource as never);
        return true;
      });
      if (!added) {
        finish("offline");
        return;
      }
    }

    timeoutId = setTimeout(() => finish("offline"), ONLINE_TERRAIN_TIMEOUT_MS);
  });

  return state.onlineTerrainPromise;
}
