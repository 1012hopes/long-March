// 来源台账（原型演示数据，来自 research/source-register.csv）
export type SourceEntry = {
  id: string;
  nodeId: string;
  title: string;
  org: string;
  sourceType: string;
  date: string;
  url: string;
  reliability: "high" | "medium" | "low";
  rightsStatus: "cleared" | "permission-needed" | "citation-only" | "blocked";
  claim: string;
  note?: string;
};

const R = "citation-only" as const;

export const sources: SourceEntry[] = [
  { id: "hist-001", nodeId: "node-01", title: "中央红军长征开始", org: "中国共产党新闻网", sourceType: "官方党史网站", date: "2016-08-14", url: "https://cpc.people.com.cn/BIG5/33837/2534266.html", reliability: "high", rightsStatus: R, claim: "中央红军从瑞金出发", note: "主线起点需与于都夜渡分层" },
  { id: "hist-002", nodeId: "node-01", title: "为什么30万人能保守一个秘密", org: "人民网党史", sourceType: "官方党史网站", date: "2016-10-09", url: "https://dangshi.people.com.cn/n1/2016/1009/c85037-28763061.html", reliability: "high", rightsStatus: R, claim: "出发前保密与集结", note: "用于教育问题，不直接替代档案" },
  { id: "hist-003", nodeId: "node-02", title: "湘江战役：中央红军长征的悲壮史诗", org: "人民网党史", sourceType: "官方党史网站", date: "2016-02-29", url: "https://dangshi.people.com.cn/n1/2016/0229/c85037-28159039.html", reliability: "high", rightsStatus: R, claim: "湘江战役时间地点与影响", note: "需交叉核验数字" },
  { id: "hist-004", nodeId: "node-02", title: "湘江之战和突破乌江天险", org: "人民网党史", sourceType: "官方党史网站", date: "2016-10-10", url: "https://dangshi.people.com.cn/n1/2016/1010/c85037-28763952.html", reliability: "high", rightsStatus: R, claim: "湘江至乌江阶段", note: "不消费伤亡数字" },
  { id: "hist-005", nodeId: "node-03", title: "通道会议：伟大转折的起点", org: "中国共产党新闻网", sourceType: "官方党史网站", date: "2024-12-08", url: "https://cpc.people.com.cn/n1/2024/1208/c443712-40377631.html", reliability: "high", rightsStatus: R, claim: "通道会议与转兵贵州", note: "与黎平猴场合并呈现" },
  { id: "hist-006", nodeId: "node-03", title: "猴场会议：伟大转折的前夜", org: "中国共产党新闻网", sourceType: "官方党史网站", date: "2025-01-11", url: "https://cpc.people.com.cn/n1/2025/0111/c443712-40399843.html", reliability: "high", rightsStatus: R, claim: "猴场会议", note: "与hist-020共同覆盖黎平会议链" },
  { id: "hist-007", nodeId: "node-04", title: "遵义1935：早到的春天", org: "中国共产党新闻网", sourceType: "官方党史网站", date: "2025-01-15", url: "https://cpc.people.com.cn/n1/2025/0115/c443712-40402123.html", reliability: "high", rightsStatus: R, claim: "遵义会议日期与意义", note: "与正式党史著作交叉核验" },
  { id: "hist-008", nodeId: "node-04", title: "遵义会议", org: "中国共产党新闻网", sourceType: "官方党史网站", date: "", url: "https://cpc.people.com.cn/GB/33837/2534276.html", reliability: "high", rightsStatus: R, claim: "遵义会议基本事实", note: "页面编码需人工保存引用" },
  { id: "hist-009", nodeId: "node-05", title: "1935年红军四渡赤水转战川南", org: "人民网党史", sourceType: "官方党史网站", date: "2015-02-12", url: "https://dangshi.people.com.cn/n/2015/0212/c85037-26555356.html", reliability: "high", rightsStatus: R, claim: "四渡赤水时间与区域", note: "需人工下载书目信息" },
  { id: "hist-010", nodeId: "node-05", title: "四渡赤水战役：中央红军战略转移的决定性胜利", org: "人民网党史", sourceType: "官方党史网站", date: "2016-10-08", url: "https://dangshi.people.com.cn/n1/2016/1008/c85037-28758648.html", reliability: "high", rightsStatus: R, claim: "四渡赤水历史解释", note: "解释标签不得写成唯一事实" },
  { id: "hist-011", nodeId: "node-06", title: "第十章 巧渡金沙江", org: "人民网党史", sourceType: "官方党史网站", date: "2016-08-14", url: "https://dangshi.people.com.cn/n1/2016/0814/c406330-28634787.html", reliability: "high", rightsStatus: R, claim: "巧渡金沙江", note: "保留皎平渡与时间窗口" },
  { id: "hist-012", nodeId: "node-06", title: "长征途中的地图与测绘", org: "中国共产党新闻网", sourceType: "官方党史网站", date: "2023-10-22", url: "https://cpc.people.com.cn/n1/2023/1022/c443712-40100662.html", reliability: "high", rightsStatus: R, claim: "地图测绘与路线理解", note: "用于史料实证教育" },
  { id: "hist-013", nodeId: "node-07", title: "飞夺泸定桥", org: "中国共产党新闻网", sourceType: "官方党史网站", date: "2025-03-08", url: "https://cpc.people.com.cn/GB/n1/2025/0308/c443712-40434014.html", reliability: "high", rightsStatus: R, claim: "飞夺泸定桥", note: "与hist-021分开覆盖安顺场强渡" },
  { id: "hist-014", nodeId: "node-07", title: "历史记忆中的长征（七）：飞夺泸定桥", org: "共产党员网", sourceType: "官方党史网站", date: "2016-12-16", url: "https://xuexi.12371.cn/2016/12/16/ARTI1481870706956501.shtml", reliability: "high", rightsStatus: R, claim: "泸定桥叙事", note: "与安顺场分开" },
  { id: "hist-015", nodeId: "node-08", title: "第十五章 懋功会师", org: "人民网党史", sourceType: "官方党史网站", date: "2016-08-19", url: "https://dangshi.people.com.cn/n1/2016/0819/c406330-28649914.html", reliability: "high", rightsStatus: R, claim: "懋功会师", note: "不是1936三大主力会师" },
  { id: "hist-016", nodeId: "node-08", title: "历史记忆中的长征（八）：红军翻越大雪山", org: "共产党员网", sourceType: "官方党史网站", date: "2016-12-16", url: "https://xuexi.12371.cn/2016/12/16/ARTI1481871917232610.shtml", reliability: "high", rightsStatus: R, claim: "夹金山与雪山", note: "环境叙事需避免奇观化" },
  { id: "hist-017", nodeId: "node-09", title: "中央红军到达陕北", org: "人民网党史", sourceType: "官方党史网站", date: "2016-09-18", url: "https://dangshi.people.com.cn/BIG5/n1/2016/0918/c85037-28721433.html", reliability: "high", rightsStatus: R, claim: "到达陕北", note: "与长征结束分层" },
  { id: "hist-018", nodeId: "node-09", title: "榜罗镇：从一口铁缸看共产党人的初心", org: "人民网党史", sourceType: "官方党史网站", date: "2019-08-18", url: "https://dangshi.people.com.cn/n1/2019/0818/c85037-31301507.html", reliability: "high", rightsStatus: R, claim: "榜罗镇信息与方向", note: "避免把个案变成全部证据" },
  { id: "hist-019", nodeId: "node-09", title: "红军抵达陕北吴起镇 红一方面军长征胜利结束", org: "中国共产党新闻网", sourceType: "官方党史网站", date: "", url: "https://cpc.people.com.cn/GB/33837/2534292.html", reliability: "high", rightsStatus: R, claim: "吴起镇与中央红军狭义结束", note: "总史尾声另列" },
  { id: "hist-020", nodeId: "node-03", title: "党的历史上生死攸关的转折点", org: "中央党史和文献研究院院长曲青山／学习时报", sourceType: "权威研究文章", date: "2025-01-13", url: "https://cpc.people.com.cn/BIG5/n1/2025/0113/c443712-40400457.html", reliability: "high", rightsStatus: R, claim: "通道黎平猴场至遵义的会议链", note: "正文独立列出黎平会议日期和决议" },
  { id: "hist-021", nodeId: "node-07", title: "不忘初心 传承红色基因（长征记忆·寻访红军部队）", org: "人民网党史", sourceType: "官方党史网站", date: "2016-10-13", url: "https://dangshi.people.com.cn/n1/2016/1013/c85037-28773975.html", reliability: "high", rightsStatus: R, claim: "安顺场强渡与后续泸定桥时间链", note: "需保存页面或书目信息防链接波动" },
];

export const sourcesByNode = (nodeId: string) => sources.filter((s) => s.nodeId === nodeId);

// 路线段展示元数据（来自 research/route-segment-register.csv）
export type SegmentMeta = {
  id: string;
  certainty: "confirmed" | "approximate" | "disputed";
  displayDateLabel: string;
  fromNodeId: string;
  toNodeId: string;
  reasoning: string;
  sourceIds: string[];
};

export const segments: SegmentMeta[] = [
  { id: "seg-01", certainty: "approximate", displayDateLabel: "1934年10月至12月", fromNodeId: "node-01", toNodeId: "node-02", reasoning: "当前只确认主要起点事件与湘江阶段，不画逐日单线", sourceIds: ["hist-001", "hist-002", "hist-003", "hist-004"] },
  { id: "seg-02", certainty: "approximate", displayDateLabel: "1934年12月", fromNodeId: "node-02", toNodeId: "node-03", reasoning: "路线转向必须与通道黎平猴场会议链共同解释", sourceIds: ["hist-004", "hist-005", "hist-006", "hist-020"] },
  { id: "seg-03", certainty: "approximate", displayDateLabel: "1935年1月上中旬", fromNodeId: "node-03", toNodeId: "node-04", reasoning: "只在史料可确认的城镇节点间使用代表性中心线", sourceIds: ["hist-006", "hist-007", "hist-008", "hist-020"] },
  { id: "seg-04", certainty: "disputed", displayDateLabel: "1935年1月至3月", fromNodeId: "node-04", toNodeId: "node-05", reasoning: "四渡赤水多次往返，应按渡河事件和候选区段建模", sourceIds: ["hist-009", "hist-010"] },
  { id: "seg-05", certainty: "approximate", displayDateLabel: "1935年春", fromNodeId: "node-05", toNodeId: "node-06", reasoning: "川黔滇至金沙江段先建约略走廊，渡口点单独核验", sourceIds: ["hist-010", "hist-011", "hist-012"] },
  { id: "seg-06", certainty: "approximate", displayDateLabel: "1935年5月", fromNodeId: "node-06", toNodeId: "node-07", reasoning: "金沙江至大渡河阶段不沿现代公路硬画", sourceIds: ["hist-011", "hist-013", "hist-014", "hist-021"] },
  { id: "seg-07", certainty: "approximate", displayDateLabel: "1935年5月底至6月", fromNodeId: "node-07", toNodeId: "node-08", reasoning: "泸定桥至夹金山和会师段需结合地形与史料", sourceIds: ["hist-013", "hist-014", "hist-015", "hist-016", "hist-021"] },
  { id: "seg-08", certainty: "disputed", displayDateLabel: "1935年夏至秋", fromNodeId: "node-08", toNodeId: "node-09", reasoning: "会师后至陕北跨度大且涉及路线分歧，只作候选与分阶段说明", sourceIds: ["hist-015", "hist-016", "hist-017", "hist-018", "hist-019"] },
];
