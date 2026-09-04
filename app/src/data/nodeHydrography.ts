import type { FeatureCollection, MultiLineString, Point } from "geojson";
import { nodes } from "./nodes.ts";
import { stories } from "./stories.ts";
import type { NodeMapScene } from "./nodeScenes.ts";

export const NODE_HYDROGRAPHY_SOURCE_ID = "node-hydrography";
export const NODE_HYDROGRAPHY_LINE_LAYER_ID = "node-hydrography-line";
export const NODE_HYDROGRAPHY_POINT_LAYER_ID = "node-hydrography-point";

export type HydrographyLabelKind = "river" | "mountain";
export type HydrographyProminence = "focus" | "secondary";

export type HydrographyLabel = {
  id: string;
  label: string;
  kind: HydrographyLabelKind;
  location: [number, number];
  offset: [number, number];
  certainty: "confirmed" | "approximate";
  sourceIds: string[];
  clipBounds: [number, number, number, number];
  provenance: string;
  ariaLabel: string;
};

export type HydrographyProvenance = {
  sceneId: string;
  systemId: string;
  label: string;
  method: "clipped-line" | "source-backed-point";
  sourceRef: string;
  sourceIds: string[];
  clipBounds: [number, number, number, number];
};

export type HydrographyScene = {
  featureCollection: FeatureCollection;
  labels: HydrographyLabel[];
  provenance: HydrographyProvenance[];
};

type Coord = [number, number];
type Bbox = [number, number, number, number];

type HydroFeatureSpec =
  | {
      kind: "river-line";
      id: string;
      label: string;
      nodeId: string;
      systemId: string;
      sourceRef: string;
      sourceIds: string[];
      clipBounds: Bbox;
      prominence: HydrographyProminence;
      coordinates: Coord[][];
      offset: [number, number];
      certainty: "confirmed" | "approximate";
    }
  | {
      kind: "river-point" | "mountain";
      id: string;
      label: string;
      nodeId: string;
      systemId: string;
      sourceRef: string;
      sourceIds: string[];
      clipBounds: Bbox;
      prominence: HydrographyProminence;
      location: Coord;
      offset: [number, number];
      labelKind: HydrographyLabelKind;
      certainty: "confirmed" | "approximate";
    };

const nodeById = new Map(nodes.map((node) => [node.id, node] as const));
const storyById = new Map(stories.map((story) => [story.id, story] as const));

const JINSHA_CLIP: Coord[][] = [
  [
    [102.02667199111954, 25.993504136906438],
    [102.12599409365254, 26.056859442409404],
    [102.20981326726854, 26.171477769183753],
    [102.33083947136458, 26.26622650794701],
    [102.48886600126502, 26.341131497120955],
    [102.58250369688818, 26.370173651992502],
    [102.61164920454723, 26.353430487826813],
    [102.62208784417874, 26.323819892174356],
    [102.61381961488337, 26.281341864135754],
    [102.63500695160957, 26.252351386107648],
    [102.68554650246915, 26.23674510350378],
    [102.75262251191947, 26.26294505447072],
    [102.83613162627358, 26.330951239907847],
    [102.90548139884754, 26.365006008120815],
    [102.96067182784265, 26.36508352338592],
    [102.99007571792009, 26.39515920703184],
    [102.99369306818062, 26.4552847359019],
    [103.01100467312722, 26.49807282140364],
    [103.04211388554745, 26.52349762601466],
    [103.01849775606667, 26.633310045022597],
    [102.94025963747237, 26.827561753472196],
    [102.89741987512718, 27.01266673438232],
    [102.88997846903118, 27.188676662797775],
    [102.90331098851135, 27.312700100429367],
    [102.93752078635526, 27.384711208855265],
    [102.96914676271297, 27.412022202962362],
    [102.99829227127134, 27.394658922071642],
    [103.04640302937639, 27.398069566757158],
    [103.1470170431021, 27.4343464221497],
    [103.20019209229127, 27.533668524682696],
    [103.23745079961475, 27.572038276045646],
    [103.27641482928101, 27.58252859162127],
    [103.29300296471513, 27.600951239708024],
    [103.28706017448752, 27.62725454346247],
    [103.32592085136628, 27.670301011382605],
    [103.40958499535134, 27.730038967524365],
    [103.47924482628775, 27.81380646429693],
    [103.5349520201197, 27.921551825756183],
  ],
  [
    [103.53231652179011, 27.992167670201866],
    [103.47144168498585, 28.02560232168986],
    [103.44441491081955, 28.065212307402135],
    [103.45133955297803, 28.11099762643937],
    [103.48394738126672, 28.161175442093054],
    [103.58947065644571, 28.24995555310636],
  ],
];

const DADU_CLIP: Coord[][] = [
  [
    [102.17870405484831, 30.09736216902894],
    [102.18506025622588, 30.032094834708914],
    [102.21389570552248, 29.97899730078484],
    [102.21291385269222, 29.839600124546166],
    [102.18211469953383, 29.61379995410465],
    [102.20619591700802, 29.439159450348427],
    [102.28505415232735, 29.31565277755368],
    [102.3972953631905, 29.277799791027576],
    [102.61567996595772, 29.349500841091015],
  ],
];

const SCENE_HYDROGRAPHY: Record<string, HydroFeatureSpec[]> = {
  "node-01": [
    {
      kind: "river-point",
      id: "node-01-yuduhe",
      label: "于都河",
      nodeId: "node-01",
      systemId: "yuduhe",
      sourceRef: "stories.json#story-01",
      sourceIds: ["hist-001", "hist-002"],
      clipBounds: [115.115, 25.652, 115.715, 26.252],
      prominence: "focus",
      location: storyPoint("story-01"),
      offset: [0, -12],
      labelKind: "river",
      certainty: "confirmed",
    },
  ],
  "node-02": [
    {
      kind: "river-point",
      id: "node-02-xiangjiang",
      label: "湘江",
      nodeId: "node-02",
      systemId: "xiangjiang",
      sourceRef: "stories.json#story-02",
      sourceIds: ["hist-003", "hist-004"],
      clipBounds: [110.54, 25.49, 111.14, 26.09],
      prominence: "focus",
      location: storyPoint("story-02"),
      offset: [0, -12],
      labelKind: "river",
      certainty: "confirmed",
    },
  ],
  "node-03": [
    {
      kind: "river-point",
      id: "node-03-wujiang",
      label: "乌江",
      nodeId: "node-03",
      systemId: "wujiang",
      sourceRef: "stories.json#story-22",
      sourceIds: ["hist-036", "hist-037"],
      clipBounds: [107.14, 27.01, 107.44, 27.41],
      prominence: "focus",
      location: storyPoint("story-22"),
      offset: [0, -12],
      labelKind: "river",
      certainty: "confirmed",
    },
    {
      kind: "mountain",
      id: "node-03-wumeng",
      label: "乌蒙山地",
      nodeId: "node-03",
      systemId: "wumeng",
      sourceRef: "sources.ts#hist-026;hist-027",
      sourceIds: ["hist-026", "hist-027"],
      clipBounds: [103.9, 27.22, 104.3, 27.58],
      prominence: "secondary",
      location: [104.1, 27.4],
      offset: [0, -10],
      labelKind: "mountain",
      certainty: "approximate",
    },
  ],
  "node-05": [
    {
      kind: "river-point",
      id: "node-05-chishuihe",
      label: "赤水河",
      nodeId: "node-05",
      systemId: "chishuihe",
      sourceRef: "stories.json#story-06",
      sourceIds: ["hist-009", "hist-010"],
      clipBounds: [105.4, 28.05, 106.0, 28.45],
      prominence: "focus",
      location: storyPoint("story-06"),
      offset: [0, -12],
      labelKind: "river",
      certainty: "approximate",
    },
    {
      kind: "mountain",
      id: "node-05-yungui",
      label: "云贵高原",
      nodeId: "node-05",
      systemId: "yungui",
      sourceRef: "sources.ts#hist-009;hist-010",
      sourceIds: ["hist-009", "hist-010"],
      clipBounds: [103.95, 26.05, 104.45, 26.45],
      prominence: "secondary",
      location: [104.2, 26.2],
      offset: [0, -10],
      labelKind: "mountain",
      certainty: "approximate",
    },
  ],
  "node-06": [
    {
      kind: "river-line",
      id: "node-06-jinsha-a",
      label: "金沙江",
      nodeId: "node-06",
      systemId: "jinsha",
      sourceRef: "rivers.json#Jinsha",
      sourceIds: ["hist-011", "hist-012", "hist-042", "hist-043"],
      clipBounds: [102.12, 25.4, 103.5, 29.07],
      prominence: "focus",
      coordinates: JINSHA_CLIP,
      offset: [0, -12],
      certainty: "confirmed",
    },
  ],
  "node-07": [
    {
      kind: "river-line",
      id: "node-07-dadu-a",
      label: "大渡河",
      nodeId: "node-07",
      systemId: "dadu",
      sourceRef: "rivers.json#Dadu",
      sourceIds: ["hist-013", "hist-014", "hist-021"],
      clipBounds: [102.1, 29.05, 102.5, 30.094],
      prominence: "focus",
      coordinates: DADU_CLIP,
      offset: [0, -12],
      certainty: "confirmed",
    },
  ],
  "node-08": [
    {
      kind: "mountain",
      id: "node-08-snow-mountain",
      label: "雪山",
      nodeId: "node-08",
      systemId: "xueshan",
      sourceRef: "nodes.ts#node-08.secondary[夹金山]",
      sourceIds: ["hist-016"],
      clipBounds: [102.7, 30.51, 103.0, 30.81],
      prominence: "focus",
      location: nodeSecondaryPoint("node-08", "夹金山"),
      offset: [0, -12],
      labelKind: "mountain",
      certainty: "confirmed",
    },
  ],
};

function nodeSecondaryPoint(nodeId: string, placeName: string): Coord {
  const node = nodeById.get(nodeId);
  const place = node?.secondary.find((candidate) => candidate.name === placeName);
  if (!place) throw new Error(`Unknown secondary place ${placeName} for ${nodeId}`);
  return [place.lon, place.lat];
}

function storyPoint(storyId: string): Coord {
  const story = storyById.get(storyId);
  if (!story) throw new Error("Unknown story " + storyId);
  return story.location;
}

function midpoint(points: Coord[]): Coord {
  const middle = points[Math.floor(points.length / 2)] ?? points[0];
  return [middle[0], middle[1]];
}

function emptyFeatureCollection(): FeatureCollection {
  return { type: "FeatureCollection", features: [] };
}

function buildLabelBounds(location: Coord, pad = 0.09): Bbox {
  return [location[0] - pad, location[1] - pad, location[0] + pad, location[1] + pad];
}

function featureProps(spec: HydroFeatureSpec) {
  return {
    id: spec.id,
    label: spec.label,
    nodeId: spec.nodeId,
    systemId: spec.systemId,
    prominence: spec.prominence,
    sourceRef: spec.sourceRef,
    sourceIds: spec.sourceIds,
    clipBounds: spec.clipBounds,
  };
}

function toFeatureCollection(scene: NodeMapScene): HydrographyScene {
  const specs = SCENE_HYDROGRAPHY[scene.nodeId] ?? [];
  const features = specs.map((spec) => {
    if (spec.kind === "river-line") {
      return {
        type: "Feature",
        properties: {
          ...featureProps(spec),
          kind: spec.kind,
        },
        geometry: {
          type: "MultiLineString",
          coordinates: spec.coordinates,
        },
    } as GeoJSON.Feature<MultiLineString>;
    }
    return {
      type: "Feature",
      properties: {
        ...featureProps(spec),
        kind: spec.kind,
        labelKind: spec.labelKind,
        certainty: spec.certainty,
      },
      geometry: {
        type: "Point",
        coordinates: spec.location,
      },
    } as GeoJSON.Feature<Point>;
  });

  const labels = specs.map((spec) => {
    const labelLocation =
      spec.kind === "river-line"
        ? midpoint(spec.coordinates[spec.coordinates.length - 1] ?? spec.coordinates[0] ?? [[0, 0]])
        : spec.location;
    return {
      id: `${spec.id}-label`,
      label: spec.label,
      kind: spec.kind === "mountain" ? "mountain" : "river",
      location: labelLocation,
      offset: spec.offset,
      certainty: spec.certainty,
      sourceIds: spec.sourceIds,
      clipBounds: spec.kind === "river-line" ? spec.clipBounds : buildLabelBounds(spec.location),
      provenance:
        spec.kind === "river-line"
          ? `clipped from ${spec.sourceRef} to ${spec.clipBounds.join(",")}`
          : `source-backed point from ${spec.sourceRef}`,
      ariaLabel:
        spec.kind === "mountain"
          ? `${spec.label}，山地标注${spec.certainty === "approximate" ? "，约略位置" : ""}`
          : `${spec.label}，河流标注${spec.certainty === "approximate" ? "，约略位置" : ""}`,
    } satisfies HydrographyLabel;
  });

  const provenance: HydrographyProvenance[] = specs.map((spec) => ({
    sceneId: scene.nodeId,
    systemId: spec.systemId,
    label: spec.label,
    method: spec.kind === "river-line" ? "clipped-line" : "source-backed-point",
    sourceRef: spec.sourceRef,
    sourceIds: spec.sourceIds,
    clipBounds: spec.kind === "river-line" ? spec.clipBounds : buildLabelBounds(spec.location),
  }));

  return {
    featureCollection: features.length ? { type: "FeatureCollection", features } : emptyFeatureCollection(),
    labels,
    provenance,
  };
}

export function emptyNodeHydrography(): HydrographyScene {
  return {
    featureCollection: emptyFeatureCollection(),
    labels: [],
    provenance: [],
  };
}

export function sceneHydrography(scene: NodeMapScene): HydrographyScene {
  return toFeatureCollection(scene);
}
