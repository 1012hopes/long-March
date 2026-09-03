import routeGeometry from "./route-geometry.json" with { type: "json" };
import { nodes } from "./nodes.ts";
import { stories } from "./stories.ts";

export type NodeSceneAnnotationKind =
  | "origin"
  | "destination"
  | "crossing"
  | "meeting"
  | "direction"
  | "river"
  | "mountain";

export type NodeMapScene = {
  nodeId: string;
  focusBounds: [number, number, number, number];
  highlightedSegmentIds: string[];
  contextSegmentIds: string[];
  terrainMode: "plain" | "river-valley" | "mountain" | "plateau";
  annotations: Array<{
    id: string;
    kind: NodeSceneAnnotationKind;
    label: string;
    location: [number, number];
    sourceIds: string[];
    certainty: "confirmed" | "approximate";
  }>;
};

type Coord = [number, number];

type SceneSeed = Omit<NodeMapScene, "focusBounds"> & {
  focusPad: Coord;
  focusPoints: Coord[];
};

const nodeById = new Map(nodes.map((node) => [node.id, node] as const));
const storyById = new Map(stories.map((story) => [story.id, story] as const));

const routeBounds = routeGeometry.reduce(
  (bounds, line) => {
    for (const [lon, lat] of line.coordinates) {
      bounds[0] = Math.min(bounds[0], lon);
      bounds[1] = Math.min(bounds[1], lat);
      bounds[2] = Math.max(bounds[2], lon);
      bounds[3] = Math.max(bounds[3], lat);
    }
    return bounds;
  },
  [Infinity, Infinity, -Infinity, -Infinity] as [number, number, number, number]
);

function nodeAnchor(nodeId: string): Coord {
  const node = nodeById.get(nodeId);
  if (!node) throw new Error("Unknown node " + nodeId);
  return node.anchor;
}

function secondaryPoint(nodeId: string, placeName: string): Coord {
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

function makeBounds(points: Coord[], [padLon, padLat]: Coord): [number, number, number, number] {
  let west = Infinity;
  let south = Infinity;
  let east = -Infinity;
  let north = -Infinity;

  for (const [lon, lat] of points) {
    west = Math.min(west, lon);
    south = Math.min(south, lat);
    east = Math.max(east, lon);
    north = Math.max(north, lat);
  }

  return [
    Math.max(routeBounds[0], west - padLon),
    Math.max(routeBounds[1], south - padLat),
    Math.min(routeBounds[2], east + padLon),
    Math.min(routeBounds[3], north + padLat),
  ];
}

const sceneSeeds: SceneSeed[] = [
  {
    nodeId: "node-01",
    highlightedSegmentIds: ["seg-01"],
    contextSegmentIds: [],
    terrainMode: "river-valley",
    focusPad: [0.25, 0.2],
    focusPoints: [secondaryPoint("node-01", "瑞金"), nodeAnchor("node-01"), [114.93, 25.6]],
    annotations: [
      {
        id: "scene-node-01-origin-ruijin",
        kind: "origin",
        label: "瑞金",
        location: secondaryPoint("node-01", "瑞金"),
        sourceIds: ["hist-001"],
        certainty: "confirmed",
      },
      {
        id: "scene-node-01-crossing-yudu",
        kind: "crossing",
        label: "于都河",
        location: nodeAnchor("node-01"),
        sourceIds: ["hist-001", "hist-002"],
        certainty: "confirmed",
      },
      {
        id: "scene-node-01-direction-west",
        kind: "direction",
        label: "向西转移",
        location: [114.93, 25.6],
        sourceIds: ["hist-001", "hist-002"],
        certainty: "approximate",
      },
    ],
  },
  {
    nodeId: "node-02",
    highlightedSegmentIds: ["seg-01"],
    contextSegmentIds: ["seg-02"],
    terrainMode: "river-valley",
    focusPad: [0.2, 0.18],
    focusPoints: [secondaryPoint("node-02", "全州"), secondaryPoint("node-02", "兴安"), [110.8, 25.75]],
    annotations: [
      {
        id: "scene-node-02-origin-quanzhou",
        kind: "origin",
        label: "全州",
        location: secondaryPoint("node-02", "全州"),
        sourceIds: ["hist-003"],
        certainty: "confirmed",
      },
      {
        id: "scene-node-02-destination-xingan",
        kind: "destination",
        label: "兴安",
        location: secondaryPoint("node-02", "兴安"),
        sourceIds: ["hist-003", "hist-004"],
        certainty: "confirmed",
      },
      {
        id: "scene-node-02-river-xiang",
        kind: "river",
        label: "湘江",
        location: nodeAnchor("node-02"),
        sourceIds: ["hist-003", "hist-004"],
        certainty: "approximate",
      },
      {
        id: "scene-node-02-direction-breakout",
        kind: "direction",
        label: "西进突围",
        location: [110.8, 25.75],
        sourceIds: ["hist-003", "hist-004"],
        certainty: "approximate",
      },
    ],
  },
  {
    nodeId: "node-03",
    highlightedSegmentIds: ["seg-02", "seg-03"],
    contextSegmentIds: ["seg-01"],
    terrainMode: "mountain",
    focusPad: [0.25, 0.2],
    focusPoints: [
      secondaryPoint("node-03", "通道"),
      storyPoint("story-04"),
      secondaryPoint("node-03", "猴场"),
      [108.45, 26.72],
    ],
    annotations: [
      {
        id: "scene-node-03-meeting-tongdao",
        kind: "meeting",
        label: "通道",
        location: secondaryPoint("node-03", "通道"),
        sourceIds: ["hist-005"],
        certainty: "confirmed",
      },
      {
        id: "scene-node-03-meeting-liping",
        kind: "meeting",
        label: "黎平",
        location: storyPoint("story-04"),
        sourceIds: ["hist-005", "hist-020"],
        certainty: "confirmed",
      },
      {
        id: "scene-node-03-meeting-houchang",
        kind: "meeting",
        label: "猴场",
        location: secondaryPoint("node-03", "猴场"),
        sourceIds: ["hist-006", "hist-020"],
        certainty: "confirmed",
      },
      {
        id: "scene-node-03-direction-guizhou",
        kind: "direction",
        label: "转兵贵州",
        location: [108.45, 26.72],
        sourceIds: ["hist-005", "hist-006", "hist-020"],
        certainty: "approximate",
      },
    ],
  },
  {
    nodeId: "node-04",
    highlightedSegmentIds: ["seg-03", "seg-04"],
    contextSegmentIds: ["seg-02"],
    terrainMode: "plain",
    focusPad: [0.22, 0.18],
    focusPoints: [nodeAnchor("node-04"), storyPoint("story-23"), [106.55, 27.94], [106.95, 27.6]],
    annotations: [
      {
        id: "scene-node-04-meeting-zunyi",
        kind: "meeting",
        label: "遵义会议",
        location: nodeAnchor("node-04"),
        sourceIds: ["hist-007", "hist-008"],
        certainty: "confirmed",
      },
      {
        id: "scene-node-04-origin-redgrave",
        kind: "origin",
        label: "桑木垭",
        location: storyPoint("story-23"),
        sourceIds: ["hist-038", "hist-039"],
        certainty: "approximate",
      },
      {
        id: "scene-node-04-river-wu",
        kind: "river",
        label: "乌江",
        location: [106.95, 27.6],
        sourceIds: ["hist-020", "hist-036", "hist-037"],
        certainty: "approximate",
      },
      {
        id: "scene-node-04-direction-chishui",
        kind: "direction",
        label: "回师赤水",
        location: [106.55, 27.94],
        sourceIds: ["hist-007", "hist-020"],
        certainty: "approximate",
      },
    ],
  },
  {
    nodeId: "node-05",
    highlightedSegmentIds: ["seg-04"],
    contextSegmentIds: ["seg-05"],
    terrainMode: "river-valley",
    focusPad: [0.22, 0.2],
    focusPoints: [storyPoint("story-18"), secondaryPoint("node-05", "太平渡"), [105.72, 28.12], [106.6, 27.2]],
    annotations: [
      {
        id: "scene-node-05-origin-loushanguan",
        kind: "origin",
        label: "娄山关",
        location: storyPoint("story-18"),
        sourceIds: ["hist-028", "hist-029"],
        certainty: "confirmed",
      },
      {
        id: "scene-node-05-crossing-taipingdu",
        kind: "crossing",
        label: "太平渡",
        location: secondaryPoint("node-05", "太平渡"),
        sourceIds: ["hist-009", "hist-010"],
        certainty: "confirmed",
      },
      {
        id: "scene-node-05-river-chishui",
        kind: "river",
        label: "赤水河",
        location: [105.72, 28.12],
        sourceIds: ["hist-009", "hist-010"],
        certainty: "approximate",
      },
      {
        id: "scene-node-05-direction-wujiang",
        kind: "direction",
        label: "南渡乌江",
        location: [106.6, 27.2],
        sourceIds: ["hist-009", "hist-010"],
        certainty: "approximate",
      },
    ],
  },
  {
    nodeId: "node-06",
    highlightedSegmentIds: ["seg-05"],
    contextSegmentIds: ["seg-06"],
    terrainMode: "river-valley",
    focusPad: [0.2, 0.2],
    focusPoints: [[103.3, 25.6], storyPoint("story-07"), nodeAnchor("node-06"), storyPoint("story-20")],
    annotations: [
      {
        id: "scene-node-06-direction-yunnan",
        kind: "direction",
        label: "西进云南",
        location: [103.3, 25.6],
        sourceIds: ["hist-011", "hist-012"],
        certainty: "approximate",
      },
      {
        id: "scene-node-06-crossing-jiaopingdu",
        kind: "crossing",
        label: "皎平渡",
        location: storyPoint("story-07"),
        sourceIds: ["hist-011", "hist-012", "hist-042", "hist-043"],
        certainty: "confirmed",
      },
      {
        id: "scene-node-06-river-jinsha",
        kind: "river",
        label: "金沙江",
        location: nodeAnchor("node-06"),
        sourceIds: ["hist-011", "hist-012"],
        certainty: "confirmed",
      },
      {
        id: "scene-node-06-meeting-yihai",
        kind: "meeting",
        label: "彝海结盟",
        location: storyPoint("story-20"),
        sourceIds: ["hist-032", "hist-033"],
        certainty: "confirmed",
      },
    ],
  },
  {
    nodeId: "node-07",
    highlightedSegmentIds: ["seg-06", "seg-07"],
    contextSegmentIds: ["seg-05"],
    terrainMode: "river-valley",
    focusPad: [0.15, 0.18],
    focusPoints: [storyPoint("story-08"), [102.28, 29.55], storyPoint("story-09")],
    annotations: [
      {
        id: "scene-node-07-crossing-anshunchang",
        kind: "crossing",
        label: "安顺场",
        location: storyPoint("story-08"),
        sourceIds: ["hist-021"],
        certainty: "confirmed",
      },
      {
        id: "scene-node-07-river-dadu",
        kind: "river",
        label: "大渡河",
        location: [102.28, 29.55],
        sourceIds: ["hist-013", "hist-014", "hist-021"],
        certainty: "approximate",
      },
      {
        id: "scene-node-07-direction-river",
        kind: "direction",
        label: "沿河北进",
        location: [102.3, 29.62],
        sourceIds: ["hist-013", "hist-014", "hist-021"],
        certainty: "approximate",
      },
      {
        id: "scene-node-07-crossing-luding",
        kind: "crossing",
        label: "泸定桥",
        location: storyPoint("story-09"),
        sourceIds: ["hist-013", "hist-014", "hist-021"],
        certainty: "confirmed",
      },
    ],
  },
  {
    nodeId: "node-08",
    highlightedSegmentIds: ["seg-07"],
    contextSegmentIds: ["seg-08"],
    terrainMode: "mountain",
    focusPad: [0.16, 0.18],
    focusPoints: [secondaryPoint("node-08", "夹金山"), nodeAnchor("node-08"), secondaryPoint("node-08", "懋功（小金）"), [102.36, 31.52]],
    annotations: [
      {
        id: "scene-node-08-mountain-jiajin",
        kind: "mountain",
        label: "夹金山",
        location: secondaryPoint("node-08", "夹金山"),
        sourceIds: ["hist-016"],
        certainty: "confirmed",
      },
      {
        id: "scene-node-08-destination-xiaojin",
        kind: "destination",
        label: "小金",
        location: secondaryPoint("node-08", "懋功（小金）"),
        sourceIds: ["hist-015"],
        certainty: "confirmed",
      },
      {
        id: "scene-node-08-meeting-maogong",
        kind: "meeting",
        label: "懋功会师",
        location: storyPoint("story-11"),
        sourceIds: ["hist-015", "hist-016"],
        certainty: "approximate",
      },
      {
        id: "scene-node-08-direction-north",
        kind: "direction",
        label: "会师后北上",
        location: [102.36, 31.52],
        sourceIds: ["hist-015", "hist-016"],
        certainty: "approximate",
      },
    ],
  },
  {
    nodeId: "node-09",
    highlightedSegmentIds: ["seg-08"],
    contextSegmentIds: ["seg-07"],
    terrainMode: "plateau",
    focusPad: [0.25, 0.25],
    focusPoints: [secondaryPoint("node-09", "哈达铺"), storyPoint("story-13"), nodeAnchor("node-09"), [106.21, 35.67]],
    annotations: [
      {
        id: "scene-node-09-origin-hadapu",
        kind: "origin",
        label: "哈达铺",
        location: secondaryPoint("node-09", "哈达铺"),
        sourceIds: ["hist-017", "hist-018"],
        certainty: "confirmed",
      },
      {
        id: "scene-node-09-meeting-bangluo",
        kind: "meeting",
        label: "榜罗镇",
        location: storyPoint("story-13"),
        sourceIds: ["hist-017", "hist-018"],
        certainty: "confirmed",
      },
      {
        id: "scene-node-09-direction-northwest",
        kind: "direction",
        label: "北上陕北",
        location: [106.21, 35.67],
        sourceIds: ["hist-017", "hist-018", "hist-019"],
        certainty: "approximate",
      },
      {
        id: "scene-node-09-destination-wuqi",
        kind: "destination",
        label: "吴起镇",
        location: nodeAnchor("node-09"),
        sourceIds: ["hist-017", "hist-019"],
        certainty: "confirmed",
      },
    ],
  },
];

export const nodeScenes: NodeMapScene[] = sceneSeeds.map(({ focusPad, focusPoints, nodeId, ...scene }) => ({
  ...scene,
  nodeId,
  focusBounds: makeBounds([...focusPoints, nodeAnchor(nodeId)], focusPad),
}));

export function sceneForNode(nodeId: string): NodeMapScene | null {
  return nodeScenes.find((scene) => scene.nodeId === nodeId) ?? null;
}
