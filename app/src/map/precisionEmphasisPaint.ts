import routeGeometry from "../data/route-geometry.json" with { type: "json" };
import type { PrecisionKind } from "./precisionExplain.ts";
import { lineIdsForCertainty } from "./precisionExplain.ts";

export type PrecisionPaintMapLike = {
  getLayer: (id: string) => unknown;
  setPaintProperty: (id: string, name: string, value: unknown) => void;
};

export const CORRIDOR_BASE_OPACITY = 0.2;
export const CORRIDOR_BASE_WIDTH = 18;
export const LINE_BASE_WIDTH = 3.4;
export const CAND_BASE_OPACITY = 0.95;

const DIM_OPACITY = 0.12;
const DIM_CAND_OPACITY = 0.18;
const DIM_CORRIDOR_OPACITY = 0.05;

const EMPHASIS = {
  confirmed: {
    lineOpacity: 1,
    lineWidth: 4.2,
    corridorOpacity: 0.1,
    corridorWidth: 14,
    candOpacity: DIM_CAND_OPACITY,
  },
  approximate: {
    lineOpacity: 0.55,
    lineWidth: 2.2,
    corridorOpacity: 0.38,
    corridorWidth: 26,
    candOpacity: DIM_CAND_OPACITY,
  },
  disputed: {
    lineOpacity: DIM_OPACITY,
    lineWidth: 2.2,
    corridorOpacity: DIM_CORRIDOR_OPACITY,
    corridorWidth: 12,
    candOpacity: 1,
  },
} as const;

function isCandidateLineId(lineId: string): boolean {
  return lineId.endsWith("a") || lineId.endsWith("b");
}

export function precisionWidthScale(viewportWidth?: number): number {
  const width = viewportWidth ?? (typeof window !== "undefined" ? window.innerWidth : 1200);
  return width >= 1400 ? 1.15 : 1;
}

export type PrecisionPaintOptions = {
  /** 争议段单条候选（如 seg-04a）；仅当 emphasis=disputed 时生效 */
  focusCandidateLineId?: string | null;
  widthScale?: number;
};

/** 精度强调：只调整路线图层 paint，不重建 style */
export function applyPrecisionEmphasisPaint(
  map: PrecisionPaintMapLike,
  emphasis: PrecisionKind | null,
  options: PrecisionPaintOptions = {}
): void {
  if (!emphasis) return;
  const paint = EMPHASIS[emphasis];
  const widthScale = options.widthScale ?? 1;
  const focusCandidate = options.focusCandidateLineId ?? null;
  const focusLineIds = new Set(lineIdsForCertainty(emphasis));

  for (const line of routeGeometry) {
    const id = line.id;
    if (isCandidateLineId(id)) {
      if (!map.getLayer(`${id}-cand`)) continue;
      const inDisputeSet = focusLineIds.has(id);
      let opacity: number;
      let width: number;
      if (emphasis === "disputed") {
        if (focusCandidate) {
          opacity = id === focusCandidate ? 1 : 0.22;
          width = id === focusCandidate ? 3.6 * widthScale : 1.3;
        } else {
          opacity = inDisputeSet ? paint.candOpacity : DIM_CAND_OPACITY;
          width = (id.endsWith("b") ? 2.4 : 3.2) * widthScale;
        }
      } else {
        opacity = DIM_CAND_OPACITY;
        width = 1.4;
      }
      map.setPaintProperty(`${id}-cand`, "line-opacity", opacity);
      map.setPaintProperty(`${id}-cand`, "line-width", width);
      continue;
    }

    if (map.getLayer(`${id}-corridor`)) {
      const focused = focusLineIds.has(id);
      map.setPaintProperty(
        `${id}-corridor`,
        "line-opacity",
        focused ? paint.corridorOpacity : emphasis === "approximate" ? paint.corridorOpacity : DIM_CORRIDOR_OPACITY
      );
      map.setPaintProperty(
        `${id}-corridor`,
        "line-width",
        (focused ? paint.corridorWidth : CORRIDOR_BASE_WIDTH * 0.55) * widthScale
      );
    }
    if (map.getLayer(`${id}-line`)) {
      const focused = focusLineIds.has(id);
      map.setPaintProperty(`${id}-line`, "line-opacity", focused ? paint.lineOpacity : DIM_OPACITY);
      map.setPaintProperty(`${id}-line`, "line-width", (focused ? paint.lineWidth : 1.8) * widthScale);
    }
  }
}

/** 关闭强调：恢复静态基线（显影进度由 paintLineReveal 另行控制） */
export function resetPrecisionEmphasisPaint(map: PrecisionPaintMapLike): void {
  for (const line of routeGeometry) {
    const id = line.id;
    if (isCandidateLineId(id)) {
      if (map.getLayer(`${id}-cand`)) {
        map.setPaintProperty(`${id}-cand`, "line-opacity", CAND_BASE_OPACITY);
        map.setPaintProperty(`${id}-cand`, "line-width", id.endsWith("b") ? 1.8 : 2.6);
      }
      continue;
    }
    if (map.getLayer(`${id}-corridor`)) {
      map.setPaintProperty(`${id}-corridor`, "line-opacity", CORRIDOR_BASE_OPACITY);
      map.setPaintProperty(`${id}-corridor`, "line-width", CORRIDOR_BASE_WIDTH);
    }
    if (map.getLayer(`${id}-line`)) {
      map.setPaintProperty(`${id}-line`, "line-opacity", 1);
      map.setPaintProperty(`${id}-line`, "line-width", LINE_BASE_WIDTH);
    }
  }
}
