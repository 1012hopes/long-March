# 节点地图场景与渐进地形实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让节点学习地图打开后立即呈现清晰的山河地形、当前路线和历史地理标注，并在在线 DEM 就绪后渐进增强为真 3D。

**Architecture:** 基础样式只加载本地离线地形和核心地图数据；节点场景配置负责取景、路线强调和地理标注；在线 DEM 与细等高线在首屏可交互后按需加载。右侧节点学习区改为桌面双栏编辑版式，复用已有内容与来源。

**Tech Stack:** React 18, TypeScript, Vite, MapLibre GL 5, Node.js preprocessing, PNGJS, GeoJSON.

**Spec:** `docs/superpowers/specs/2026-09-03-node-map-terrain-design.md`

## Global Constraints

- 不增加新依赖。
- 不虚构逐日路线、渡口或山河坐标；所有节点标注必须带现有 `sourceIds`。
- 无网络时必须保留完整的节点学习主流程。
- 未经地图与版权审核的数据不能作为公开发布底图。
- 继续使用纸面档案与历史地理图志视觉语言。
- 视觉评分低于 90 分不得完成对应视觉任务。
- 每个阶段通过测试、构建和截图验收后再进入下一阶段。

---

## 完成清单总览

- [ ] A. 锁定性能基线与地形加载行为
- [ ] B. 接入本地离线高程设色和山体阴影
- [ ] C. 延迟加载全局等高线与在线 DEM
- [ ] D. 建立九节点地图场景数据结构
- [ ] E. 实现节点路线强调和历史地理标注
- [ ] F. 生成九份高分辨率节点地形裁切
- [ ] G. 强化关键河流、渡口和山地表达
- [ ] H. 实现在线真 3D 渐进增强
- [ ] I. 重排节点学习右侧内容版式
- [ ] J. 完成性能、离线、无障碍和视觉验收

## 验收标准

- [ ] 断网打开自由地图和节点学习时，本地地形、河流、路线和节点均可见。
- [ ] 节点学习打开后 1 秒内出现本地地形视觉，不等待 AWS DEM。
- [ ] 基础地图初始化不请求在线 DEM；只有节点预取或用户开启 3D 时请求。
- [ ] 390×844、1440×900、1920×1080 均无横向溢出。
- [ ] 九个节点都有 `NodeMapScene`，每个场景至少一个重点路线段和两个有效标注。
- [ ] 每个标注至少关联一个有效来源 ID，约略位置明确显示精度。
- [ ] 当前路线、上下文路线、河流和山地具有清晰但克制的视觉层级。
- [ ] 3D 加载失败不会出现空白地图，且主流程仍可操作。
- [ ] 首屏不解析 50m 与 100m 全局等高线文件。
- [ ] 节点学习右侧在桌面充分使用空间，手机保持单栏阅读。
- [ ] `prefers-reduced-motion` 下功能完整。
- [ ] 最终视觉复核达到 90/100 以上。

---

### Task 1: 建立加载与性能基线

**Files:**
- Create: `app/scripts/map-loading.test.mjs`
- Modify: `app/package.json`
- Create: `docs/superpowers/plans/2026-09-03-node-map-terrain-qa.md`

**Interfaces:**
- Produce `npm run test:loading`。
- Produce首屏请求、资源体积和离线表现基线记录。

- [ ] 记录当前本地地形、等高线和 GeoJSON 文件体积。
- [ ] 写失败测试，断言基础样式不得默认包含两个在线 `raster-dem` source。
- [ ] 写失败测试，断言本地 `terrain-tint.png` 与 `hillshade.png` 必须进入基础样式。
- [ ] 使用 Playwright/Edge 记录 390、1440、1920 三档首屏截图与请求列表。
- [ ] 将当前结果写入 QA 文件，作为后续对比基线。

Run: `npm run test:loading`

Expected: 新约束在实现前 FAIL，现有测试保持 PASS。

### Task 2: 接入本地离线地形首屏

**Files:**
- Modify: `app/src/map/style.ts:22-190`
- Modify: `app/src/map/MapCanvas.tsx:110-180`
- Modify: `app/scripts/map-loading.test.mjs`

**Interfaces:**
- `buildStyle(hillshade: HillshadeBbox | null)` 在元数据存在时创建 `image` sources：`offlineTerrainTint`、`offlineHillshade`。
- 本地图层 ID：`offline-terrain-color`、`offline-terrain-relief`。

- [ ] 使用 `hillshade-bbox.json` 的四角坐标接入两个本地 PNG。
- [ ] 在陆地层之上、水系和路线之下渲染高程设色与阴影。
- [ ] 将本地阴影视觉强度校准到约 0.32–0.42 的等效效果。
- [ ] 本地资源缺失时自动回退纸面底图，不抛出阻断错误。
- [ ] 断网运行截图，确认山河层次仍可见。

Run: `npm run test:loading && npm run build`

Expected: PASS；网络面板中没有基础 DEM 请求。

### Task 3: 将重资源移出首屏

**Files:**
- Create: `app/src/map/terrainRuntime.ts`
- Modify: `app/src/map/style.ts`
- Modify: `app/src/map/MapCanvas.tsx`
- Modify: `app/scripts/map-loading.test.mjs`

**Interfaces:**
- `ensureMajorContours(map): Promise<void>`：加载 200m 等高线和标签。
- `ensureDetailContours(map, zoom): Promise<void>`：仅在详细缩放加载 100m/50m 数据。
- `ensureOnlineTerrain(map): Promise<"ready" | "offline">`：按需添加在线 DEM。

- [ ] 从基础 `buildStyle()` 移除 50m、100m 等高线 source。
- [ ] 地图首次可交互后再添加 200m 主要等高线。
- [ ] 缩放达到约 7.2/8.5 后分别加载 100m/50m 数据。
- [ ] 从基础样式移除在线 `terrainDem` 与 `terrainColorDem`。
- [ ] 记录首屏传输与解析资源减少量。

Run: `npm run test:loading && npm run test:stories && npm run build`

Expected: 首屏请求中没有细等高线与在线 DEM。

### Task 4: 建立节点地图场景台账

**Files:**
- Create: `app/src/data/nodeScenes.ts`
- Create: `app/scripts/node-scenes.test.mjs`
- Modify: `app/package.json`

**Interfaces:**
- Export `NodeMapScene`、`NodeSceneAnnotationKind`、`nodeScenes`、`sceneForNode(nodeId)`。

- [ ] 按设计规格实现类型和查询函数。
- [ ] 先完成 node-01、node-05、node-07、node-08 四种代表场景。
- [ ] 补齐其余五个节点。
- [ ] 校验九个 node ID 唯一且与 `nodes.ts` 一一对应。
- [ ] 校验路线段 ID、来源 ID、坐标范围和标注精度有效。
- [ ] 对每条山河、渡口和方向标注进行人工史料复核。

Run: `npm run test:scenes`

Expected: 9/9 场景完整，0 个失效引用。

### Task 5: 实现节点专属路线与标注层

**Files:**
- Create: `app/src/map/nodeScenePresentation.ts`
- Modify: `app/src/map/MapCanvas.tsx`
- Modify: `app/src/App.tsx`
- Modify: `app/src/styles.css`
- Test: `app/scripts/node-scenes.test.mjs`

**Interfaces:**
- `applyNodeScene(map, scene): void`。
- `clearNodeScene(map): void`。
- `NodeSceneCartouche` 显示地点、日期、精度和地图阅读提示。

- [ ] 节点学习时当前段保持路线红，上下文段降低至 18–30% 对比度。
- [ ] 显示起点、终点、渡口、会议、方向、河流与山地标注。
- [ ] 标注区分“史料明确”和“约略位置”。
- [ ] 地图取景使用 `scene.focusBounds`，让路线与地形占据主要画面。
- [ ] 退出节点学习时恢复全部路线和普通地图标记。
- [ ] 减少动态模式下立即完成取景与图层切换。

Run: `npm run test:scenes && npm run test:learning && npm run build`

Expected: node-01、05、07、08 截图中均能直接识别本节点的路线问题。

### Task 6: 生成九节点高分辨率地形裁切

**Files:**
- Modify: `app/scripts/build-terrain.mjs`
- Create: `app/public/terrain/nodes/manifest.json`
- Create outputs: `app/public/terrain/nodes/node-01-*.png` 至 `node-09-*.png`
- Modify: `app/scripts/map-loading.test.mjs`

**Interfaces:**
- Manifest记录每个节点的 bbox、生成日期、DEM 来源、分辨率和文件名。

- [ ] 根据 `nodeScenes.focusBounds` 生成带安全边距的地形裁切。
- [ ] 使用比全局图更高的采样级别，并复用 `.terrain-cache`。
- [ ] 输出 tint 与 hillshade 两张图，单节点总量目标不超过 1.5MB。
- [ ] 河谷节点提高侧向阴影，高山节点控制夸张避免失真。
- [ ] MapCanvas 进入节点时替换为局部高分辨率图，退出后恢复全局图。
- [ ] 记录九节点总资源体积和生成耗时。

Run: `npm run terrain && npm run test:loading && npm run build`

Expected: 九节点文件齐全、manifest 可解析、无在线请求也可显示局部地形。

### Task 7: 强化关键水系与山地表达

**Files:**
- Create: `app/src/data/nodeHydrography.ts` 或生成的 `app/public/geo/node-hydrography.geojson`
- Modify: `app/src/map/style.ts`
- Modify: `app/src/map/MapCanvas.tsx`
- Test: `app/scripts/node-scenes.test.mjs`

- [ ] 从现有水系数据裁切节点局部河流，不手工猜测河道形状。
- [ ] 为于都河、湘江、乌江、赤水河、金沙江和大渡河建立来源关联。
- [ ] 当前相关河流使用更清楚的证据蓝线宽，其他水系降低对比度。
- [ ] 在跨河点增加“渡”语义标记，约略渡口使用虚线环。
- [ ] 为夹金山、云贵高原等相关地貌增加克制的山地标注。
- [ ] 检查文字不遮挡当前路线和关键节点。

Run: `npm run test:scenes && npm run build`

Expected: 六类关键河流均能在对应节点场景中识别。

### Task 8: 实现真 3D 渐进增强

**Files:**
- Modify: `app/src/map/terrainRuntime.ts`
- Modify: `app/src/map/MapCanvas.tsx`
- Modify: `app/src/App.tsx`
- Modify: `app/src/components/TopBar.tsx`
- Modify: `app/src/styles.css`
- Test: `app/scripts/map-loading.test.mjs`

**Interfaces:**
- `terrainStatus: "local" | "loading" | "ready" | "offline"`。
- 3D 按钮根据状态显示清晰文案和 `aria-live` 反馈。

- [ ] 节点首屏完成后后台预取当前视口 DEM。
- [ ] 用户开启 3D 时，如未就绪则显示“加载中”，本地地形继续显示。
- [ ] DEM 就绪后使用 38–45° pitch 和节点地形模式对应的 exaggeration。
- [ ] 关闭 3D 后平滑回到二维节点场景，但不重置地图时间和选择状态。
- [ ] 网络失败时状态切换为“离线”，按钮可重试。
- [ ] 减少动态模式使用 0ms 相机和地形切换。

Run: `npm run test:loading && npm run test:map && npm run build`

Expected: 慢网和断网下不会出现空白地图或不可关闭加载状态。

### Task 9: 丰富节点学习右侧版面

**Files:**
- Modify: `app/src/components/RightPanel.tsx`
- Create: `app/src/components/NodeEvidenceRail.tsx`
- Modify: `app/src/layout/rightPanelPresentation.ts`
- Modify: `app/src/styles.css`
- Test: `app/scripts/learning-focus.test.mjs`

- [ ] 桌面节点页标题横跨内容区。
- [ ] 标题下形成主叙事栏与证据侧栏。
- [ ] 主栏显示简明/深入正文、核心问题和五问。
- [ ] 侧栏复用现有标签内容、路线精度、相关故事和史料入口。
- [ ] 内容较少的节点也保持版面平衡，不使用无意义占位卡。
- [ ] 手机端回落为单栏，不保留桌面侧栏宽度。
- [ ] 地图展签与右侧证据侧栏使用一致的标签和颜色语言。

Run: `npm run test:learning && npm run build`

Expected: 1440/1920 节点页无大面积无功能空白，390px 正文无裁切。

### Task 10: 全面验收与文档同步

**Files:**
- Modify: `docs/05-地图与GIS数据方案.md`
- Modify: `docs/07-技术可行性与Spike清单.md`
- Modify: `docs/16-全屏地图与可收缩面板.md`
- Modify: `docs/11-当前门禁状态.md`
- Modify: `docs/superpowers/plans/2026-09-03-node-map-terrain-qa.md`

- [ ] 断网刷新并走完节点学习、故事、史料和返回地图流程。
- [ ] Fast 3G/Slow 3G 下检查本地地形先于在线 DEM 出现。
- [ ] 检查 390×844、1280×720、1440×900、1920×1080。
- [ ] 检查键盘、触摸、屏幕阅读器状态提示和减少动态。
- [ ] 对 node-01、05、07、08 做重点截图评审，再抽查其余节点。
- [ ] 每轮使用视觉评审，最终分数必须 ≥90。
- [ ] 运行完整测试、构建、准备包校验、对比度和依赖审计。
- [ ] 更新地图技术栈、离线降级和在线 DEM 说明，但不误改正式开发 NO GO 状态。

Run:

```text
npm run test:loading
npm run test:scenes
npm run test:timeline
npm run test:map
npm run test:markers
npm run test:learning
npm run test:stories
npm run build
node scripts/validate-prep.mjs
node app/scripts/contrast-audit.mjs
npm audit --omit=dev --audit-level=high
```

Expected: 全部退出码 0；视觉评审 ≥90；QA 文件只声明有证据支持的结果。

## 视觉评分提升工作流

本工作流不新增一套重复实现任务，而是作为 Task 5、7、9、10 的视觉验收清单。每完成一个视觉阶段，必须截图、评分、修正后才能进入下一阶段。

### 评分模型

| 维度 | 权重 | 通过标准 |
| --- | ---: | --- |
| 当前节点与叙事焦点 | 25 | 3 秒内能指出当前地点、时间和路线问题 |
| 地形、河流与路线可读性 | 20 | 不看正文也能辨认主要山河关系 |
| 版式、密度与留白 | 20 | 无无意义大片空白，无信息拥挤 |
| 地图与内容视觉一致性 | 15 | 标签、颜色、线宽和边框属于同一系统 |
| 动效节奏 | 10 | 任意时刻最多一个主要运动焦点 |
| 移动端与无障碍 | 10 | 390px 无裁切，减少动态仍保持层级 |

视觉完成条件：总分 ≥90，任一单项不得低于 85%，且不得出现横向溢出、正文裁切、空白地图或不可关闭的加载状态。

### V1: 建立固定截图基线

**依赖:** Task 1

- [ ] 保存 1440×900 自由地图截图。
- [ ] 保存 1440×900 node-01 节点学习截图。
- [ ] 保存 1440×900 node-05 争议路线节点截图。
- [ ] 保存 1440×900 node-08 高山节点截图。
- [ ] 保存 390×844 自由地图、节点学习和时间抽屉截图。
- [ ] 保存 1280×720 投影尺寸截图。
- [ ] 每张截图记录 viewport、URL hash、网络状态和 3D 状态。
- [ ] 将第一次评分写入 QA 文件，禁止只保存“最好看的一张”。

### V2: 强化当前节点焦点

**依赖:** Task 5

- [ ] 当前节点始终使用唯一的实心路线红标记。
- [ ] 当前节点增加细外环或短引线，但不使用持续闪烁。
- [ ] 当前路线段保持 100% 对比度，上下文路线控制在 18–30%。
- [ ] 前方尚未讨论路线不得与当前段使用同等红色权重。
- [ ] 地图展签显示“当前节点 NN / 09”、时间和精度。
- [ ] 地图取景将当前路线放在视觉三分点，而非机械正中央。
- [ ] 节点名称与对应河流/山地标签不发生遮挡。
- [ ] 3 秒识别测试中，5 人至少 4 人能指出当前节点与行军方向。

### V3: 让地图成为节点叙事场景

**依赖:** Task 5、6、7

- [ ] 每个节点只保留一个主路线焦点和最多两个次级地理焦点。
- [ ] node-01 显示瑞金、于都、于都河与向西转移方向。
- [ ] node-02 显示湘江、主要渡河区域和路线穿越关系。
- [ ] node-03 显示通道、黎平、猴场和转兵方向链。
- [ ] node-05 显示四次渡河次序及并列候选路线。
- [ ] node-06 显示金沙江与关键渡河关系。
- [ ] node-07 显示大渡河、安顺场和泸定桥的空间关系。
- [ ] node-08 显示夹金山、高程变化和会师方向。
- [ ] node-09 显示北上方向、陕北落脚点与总史尾声边界。
- [ ] 河流名称沿水系方向排列，不使用普通水平卡片覆盖河道。
- [ ] 路线方向箭头数量受控，同一画面不超过 3 个。
- [ ] 地形纹理不得压过路线红和证据蓝。

### V4: 重排右侧编辑版式

**依赖:** Task 9

- [ ] 桌面标题、日期、精度横跨内容区，成为第一视觉层。
- [ ] 主叙事栏宽度适合 17px 正文阅读，每行约 28–40 个汉字。
- [ ] 证据侧栏宽度控制在内容区的 28–34%。
- [ ] 证据侧栏显示路线性质、事实/解释/还原线索、故事和史料入口。
- [ ] 内容较少的节点使用版面比例和留白平衡，不增加空装饰卡。
- [ ] “简明 / 深入”切换不改变整个页面宽度和地图视角。
- [ ] 上一站、下一站与史料入口形成稳定底部导航区。
- [ ] 390px 下恢复单栏，标题、正文、问题和按钮均完整换行。
- [ ] 右侧内容高度不足一屏时，视觉重心位于上半部三分之一至三分之二之间。

### V5: 建立地图与正文联动

**依赖:** Task 5、9

- [ ] 聚焦“这一站”正文时强调当前路线段。
- [ ] 聚焦地形解释时增强局部地形与相关山河标注。
- [ ] 聚焦史料入口时显示标注所关联的来源 ID 或证据状态。
- [ ] 鼠标、键盘和触摸均可触发联动，不能只依赖 hover。
- [ ] 联动只改变强调层，不重新创建地图或重置相机。
- [ ] 离开正文块后恢复节点基础场景，而不是恢复全路线总览。
- [ ] 减少动态模式下联动立即切换，不使用淡入或相机移动。
- [ ] 同一时刻地图最多高亮一个正文对应对象。

### V6: 降低底栏视觉噪声

**依赖:** Task 9、10

- [ ] 一级信息只包含当前时点、播放状态和时间拖动。
- [ ] 二级信息包含当前路线段和精度。
- [ ] 三级信息包含海拔、旁白、环境声和剖面入口。
- [ ] 三级工具不得与当前时间使用相同字号、颜色和边框权重。
- [ ] 桌面底栏在 1440px 下保持单一阅读顺序，不出现多个等权重视觉中心。
- [ ] 手机底栏所有按钮完整显示，不使用隐藏滚动条掩盖裁切。
- [ ] 手机时间抽屉打开后，底栏不得与抽屉争抢点击区域。
- [ ] 底栏高度变化不能导致地图当前节点跳动。

### V7: 建立一个项目记忆点

**依赖:** Task 5、7、9

- [ ] 选定“红色行军铅笔线 + 档案展签”为唯一核心视觉语言。
- [ ] 路线红线保留轻微手工质感，但不使用随机抖动影响坐标准确性。
- [ ] 地图展签、证据侧栏和时间线使用同一编号、引线与边框规则。
- [ ] 事实、解释、还原继续使用既有色彩语义，不新增第四套装饰色。
- [ ] 全页面胶囊形控件数量受控，仅用于短状态，不用于普通容器。
- [ ] 不引入科技蓝光、玻璃霓虹、游戏徽章或持续粒子效果。

### V8: 统一动效编排

**依赖:** Task 5、8、9

- [ ] 节点打开顺序固定为：地图取景 → 路线强调 → 地理标注 → 内容出现。
- [ ] 地图取景约 1200–1600ms，路线强调约 700–1000ms，内容淡入约 160–220ms。
- [ ] 在线 3D 就绪不自动抬升，必须由用户主动开启。
- [ ] 2D → 3D 过程中路线、河流和标注保持可读。
- [ ] 用户拖动地图后，自动镜头不会立即夺回控制权。
- [ ] 任意时刻最多一个高对比运动焦点。
- [ ] 所有动画具有 `prefers-reduced-motion` 即时降级。
- [ ] 动画结束后画面有明确停稳状态，不保持缓慢漂移。

### V9: 最终视觉评分循环

**依赖:** Task 10

- [ ] 使用 V1 的固定截图状态重新截图，禁止更换有利视角规避问题。
- [ ] 独立视觉评审输出 0–100 分、差异和下一轮修改建议。
- [ ] 分数低于 90 时继续修改并重新截图。
- [ ] 横向溢出、正文裁切、地图空白任一出现时直接判定 revise。
- [ ] node-01、05、08 必须分别代表河谷、复杂路线和高山三类场景通过。
- [ ] 手机节点页、手机地图页和手机时间抽屉必须分别通过。
- [ ] 最终 QA 记录视觉分数、截图路径、网络条件和未验证真机项。
- [ ] 视觉评审通过后再进行最终代码复核和完整测试。

## 视觉禁止清单

- [ ] 不用大面积路线红填满地形或面板。
- [ ] 不用九个等权重高亮点同时抢焦点。
- [ ] 不为了填满右侧而创建没有信息价值的卡片。
- [ ] 不用持续脉冲、闪烁、漂浮或自动循环镜头。
- [ ] 不让细等高线覆盖河流、路线和正文标注。
- [ ] 不让 3D 加载状态遮挡本地 2.5D 地图。
- [ ] 不把桌面双栏机械压缩成手机双栏。
- [ ] 不使用未授权图片作为视觉评分捷径。

## 推荐执行顺序

严格按照 Task 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10 执行。

最先交付的可见收益应出现在 Task 2：即使后续节点标注和真 3D 尚未完成，地图也必须先实现“打开立即有地形”。

## 主要风险

| 风险 | 缓解方式 |
| --- | --- |
| 本地地形在节点放大后模糊 | Task 6 生成九份高分辨率节点裁切 |
| 九节点素材体积过大 | 单节点目标 ≤1.5MB，总量控制并按节点懒加载 |
| 在线 DEM 仍然缓慢 | 本地 2.5D 永远先显示，真 3D 不阻塞主流程 |
| 河流或渡口坐标过度精确 | 标注携带来源与 certainty，约略位置使用不同符号 |
| 山体阴影过强影响正文与路线 | 每轮截图评审，路线红和河流蓝优先于地形纹理 |
| 右侧为了填满而堆砌内容 | 只复用现有审核字段，不增加装饰性空卡 |
| 全局等高线仍拖慢解析 | 从基础样式移除并按缩放/节点动态加载 |
| 地图合规状态被误解 | 文档持续保留公开发布 NO GO 与审图要求 |

## Definition of Done

- [ ] 节点地图无需网络即可立即呈现清晰地形。
- [ ] 九节点路线、山河与历史地理标注完整且可追溯。
- [ ] 在线 3D 是增强层而非启动依赖。
- [ ] 左右分屏均有明确功能和视觉重心。
- [ ] 所有测试、构建、校验与视觉门槛通过。
- [ ] 低性能真机与投影测试结果被如实记录。
