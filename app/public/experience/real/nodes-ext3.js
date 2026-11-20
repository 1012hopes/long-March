/* =========================================================
   长征一条路的来处 · 人物支线（第四辑）
   ---------------------------------------------------------
   主线是路，支线是人。
   前面二十五站，走的是中央红军的行进序列；
   这一辑六站，全部从主线的一个点上岔出去，讲路上的人：

     node-00s 四枚银元   —— 十四岁的勤务员，把银元缝进腰带  （挂 瑞金出发）
     node-02q 后  卫     —— 二十九岁的师长，走在最后        （挂 湘江战役）
     node-06d 护  旗     —— 一面旗，一家人守了五千四百天    （挂 彝海结盟）
     node-08p 半截皮带   —— 一条皮带煮了，剩下的半截刻了字  （挂 过草地）
     node-08q 手摇发电机 —— 六十八公斤，一个人背上草地      （挂 过草地）
     node-09s 云 贵 川   —— 十七岁，没有名字，先上了崖      （挂 腊子口）

   本文件在 nodes-ext2.js 之后加载：
     1. 定义 RS_EXTRA3（新增 6 站）
     2. 重写 RS_ROUTE（31 站），每一项带 line（主线/支线）与 hang（挂在哪个主线站）
     3. 把 RS_EXTRA3 并入 RS_NODES，并按路线回写 seq
   ---------------------------------------------------------
   两条硬规矩（与前几辑一致）：
     · 不为无名者编造姓名。名字不详就写"不详"。
     · 不消费伤亡数字，也不把"牺牲"写成景观。
   ========================================================= */
window.RS_EXTRA3 = [

  /* ================= 出发 · 四枚银元 ================= */
  {
    id: "node-00s", ready: true, line: "side", hang: "node-00",
    title: "出发前 · 四枚银元", short: "四枚银元",
    stamp: "1934.10 上旬 · 宁都", place: "江西 宁都 · 田头乡",
    mode: "walk", speed: 0.0140,
    stages: [
      { img: "real/img/yinyuan.jpg", over: 1.15, push: 0.09 },
      { img: "real/img/yinyuan.jpg", over: 1.14, push: 0.08 },
      { img: "real/img/yinyuan.jpg", over: 1.13, push: 0.07 }
    ],
    flash: { a: 0.20, col: [206, 190, 164] },
    lens: { yaw: 0.03, pitch: 0.08, kx: 0.0014, ky: 0.0010 },
    gait: { amp: 1.0, freq: 0.90, sway: 0.0016, push: 1.2 },
    hudDist: { from: 0, label: "出发前一夜" },
    walk: { custom: "出发前一夜　·　宁都" },
    amb: { wind: 0.04, water: 0.04, fire: 0.22, room: 0.40 },
    grade: { tint: [56, 42, 30], tintA: 0.24 },
    vignette: 0.96, grain: 0.10,
    glow: { x: 0.27, y: 0.40, r: 0.24, col: [255, 190, 120], alpha: 0.20, pulse: 0.06 },
    fx: [
      { type: "dust", n: 10, r: 0.8, a: 0.16, vx: 0.05, col: [212, 200, 182] }
    ],
    constraint:
      "江西宁都一处土坯房，深夜，油灯一盏。少年背对镜头，只见后脑与肩背；" +
      "桌上四枚银元、一块灰布、针线。不写他的表情，也不写「依依不舍」——" +
      "这一夜他在做的事很具体：把银元缝进腰带。",
    notes: [
      {
        u: 0.30, v: 0.60, short: "桌上那四枚银元", lv: "确定 · 有史料依据", precision: "confirmed",
        title: "六枚银元，他只带走了四枚",
        body:
          "一九三四年，这个十四岁就参军的少年随队到宁都开会。宁都是他的老家，他要回去看一眼。<br><br>" +
          "首长从自己的津贴里省出六枚银元给他 —— 他家里已经穷到揭不开锅。<br><br>" +
          "他给家里留了两枚，把剩下的四枚用布包好，缝进裤腰带的夹层里，贴着肉。",
        src: "依据：<b>hist-052</b> 斑驳锈迹下的温情记忆 —— 毛泽东送给陈昌奉的银元（北京市文物局·军博藏品）。",
        warn: "「六枚」「两枚」「四枚」这一组数字来自军博藏品说明与当事人回忆，与部分转述略有出入。"
      },
      {
        u: 0.62, v: 0.40, short: "缝进腰带的那只手", lv: "确定 · 有史料依据", precision: "confirmed",
        title: "他的名字是后来才学会写的",
        body:
          "他放牛长大，没上过一天学，连自己的名字都不认得。<br><br>" +
          "到陕北以后，别人一字一笔教他写「陈昌奉」三个字。<br><br>" +
          "一个在队伍里学会写自己名字的人，后来把四枚银元捐给了军事博物馆 —— 一九五九年。",
        src: "依据：<b>hist-052</b>；<b>hist-053</b> 他 15 岁护卫毛主席长征（文汇报，2020-06-23）。",
        warn: "参加红军的年龄，各记述有「不满十四」与「十四」两说；本画面不写具体出生月日。"
      },
      {
        u: 0.16, v: 0.34, short: "门缝外那片黑", lv: "解释 · 一种理解", precision: "interpretive",
        title: "缝进去的不是钱",
        body:
          "这四枚银元跟了他一整年：爬雪山、过草地，一直缝在腰上。<br><br>" +
          "在草地上断粮的时候，他把猪皮鞋底割下来煮了吃 —— 腰带没拆。<br><br>" +
          "有些东西不是用来花的。",
        src: "依据：<b>hist-053</b>（煮鞋底一节出自陈昌奉本人回忆）；<b>hist-052</b>（银元随其走完长征）。",
        warn: "「腰带没拆」是对行为的推断，不是当事人原话；回忆录未直接说明草地期间是否动用过银元。"
      }
    ]
  },

  /* ================= 湘江 · 后卫 ================= */
  {
    id: "node-02q", ready: true, line: "side", hang: "node-02",
    title: "湘江 · 后卫", short: "后卫",
    stamp: "1934.11 底 — 12 初", place: "广西 全州 · 界首",
    mode: "walk", speed: 0.0150,
    stages: [
      { img: "real/img/xiangjiang.jpg", over: 1.16, push: 0.11 },
      { img: "real/img/xiangjiang.jpg", over: 1.15, push: 0.10 },
      { img: "real/img/xiangjiang.jpg", over: 1.14, push: 0.09 }
    ],
    flash: { a: 0.30, col: [198, 204, 196] },
    lens: { yaw: 0.05, pitch: 0.06, kx: 0.0020, ky: 0.0012 },
    gait: { amp: 1.5, freq: 0.86, sway: 0.0026, push: 1.7 },
    hudDist: { from: 0, label: "江水到腰" },
    amb: { wind: 0.22, water: 0.55, fire: 0.06, room: 0.06 },
    grade: { tint: [40, 48, 44], tintA: 0.26 },
    vignette: 0.98, grain: 0.11,
    glow: { x: 0.14, y: 0.62, r: 0.30, col: [180, 200, 190], alpha: 0.08, pulse: 0.03 },
    fx: [
      { type: "mist", n: 6, r: 0.20, a: 0.10, vx: 0.04, col: [206, 214, 208] }
    ],
    constraint:
      "湘江渡口，天亮前的浓雾。断掉的浮桥漂在近岸，岸边丢弃着扁担、草鞋、竹筐、压扁的斗笠。" +
      "画面里没有伤者，没有尸体，没有血 —— 这一站要说的事，不需要画出来。",
    notes: [
      {
        u: 0.55, v: 0.62, short: "水里那几个背影", lv: "确定 · 有史料依据", precision: "confirmed",
        title: "走在最后的那个师",
        body:
          "一九三四年十一月底，主力要过湘江。有一个师被留在最后面，任务只有一句：挡住追兵，让主力过去。<br><br>" +
          "红三十四师，师长陈树湘，二十九岁。<br><br>" +
          "主力过去了。他们没过去。",
        src: "依据：<b>hist-024</b>／<b>hist-025</b> 陈树湘：「为苏维埃新中国流尽最后一滴血」（共产党员网、新华网）。",
        warn: "本画面不表现战斗过程，也不复原当时的兵力与阵地位置。"
      },
      {
        u: 0.26, v: 0.72, short: "岸上那些扁担", lv: "确定 · 有史料依据", precision: "confirmed",
        title: "他被抬着去领赏，路上把肠子绞断了",
        body:
          "他腹部中弹，昏过去，被俘。<br><br>" +
          "敌人用担架抬着他去邀功。半路上，他从伤口里把自己的肠子绞断。<br><br>" +
          "二十九岁。这是党史记述里的原话：为苏维埃新中国流尽最后一滴血。",
        src: "依据：<b>hist-024</b>／<b>hist-025</b>。",
        warn: "「断肠」一节见于党史记述与多种转述，具体时刻、地点各家表述略有差异。本画面不作视觉再现。"
      },
      {
        u: 0.78, v: 0.50, short: "雾里的江面", lv: "解释 · 一种理解", precision: "interpretive",
        title: "这一仗的数字，本项目不写",
        body:
          "湘江战役的伤亡与减员，各种材料给出的数字并不一致，口径也不同。<br><br>" +
          "所以这里不列数字。你只需要知道一件事：过江之后，那支队伍的人数，比出发时少了很多。",
        src: "依据：<b>hist-003</b>／<b>hist-004</b>（湘江战役的经过与影响；数字需交叉核验）。",
        warn: "「不列数字」是本项目的自觉约束，不代表相关研究没有成果。"
      }
    ]
  },

  /* ================= 彝海 · 护旗 ================= */
  {
    id: "node-06d", ready: true, line: "side", hang: "node-06a", noMate: true,
    title: "彝海 · 护旗", short: "护旗",
    stamp: "1935.5 — 1950", place: "四川 冕宁 · 彝海",
    mode: "walk", speed: 0.0130,
    stages: [
      { img: "real/img/huqi.jpg", over: 1.15, push: 0.09 },
      { img: "real/img/huqi.jpg", over: 1.14, push: 0.08 },
      { img: "real/img/huqi.jpg", over: 1.13, push: 0.07 }
    ],
    flash: { a: 0.18, col: [200, 172, 140] },
    lens: { yaw: 0.03, pitch: 0.07, kx: 0.0013, ky: 0.0010 },
    gait: { amp: 0.9, freq: 0.88, sway: 0.0014, push: 1.1 },
    hudDist: { from: 190, label: "十五年后" },
    walk: { custom: "十五年后　·　同一片山地" },
    amb: { wind: 0.10, water: 0.06, fire: 0.34, room: 0.30 },
    grade: { tint: [50, 34, 26], tintA: 0.24 },
    vignette: 0.94, grain: 0.10,
    glow: { x: 0.30, y: 0.66, r: 0.26, col: [255, 168, 96], alpha: 0.18, pulse: 0.07 },
    fx: [
      { type: "ember", n: 8, r: 0.5, a: 0.30, vx: 0.05, col: [255, 170, 110] },
      { type: "smoke", n: 3, r: 0.16, a: 0.06, vx: 0.03, col: [190, 180, 168] }
    ],
    constraint:
      "彝族村寨的堂屋，火塘，黄昏。老妇人背对镜头，把一块叠好的深色布放进木箱底。" +
      "旗面图案与文字均不可辨认 —— 这面旗的样子可以查，但不该由生成影像来「复原」。",
    notes: [
      {
        u: 0.56, v: 0.52, short: "箱底那块布", lv: "确定 · 有史料依据", precision: "confirmed",
        title: "一面旗，交给了一个人",
        body:
          "一九三五年五月二十二日，刘伯承与彝族首领小叶丹在彝海边结盟。<br><br>" +
          "红军授了一面旗：「中国夷民红军沽鸡支队」。<br><br>" +
          "红军走后，这面旗留在了一个彝族女人的手里。",
        src: "依据：<b>hist-032</b> 小叶丹 —— 彝海结盟谱写民族团结之歌（中国共产党新闻网）；<b>hist-033</b>（新华网，护旗故事）。",
        warn: "旗上的字，不同资料转写略异；本画面不复原旗面图案。"
      },
      {
        u: 0.26, v: 0.66, short: "火塘里的炭", lv: "确定 · 有史料依据", precision: "confirmed",
        title: "五千四百天",
        body:
          "从一九三五年到一九五〇年，这面旗被这家人藏了十五年。<br><br>" +
          "搜索、盘问、威逼，都没有交出去。<br><br>" +
          "冕宁解放时，它被交到解放军手里。今天在军事博物馆。",
        src: "依据：<b>hist-033</b>「彝海结盟后，掩护红军旗的 5400 天」（新华网，2019-07-26）。",
        warn: "「五四〇〇天」是报道用语，按 1935 年 5 月至 1950 年春估算；具体交接日期各说不一。"
      },
      {
        u: 0.14, v: 0.42, short: "门外的黄昏", lv: "确定 · 有史料依据", precision: "confirmed",
        title: "结盟的人，没能等到那一天",
        body:
          "小叶丹本名果基约达。<br><br>" +
          "一九四二年，他在冕宁一带遇害 —— 距那面旗交出去，还有八年。<br><br>" +
          "守旗的，是他的妻子和家人。",
        src: "依据：<b>hist-032</b>／<b>hist-033</b>（小叶丹生平与家人护旗经过）。",
        warn: "遇害的时间与经过，公开记述有不同版本；此处只取「1942 年遇害」这一较为一致的说法。"
      }
    ]
  },

  /* ================= 草地 · 半截皮带 ================= */
  {
    id: "node-08p", ready: true, line: "side", hang: "node-08b",
    title: "草地 · 半截皮带", short: "半截皮带",
    stamp: "1935.8 — 1936", place: "四川 松潘 · 草地",
    mode: "walk", speed: 0.0125,
    stages: [
      { img: "real/img/pidai.jpg", over: 1.15, push: 0.10 },
      { img: "real/img/pidai.jpg", over: 1.14, push: 0.09 },
      { img: "real/img/pidai.jpg", over: 1.13, push: 0.08 }
    ],
    flash: { a: 0.26, col: [188, 130, 96] },
    lens: { yaw: 0.03, pitch: 0.09, kx: 0.0015, ky: 0.0012 },
    gait: { amp: 1.1, freq: 0.82, sway: 0.0018, push: 1.3 },
    hudDist: { from: 0, label: "断粮的第三天" },
    walk: { custom: "一年后　·　同一片草地" },
    amb: { wind: 0.16, water: 0.10, fire: 0.46, room: 0.04 },
    grade: { tint: [46, 30, 24], tintA: 0.28 },
    vignette: 1.0, grain: 0.12,
    glow: { x: 0.50, y: 0.62, r: 0.22, col: [255, 140, 70], alpha: 0.24, pulse: 0.10 },
    fx: [
      { type: "ember", n: 10, r: 0.6, a: 0.34, vx: 0.06, col: [255, 150, 84] },
      { type: "smoke", n: 2, r: 0.14, a: 0.07, vx: 0.04, col: [176, 166, 154] }
    ],
    constraint:
      "草地上的一堆牛粪火，五个人背对镜头围坐，铁皮缸子里煮着割成段的皮带。" +
      "不给面部，不给「饥饿的表情」。这一站要说的是：他们把能吃的东西吃完了，然后开始吃不能吃的。",
    notes: [
      {
        u: 0.50, v: 0.56, short: "缸子里那几段", lv: "确定 · 有史料依据", precision: "confirmed",
        title: "皮带是可以煮的",
        body:
          "过草地，断粮。<br><br>" +
          "一个叫周国才的战士，把自己那条皮带割成几段，放进缸子里煮。<br><br>" +
          "煮软的皮带能吃下去，虽然不好吃。这件事在队伍里传开了 —— 有皮带的都开始煮。",
        src: "依据：<b>hist-044</b> 长征路上吃皮带（人民网党史）；<b>hist-045</b>（中国国家博物馆藏半截皮带）。",
        warn: "「周国才」另写作「周广才」，系同一人；他属红四方面军，过草地的时间（1935—1936）与中央红军不同批。本画面不写具体日期。"
      },
      {
        u: 0.28, v: 0.74, short: "泥地上那段没下锅的", lv: "确定 · 有史料依据", precision: "confirmed",
        title: "他留下了半截",
        body:
          "一条皮带煮着吃，最后剩下半截，他停下了。<br><br>" +
          "他把这半截收起来，在上面刻了三个字：长征记。<br><br>" +
          "今天这半截皮带在中国国家博物馆。",
        src: "依据：<b>hist-045</b> 红四方面军战士周广才在长征过草地时吃剩下的皮带（中国国家博物馆，2021-08-06）。",
        warn: "刻字的具体刀法与字数，各家转述略有出入；本画面不放大刻字。"
      },
      {
        u: 0.76, v: 0.44, short: "火光照着的那圈人", lv: "解释 · 一种理解", precision: "interpretive",
        title: "为什么是「半截」这件事最重",
        body:
          "一个人饿到要吃皮带，说明他身上再没有别的东西可以吃了。<br><br>" +
          "他留下半截，说明他心里还有一件事没做完 —— 要把这件事记下来。<br><br>" +
          "活下来的人，替没活下来的人记。",
        src: "依据：<b>hist-044</b>／<b>hist-045</b>（半截皮带作为文物留存与历史见证）。",
        warn: "「替没活下来的人记」是对留存动机的解读，不是当事人自述。"
      }
    ]
  },

  /* ================= 草地 · 手摇发电机 ================= */
  {
    id: "node-08q", ready: true, line: "side", hang: "node-08b",
    title: "草地 · 手摇发电机", short: "手摇发电机",
    stamp: "1935.8", place: "四川 松潘 · 草地",
    mode: "walk", speed: 0.0148,
    stages: [
      { img: "real/img/fadianji.jpg", over: 1.16, push: 0.10 },
      { img: "real/img/fadianji.jpg", over: 1.15, push: 0.09 },
      { img: "real/img/fadianji.jpg", over: 1.14, push: 0.08 }
    ],
    flash: { a: 0.22, col: [198, 200, 190] },
    lens: { yaw: 0.04, pitch: 0.07, kx: 0.0018, ky: 0.0011 },
    gait: { amp: 1.6, freq: 0.80, sway: 0.0028, push: 1.8 },
    hudDist: { from: 0, label: "六十八公斤，背在背上" },
    amb: { wind: 0.30, water: 0.22, fire: 0.04, room: 0.08 },
    grade: { tint: [44, 48, 44], tintA: 0.22 },
    vignette: 0.94, grain: 0.10,
    glow: { x: 0.30, y: 0.42, r: 0.34, col: [210, 214, 208], alpha: 0.07, pulse: 0.02 },
    fx: [
      { type: "mist", n: 7, r: 0.24, a: 0.09, vx: 0.05, col: [208, 212, 206] }
    ],
    constraint:
      "草地边缘，阴天，齐膝的草与成片的水洼。一个人背着木箱式手摇发电机走在泥水里，" +
      "另两人一前一后帮着扶。只见背影与斗笠。机器不是奇观，是行李 —— 画得像行李。",
    notes: [
      {
        u: 0.42, v: 0.52, short: "背上那个木箱", lv: "确定 · 有史料依据", precision: "confirmed",
        title: "六十八公斤",
        body:
          "谢宝金，江西于都人。<br><br>" +
          "长征出发时，他被指派负责一台手摇发电机。这台机器六十八公斤，给电台供电。<br><br>" +
          "他把它背过了草地。",
        src: "依据：<b>hist-034</b> 追记那个背着发电机走完长征路的于都人（于都县人民政府）；<b>hist-035</b>（共产党员网）。",
        warn: "「六十八公斤」为报道中的表述；机器型号、重量各资料表述略有差异。"
      },
      {
        u: 0.60, v: 0.66, short: "勒在肩上的背带", lv: "解释 · 一种理解", precision: "interpretive",
        title: "为什么一台机器要人背",
        body:
          "电台要电。没有电，电台就是一块铁。<br><br>" +
          "没有电台，这支队伍就跟自己的各个部分失去联系。<br><br>" +
          "所以这台机器不能丢。丢的不是行李，是指挥。",
        src: "依据：<b>hist-035</b>（发电机的用途与馆藏身份）；<b>hist-012</b>（长征途中的通讯与测绘条件）。",
        warn: "「不能丢」是对任务性质的说明，不是当时的命令原话。"
      },
      {
        u: 0.16, v: 0.40, short: "远处的雾", lv: "确定 · 有史料依据", precision: "confirmed",
        title: "它后来进了博物馆",
        body:
          "这台手摇发电机走完了长征，今天在中国人民革命军事博物馆，国家一级文物。<br><br>" +
          "展签上写的是机器。<br><br>" +
          "背它的人叫谢宝金。",
        src: "依据：<b>hist-035</b> 初心印记 ｜「走」过长征路的手摇发电机（共产党员网，2021-08-10）。",
        warn: "背运过程中是否有其他人轮换，公开记述不详；画面中的两人搀扶属场景构成，不指认具体人物。"
      }
    ]
  },

  /* ================= 腊子口 · 云贵川 ================= */
  {
    id: "node-09s", ready: true, line: "side", hang: "node-09a",
    title: "腊子口 · 云贵川", short: "云贵川",
    stamp: "1935.9.17 · 夜", place: "甘肃 迭部 · 腊子口",
    mode: "walk", speed: 0.0155,
    stages: [
      { img: "real/img/yunguichuan.jpg", over: 1.16, push: 0.12 },
      { img: "real/img/yunguichuan.jpg", over: 1.15, push: 0.11 },
      { img: "real/img/yunguichuan.jpg", over: 1.14, push: 0.10 }
    ],
    flash: { a: 0.28, col: [180, 190, 196] },
    lens: { yaw: 0.06, pitch: 0.12, kx: 0.0022, ky: 0.0016 },
    gait: { amp: 1.3, freq: 0.88, sway: 0.0022, push: 1.5 },
    hudDist: { from: 0, label: "崖壁，七十米" },
    amb: { wind: 0.34, water: 0.40, fire: 0.12, room: 0.06 },
    grade: { tint: [34, 42, 46], tintA: 0.28 },
    vignette: 1.02, grain: 0.13,
    glow: { x: 0.34, y: 0.38, r: 0.16, col: [255, 148, 76], alpha: 0.14, pulse: 0.08 },
    fx: [
      { type: "mist", n: 5, r: 0.18, a: 0.08, vx: 0.05, col: [186, 196, 200] }
    ],
    constraint:
      "腊子口，深夜。两侧近乎垂直的石崖，谷底一条急流、一座只剩木梁的桥，谷口碉堡的枪眼里透着一点光。" +
      "一个十七岁上下的瘦小少年赤脚攀在崖壁上，背对镜头，腰间一根粗麻绳。" +
      "不画他的脸，也不画他登顶之后的事 —— 那一段，史料里没有。",
    notes: [
      {
        u: 0.72, v: 0.44, short: "崖壁上那个人", lv: "确定 · 有史料依据", precision: "confirmed",
        title: "他先上去了，后面的人才跟得上",
        body:
          "腊子口是一道窄口子，正面攻不进去。<br><br>" +
          "一个十七岁的苗族小战士，赤脚，会攀崖。他从侧面先攀上去，把绳子放下来。<br><br>" +
          "后面的人顺着绳子上去了。",
        src: "依据：<b>hist-041</b> 17 岁「云贵川」助力红军打下天险腊子口（人民网，2019-08-19）；<b>hist-040</b>（腊子口战役）。",
        warn: "攀崖的高度、路线与参战人数，各记述不一；本画面不标具体米数。"
      },
      {
        u: 0.50, v: 0.72, short: "垂下来的那根绳", lv: "确定 · 有史料依据", precision: "confirmed",
        title: "他没有名字",
        body:
          "史料里叫他「云贵川」。<br><br>" +
          "这是外号，不是名字 —— 因为他从云贵川那一带来。<br><br>" +
          "真名不详。到今天也不详。",
        src: "依据：<b>hist-041</b>（战士真名不详，仅存外号）。",
        warn: "「从云贵川那一带来的」是外号由来的通行解释，具体籍贯无考。"
      },
      {
        u: 0.26, v: 0.34, short: "谷口那点光", lv: "解释 · 一种理解", precision: "interpretive",
        title: "后来他怎么样了 —— 不知道",
        body:
          "腊子口打下来了。第二天部队继续往北走。<br><br>" +
          "这个十七岁的人后来怎么样了，公开记述里没有。<br><br>" +
          "不是没有故事。是史料没到那一步。",
        src: "依据：<b>hist-040</b>／<b>hist-041</b>（两文均未载其后续）。",
        warn: "「不知道」是检索结论，不等于历史上没有记载；若有新材料，此处应改写。"
      }
    ]
  }

];

/* =========================================================
   路线：31 站
     line: "main"  主线 —— 中央红军行进序列，21 站
     line: "side"  支线 —— 从某个主线站岔出去，10 站
     hang          支线挂在哪个主线站的后面
     walk          行程感（约略值）：day 出发后第几天 / li 累计里数 / alt 海拔米
   ========================================================= */
window.RS_ROUTE = [
  { id: "node-00", seq: 1, line: "main", title: "瑞金出发", date: "1934.10.10", place: "瑞金 / 云石山", ready: true,
    walk: { day: 1, li: 0, alt: 200 },
    q: "走的时候，知道自己要去哪儿吗？", shot: "夜里，田埂，草鞋，远处几点遮住的灯" },
  { id: "node-00s", seq: 2, line: "side", hang: "node-00", title: "出发前 · 四枚银元", date: "1934.10 上旬", place: "宁都 / 田头乡", ready: true,
    walk: { custom: "出发前一夜　·　宁都" },
    who: "十四岁 · 勤务员",
    q: "一个孩子把六枚银元里的四枚缝进腰带，是为什么？", shot: "土坯房，油灯，桌上四枚银元，一个背影在缝东西" },
  { id: "node-01", seq: 3, line: "main", title: "于都夜渡", date: "1934.10.17", place: "于都 / 于都河", ready: true,
    walk: { day: 8, li: 400, alt: 120 },
    q: "为什么是战略转移，而不是普通行军？", shot: "夜，渔船捆成的浮桥，没人说话" },
  { id: "node-01b", seq: 4, line: "main", title: "突破封锁线", date: "1934.10.21", place: "赣南 / 信丰", ready: true,
    walk: { day: 12, li: 700, alt: 200 },
    q: "突围为什么要走一个多月？", shot: "碉堡之间的缺口，推倒的铁丝网，远处的火" },
  { id: "node-02p", seq: 5, line: "side", hang: "node-01b", title: "沙洲村 · 半条被子", date: "1934.11 上旬", place: "汝城 / 沙洲村", ready: true,
    walk: { day: 30, li: 1600, alt: 600 },
    who: "三位女红军 · 没有名字",
    q: "一床被子剪成两半，还算不算一床被子？", shot: "雨夜堂屋，油灯，灶膛余火，门外有人经过" },
  { id: "node-02", seq: 6, line: "main", title: "湘江战役", date: "1934.11 底", place: "全州 / 兴安", ready: true,
    walk: { day: 55, li: 2800, alt: 200 },
    q: "为什么这是生死关，也是重大转折？", shot: "天亮前，水到胸口，断掉的浮桥" },
  { id: "node-02q", seq: 7, line: "side", hang: "node-02", title: "湘江 · 后卫", date: "1934.11 底 — 12 初", place: "全州 / 界首", ready: true,
    walk: { day: 57, li: 2860, alt: 190 },
    who: "二十九岁 · 师长",
    q: "走在最后的那支部队，后来怎么样了？", shot: "浓雾，断浮桥，丢弃的扁担与草鞋，涉水的背影" },
  { id: "node-03", seq: 8, line: "main", title: "老山界", date: "1934.12 初", place: "越城岭", ready: true,
    walk: { day: 62, li: 3300, alt: 1500 },
    q: "最难的一段路，为什么不是战场？", shot: "雨夜石阶，泥泞，火把压得很低" },
  { id: "node-03a", seq: 9, line: "main", title: "通道转兵", date: "1934.12.12", place: "通道 / 恭城书院", ready: true,
    walk: { day: 64, li: 3500, alt: 400 },
    q: "一次会，能不能改掉一条路线？", shot: "侗寨木楼，门里一盏灯，湿石板" },
  { id: "node-03c", seq: 10, line: "side", hang: "node-03a", title: "村口的墙 · 标语", date: "1934.12 中", place: "黎平一带 / 村口", ready: true,
    walk: { day: 70, li: 4000, alt: 500 },
    who: "识字的那一个 · 念给别人听",
    q: "刷在墙上的字，是写给谁看的？", shot: "阴天晒谷场，白灰字迹已被雨冲花，一群人仰头看" },
  { id: "node-03b", seq: 11, line: "main", title: "强渡乌江", date: "1935.1.1", place: "瓮安 / 江界河", ready: true,
    walk: { day: 84, li: 4700, alt: 700 },
    q: "天险是怎么过去的？", shot: "夜，竹筏，马灯，对岸的绝壁" },
  { id: "node-04", seq: 12, line: "main", title: "遵义会议", date: "1935.1.15", place: "遵义", ready: true,
    walk: { day: 98, li: 5200, alt: 850 },
    q: "为什么说这是伟大转折？", shot: "楼外的湿石板，二楼一扇亮着的窗" },
  { id: "node-04p", seq: 13, line: "side", hang: "node-04", title: "遵义 · 红军坟", date: "1935.1 下旬", place: "遵义 / 桑木垭", ready: true,
    walk: { day: 106, li: 5300, alt: 870 },
    who: "一个卫生员 · 身份待考",
    q: "一座没人管的坟，为什么一直有人去？", shot: "冬季清晨，枯草坡，新培的土，坟前一堆烧着的纸" },
  { id: "node-05a", seq: 14, line: "main", title: "土城 · 一渡赤水", date: "1935.1.29", place: "习水 / 土城", ready: true,
    walk: { day: 112, li: 5900, alt: 400 },
    q: "第一次渡河，是被迫还是主动？", shot: "拂晓石阶，浮桥，队伍急着过" },
  { id: "node-05b", seq: 15, line: "main", title: "娄山关", date: "1935.2.25", place: "桐梓 / 娄山关", ready: true,
    walk: { day: 139, li: 6800, alt: 1400 },
    q: "为什么回头打这一仗？", shot: "雨雾关隘，残破关门，靠壁歇着的人" },
  { id: "node-05", seq: 16, line: "main", title: "四渡赤水", date: "1935.1—3", place: "赤水河流域", ready: true,
    walk: { day: 160, li: 7500, alt: 600 },
    q: "如何理解机动、情报与主动权？", shot: "雨中的同一段河滩，走了四次" },
  { id: "node-06", seq: 17, line: "main", title: "巧渡金沙江", date: "1935.5.3", place: "皎平渡", ready: true,
    walk: { day: 206, li: 10600, alt: 1200 },
    q: "为什么渡江改变了追堵态势？", shot: "夜，宽江，七只船，岸上等船的人" },
  { id: "node-06c", seq: 18, line: "side", hang: "node-06", title: "皎平渡 · 船工", date: "1935.5.4", place: "禄劝 / 皎平渡口", ready: true,
    walk: { day: 207, li: 10700, alt: 1100 },
    who: "船工 · 三十六七个人",
    q: "三万人过江，撑船的是谁？", shot: "拂晓沙滩，木船，竹篙，火堆，岸上黑压压坐满人" },
  { id: "node-06a", seq: 19, line: "main", title: "彝海结盟", date: "1935.5.22", place: "冕宁 / 彝海", ready: true,
    walk: { day: 225, li: 12200, alt: 2200 },
    q: "为什么必须结盟才能过去？", shot: "高山湖，松林，湖边两个人" },
  { id: "node-06d", seq: 20, line: "side", hang: "node-06a", title: "彝海 · 护旗", date: "1935.5 — 1950", place: "冕宁 / 彝海", ready: true,
    walk: { custom: "十五年后　·　同一片山地" },
    who: "守旗的一家人",
    q: "一面旗，为什么要藏十五年？", shot: "火塘，木箱，一个背影把一块布收进箱底" },
  { id: "node-06b", seq: 21, line: "main", title: "安顺场 · 强渡大渡河", date: "1935.5.25", place: "石棉 / 安顺场", ready: true,
    walk: { day: 228, li: 13000, alt: 900 },
    q: "一条船，为什么不够？", shot: "急流，一条木船，对岸的碉堡" },
  { id: "node-07", seq: 22, line: "main", title: "飞夺泸定桥", date: "1935.5.29", place: "泸定", ready: true,
    walk: { day: 232, li: 13700, alt: 1300 },
    q: "为什么必须区分两个连续事件？", shot: "铁索，抽走的桥板，下午四点的西晒" },
  { id: "node-08", seq: 23, line: "main", title: "翻越夹金山", date: "1935.6.12", place: "宝兴 / 夹金山", ready: true,
    walk: { day: 246, li: 14700, alt: 4114 },
    q: "雪山难在哪里？", shot: "雪线以上，喘息，结冰的绑腿" },
  { id: "node-08a", seq: 24, line: "main", title: "懋功会师", date: "1935.6.18", place: "小金 / 达维", ready: true,
    walk: { day: 252, li: 15200, alt: 2700 },
    q: "会师为什么不是终点？", shot: "达维桥，两支部队，两种样子" },
  { id: "node-08b", seq: 25, line: "main", title: "过草地", date: "1935.8.21", place: "松潘草地", ready: true,
    walk: { day: 316, li: 18500, alt: 3500 },
    q: "最怕的不是打仗，那是什么？", shot: "黑水，草甸，踩下去不回弹" },
  { id: "node-08p", seq: 26, line: "side", hang: "node-08b", title: "草地 · 半截皮带", date: "1935.8 — 1936", place: "松潘 / 草地", ready: true,
    walk: { custom: "一年后　·　同一片草地" },
    who: "一个战士 · 周国才",
    q: "饿到吃皮带的时候，为什么还留下半截？", shot: "牛粪火，铁皮缸子，煮着的皮带，一圈背影" },
  { id: "node-08q", seq: 27, line: "side", hang: "node-08b", title: "草地 · 手摇发电机", date: "1935.8", place: "松潘 / 草地", ready: true,
    walk: { day: 322, li: 18900, alt: 3400 },
    who: "谢宝金 · 背机器的人",
    q: "六十八公斤的机器，为什么不能丢？", shot: "阴天草甸，水洼，一个人背着木箱走在泥里" },
  { id: "node-09a", seq: 28, line: "main", title: "腊子口", date: "1935.9.17", place: "迭部 / 腊子口", ready: true,
    walk: { day: 343, li: 20800, alt: 2000 },
    q: "只有一条路的时候怎么办？", shot: "夜，隘口，崖壁，仰攻的梯队" },
  { id: "node-09s", seq: 29, line: "side", hang: "node-09a", title: "腊子口 · 云贵川", date: "1935.9.17 · 夜", place: "迭部 / 腊子口", ready: true,
    walk: { day: 343, li: 20800, alt: 2100 },
    who: "十七岁 · 真名不详",
    q: "一个没有留下姓名的人，怎么被记住？", shot: "崖壁，少年赤脚攀爬，腰上一根麻绳" },
  { id: "node-09b", seq: 30, line: "main", title: "哈达铺 · 榜罗镇", date: "1935.9.18", place: "宕昌 / 哈达铺", ready: true,
    walk: { day: 344, li: 21000, alt: 2200 },
    q: "目的地是什么时候定下来的？", shot: "街，邮政代办所，一份报纸" },
  { id: "node-09", seq: 31, line: "main", title: "吴起镇", date: "1935.10.19", place: "吴起镇", ready: true,
    walk: { day: 375, li: 25000, alt: 1300 },
    q: "走到这里，算不算走完？", shot: "黄土塬，窑洞，风，旗子" }
];

/* 并入节点表，并按路线回写 seq / line / hang / walk */
(function () {
  window.RS_NODES = (window.RS_NODES || []).concat(window.RS_EXTRA3 || []);
  var byId = {};
  window.RS_NODES.forEach(function (n) { byId[n.id] = n; });
  window.RS_ROUTE.forEach(function (r, i) {
    r.seq = i + 1;
    var n = byId[r.id];
    if (!n) return;
    n.seq = i + 1;
    n.line = r.line;
    n.hang = r.hang || null;
    if (r.walk) n.walk = r.walk;
    if (r.who) n.who = r.who;
  });
})();
