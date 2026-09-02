// 导览停靠点：九个单元压缩为 8 站（docs/02：6-8 站，每站一个核心问题）
import { nodes } from "./data/nodes";

export type TourStop = {
  id: string;
  kind: "intro" | "node" | "merged" | "final";
  title: string;
  nodeIds: string[];
  text: string;
  question: string;
  /** 停靠后应显影到的时间进度 */
  revealT: number;
};

const n = (id: string) => nodes.find((x) => x.id === id)!;

export const TOUR_STOPS: TourStop[] = [
  {
    id: "stop-intro",
    kind: "intro",
    title: "总览 · 一条路的来处",
    nodeIds: [],
    question: "我们凭什么知道长征是这样走的？",
    text: "主线只讲中央红军（红一方面军）1934 年 10 月至 1935 年 10 月：从瑞金出发、于都集结渡河，到到达陕北吴起镇。1936 年三大主力会师是长征总史的尾声，与这条主线分开呈现。路线不是一条预定的直线。每一段都标注「确定 / 约略 / 争议」，每一站都可以查到史料。",
    revealT: 0,
  },
  {
    id: "stop-01",
    kind: "node",
    title: "出发 · 夜渡于都河",
    nodeIds: ["node-01"],
    question: n("node-01").coreQuestion,
    text: n("node-01").concise,
    revealT: 0.02,
  },
  {
    id: "stop-02",
    kind: "node",
    title: "湘江 · 生死关",
    nodeIds: ["node-02"],
    question: n("node-02").coreQuestion,
    text: n("node-02").concise,
    revealT: 0.18,
  },
  {
    id: "stop-03",
    kind: "node",
    title: "转兵 · 通道黎平猴场",
    nodeIds: ["node-03"],
    question: n("node-03").coreQuestion,
    text: n("node-03").concise,
    revealT: 0.3,
  },
  {
    id: "stop-04",
    kind: "node",
    title: "遵义 · 伟大转折",
    nodeIds: ["node-04"],
    question: n("node-04").coreQuestion,
    text: n("node-04").concise,
    revealT: 0.38,
  },
  {
    id: "stop-05",
    kind: "merged",
    title: "机动作战 · 四渡赤水与巧渡金沙江",
    nodeIds: ["node-05", "node-06"],
    question: n("node-05").coreQuestion,
    text: `${n("node-05").concise}\n\n${n("node-06").concise}`,
    revealT: 0.66,
  },
  {
    id: "stop-06",
    kind: "node",
    title: "大渡河 · 两件事",
    nodeIds: ["node-07"],
    question: n("node-07").coreQuestion,
    text: n("node-07").concise,
    revealT: 0.76,
  },
  {
    id: "stop-07",
    kind: "final",
    title: "雪山会师与落脚陕北",
    nodeIds: ["node-08", "node-09"],
    question: "会师为什么不是终点？到达陕北意味着什么？",
    text: `${n("node-08").concise}\n\n${n("node-09").concise}\n\n尾声：1936 年 10 月，红一、红二、红四方面军会宁、将台堡会师，整个长征胜利结束。它与 1935 年中央红军到达陕北是两个不同层级的事件。`,
    revealT: 1,
  },
];
