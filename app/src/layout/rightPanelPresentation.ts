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
    return {
      panelWidth: "55vw",
      mapWidth: "45vw",
      mapPaddingRight: 28,
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
  return kind !== "node" || !selected;
}
