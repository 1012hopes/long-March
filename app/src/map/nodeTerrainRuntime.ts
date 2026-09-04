export const NODE_TERRAIN_COLOR_SOURCE_ID = "node-terrain-color-source";
export const NODE_TERRAIN_RELIEF_SOURCE_ID = "node-terrain-relief-source";
export const NODE_TERRAIN_COLOR_LAYER_ID = "node-terrain-color";
export const NODE_TERRAIN_RELIEF_LAYER_ID = "node-terrain-relief";

type Bounds = { west: number; east: number; south: number; north: number };

export type NodeTerrainManifestEntry = {
  nodeId: string;
  bbox: Bounds;
  filenames: { tint: string; hillshade: string };
  resolution: { width: number; height: number };
};

export type NodeTerrainManifest = {
  generated: string;
  source: string;
  nodes: NodeTerrainManifestEntry[];
};

type ImageSourceLike = {
  updateImage?: (options: { url: string; coordinates: readonly (readonly [number, number])[] }) => void;
};

export type NodeTerrainMapLike = {
  getSource: (id: string) => ImageSourceLike | undefined;
  addSource: (id: string, source: unknown) => void;
  removeSource?: (id: string) => void;
  getLayer: (id: string) => unknown;
  addLayer: (layer: unknown, beforeId?: string) => void;
  removeLayer?: (id: string) => void;
  setLayoutProperty: (id: string, name: string, value: unknown) => void;
};

const stateByMap = new WeakMap<object, { request: number; nodeId: string | null }>();
let manifestPromise: Promise<NodeTerrainManifest | null> | null = null;

export function nodeTerrainCoordinates(bounds: Bounds) {
  return [
    [bounds.west, bounds.north],
    [bounds.east, bounds.north],
    [bounds.east, bounds.south],
    [bounds.west, bounds.south],
  ] as const;
}

export function loadNodeTerrainManifest(
  fetcher: typeof fetch = fetch
): Promise<NodeTerrainManifest | null> {
  if (!manifestPromise) {
    manifestPromise = fetcher("terrain/nodes/manifest.json")
      .then(async (response) => (response.ok ? (await response.json()) as NodeTerrainManifest : null))
      .catch(() => null);
  }
  return manifestPromise;
}

export function resetNodeTerrainManifestForTests(): void {
  manifestPromise = null;
}

const imageUrl = (filename: string) => `terrain/nodes/${filename}`;

function removeNodeTerrain(map: NodeTerrainMapLike): void {
  for (const layerId of [NODE_TERRAIN_RELIEF_LAYER_ID, NODE_TERRAIN_COLOR_LAYER_ID]) {
    if (map.getLayer(layerId)) map.removeLayer?.(layerId);
  }
  for (const sourceId of [NODE_TERRAIN_RELIEF_SOURCE_ID, NODE_TERRAIN_COLOR_SOURCE_ID]) {
    if (map.getSource(sourceId)) map.removeSource?.(sourceId);
  }
}

export async function applyNodeTerrain(
  map: NodeTerrainMapLike,
  nodeId: string,
  visible = true,
  fetcher: typeof fetch = fetch
): Promise<"ready" | "missing" | "stale"> {
  const previous = stateByMap.get(map as object) ?? { request: 0, nodeId: null };
  const request = previous.request + 1;
  stateByMap.set(map as object, { request, nodeId });

  const manifest = await loadNodeTerrainManifest(fetcher);
  const current = stateByMap.get(map as object);
  if (!current || current.request !== request || current.nodeId !== nodeId) return "stale";
  const entry = manifest?.nodes.find((item) => item.nodeId === nodeId);
  if (!entry) {
    removeNodeTerrain(map);
    return "missing";
  }

  const coordinates = nodeTerrainCoordinates(entry.bbox);
  const sources = [
    [NODE_TERRAIN_COLOR_SOURCE_ID, imageUrl(entry.filenames.tint)],
    [NODE_TERRAIN_RELIEF_SOURCE_ID, imageUrl(entry.filenames.hillshade)],
  ] as const;

  for (const [sourceId, url] of sources) {
    const source = map.getSource(sourceId);
    if (source?.updateImage) source.updateImage({ url, coordinates });
    else map.addSource(sourceId, { type: "image", url, coordinates });
  }

  if (!map.getLayer(NODE_TERRAIN_COLOR_LAYER_ID)) {
    map.addLayer(
      {
        id: NODE_TERRAIN_COLOR_LAYER_ID,
        type: "raster",
        source: NODE_TERRAIN_COLOR_SOURCE_ID,
        paint: {
          "raster-opacity": 0.48,
          "raster-saturation": -0.1,
          "raster-contrast": 0.02,
          "raster-fade-duration": 0,
        },
        layout: { visibility: visible ? "visible" : "none" },
      },
      "coastline-overlay"
    );
  }
  if (!map.getLayer(NODE_TERRAIN_RELIEF_LAYER_ID)) {
    map.addLayer(
      {
        id: NODE_TERRAIN_RELIEF_LAYER_ID,
        type: "raster",
        source: NODE_TERRAIN_RELIEF_SOURCE_ID,
        paint: {
          "raster-opacity": 0.52,
          "raster-saturation": -1,
          "raster-contrast": 0.24,
          "raster-fade-duration": 0,
        },
        layout: { visibility: visible ? "visible" : "none" },
      },
      "coastline-overlay"
    );
  }

  map.setLayoutProperty(NODE_TERRAIN_COLOR_LAYER_ID, "visibility", visible ? "visible" : "none");
  map.setLayoutProperty(NODE_TERRAIN_RELIEF_LAYER_ID, "visibility", visible ? "visible" : "none");
  return "ready";
}

export function clearNodeTerrain(map: NodeTerrainMapLike): void {
  const previous = stateByMap.get(map as object) ?? { request: 0, nodeId: null };
  stateByMap.set(map as object, { request: previous.request + 1, nodeId: null });
  removeNodeTerrain(map);
}

