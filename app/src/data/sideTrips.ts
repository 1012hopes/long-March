/**
 * 支线（岔路）索引
 * ---------------------------------------------------------
 * 主线是按行军序列排的；支线是从某个主线站岔出去的人与事。
 * 这里只做主应用弹窗里的「旁边的岔路」入口 —— 真正的剧本仍在
 * experience/real/adv-story-ext*.js 里，两个入口共用同一份。
 *
 * hang 对应 experience 里的主线站；这里按主应用 9 个单元就近归并：
 *   node-01b 突破封锁线 → node-02（湘江）
 *   node-03a 通道转兵   → node-03（老山界 / 通道）
 *   node-06a 彝海结盟   → node-06（金沙江）
 *   node-08b 过草地     → node-08（雪山草地）
 *   node-09a 腊子口     → node-09（吴起镇）
 */
export type SideTrip = {
  id: string;
  title: string;
  who: string;
  note: string;
};

export const SIDE_TRIPS: Record<string, SideTrip[]> = {
  "node-01": [
    {
      id: "node-00s",
      title: "四枚银元",
      who: "十四岁的勤务员",
      note: "六枚银元，两枚留给家里，四枚缝进腰带，带着翻雪山过草地。",
    },
  ],
  "node-02": [
    {
      id: "node-02p",
      title: "沙洲村 · 半条被子",
      who: "徐解秀一家 · 三位女红军没有名字",
      note: "一床被子剪成两半，一半留下，一半带走。",
    },
    {
      id: "node-02q",
      title: "后卫",
      who: "二十九岁的师长 · 陈树湘",
      note: "主力过去了，走在最后的那支部队没有过去。",
    },
  ],
  "node-03": [
    {
      id: "node-03c",
      title: "村口的墙 · 标语",
      who: "识字的那一个",
      note: "墙上刷了字，得有人一个字一个字念给不识字的人听。",
    },
  ],
  "node-04": [
    {
      id: "node-04p",
      title: "红军坟",
      who: "一个卫生员 · 身份待考",
      note: "人死了，百姓自己垒坟、自己上坟，守了几十年。",
    },
  ],
  "node-06": [
    {
      id: "node-06c",
      title: "皎平渡 · 船工",
      who: "三十六七个人 · 姓名多不详",
      note: "七只船，三万人，人歇船不歇。",
    },
    {
      id: "node-06d",
      title: "护旗",
      who: "小叶丹一家 · 守了十五年",
      note: "一面旗，一个女人，五千四百天。",
    },
  ],
  "node-08": [
    {
      id: "node-08p",
      title: "半截皮带",
      who: "战士周国才",
      note: "断粮，把皮带割成段煮了吃。剩下半截刻上「长征记」。",
    },
    {
      id: "node-08q",
      title: "手摇发电机",
      who: "谢宝金 · 背机器的人",
      note: "六十八公斤，一个人背上草地。机器今天在军事博物馆。",
    },
  ],
  "node-09": [
    {
      id: "node-09s",
      title: "云贵川",
      who: "十七岁 · 真名不详",
      note: "腊子口攻不进去。他赤脚先攀上崖，把绳子放下来。",
    },
  ],
};

export function sideTripsFor(nodeId: string): SideTrip[] {
  return SIDE_TRIPS[nodeId] || [];
}
