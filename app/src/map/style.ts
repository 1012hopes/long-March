// 纸面档案风格 MapLibre 样式（docs/15 视觉规范色板）
import type { StyleSpecification } from "maplibre-gl";
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
  terrain: ["global-terrain-color", "terrain-relief"],
  contours: ["contour-major", "contour-mid", "contour-fine"],
  water: ["lakes-fill", "rivers-line"],
  route: ROUTE_LAYER_IDS,
};

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
    graticule: { type: "geojson", data: graticule() },
    contourMajor: { type: "geojson", data: "terrain/contour-200.geojson" },
    contourMid: { type: "geojson", data: "terrain/contour-100.geojson" },
    contourFine: { type: "geojson", data: "terrain/contour-50.geojson" },
    // 3D 地形 DEM（开放数据，运行时在线）
    terrainDem: {
      type: "raster-dem",
      tiles: ["https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"],
      encoding: "terrarium",
      tileSize: 256,
      maxzoom: 13,
      attribution: "Elevation: AWS Terrain Tiles, SRTM and NASADEM derived",
    },
    terrainColorDem: {
      type: "raster-dem",
      tiles: ["https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"],
      encoding: "terrarium",
      tileSize: 256,
      maxzoom: 13,
      attribution: "Elevation: AWS Terrain Tiles, SRTM and NASADEM derived",
    },
  };

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

  layers.push(
    {
      id: "global-terrain-color",
      type: "color-relief",
      source: "terrainColorDem",
      paint: {
        "color-relief-opacity": 0.9,
        "color-relief-color": [
          "interpolate",
          ["linear"],
          ["elevation"],
          -11000, "#B9CBD4",
          -1000, "#CEDCE1",
          0, "#DCE7E5",
          1, "#D4E0C8",
          200, "#DCE5C5",
          600, "#CFD7B2",
          1200, "#D3CAA6",
          2000, "#C9BA97",
          3000, "#B8AC98",
          4000, "#C7C3BA",
          5400, "#EBEBE5"
        ],
        "resampling": "linear",
      },
    },
    {
      id: "terrain-relief",
      type: "hillshade",
      source: "terrainDem",
      paint: {
        "hillshade-exaggeration": 0.1,
        "hillshade-shadow-color": "#5C5F52",
        "hillshade-highlight-color": "#FCFAF5",
        "hillshade-accent-color": "#8C8F7C",
        "hillshade-illumination-direction": 315,
        "hillshade-method": "multidirectional",
        "resampling": "linear",
      },
    },
    {
      id: "coastline-overlay",
      type: "line",
      source: "land",
      paint: { "line-color": C.archiveLine, "line-width": 0.8, "line-opacity": 0.78 },
    },
    {
      id: "contour-major",
      type: "line",
      source: "contourMajor",
      minzoom: 4.6,
      paint: {
        "line-color": "#6F735F",
        "line-width": ["interpolate", ["linear"], ["zoom"], 4.6, 0.32, 8, 0.75, 11, 1.15],
        "line-opacity": ["interpolate", ["linear"], ["zoom"], 4.6, 0.18, 6, 0.38, 9, 0.55],
      },
    },
    {
      id: "contour-mid",
      type: "line",
      source: "contourMid",
      minzoom: 6.4,
      paint: {
        "line-color": "#858873",
        "line-width": ["interpolate", ["linear"], ["zoom"], 6.4, 0.25, 10, 0.72],
        "line-opacity": ["interpolate", ["linear"], ["zoom"], 6.4, 0, 7.2, 0.3, 10, 0.46],
      },
    },
    {
      id: "contour-fine",
      type: "line",
      source: "contourFine",
      minzoom: 8.1,
      paint: {
        "line-color": "#989A86",
        "line-width": 0.42,
        "line-opacity": ["interpolate", ["linear"], ["zoom"], 8.1, 0, 9, 0.25, 12, 0.36],
      },
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
