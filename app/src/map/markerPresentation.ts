import type { StoryKind } from "../data/stories";

export type MarkerZoomState = {
  level: "overview" | "mid" | "detail";
  showNodeLabels: boolean;
  showStories: boolean;
  showSecondaryPlaces: boolean;
};

const STORY_GLYPHS: Record<StoryKind, string> = {
  decision: "策",
  march: "行",
  battle: "战",
  crossing: "渡",
  people: "人",
  terrain: "山",
  meeting: "议",
};

export function getMarkerZoomState(zoom: number): MarkerZoomState {
  if (zoom < 5.8) {
    return {
      level: "overview",
      showNodeLabels: false,
      showStories: false,
      showSecondaryPlaces: false,
    };
  }
  if (zoom < 7.4) {
    return {
      level: "mid",
      showNodeLabels: true,
      showStories: false,
      showSecondaryPlaces: false,
    };
  }
  return {
    level: "detail",
    showNodeLabels: false,
    showStories: true,
    showSecondaryPlaces: true,
  };
}

export function getStoryMarkerPresentation(shortTitle: string, kind: StoryKind) {
  return {
    glyph: STORY_GLYPHS[kind],
    label: shortTitle,
    ariaLabel: "打开沿途故事：" + shortTitle,
  };
}
