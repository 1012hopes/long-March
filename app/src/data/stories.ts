import storyData from "./stories.json";

export type StoryKind = "decision" | "march" | "battle" | "crossing" | "people" | "terrain" | "meeting";
export type StoryPrecision = "confirmed" | "approximate";

export type StoryPerson = {
  name: string;
  role: string;
};

export type StoryImage = {
  src: string;
  alt: string;
  credit: string;
};

export type StoryPoint = {
  id: string;
  nodeId: string;
  title: string;
  shortTitle: string;
  dateLabel: string;
  place: string;
  location: [number, number];
  kind: StoryKind;
  precision: StoryPrecision;
  summary: string;
  people: StoryPerson[];
  sourceIds: string[];
  question: string;
  // 文物/历史照片槽位：仅在取得书面授权后填充（见 research/rights-register.csv）
  image?: StoryImage;
};

export const stories = storyData as StoryPoint[];
