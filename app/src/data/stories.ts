import storyData from "./stories.json" with { type: "json" };

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

// 官方影像：只存权威平台的播放页链接（不复制、不转存视频文件）。
export type StoryVideo = {
  url: string;
  title: string;
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
  video?: StoryVideo;
};

export const stories = storyData as StoryPoint[];
