export type RightPanelKind = "node" | "story" | "sources" | null;
export type LearningMarkerKind = "node" | "story" | "secondary" | "geo" | "contour" | "epilogue";

export type RightPanelPresentation = {
  panelWidth: string;
  mapWidth: string;
  mapPaddingRight: number;
  learningFocus: boolean;
  hideChrome: boolean;
};

export function getRightPanelPresentation(kind: RightPanelKind): RightPanelPresentation {
  if (kind === "node") {
    // 档案研究卷宗：右侧浮动卡，不再 55vw 对切地图
    return {
      panelWidth: "min(520px, 42vw)",
      mapWidth: "100vw",
      mapPaddingRight: 548,
      learningFocus: true,
      hideChrome: true,
    };
  }
  if (kind === "story" || kind === "sources") {
    return {
      panelWidth: "440px",
      mapWidth: "100vw",
      mapPaddingRight: 472,
      learningFocus: false,
      hideChrome: false,
    };
  }
  return {
    panelWidth: "0px",
    mapWidth: "100vw",
    mapPaddingRight: 32,
    learningFocus: false,
    hideChrome: false,
  };
}

export function shouldHideMarkerForLearning(
  learningFocus: boolean,
  kind: LearningMarkerKind,
  selected: boolean
): boolean {
  if (!learningFocus) return false;
  // 地理参照保留（仅 CSS 压低城市），避免学习态地图过空、被切碎
  if (kind === "geo") return false;
  return kind !== "node" || !selected;
}
