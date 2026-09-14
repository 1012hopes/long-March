import type { NodeUnit } from "./nodes";

export type SceneEra = "then" | "now";

export type NodeScenePhoto = {
  nodeId: string;
  thenSrc: string;
  nowSrc: string;
  thenAlt: string;
  nowAlt: string;
  /** AI 生成示意场景，正式版须替换为授权档案/实景照片 */
  credit: string;
};

const credit = "AI 生成示意场景（原型演示）· 非历史档案照片 · 正式版须替换为授权影像";

export const nodeScenePhotos: Record<string, NodeScenePhoto> = {
  "node-01": {
    nodeId: "node-01",
    thenSrc: "scenes/node-01-then.png",
    nowSrc: "scenes/node-01-now.png",
    thenAlt: "1934年10月于都河夜渡示意场景",
    nowAlt: "今日于都河畔景观示意",
    credit,
  },
  "node-02": {
    nodeId: "node-02",
    thenSrc: "scenes/node-02-then.png",
    nowSrc: "scenes/node-02-now.png",
    thenAlt: "1934年湘江走廊行军示意场景",
    nowAlt: "今日湘江沿岸景观示意",
    credit,
  },
  "node-03": {
    nodeId: "node-03",
    thenSrc: "scenes/node-03-then.png",
    nowSrc: "scenes/node-03-now.png",
    thenAlt: "1934年冬通道山区行军示意场景",
    nowAlt: "今日通道山区景观示意",
    credit,
  },
  "node-04": {
    nodeId: "node-04",
    thenSrc: "scenes/node-04-then.png",
    nowSrc: "scenes/node-04-now.png",
    thenAlt: "1935年遵义会议会址氛围示意",
    nowAlt: "今日遵义会议会址景观示意",
    credit,
  },
  "node-05": {
    nodeId: "node-05",
    thenSrc: "scenes/node-05-then.png",
    nowSrc: "scenes/node-05-now.png",
    thenAlt: "1935年赤水河谷机动示意场景",
    nowAlt: "今日赤水河谷景观示意",
    credit,
  },
  "node-06": {
    nodeId: "node-06",
    thenSrc: "scenes/node-06-then.png",
    nowSrc: "scenes/node-06-now.png",
    thenAlt: "1935年金沙江渡口示意场景",
    nowAlt: "今日金沙江峡谷景观示意",
    credit,
  },
  "node-07": {
    nodeId: "node-07",
    thenSrc: "scenes/node-07-then.png",
    nowSrc: "scenes/node-07-now.png",
    thenAlt: "1935年泸定桥示意场景",
    nowAlt: "今日泸定桥景观示意",
    credit,
  },
  "node-08": {
    nodeId: "node-08",
    thenSrc: "scenes/node-08-then.png",
    nowSrc: "scenes/node-08-now.png",
    thenAlt: "1935年懋功会师示意场景",
    nowAlt: "今日川西高原景观示意",
    credit,
  },
  "node-09": {
    nodeId: "node-09",
    thenSrc: "scenes/node-09-then.png",
    nowSrc: "scenes/node-09-now.png",
    thenAlt: "1935年抵达吴起镇示意场景",
    nowAlt: "今日吴起黄土高原景观示意",
    credit,
  },
};

export function scenePhotoForNode(nodeId: string): NodeScenePhoto | null {
  return nodeScenePhotos[nodeId] ?? null;
}

export function sceneImageSrc(photo: NodeScenePhoto, era: SceneEra): string {
  return era === "now" ? photo.nowSrc : photo.thenSrc;
}

export function sceneImageAlt(photo: NodeScenePhoto, era: SceneEra): string {
  return era === "now" ? photo.nowAlt : photo.thenAlt;
}

export function sceneEraLabel(era: SceneEra): string {
  return era === "now" ? "当今场景" : "当时场景";
}

/** 打开节点时是否默认看「当今」：跟随古今对照开关 */
export function defaultSceneEra(compareOn: boolean): SceneEra {
  return compareOn ? "now" : "then";
}

export function scenePhotoExistsForNodes(list: Pick<NodeUnit, "id">[]): boolean {
  return list.every((node) => Boolean(nodeScenePhotos[node.id]));
}
