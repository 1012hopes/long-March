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
  // —— 沿途人物故事补充（2026-09 增补，链接经检索核对） ——
  { id: "hist-022", nodeId: "node-02", title: "一百堂党史课 | 半条被子一条心", org: "共产党员网", sourceType: "官方党史网站", date: "2021-04-09", url: "https://www.12371.cn/2021/04/09/VIDE1617965041460338.shtml", reliability: "high", rightsStatus: R, claim: "1934年11月3位女红军借宿沙洲村徐解秀家并留下半条被子", note: "借宿天数各记述略有出入，展示时不写具体天数" },
  { id: "hist-023", nodeId: "node-02", title: "“半条被子”的故事在继续", org: "新华网", sourceType: "官方通讯社", date: "2025-11-04", url: "http://www.news.cn/politics/20251104/2b8289f7b3ba49c49ee43b90bc83eaff/c.html", reliability: "high", rightsStatus: R, claim: "罗开富1984年重走长征路报道与徐解秀后人的守护", note: "" },
  { id: "hist-024", nodeId: "node-02", title: "陈树湘：“为苏维埃新中国流尽最后一滴血”", org: "共产党员网", sourceType: "官方党史网站", date: "2018-09-10", url: "https://www.12371.cn/2018/09/10/ARTI1536542200844931.shtml", reliability: "high", rightsStatus: R, claim: "红34师师长陈树湘湘江殿后、被俘后断肠牺牲（时年29岁）", note: "" },
  { id: "hist-025", nodeId: "node-02", title: "陈树湘：“为苏维埃新中国流尽最后一滴血”", org: "新华网", sourceType: "官方通讯社", date: "2018-09-09", url: "https://www.xinhuanet.com/politics/2018-09/09/c_1123401045.htm", reliability: "high", rightsStatus: R, claim: "陈树湘率部担任全军总后卫掩护主力渡江", note: "与hist-024交叉核验" },
  { id: "hist-026", nodeId: "node-03", title: "老山界高山俯首 通道县红军转兵", org: "人民网党史", sourceType: "官方党史网站", date: "2016-08-18", url: "http://dangshi.people.com.cn/n1/2016/0818/c85037-28646476.html", reliability: "high", rightsStatus: R, claim: "红军翻越越城岭（老山界）的行军记述", note: "" },
  { id: "hist-027", nodeId: "node-03", title: "没有红军逾越不了的山河", org: "新华网", sourceType: "官方通讯社", date: "2019-07-05", url: "https://www.xinhuanet.com/politics/2019-07/05/c_1124716497.htm", reliability: "high", rightsStatus: R, claim: "老山界是中央红军长征以来遇到的第一座高山；陆定一《老山界》为亲历记述", note: "" },
  { id: "hist-028", nodeId: "node-05", title: "钟赤兵，单腿走完长征的开国将军", org: "人民网党史", sourceType: "官方党史网站", date: "2016-09-22", url: "http://dangshi.people.com.cn/n1/2016/0922/c85037-28731906.html", reliability: "high", rightsStatus: R, claim: "娄山关战斗负伤、三次截肢后独腿走完长征", note: "" },
  { id: "hist-029", nodeId: "node-05", title: "独腿战士钟赤兵拄双拐走完长征路", org: "应急管理部网站", sourceType: "官方网站", date: "2016-10-22", url: "https://www.mem.gov.cn/xw/ztzl/2018/cyzd/hslc/201610/t20161022_228344.shtml", reliability: "high", rightsStatus: R, claim: "钟赤兵娄山关负伤与独腿长征经过", note: "与hist-028交叉核验" },
  { id: "hist-030", nodeId: "node-06", title: "她是井冈山第一位女红军，为掩护伤员，身中17块弹片", org: "共产党员网", sourceType: "官方党史网站", date: "2022-04-20", url: "https://www.12371.cn/2022/04/20/ARTI1650438417395631.shtml", reliability: "high", rightsStatus: R, claim: "1935年4月盘县遭空袭，贺子珍扑在担架上掩护钟赤兵而负重伤", note: "弹片数量各记载略有出入，展示用“十余处”表述" },
  { id: "hist-031", nodeId: "node-06", title: "贺子珍在长征如何救红军伤员？", org: "中国日报网", sourceType: "官方媒体", date: "2016-10-16", url: "http://china.chinadaily.com.cn/2016-10/16/content_27076510.htm", reliability: "high", rightsStatus: R, claim: "贺子珍掩护伤员的经过与时间地点", note: "" },
  { id: "hist-032", nodeId: "node-06", title: "小叶丹——彝海结盟谱写民族团结之歌", org: "中国共产党新闻网", sourceType: "官方党史网站", date: "2022-07-29", url: "http://cpc.people.com.cn/n1/2022/0729/c443712-32488716.html", reliability: "high", rightsStatus: R, claim: "1935年5月22日刘伯承与小叶丹彝海结盟", note: "" },
  { id: "hist-033", nodeId: "node-06", title: "彝海结盟后，掩护红军旗的5400天——鲜为人知的彝家护旗故事", org: "新华网", sourceType: "官方通讯社", date: "2019-07-26", url: "https://www.xinhuanet.com/politics/2019-07/26/c_1210216347.htm", reliability: "high", rightsStatus: R, claim: "“中国夷民红军沽鸡支队”队旗由小叶丹家人长期守护，现藏军事博物馆", note: "" },
  { id: "hist-034", nodeId: "node-08", title: "追记那个背着发电机走完长征路的于都人", org: "于都县人民政府", sourceType: "官方网站", date: "2024-08", url: "https://www.yudu.gov.cn/yudu/ydly/202408/0012a582a96e47ecab43324a88afefb5.shtml", reliability: "high", rightsStatus: R, claim: "谢宝金独自扛起68公斤手摇发电机过草地走完长征", note: "" },
  { id: "hist-035", nodeId: "node-08", title: "初心印记丨“走”过长征路的手摇发电机", org: "共产党员网", sourceType: "官方党史网站", date: "2021-08-10", url: "https://www.12371.cn/2021/08/10/ARTI1628587797824252.shtml", reliability: "high", rightsStatus: R, claim: "手摇发电机现藏军事博物馆（国家一级文物）", note: "" },
  // —— 人物故事第二批（2026-09 增补，链接经检索核对） ——
  { id: "hist-036", nodeId: "node-03", title: "功勋荣誉战旗巡礼｜“强渡乌江模范连”战旗：强渡乌江建奇功", org: "国防部网站", sourceType: "官方网站", date: "", url: "http://www.mod.gov.cn/gfbw/gfjy_index/js_214151/4885886.html", reliability: "high", rightsStatus: R, claim: "1935年1月红军在江界河等渡口强渡乌江天险", note: "" },
  { id: "hist-037", nodeId: "node-03", title: "红军强渡乌江经历了怎样艰险?", org: "中央党史和文献研究院", sourceType: "权威研究机构", date: "2016-09-14", url: "https://www.dswxyjy.org.cn/n1/2016/0914/c396980-28716021.html", reliability: "high", rightsStatus: R, claim: "毛振华率勇士夜渡乌江潜伏对岸，与强渡部队里应外合", note: "人名另有“毛正华”写法，系同一人" },
  { id: "hist-038", nodeId: "node-04", title: "我想记住你的名字｜这里为何有一尊“红军菩萨”？", org: "新华网", sourceType: "官方通讯社", date: "2025-01-14", url: "https://www.news.cn/politics/20250114/3df616e99dd94b7ab3f89417e5662dc5/c.html", reliability: "high", rightsStatus: R, claim: "遵义“红军坟”与卫生员龙思泉事迹及其身份考证", note: "" },
  { id: "hist-039", nodeId: "node-04", title: "红军卫生员为什么被称为“红菩萨”", org: "新华网", sourceType: "官方通讯社", date: "2016-08-28", url: "http://news.xinhuanet.com/politics/2016-08/28/c_1119466941.htm", reliability: "high", rightsStatus: R, claim: "红军坟的由来与百姓守护经过", note: "与hist-038交叉核验" },
  { id: "hist-040", nodeId: "node-09", title: "腊子口战役：出奇制胜开辟北上通道", org: "人民网党史", sourceType: "官方党史网站", date: "2021-04-28", url: "http://dangshi.people.com.cn/n1/2021/0428/c436975-32090668.html", reliability: "high", rightsStatus: R, claim: "1935年9月17日红军攻克腊子口天险", note: "" },
  { id: "hist-041", nodeId: "node-09", title: "17岁“云贵川”助力红军打下天险腊子口", org: "人民网", sourceType: "官方媒体", date: "2019-08-19", url: "http://politics.people.com.cn/n1/2019/0819/c1001-31302867.html", reliability: "high", rightsStatus: R, claim: "苗族小战士“云贵川”攀崖引路奇袭敌后", note: "战士真名不详，仅存外号" },
  { id: "hist-042", nodeId: "node-06", title: "七只船三万人", org: "共产党员网", sourceType: "官方党史网站", date: "2016-10-13", url: "http://news.12371.cn/2016/10/13/ARTI1476351910026867.shtml", reliability: "high", rightsStatus: R, claim: "红军依靠皎平渡七只小船渡过金沙江", note: "摆渡天数“九天九夜”“七天七夜”两说并存" },
  { id: "hist-043", nodeId: "node-06", title: "解读长征（26）：中央红军如何靠七只小船渡过金沙江", org: "人民网党史", sourceType: "官方党史网站", date: "2016-09-14", url: "http://dangshi.people.com.cn/n1/2016/0914/c85037-28716782.html", reliability: "high", rightsStatus: R, claim: "船工分班轮流、人歇船不歇日夜摆渡", note: "船工人数记载有36/37名出入" },
  { id: "hist-044", nodeId: "node-08", title: "长征路上吃皮带", org: "人民网党史", sourceType: "官方党史网站", date: "2016-08-25", url: "http://dangshi.people.com.cn/n1/2016/0825/c85037-28666190.html", reliability: "high", rightsStatus: R, claim: "红四方面军战士周国才过草地煮皮带，留半截烙“长征记”", note: "人名另写作“周广才”，系同一人" },
  { id: "hist-045", nodeId: "node-08", title: "红四方面军战士周广才在长征过草地时吃剩下的皮带", org: "中国国家博物馆", sourceType: "权威馆藏机构", date: "2021-08-06", url: "https://www.chnmuseum.cn/sp/gbzp/xhsww/202108/t20210806_251001.shtml", reliability: "high", rightsStatus: R, claim: "半截皮带作为文物馆藏与历史见证", note: "军博、国博分别藏有同类皮带文物" },
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
