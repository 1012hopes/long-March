import profilesData from "../data/elevation-profiles.json" with { type: "json" };
import type { ContentTag, NodeUnit } from "../data/nodes";
import { sources, sourcesByNode, segments, type SegmentMeta, type SourceEntry } from "../data/sources.ts";
import { stories, type StoryPoint } from "../data/stories.ts";
import { sceneForNode } from "../data/nodeScenes.ts";
import { sceneReadingCue } from "../map/nodeScenePresentation.ts";

export type LearningEmphasis = "route" | "terrain" | "evidence" | null;
export type LearningEmphasisKey = Exclude<LearningEmphasis, null>;

type ProfilePoint = { d: number; e: number };
type SegmentProfile = {
  demSource: string;
  zoomLevel: number;
  approxSampleStepMeters: number;
  minElevMeters: number;
  maxElevMeters: number;
  ascentMeters: number;
  totalKm: number;
  profile: ProfilePoint[];
};

type ProfilesFile = { generated: string; profiles: Record<string, SegmentProfile> };

const profiles = profilesData as ProfilesFile;

export const CONTENT_TAG_LABEL: Record<ContentTag, string> = {
  fact: "事实",
  interp: "解释",
  recon: "可视化还原",
  disputed: "来源有争议",
};

export const LEARNING_EMPHASIS_OPTIONS: Array<{
  id: LearningEmphasisKey;
  label: string;
  hint: string;
}> = [
  { id: "route", label: "看路线", hint: "强调主线与路线判定" },
  { id: "terrain", label: "看地形", hint: "强调地形、水系与读图线索" },
  { id: "evidence", label: "看证据", hint: "强调标注与证据摘录" },
];

const SEGMENT_CERTAINTY_LABEL: Record<SegmentMeta["certainty"], string> = {
  confirmed: "史料明确",
  approximate: "约略路线",
  disputed: "争议候选",
};

const TERRAIN_MODE_LABEL = {
  plain: "平原 / 城镇地带",
  "river-valley": "河谷 / 渡口地形",
  mountain: "山地 / 隘口地形",
  plateau: "高原 / 台塬地形",
} as const;

export type NodeEvidenceRailModel = {
  routeSegments: Array<
    SegmentMeta & {
      certaintyLabel: string;
      sourceCount: number;
      sources: SourceEntry[];
    }
  >;
  terrainLabel: string | null;
  sceneCue: string;
  relatedStories: StoryPoint[];
  nodeSources: SourceEntry[];
  sourceCount: number;
  elevationSummary:
    | (SegmentProfile & {
        profileId: string;
        fromCandidate: boolean;
      })
    | null;
};

function elevationSummaryForSegment(segmentId: string) {
  const profileId = [segmentId, `${segmentId}a`, `${segmentId}b`].find((candidate) => profiles.profiles[candidate]) ?? null;
  if (!profileId) return null;
  return {
    ...profiles.profiles[profileId],
    profileId,
    fromCandidate: profileId !== segmentId,
  };
}

/** 段内进度 frac（0..1）处的估算海拔（米），供行军计程仪实时读取 */
export function altitudeForSegment(segmentId: string, frac: number): number | null {
  const profileId = [segmentId, `${segmentId}a`, `${segmentId}b`].find((candidate) => profiles.profiles[candidate]) ?? null;
  if (!profileId) return null;
  const pts = profiles.profiles[profileId].profile;
  if (pts.length === 0) return null;
  const target = Math.max(0, Math.min(1, frac)) * pts[pts.length - 1].d;
  for (let i = 1; i < pts.length; i++) {
    if (pts[i].d >= target) {
      const p0 = pts[i - 1];
      const p1 = pts[i];
      const span = p1.d - p0.d || 1;
      const k = (target - p0.d) / span;
      return Math.round(p0.e + (p1.e - p0.e) * k);
    }
  }
  return Math.round(pts[pts.length - 1].e);
}

export function buildNodeEvidenceRailModel(node: NodeUnit): NodeEvidenceRailModel {
  const scene = sceneForNode(node.id);
  const nodeSources = sourcesByNode(node.id);

  return {
    routeSegments: node.segmentIds
      .map((segmentId) => segments.find((segment) => segment.id === segmentId))
      .filter((segment): segment is SegmentMeta => Boolean(segment))
      .map((segment) => ({
        ...segment,
        certaintyLabel: SEGMENT_CERTAINTY_LABEL[segment.certainty],
        sourceCount: segment.sourceIds.length,
        sources: segment.sourceIds
          .map((sourceId) => sources.find((source) => source.id === sourceId))
          .filter((source): source is SourceEntry => Boolean(source)),
      })),
    terrainLabel: scene ? TERRAIN_MODE_LABEL[scene.terrainMode] : null,
    sceneCue: scene ? sceneReadingCue(scene) : "先顺着主线读图。",
    relatedStories: stories.filter((story) => story.nodeId === node.id),
    nodeSources: nodeSources,
    sourceCount: nodeSources.length,
    elevationSummary: elevationSummaryForSegment(node.segmentIds[0] ?? ""),
  };
}
