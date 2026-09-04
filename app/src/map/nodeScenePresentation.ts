import routeGeometry from "../data/route-geometry.json" with { type: "json" };
import type { NodeMapScene } from "../data/nodeScenes.ts";
import type { NodeUnit } from "../data/nodes.ts";

export const SCENE_ANNOTATION_SOURCE_ID = "node-scene-annotations";
export const SCENE_BADGE_LAYER_ID = "node-scene-badges";
export const SCENE_ANNOTATION_LAYER_ID = "node-scene-labels";

type RouteSceneRole = "highlight" | "context" | "dim";

export type SceneMapLike = {
  addLayer: (layer: unknown, beforeId?: string) => unknown;
  addSource: (id: string, source: unknown) => unknown;
  getLayer: (id: string) => unknown;
  getSource: (id: string) => { setData?: (data: GeoJSON.FeatureCollection) => void } | undefined;
  removeLayer: (id: string) => void;
  removeSource: (id: string) => void;
  setPaintProperty: (id: string, name: string, value: unknown) => void;
};

const SCENE_COLORS = {
  paperLight: "#FCFAF5",
  archiveLine: "#C9C1B3",
  terrain: "#727963",
  river: "#647D8F",
  routeRed: "#A6322B",
  evidenceBlue: "#315E78",
} as const;

const ROUTE_ROLE_PAINT: Record<
  RouteSceneRole,
  { candidateOpacity: number; corridorOpacity: number; corridorWidth: number; lineOpacity: number; lineWidth: number }
> = {
  highlight: {
    candidateOpacity: 0.95,
    corridorOpacity: 0.3,
    corridorWidth: 24,
    lineOpacity: 1,
    lineWidth: 4.6,
  },
  context: {
    candidateOpacity: 0.28,
    corridorOpacity: 0.08,
    corridorWidth: 16,
    lineOpacity: 0.24,
    lineWidth: 2.8,
  },
  dim: {
    candidateOpacity: 0.1,
    corridorOpacity: 0.02,
    corridorWidth: 10,
    lineOpacity: 0.08,
    lineWidth: 2.1,
  },
};

const BASE_ROUTE_PAINT = {
  candidateOpacity: 0.95,
  corridorOpacity: 0.2,
  corridorWidth: 18,
  lineOpacity: 1,
  lineWidth: 3.4,
} as const;

const KIND_GLYPHS = {
  origin: "起",
  destination: "至",
  crossing: "渡",
  meeting: "会",
  direction: "向",
  river: "川",
  mountain: "山",
} as const;

const KIND_LABELS = {
  origin: "起点",
  destination: "终点",
  crossing: "渡口",
  meeting: "会合",
  direction: "方向",
  river: "河流",
  mountain: "山地",
} as const;

function featureCollection(scene: NodeMapScene): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: scene.annotations.map((annotation) => {
      const presentation = annotationPresentation(annotation);
      return {
        type: "Feature",
        properties: {
          id: annotation.id,
          glyph: presentation.glyph,
          label: annotation.label,
          ariaLabel: presentation.ariaLabel,
          certainty: annotation.certainty,
          kind: annotation.kind,
          className: presentation.className,
        },
        geometry: {
          type: "Point",
          coordinates: annotation.location,
        },
      };
    }),
  };
}

function ensureSceneLayers(map: SceneMapLike, scene: NodeMapScene) {
  const source = map.getSource(SCENE_ANNOTATION_SOURCE_ID);
  const data = featureCollection(scene);
  if (source?.setData) {
    source.setData(data);
  } else if (!source) {
    map.addSource(SCENE_ANNOTATION_SOURCE_ID, {
      type: "geojson",
      data,
    });
  }

  if (!map.getLayer(SCENE_BADGE_LAYER_ID)) {
    map.addLayer({
      id: SCENE_BADGE_LAYER_ID,
      type: "circle",
      source: SCENE_ANNOTATION_SOURCE_ID,
      paint: {
        "circle-radius": [
          "case",
          ["==", ["get", "certainty"], "approximate"],
          11,
          9,
        ],
        "circle-color": [
          "match",
          ["get", "kind"],
          "river",
          SCENE_COLORS.river,
          "mountain",
          SCENE_COLORS.terrain,
          "direction",
          SCENE_COLORS.evidenceBlue,
          SCENE_COLORS.routeRed,
        ],
        "circle-stroke-color": [
          "case",
          ["==", ["get", "certainty"], "approximate"],
          SCENE_COLORS.archiveLine,
          SCENE_COLORS.paperLight,
        ],
        "circle-stroke-width": [
          "case",
          ["==", ["get", "certainty"], "approximate"],
          2,
          1.6,
        ],
        "circle-opacity": 0.88,
      },
    });
  }

  if (!map.getLayer(SCENE_ANNOTATION_LAYER_ID)) {
    map.addLayer({
      id: SCENE_ANNOTATION_LAYER_ID,
      type: "symbol",
      source: SCENE_ANNOTATION_SOURCE_ID,
      layout: {
        "text-field": ["get", "glyph"],
        "text-size": 11,
        "text-font": ["Noto Sans Regular"],
        "text-allow-overlap": true,
        "text-ignore-placement": true,
      },
      paint: {
        "text-color": SCENE_COLORS.paperLight,
        "text-halo-color": "rgba(28,29,27,0.22)",
        "text-halo-width": 0.7,
        "text-opacity": 0.95,
      },
    });
  }
}

function restoreRouteLayer(map: SceneMapLike, lineId: string) {
  const isCandidate = lineId.endsWith("a") || lineId.endsWith("b");
  if (isCandidate) {
    map.setPaintProperty(`${lineId}-cand`, "line-opacity", BASE_ROUTE_PAINT.candidateOpacity);
    return;
  }

  map.setPaintProperty(`${lineId}-corridor`, "line-opacity", BASE_ROUTE_PAINT.corridorOpacity);
  map.setPaintProperty(`${lineId}-corridor`, "line-width", BASE_ROUTE_PAINT.corridorWidth);
  map.setPaintProperty(`${lineId}-line`, "line-opacity", BASE_ROUTE_PAINT.lineOpacity);
  map.setPaintProperty(`${lineId}-line`, "line-width", BASE_ROUTE_PAINT.lineWidth);
}

export function routeSceneRole(segmentId: string, scene: NodeMapScene): RouteSceneRole {
  if (scene.highlightedSegmentIds.includes(segmentId)) return "highlight";
  if (scene.contextSegmentIds.includes(segmentId)) return "context";
  return "dim";
}

export function annotationPresentation(annotation: NodeMapScene["annotations"][number]) {
  const certaintyPrefix =
    annotation.certainty === "approximate"
      ? annotation.kind === "crossing"
        ? "约略渡口，"
        : "约略位置，"
      : "";
  return {
    glyph: KIND_GLYPHS[annotation.kind],
    ariaLabel: `${annotation.label}，${certaintyPrefix}${KIND_LABELS[annotation.kind]}标注`,
    className: `map-scene-annotation ${annotation.kind} ${annotation.certainty}`,
  };
}

export function scenePrecisionLabel(precision: NodeUnit["precision"]): string {
  if (precision === "confirmed") return "定位明确";
  if (precision === "approximate") return "位置约略";
  return "路线存争议";
}

export function sceneReadingCue(scene: NodeMapScene): string {
  const first = scene.annotations.find((annotation) =>
    ["origin", "crossing", "meeting", "river", "mountain", "destination"].includes(annotation.kind)
  );
  const second = scene.annotations.find(
    (annotation) =>
      annotation.id !== first?.id &&
      ["crossing", "meeting", "destination", "river", "mountain", "origin"].includes(annotation.kind)
  );
  const direction = scene.annotations.find((annotation) => annotation.kind === "direction");

  if (first && second && direction) {
    return `先看${first.label}与${second.label}，再读${direction.label}。`;
  }
  if (first && second) {
    return `先看${first.label}与${second.label}。`;
  }
  if (first) {
    return `先看${first.label}。`;
  }
  return "先顺着主线读图。";
}

export function scenePlaceLabel(scene: NodeMapScene, node: NodeUnit): string {
  const labels: string[] = [];
  for (const annotation of scene.annotations) {
    if (annotation.kind === "direction") continue;
    if (!labels.includes(annotation.label)) labels.push(annotation.label);
    if (labels.length === 2) return labels.join(" · ");
  }

  for (const secondary of node.secondary) {
    if (!labels.includes(secondary.name)) labels.push(secondary.name);
    if (labels.length === 2) return labels.join(" · ");
  }

  return labels[0] ?? node.shortTitle;
}

export function applyNodeScene(map: SceneMapLike, scene: NodeMapScene): void {
  ensureSceneLayers(map, scene);

  for (const line of routeGeometry) {
    const role = ROUTE_ROLE_PAINT[routeSceneRole(line.segmentId, scene)];
    const isCandidate = line.id.endsWith("a") || line.id.endsWith("b");
    if (isCandidate) {
      map.setPaintProperty(`${line.id}-cand`, "line-opacity", role.candidateOpacity);
      continue;
    }

    map.setPaintProperty(`${line.id}-corridor`, "line-opacity", role.corridorOpacity);
    map.setPaintProperty(`${line.id}-corridor`, "line-width", role.corridorWidth);
    map.setPaintProperty(`${line.id}-line`, "line-opacity", role.lineOpacity);
    map.setPaintProperty(`${line.id}-line`, "line-width", role.lineWidth);
  }
}

export function clearNodeScene(map: SceneMapLike): void {
  if (map.getLayer(SCENE_ANNOTATION_LAYER_ID)) map.removeLayer(SCENE_ANNOTATION_LAYER_ID);
  if (map.getLayer(SCENE_BADGE_LAYER_ID)) map.removeLayer(SCENE_BADGE_LAYER_ID);
  if (map.getSource(SCENE_ANNOTATION_SOURCE_ID)) map.removeSource(SCENE_ANNOTATION_SOURCE_ID);

  for (const line of routeGeometry) {
    restoreRouteLayer(map, line.id);
  }
}
