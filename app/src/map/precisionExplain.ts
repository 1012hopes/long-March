import type { NodeUnit } from "../data/nodes.ts";
import type { SegmentMeta } from "../data/sources.ts";
import { segments, sources } from "../data/sources.ts";

export type PrecisionKind = NodeUnit["precision"]; // confirmed | approximate | disputed

export const PRECISION_ORDER: PrecisionKind[] = ["confirmed", "approximate", "disputed"];

export function parsePrecisionKind(value: string | null | undefined): PrecisionKind | null {
  if (value === "confirmed" || value === "approximate" || value === "disputed") return value;
  return null;
}

export const PRECISION_CHIP_LABEL: Record<PrecisionKind, string> = {
  confirmed: "史料明确",
  approximate: "约略",
  disputed: "多候选 · 争议",
};

export const PRECISION_SHORT_LABEL: Record<PrecisionKind, string> = {
  confirmed: "史料明确",
  approximate: "约略",
  disputed: "多候选",
};

export const PRECISION_TITLE: Record<PrecisionKind, string> = {
  confirmed: "确定",
  approximate: "约略",
  disputed: "争议",
};

export const PRECISION_SEE: Record<PrecisionKind, string> = {
  confirmed: "地图上是较实的主线：走向有明确史料支撑。",
  approximate: "地图上是半透明走廊：史料只给大致范围，不代表逐日轨迹。",
  disputed: "地图上是并列虚线候选：存在不同版本，不预设唯一正确答案。",
};

export const PRECISION_WHY: Record<PrecisionKind, string> = {
  confirmed: "按权威史著与档案可核对的关键节点与走向绘制。",
  approximate: "在可确认的城镇 / 渡口之间使用代表性中心线与示意走廊。",
  disputed: "多次往返或路线分歧段按候选区段建模，点击来源可继续核对。",
};

export const PRECISION_MAP_LEGEND: Record<PrecisionKind, string> = {
  confirmed: "实线主线 · 史料明确",
  approximate: "半透明走廊 · 约略示意",
  disputed: "紫灰虚线 · 多候选并列",
};

export type CandidateLine = {
  id: string;
  label: string;
  segmentId: string;
};

export type PrecisionExplain = {
  kind: PrecisionKind;
  title: string;
  chipLabel: string;
  shortLabel: string;
  see: string;
  why: string;
  mapLegend: string;
  scopeLabel: string;
  reasoning: string | null;
  disputeNote: string | null;
  sourceIds: string[];
  sourceCount: number;
  candidates: CandidateLine[];
  focusNodeId: string | null;
};

export function segmentsForNode(nodeId: string): SegmentMeta[] {
  return segments.filter((segment) => segment.fromNodeId === nodeId || segment.toNodeId === nodeId);
}

export function lineIdsForSegment(segmentId: string): string[] {
  if (segmentId === "seg-04" || segmentId === "seg-08") {
    return [`${segmentId}a`, `${segmentId}b`];
  }
  return [segmentId];
}

export function lineIdsForCertainty(kind: PrecisionKind): string[] {
  return segments
    .filter((segment) => segment.certainty === kind)
    .flatMap((segment) => lineIdsForSegment(segment.id));
}

export function candidateLinesForSegments(list: SegmentMeta[]): CandidateLine[] {
  return list
    .filter((segment) => segment.certainty === "disputed")
    .flatMap((segment) =>
      lineIdsForSegment(segment.id).map((id) => ({
        id,
        segmentId: segment.id,
        label: id.endsWith("a")
          ? `${segment.displayDateLabel} · 候选 A`
          : `${segment.displayDateLabel} · 候选 B`,
      }))
    );
}

export function buildPrecisionExplain(input: {
  kind: PrecisionKind;
  node?: NodeUnit | null;
  segments?: SegmentMeta[];
}): PrecisionExplain {
  const related = input.segments ?? (input.node ? segmentsForNode(input.node.id) : segments);
  const matching = related.filter((segment) => segment.certainty === input.kind);
  const scopeSourceIds = matching.length > 0 ? matching : related;
  const sourceIds = [...new Set(scopeSourceIds.flatMap((segment) => segment.sourceIds))];

  const reasoning =
    matching.length === 1
      ? matching[0].reasoning
      : matching.length > 1
        ? matching.map((segment) => `${segment.displayDateLabel}：${segment.reasoning}`).join("；")
        : null;

  const disputeNotes = matching
    .map((segment) => segment.disputeNote)
    .filter((note): note is string => Boolean(note));
  const disputeNote = disputeNotes.length > 0 ? disputeNotes.join("\n") : null;

  const nodePlace = input.node?.secondary?.[0]?.name;
  const scopeLabel = input.node
    ? matching.length > 0
      ? `当前地点「${input.node.shortTitle}」相关的 ${matching.length} 段路线`
      : `当前地点「${input.node.shortTitle}」：出入段暂无此精度类型`
    : (nodePlace ?? "中央红军主线相关路段");

  return {
    kind: input.kind,
    title: PRECISION_TITLE[input.kind],
    chipLabel: PRECISION_CHIP_LABEL[input.kind],
    shortLabel: PRECISION_SHORT_LABEL[input.kind],
    see: PRECISION_SEE[input.kind],
    why: PRECISION_WHY[input.kind],
    mapLegend: PRECISION_MAP_LEGEND[input.kind],
    scopeLabel,
    reasoning,
    disputeNote,
    sourceIds,
    sourceCount: sourceIds.length,
    candidates: input.kind === "disputed" ? candidateLinesForSegments(matching) : [],
    focusNodeId: input.node?.id ?? null,
  };
}

export function sourcePreview(sourceId: string): { title: string; org: string } | null {
  const found = sources.find((item) => item.id === sourceId);
  return found ? { title: found.title, org: found.org } : null;
}

/**
 * 节点精度与出入段 certainty 的一致性。
 * - confirmed：点位可确认；允许邻接 disputed 段（如遵义：会址明确，四渡赤水走向并列候选）
 * - approximate：至少一条 approximate 或 disputed 出入段
 * - disputed：至少一条 disputed 出入段
 */
export function nodePrecisionConsistencyIssues(
  nodeList: NodeUnit[],
  segmentList: SegmentMeta[]
): string[] {
  const issues: string[] = [];
  for (const node of nodeList) {
    const related = segmentList.filter(
      (segment) => segment.fromNodeId === node.id || segment.toNodeId === node.id
    );
    if (related.length === 0) {
      issues.push(`${node.id}: no adjacent segments`);
      continue;
    }
    const certs = new Set(related.map((segment) => segment.certainty));
    if (node.precision === "disputed" && !certs.has("disputed")) {
      issues.push(`${node.id}: disputed node without disputed adjacent segment`);
    }
    if (node.precision === "approximate" && !certs.has("approximate") && !certs.has("disputed")) {
      issues.push(`${node.id}: approximate node without approximate/disputed segment`);
    }
    // confirmed + disputed 邻接是合法教学形态，不记为 issue
  }
  return issues;
}

/** 教学上应存在的「点位明确、走向争议」节点（若数据变更需同步更新） */
export const CONFIRMED_NODE_WITH_DISPUTED_ROUTE_IDS = ["node-04"] as const;
