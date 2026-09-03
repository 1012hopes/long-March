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

