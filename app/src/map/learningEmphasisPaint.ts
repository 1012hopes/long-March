import {
  NODE_HYDROGRAPHY_LINE_LAYER_ID,
  NODE_HYDROGRAPHY_POINT_LAYER_ID,
} from "../data/nodeHydrography.ts";
import type { LearningEmphasis } from "../components/nodeLearning.ts";

export type PaintMapLike = {
  getLayer: (id: string) => unknown;
  setPaintProperty: (id: string, name: string, value: unknown) => void;
};

export const DEFAULT_TERRAIN_LAYER_IDS = ["offline-terrain-color", "offline-terrain-relief"] as const;

const BASE_HYDRO_LINE_WIDTH = ["case", ["==", ["get", "prominence"], "focus"], 3.1, 2.2] as const;
const EMPHASIZED_HYDRO_LINE_WIDTH = ["case", ["==", ["get", "prominence"], "focus"], 3.5, 2.5] as const;
const BASE_HYDRO_POINT_RADIUS = ["case", ["==", ["get", "prominence"], "focus"], 6.2, 4.6] as const;
const EMPHASIZED_HYDRO_POINT_RADIUS = ["case", ["==", ["get", "prominence"], "focus"], 6.8, 5] as const;

export function applyLearningEmphasisSupportPaint(
  map: PaintMapLike,
  emphasis: LearningEmphasis,
  terrainLayerIds: readonly string[] = DEFAULT_TERRAIN_LAYER_IDS
): void {
  const terrainColorOpacity =
    emphasis === "terrain" ? 0.44 : emphasis === "route" ? 0.28 : 0.34;
  const terrainReliefOpacity =
    emphasis === "terrain" ? 0.54 : emphasis === "route" ? 0.31 : 0.38;

  for (const layerId of terrainLayerIds) {
    if (!map.getLayer(layerId)) continue;
    map.setPaintProperty(
      layerId,
      "raster-opacity",
      layerId === "offline-terrain-color" ? terrainColorOpacity : terrainReliefOpacity
    );
  }

  if (map.getLayer(NODE_HYDROGRAPHY_LINE_LAYER_ID)) {
    map.setPaintProperty(
      NODE_HYDROGRAPHY_LINE_LAYER_ID,
      "line-opacity",
      emphasis === "terrain" ? 1 : emphasis === "route" ? 0.68 : 0.9
    );
    map.setPaintProperty(
      NODE_HYDROGRAPHY_LINE_LAYER_ID,
      "line-width",
      emphasis === "terrain" ? EMPHASIZED_HYDRO_LINE_WIDTH : BASE_HYDRO_LINE_WIDTH
    );
  }

  if (map.getLayer(NODE_HYDROGRAPHY_POINT_LAYER_ID)) {
    map.setPaintProperty(
      NODE_HYDROGRAPHY_POINT_LAYER_ID,
      "circle-opacity",
      emphasis === "terrain" ? 0.98 : emphasis === "route" ? 0.72 : 0.9
    );
    map.setPaintProperty(
      NODE_HYDROGRAPHY_POINT_LAYER_ID,
      "circle-radius",
      emphasis === "terrain" ? EMPHASIZED_HYDRO_POINT_RADIUS : BASE_HYDRO_POINT_RADIUS
    );
  }
}
