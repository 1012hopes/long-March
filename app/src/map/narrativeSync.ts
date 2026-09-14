export type LngLatBounds = [number, number, number, number];

/** 等比外扩 bounds，避免节点取景过碎 */
export function expandBounds(bounds: LngLatBounds, factor = 0.38): LngLatBounds {
  const [w, s, e, n] = bounds;
  const padLon = Math.max(0.12, (e - w) * factor);
  const padLat = Math.max(0.08, (n - s) * factor);
  return [w - padLon, s - padLat, e + padLon, n + padLat];
}

export type NarrativeBeat =
  | "intro"
  | "question"
  | "quote"
  | "sensory"
  | "deep"
  | "close";

export const BEAT_EMPHASIS: Record<NarrativeBeat, "route" | "terrain" | "evidence" | null> = {
  intro: null,
  question: "route",
  quote: "evidence",
  sensory: "terrain",
  deep: "route",
  close: null,
};

export const BEAT_LABEL: Record<NarrativeBeat, string> = {
  intro: "总览",
  question: "核心问题",
  quote: "名句",
  sensory: "身在其中",
  deep: "深入辨析",
  close: "回看",
};
