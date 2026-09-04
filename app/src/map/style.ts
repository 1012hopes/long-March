// 纸面档案风格 MapLibre 样式（docs/15 视觉规范色板）
import type { StyleSpecification } from "maplibre-gl";
import {
  NODE_HYDROGRAPHY_LINE_LAYER_ID,
  NODE_HYDROGRAPHY_POINT_LAYER_ID,
  NODE_HYDROGRAPHY_SOURCE_ID,
} from "../data/nodeHydrography";
import routeGeometry from "../data/route-geometry.json";

export const C = {
  paper: "#F2EEE4",
  paperLight: "#FCFAF5",
  ink: "#1C1D1B",
  inkSoft: "#565952",
  archiveLine: "#C9C1B3",
  terrain: "#727963",
  river: "#647D8F",
  routeRed: "#A6322B",
  routeRedSoft: "#D8A39D",
  evidenceBlue: "#315E78",
  interpOchre: "#8F6228",
  reconOrange: "#A5532C",
  disputedViolet: "#765B78",
};

export type HillshadeBbox = {
  west: number;
  east: number;
  south: number;
  north: number;
  generated: string;
};

export type MapLayerKey = "terrain" | "contours" | "water" | "route";

export const ROUTE_LAYER_IDS = routeGeometry.flatMap((line) =>
  line.id.endsWith("a") || line.id.endsWith("b")
    ? [line.id + "-cand"]
    : [line.id + "-corridor", line.id + "-line"]
);

export const MAP_LAYER_IDS: Record<MapLayerKey, string[]> = {
  terrain: ["offline-terrain-color", "offline-terrain-relief"],
  contours: ["contour-major", "contour-mid", "contour-fine"],
  water: ["lakes-fill", "rivers-line", NODE_HYDROGRAPHY_LINE_LAYER_ID, NODE_HYDROGRAPHY_POINT_LAYER_ID],
  route: ROUTE_LAYER_IDS,
};

function offlineTerrainCoordinates(hillshade: HillshadeBbox) {
  return [
    [hillshade.west, hillshade.north],
    [hillshade.east, hillshade.north],
    [hillshade.east, hillshade.south],
    [hillshade.west, hillshade.south],
  ] as const;
}

/** 运行时探测构建产物：山体阴影图及其地理范围（缺失则自动跳过该图层） */
export async function probeHillshade(): Promise<HillshadeBbox | null> {
  try {
    const res = await fetch("terrain/hillshade-bbox.json");
    if (!res.ok) return null;
    return (await res.json()) as HillshadeBbox;
  } catch {
    return null;
  }
}

// 经纬网（5°间隔，纯地理坐标网格，不含任何行政边界）
function graticule() {
  const feats: GeoJSON.Feature[] = [];
  for (let lon = 95; lon <= 125; lon += 5) {
    feats.push({
      type: "Feature",
      properties: {},
      geometry: { type: "LineString", coordinates: [[lon, 20], [lon, 45]] },
    });
  }
  for (let lat = 20; lat <= 45; lat += 5) {
    feats.push({
      type: "Feature",
      properties: {},
      geometry: { type: "LineString", coordinates: [[90, lat], [125, lat]] },
    });
  }
  return { type: "FeatureCollection", features: feats } as GeoJSON.FeatureCollection;
}

export function buildStyle(hillshade: HillshadeBbox | null): StyleSpecification {
  const sources: Record<string, unknown> = {
    land: { type: "geojson", data: "geo/land.json" },
    rivers: { type: "geojson", data: "geo/rivers.json" },
    lakes: { type: "geojson", data: "geo/lakes.json" },
    [NODE_HYDROGRAPHY_SOURCE_ID]: {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
    },
    graticule: { type: "geojson", data: graticule() },
  };

  if (hillshade) {
    const coordinates = offlineTerrainCoordinates(hillshade);
    sources.offlineTerrainTint = {
      type: "image",
      url: "terrain/terrain-tint.png",
      coordinates,
    };
    sources.offlineHillshade = {
      type: "image",
      url: "terrain/hillshade.png",
      coordinates,
    };
  }

  // 每条候选线一个 source（line-gradient 需要 lineMetrics）
  for (const line of routeGeometry) {
    sources[line.id] = {
      type: "geojson",
      data: {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            properties: { id: line.id, segmentId: line.segmentId },
            geometry: { type: "LineString", coordinates: line.coordinates },
          },
        ],
      },
      lineMetrics: true,
    };
  }

  const layers: Record<string, unknown>[] = [
    { id: "bg", type: "background", paint: { "background-color": "#EBE5D6" } },
    {
      id: "land-fill",
      type: "fill",
      source: "land",
      paint: { "fill-color": C.paper, "fill-opacity": 1 },
    },
    {
      id: "land-outline",
      type: "line",
      source: "land",
      paint: { "line-color": C.archiveLine, "line-width": 0.8, "line-opacity": 0.9 },
    },
  ];

  if (hillshade) {
    layers.push(
      {
        id: "offline-terrain-color",
        type: "raster",
        source: "offlineTerrainTint",
        paint: {
          "raster-opacity": 0.34,
          "raster-brightness-min": 0.06,
          "raster-brightness-max": 0.94,
          "raster-saturation": -0.08,
          "raster-contrast": -0.06,
          "raster-resampling": "linear",
        },
      },
      {
        id: "offline-terrain-relief",
        type: "raster",
        source: "offlineHillshade",
        paint: {
          "raster-opacity": 0.38,
          "raster-brightness-min": 0.1,
          "raster-brightness-max": 0.96,
          "raster-saturation": -1,
          "raster-contrast": 0.18,
          "raster-resampling": "linear",
        },
      }
    );
  }

  layers.push(
    {
      id: "coastline-overlay",
      type: "line",
      source: "land",
      paint: { "line-color": C.archiveLine, "line-width": 0.8, "line-opacity": 0.78 },
    },
    {
      id: "graticule",
      type: "line",
      source: "graticule",
      paint: {
        "line-color": C.archiveLine,
        "line-width": 0.5,
        "line-opacity": 0.55,
        "line-dasharray": [4, 6],
      },
    },
    {
      id: "lakes-fill",
      type: "fill",
      source: "lakes",
      paint: {
        "fill-color": C.river,
        "fill-opacity": ["interpolate", ["linear"], ["get", "scalerank"], 3, 0.42, 7, 0.24],
      },
    },
    {
      id: "rivers-line",
      type: "line",
      source: "rivers",
      paint: {
        "line-color": C.river,
        "line-opacity": ["interpolate", ["linear"], ["get", "scalerank"], 3, 0.88, 7, 0.58],
        "line-width": [
          "interpolate",
          ["linear"],
          ["zoom"],
          3,
          ["interpolate", ["linear"], ["get", "scalerank"], 3, 1.25, 7, 0.42],
          9,
          ["interpolate", ["linear"], ["get", "scalerank"], 3, 4.2, 7, 1.15]
        ],
      },
    }
  );

  layers.push(
    {
      id: NODE_HYDROGRAPHY_LINE_LAYER_ID,
      type: "line",
      source: NODE_HYDROGRAPHY_SOURCE_ID,
      filter: ["==", ["get", "kind"], "river-line"],
      layout: { "line-join": "round", "line-cap": "round" },
      paint: {
        "line-color": C.evidenceBlue,
        "line-width": ["case", ["==", ["get", "prominence"], "focus"], 3.1, 2.2],
        "line-opacity": ["case", ["==", ["get", "prominence"], "focus"], 0.96, 0.78],
      },
    },
    {
      id: NODE_HYDROGRAPHY_POINT_LAYER_ID,
      type: "circle",
      source: NODE_HYDROGRAPHY_SOURCE_ID,
      filter: ["!=", ["get", "kind"], "river-line"],
      paint: {
        "circle-color": [
          "match",
          ["get", "kind"],
          "mountain",
          C.terrain,
          C.evidenceBlue,
        ],
        "circle-radius": ["case", ["==", ["get", "prominence"], "focus"], 6.2, 4.6],
        "circle-stroke-color": C.paperLight,
        "circle-stroke-width": 1.4,
        "circle-opacity": 0.9,
      },
    }
  );

  // 路线图层：约略走廊 + 中心线；争议候选虚线
  for (const line of routeGeometry) {
    const isCandidate = line.id.endsWith("a") || line.id.endsWith("b");
    if (isCandidate) {
      layers.push({
        id: `${line.id}-cand`,
        type: "line",
        source: line.id,
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": C.disputedViolet,
          "line-width": line.id.endsWith("b") ? 1.8 : 2.6,
          "line-dasharray": [2, 2.2],
          "line-opacity": 0.95,
        },
      });
    } else {
      layers.push({
        id: `${line.id}-corridor`,
        type: "line",
        source: line.id,
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": C.routeRedSoft,
          "line-width": 18,
          "line-blur": 9,
          "line-opacity": 0.2,
        },
      });
      layers.push({
        id: `${line.id}-line`,
        type: "line",
        source: line.id,
        layout: { "line-join": "round", "line-cap": "round" },
        paint: { "line-color": C.routeRed, "line-width": 3.4 },
      });
    }
  }

  return {
    version: 8,
    sources: sources as StyleSpecification["sources"],
    layers: layers as StyleSpecification["layers"],
  };
}
