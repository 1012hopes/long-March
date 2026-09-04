# 节点地图场景与渐进地形 QA 基线

日期：2026-09-03

## Task 1 范围

- 建立地形加载与性能基线，不实现 Task 2-3 的样式迁移或懒加载逻辑。
- 用可提交的测试记录“当前状态”和“未来验收契约”。
- 记录本地地形、等高线与 GeoJSON 资源体积，供后续首屏请求与离线表现对比。

## 当前证据

- `app/src/map/style.ts` 仍在基础样式中声明两个在线 `raster-dem` source：`terrainDem` 与 `terrainColorDem`。
- 两个在线 source 当前都请求 `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png`。
- 本地离线地形产物 `terrain-tint.png` 与 `hillshade.png` 已存在，但基础样式尚未引用这两个 PNG。
- `app/scripts/map-loading.test.mjs` 将上述两条事实作为当前基线断言，并用 `test.todo(...)` 记录后续 Task 2-3 必须满足的目标契约。

## 未来验收契约

- 基础样式不得永久依赖两个在线 `raster-dem` source。
- `terrain-tint.png` 与 `hillshade.png` 必须进入基础样式，成为离线可用的默认地形视觉。

## 本地资源体积基线

| 资源 | 大小（bytes） | 约合 |
| --- | ---: | ---: |
| `app/public/terrain/terrain-tint.png` | 1,885,070 | 1.80 MiB |
| `app/public/terrain/hillshade.png` | 828,988 | 0.79 MiB |
| `app/public/terrain/contour-200.geojson` | 2,927,094 | 2.79 MiB |
| `app/public/terrain/contour-100.geojson` | 2,063,411 | 1.97 MiB |
| `app/public/terrain/contour-50.geojson` | 3,079,571 | 2.94 MiB |
| `app/public/terrain/contour-labels.geojson` | 2,489 | <0.01 MiB |
| `app/public/geo/land.json` | 416,192 | 0.40 MiB |
| `app/public/geo/rivers.json` | 56,868 | 0.05 MiB |
| `app/public/geo/lakes.json` | 22,388 | 0.02 MiB |

## 截图与请求捕获基线说明

Task 1 未新增浏览器自动化依赖，因此本轮只固化可复用的手工捕获流程，不提交生成截图。

1. 在 `app/` 目录运行 `npm install`（如尚未安装）与 `npm run dev -- --host 0.0.0.0`。
2. 用 Edge 打开本地页面，分别切换到 `390x844`、`1440x900`、`1920x1080` 三档视口。
3. 在 DevTools Network 面板启用 `Preserve log`，刷新页面，导出 HAR 或记录首屏请求列表。
4. 断网后再次刷新，确认节点学习主流程仍可进入，并记录此时是否出现空白地形。
5. 保存截图时记录：viewport、是否断网、是否开启 3D、页面 hash、时间点。

## Task 2-3 对比重点

- 基础样式中的在线 `raster-dem` source 数量是否从 `2` 降为 `0`。
- 基础样式是否开始引用 `terrain-tint.png` 与 `hillshade.png`。
- 首屏请求是否移除基础 DEM 请求。
- 首屏是否仍然解析 `contour-100.geojson` / `contour-50.geojson`。

## Task 2 结果（离线地形首屏）

- `app/src/map/style.ts` 现在只在首屏前读取 `hillshade-bbox.json`；若 bbox 可用，则创建两个 `image` source：`offlineTerrainTint`、`offlineHillshade`。
- 影像坐标按 MapLibre `[[west,north],[east,north],[east,south],[west,south]]` 顺序生成，并由 `app/scripts/map-loading.test.mjs` 直接断言。
- 基础样式新增 `offline-terrain-color` 与 `offline-terrain-relief` 两个 `raster` layer，位置在 `land-fill` 之上、`coastline-overlay` / 等高线 / 水系 / 路线之下。
- 本地 relief 当前使用 `raster-opacity: 0.38`，tint 使用 `raster-opacity: 0.34`，保持路线红与河流蓝仍是视觉主层。
- 若 bbox 不存在，基础样式不创建离线 terrain source/layer，而是保留原有在线 `global-terrain-color` 与 `terrain-relief` 作为 Task 2 的回退路径。
- 若 bbox 存在但后续本地 PNG 404，MapLibre 直接按已有图层栈显示纸面底图，不会因为预探测而延迟初始化或重复下载图片。
- `MAP_LAYER_IDS.terrain` 现在同时覆盖离线与在线 terrain layer ID，现有显隐控制可兼容两种路径。

## Task 2 验证证据

- `npm run test:loading`：PASS（4 个断言通过，1 个 Task 3 TODO 保留）。
- `npm run test:stories`：PASS（8 个断言通过）。
- `npm run test:map`：PASS（2 个断言通过）。
- `npm run build`：PASS（`tsc -b && vite build` 成功，产物 `dist/assets/index-DNGvmrT_.js` gzip 392.83 kB）。
- `git diff --check`：PASS（无空白错误；仅有 Git 的 LF→CRLF 提示）。

## Task 3 结果（重资源移出首屏）

- `app/src/map/style.ts` 不再在 `buildStyle()` 中声明 `terrainDem`、`terrainColorDem`、`contourMajor`、`contourMid`、`contourFine`；当本地 bbox 缺失时，首屏只保留纸面底图、水系与路线。
- 新增 `app/src/map/terrainRuntime.ts`，集中提供 `ensureMajorContours()`、`ensureDetailContours()`、`ensureOnlineTerrain()`、`cancelOnlineTerrain()` 与 `loadContourLabels()`；等高线运行时按阈值注入，在线 DEM 仅在 3D 切换时按需创建。
- `ensureMajorContours()` 负责 200 米等高线；`ensureDetailContours()` 仅在 `zoom >= 7.2` 时加入 100 米、`zoom >= 8.5` 时加入 50 米，重复调用不会重复注册 source/layer。
- `MapCanvas` 现在在 `style.load` 后继续初始化节点与故事，但把 200 米等高线和高程标注推迟到 `idle` 或 900ms 兜底定时器之后，再按当前缩放补齐 100/50 米等高线。
- 3D 切换改为先 `await ensureOnlineTerrain()`；若在线 DEM 超时或报错，函数返回 `offline`，React 侧只显示既有离线提示，不再依赖首屏默认在线 terrain source。
- `cancelOnlineTerrain()` 会同步清除待决 `setTimeout`、注销 `sourcedata` / `error` 监听，并把 helper 的待决 promise 结算为 `offline`；`MapCanvas` 在 3D effect 清理和地图卸载前都会显式调用它，避免移除后的延迟回调再触碰旧 map。
- 图层显隐逻辑继续复用 `MAP_LAYER_IDS`，运行时新增的 `contour-major` / `contour-mid` / `contour-fine` 会立刻套用当前“等高线”开关状态；高程标注 DOM marker 也继续受“等高线 + 地名山系”双开关控制。

## Task 3 请求/加载顺序

1. 首屏仅预探测 `terrain/hillshade-bbox.json`。
2. 若 bbox 存在，底图立即使用 `terrain-tint.png` 与 `hillshade.png` 两个离线 `image` source。
3. 地图进入 `style.load` 后先完成节点、故事、地理标签与交互绑定。
4. 地图 `idle`（或 900ms 兜底）后，运行时再挂载 `contour-200.geojson` 与 `contour-labels.geojson`。
5. 用户缩放到 `7.2` / `8.5` 以上时，运行时分别补挂 `contour-100.geojson` / `contour-50.geojson`。
6. 只有用户开启 3D 时，才按需创建在线 `terrainDem` source 并等待其成功或离线超时结果。
7. 若用户在该等待阶段关闭 3D 或地图被卸载，`cancelOnlineTerrain()` 会立即清理 helper 自己持有的 timer / listener，并把待决结果安全落成 `offline`。

## Task 3 验证证据

- `npm run test:loading`：PASS（11 个断言通过，覆盖首屏 source 移除、运行时阈值、在线 DEM 超时、显式取消以及移除后安全性）。
- `npm run test:stories`：PASS（8 个断言通过，契约更新为运行时 contour/DEM 挂载）。
- `npm run test:map`：PASS（2 个断言通过）。
- `npm run test:timeline`：PASS（13 个断言通过）。
- `npm run build`：PASS（`tsc -b && vite build` 成功，产物 `dist/assets/index-QAtMZVbu.js` gzip 393.46 kB）。
- `git diff --check`：PASS（无空白错误；仅有 Git 的 LF→CRLF 提示）。

## Task 4 结果（九节点地图场景台账）

- 新增 `app/src/data/nodeScenes.ts`，导出 `NodeSceneAnnotationKind`、`NodeMapScene`、`nodeScenes` 与 `sceneForNode()`，总计 9 条场景记录，与 `nodes.ts` 九个教学节点一一对应。
- 每条场景都包含至少 1 个 `highlightedSegmentIds`、至少 2 条标注，并为后续 Task 5 预留了 `contextSegmentIds`、`terrainMode` 和局部 `focusBounds`。
- `focusBounds` 未手填假精度坐标，而是由现有节点锚点、次级地点、故事点位和既有路线几何点外扩生成，并钳制在长征路线总范围内。
- 确认类标注只复用现有可追溯点位：节点锚点、`secondary` 坐标或 `stories.json` 中的故事位置；约略类标注也必须复用现有 `nodes.ts`、`stories.json` 或 `route-geometry.json` 的精确点位，不再允许手填“接近但不一致”的坐标。
- 地形模式当前按教学意图落位：`node-01/02/05/06/07` 为 `river-valley`，`node-03/08` 为 `mountain`，`node-04` 为 `plain`，`node-09` 为 `plateau`。
- `scene-node-04-river-wu` 现复用 `seg-03` 既有路线点，`scene-node-05-river-chishui` 复用 `node-05` 的 `太平渡` 次级地点，`scene-node-07-direction-river` 复用 `seg-06` 河谷路线点，修复了先前 3 个未对齐的近似坐标。
- 新增 `app/scripts/node-scenes.test.mjs` 直接导入真实场景数据，验证九节点覆盖、`sceneForNode()` 查询、边界合法性、segment/source 引用有效性、全局唯一 annotation ID、确认标注必须命中 node/story 点、约略标注必须命中 node/story/route 点，以及标签长度约束。
- 为了让 Node 测试路径与浏览器构建路径保持一致，`app/src/data/stories.ts` 的 JSON 导入改为显式 `with { type: "json" }`；`nodeScenes.ts` 也使用同样写法。

## Task 4 仍需人工复核的点

- `node-02` 的“湘江 / 西进突围”与 `node-04` 的“乌江 / 回师赤水”虽然已全部绑定到现有 node/route 点，但这些点仍是教学级展签位置，后续如进入公开发布底图，仍建议 GIS 人工确认最佳摆放。
- `node-05`、`node-07` 的河谷与行军方向标签已改为复用 `太平渡` / `seg-06` 等现有精确点位，但“哪一个现有点最适合承担河名或方向说明”仍属于展签设计判断，需继续人工复核。
- `node-04` 的“桑木垭”与 `node-08` 的“懋功会师”保留为 `approximate`，因为现有故事点位与叙事范围能够支持教学定位，但不足以宣称会场/纪念地点精确落点。

## Task 4 验证证据

- `npm run test:scenes`：PASS（2 个断言通过，覆盖九节点完整性、lookup、bounds、segment/source 引用，以及确认标注命中 node/story 点、约略标注命中 node/story/route 点的 provenance 规则）。
- `npm run test:loading`：PASS（11 个断言通过）。
- `npm run test:stories`：PASS（8 个断言通过）。
- `npm run build`：PASS（`tsc -b && vite build` 成功，产物 `dist/assets/index-CU4BhB1s.js` gzip 393.56 kB）。
- `git diff --check`：PASS（无空白错误；仅有 Git 的 LF→CRLF 提示）。

## Task 5 结果（节点学习场景与展签）

- 新增 `app/src/map/nodeScenePresentation.ts`，提供 `routeSceneRole()`、`annotationPresentation()`、`applyNodeScene()` 与 `clearNodeScene()`，并把节点学习态的路由强调、scene 标注源、以及恢复逻辑集中到单一可测试模块。
- `App` 现在按 `sceneForNode(selectedNodeId)` 取出场景，并把该场景传给 `MapCanvas` 与新的 `NodeSceneCartouche`；节点相机改为优先使用 `scene.focusBounds`，让学习态镜头落在主线的视觉三分区域。
- `MapCanvas` 在学习焦点中创建/清理 scene 标注 marker，用户手势会立即停止自动动效；离开学习焦点时会清除 scene 源与图层，并恢复普通路线强调。
- `styles.css` 增加了地图侧 cartouche、scene exhibit label、以及移动端约束，避免学习态面板与标签造成横向溢出。
- `app/scripts/node-scenes.test.mjs` 与 `app/scripts/learning-focus.test.mjs` 现在覆盖 scene 角色、标注可访问命名、scene 进出时的图层/源生命周期，以及 cartouche 绑定契约。

## Task 5 验证证据

- `npm run test:scenes`：PASS（5 个断言通过）。
- `npm run test:learning`：PASS（5 个断言通过）。
- `npm run test:map`：PASS（2 个断言通过）。
- `npm run test:loading`：PASS（11 个断言通过）。
- `npm run build`：PASS（`tsc -b && vite build` 成功，产物 `dist/assets/index-Dx_xTc7i.js` gzip 397.52 kB）。
- `git diff --check`：PASS（无空白错误；仅有 Git 的 LF→CRLF 提示）。

## Task 5 视觉证据

- 截图：`E:\数媒\长征一条路的来处\.omx\screenshots\node-map-terrain\node-01-1440x900.png`
- 截图：`E:\数媒\长征一条路的来处\.omx\screenshots\node-map-terrain\node-05-1440x900.png`
- 截图：`E:\数媒\长征一条路的来处\.omx\screenshots\node-map-terrain\node-08-1440x900.png`
- 截图：`E:\数媒\长征一条路的来处\.omx\screenshots\node-map-terrain\node-05-390x844.png`
- 视觉评分：94/100
- 主要保留项：少数节点上 scene cartouche 与地图标签仍略密，`node-08` 这类场景在小屏下仍需留意标注重叠。
- 复核说明：`390x844` 的 `node-05` 现在显示了独立地点行，且卡片没有越界。

## Task 6 结果（九节点高分辨率地形裁切）

- `app/scripts/build-terrain.mjs` 现在基于 `nodeScenes.focusBounds` 生成九份本地节点地形裁切，并使用 12% 安全边距、`z10` DEM 采样和共享 `.terrain-cache`。
- `app/public/terrain/nodes/manifest.json` 记录了 `generated`、`source`、`bbox`、`sampleZoom`、`candidateLongEdges`、`chosenLongEdge`、最终 `resolution`、`filenames` 和 `sizes`。
- 节点裁切采用固定候选长边 `960/840/720/600/480` 逐个编码，先找到的合格结果即写入 manifest；若全部超出 `1.5MB`，地形生成会直接失败。
- 九个节点裁切总量：`7,697,577` bytes；单节点 pair 全部低于 `1.5MB`，最大为 `node-08` 的 `1,176,406` bytes。
- 暖缓存再跑一遍 `npm run terrain` 的耗时：`8.33s`。
- 运行时局部节点裁切尚未接入地图，保留全局地形回退，不影响 Task 7/8 的接线。
- 本轮未额外补做截图，因为本任务未启用局部裁切选择逻辑，现有截图仍对应 Task 5 的全局离线路径。

## Task 6 验证证据

- `npm run terrain`：PASS（生成全局地形、九节点裁切与 manifest）。
- `npm run test:loading`：PASS（13 个断言通过，含 manifest/文件/预算校验与候选选择失败路径）。
- `npm run test:scenes`：PASS（6 个断言通过）。
- `npm run test:stories`：PASS（8 个断言通过）。
- `npm run build`：PASS（`tsc -b && vite build` 成功，产物 `dist/assets/index-BP59p3ZA.js` gzip 397.68 kB）。
- `git diff --check`：PASS（仅有 Git 的 LF→CRLF 提示）。

## Task 7 结果（关键水系与山地表达）

- `app/src/data/nodeHydrography.ts` 新增九个教学节点的水系/山地子集，六条关键水系分别落在 `node-01/02/03/05/06/07`，并为 `node-08` 保留夹金山与雪山语义。
- 水系表达分为两层：`node-hydrography-line` 负责 `金沙江`、`大渡河` 等可确认线段，`node-hydrography-point` 负责其余源据不足时的源背书点位/面状替代。
- 点位/山地标签与 provenance 现在统一保留 authored/source-backed `clipBounds`；若需要更小的视觉命中框，另存为 `labelHitBounds`，不再混用 provenance 边界。
- `annotationPresentation()` 现在对 approximate crossing 使用“约略渡口”措辞与 `渡` 形 glyph，保持可访问命名与视觉语义一致。
- `MapCanvas` 在学习焦点下按当前节点注入/清空水系数据源，并仅在标签开关开启时渲染水系与山地标签。
- `style.ts` 将水系层插入在基础水体之后、路线之前，确保证据蓝不压过路线红，也不盖住 scene cartouche。
- `app/scripts/hydrography.test.mjs` 覆盖关键水系、来源/裁切边界、authored `clipBounds` 一致性、近似渡口文案，以及图层层级契约；`app/scripts/map-loading.test.mjs` 追加水系源/层基线断言。

## Task 7 视觉证据

- 截图：`.omx/screenshots/node-map-terrain/task7/node-01-1440x900.png`
- 截图：`.omx/screenshots/node-map-terrain/task7/node-02-1440x900.png`
- 截图：`.omx/screenshots/node-map-terrain/task7/node-05-1440x900.png`
- 截图：`.omx/screenshots/node-map-terrain/task7/node-07-1440x900.png`
- 截图：`.omx/screenshots/node-map-terrain/task7/node-08-1440x900.png`
- 截图：`.omx/screenshots/node-map-terrain/task7/node-05-390x844.png`
- 截图：`.omx/screenshots/node-map-terrain/task7/node-08-390x844.png`
- 视觉评分：94/100
- 主要差异：关键水系现在能直接读出于都河、湘江、乌江、赤水河、金沙江与大渡河；node-08 也补上了夹金山/雪山的山地表达。
- 余留观察：390px 的 node-08 学习视图仍略紧，后续若再精修，可只微调移动端学习卡顶部留白。

## Task 8 结果（渐进式 2D→3D 地形状态）

- `app/src/map/terrainRuntime.ts` 现在同时提供运行时 DEM helper 与一个小型 terrain UI state machine：`local/loading/ready/offline` 四态、待决激活 request id、可取消的 pending 状态，以及按 `plain / river-valley / mountain / plateau` 映射的 exaggeration 值。
- `cancelOnlineTerrain()` 现在只取消待决加载并返回 `cancelled`，不会在普通“关闭 3D”时抹掉已就绪 DEM；组件卸载时改用 `resetOnlineTerrain()` 做彻底清理。
- `App` 把 3D 控制从单一 boolean 改成显式状态：后台预取只更新按钮状态，不自动开 3D；用户点击后若 DEM 尚未 ready，会保持本地地形可见并进入 pending，待当前请求完成后才真正切到 3D。
- `MapCanvas` 在底图与节点场景稳定后用 `idle` + `1200ms` 兜底启动 DEM 预取；若用户手势在待激活期间接管地图，会取消 stale activation request。3D 开启使用 `pitch: 42`，减动效时直接 `jumpTo`，不再走延迟 pitch 回调。
- 节点场景的地形强度现在按 terrain mode 调整：`plain 1.15`、`river-valley 1.42`、`mountain 1.28`、`plateau 1.32`。路线、水系、标签与 scene annotation 在 3D 中保持可读，没有被地形层吞没。
- `TopBar` 的 3D 按钮改为用户可见状态文案与可访问语义合同：`3D 地形`、`3D 加载中`、`开启 3D`、`3D 离线/重试`、`关闭 3D`，并带 `aria-pressed`、`aria-busy`、`disabled` 与 `role="status"` live announcement。原先重复的离线 notice 已移除，避免与按钮状态冲突。

## Task 8 验证证据

- `npm run test:loading`：PASS（19 个断言通过，覆盖预取 ready 不自动开 3D、点击前 ready/pending、offline→retry、stale request cancel、terrain mode exaggeration 与 TopBar 可访问合同）。
- `npm run test:map`：PASS（2 个断言通过）。
- `npm run test:scenes`：PASS（10 个断言通过）。
- `npm run test:learning`：PASS（5 个断言通过）。
- `npm run test:stories`：PASS（8 个断言通过）。
- `npm run build`：PASS（`tsc -b && vite build` 成功，产物 `dist/assets/index-DyJaFG_B.js` gzip `403.37 kB`）。
- `git diff --check`：PASS（无空白错误；仅有 Git 的 LF→CRLF 提示）。

## Task 8 视觉证据

- 截图：`.omx/screenshots/node-map-terrain/task8/node-01-1440x900-2d.png`
- 截图：`.omx/screenshots/node-map-terrain/task8/node-01-1440x900-3d.png`
- 截图：`.omx/screenshots/node-map-terrain/task8/node-08-1440x900-2d.png`
- 截图：`.omx/screenshots/node-map-terrain/task8/node-08-1440x900-3d.png`
- 截图：`.omx/screenshots/node-map-terrain/task8/node-08-390x844-2d.png`
- 截图：`.omx/screenshots/node-map-terrain/task8/node-08-390x844-3d.png`
- 视觉评分：91/100
- 主要差异：`node-08` 的 3D 高差已经明显可感，山地脊线与谷地起伏比 2D 版本更清楚，同时路线红线、地点白签与山地标签仍然完整可读；`node-01` 因地势本身更平，3D 增益较克制但不会误导为“无效按钮”。
- 余留观察：390px 的 `node-08` 在 3D 下仍保持可读，但顶部 chrome 与节点卡叠压较紧；如果后续继续磨视觉，可优先只放宽移动端学习态顶部留白，而不是继续提高 exaggeration。

## Task 8 review follow-up（2026-09-04）

- Review 指出的真实问题是：`cancelOnlineTerrain()` 在 pending DEM 被取消时只结束 promise，不会移除半加载 `terrainDem` source；同时 `MapCanvas` 的 `terrainPrefetchStartedRef` 也不会在 cancelled/offline 后复位，导致后续预取/重试可能踩到脏状态。
- 运行时修复采用“取消即完整回收”路径：pending load 结束为 `cancelled` 或 `offline` 时都会移除 `terrainDem` source 并清空 runtime pending；下一次 `ensureOnlineTerrain()` 会重新创建 source，而不是复用可能已经错过 `sourcedata` 事件的旧对象。
- `MapCanvas` 的后台预取现在只在 `TerrainStatus === "local"` 且没有 active/requested 3D 时启动；若预取结果为 `cancelled` 或 `offline`，预取 latch 会复位。这样用户手势取消 stale activation 后，状态先回到 `local/ready`，之后才允许新的后台或显式重试。
- 这次没有改动视觉输出或 TopBar 文案，Task 8 的截图与 91/100 视觉判断仍然有效；follow-up 主要是把取消路径从“看起来能停”补成“停完之后还能再来一遍”。

## Task 8 review follow-up 验证证据

- `npm run test:loading`：PASS（21 个断言通过；新增“cancel 后移除 source 并可 retry 到 ready”与“gesture cancel 后 UI state 回到 local/ready”覆盖）。
- `npm run test:map`：PASS（2 个断言通过）。
- `npm run test:scenes`：PASS（10 个断言通过）。
- `npm run test:learning`：PASS（5 个断言通过）。
- `npm run test:stories`：PASS（8 个断言通过）。
- `npm run build`：PASS（follow-up 完成后再次通过）。
- `git diff --check`：PASS（仅 LF→CRLF 提示）。

## Task 9 结果（节点学习双栏编辑排版与联动强调）

- `app/src/components/RightPanel.tsx` 的 node learning 视图改为“全宽 header + 主叙事列 + 证据侧栏 + 稳定底部导航”结构；桌面端使用约 `70 / 30` 的内部两栏，外层仍保持地图 `45 / 55` 分屏。
- 新增 `app/src/components/NodeEvidenceRail.tsx` 与 `app/src/components/nodeLearning.ts`，把右栏所需数据收束成可测试的 model：路线 certainty、scene terrain mode/read cue、`node.deep` 证据摘录、相关故事、source 入口、以及已有 elevation profile 摘要。
- 证据侧栏只复用现有 node/story/source/scene/profile 数据，不新增历史叙述；相关故事从主列移除，避免双列重复渲染同一内容。
- 新增 typed `LearningEmphasis = "route" | "terrain" | "evidence" | null`，由显式按钮、焦点、点击与 blur 驱动；强调只改变图层强度和标注可读性，不改 `selectedNodeId`、`selectedStoryId`、`timelineT`、`revealT` 或相机请求。
- `MapCanvas` 现在把 emphasis 映射到 route candidate opacity/width、offline terrain raster opacity、node hydrography line/point 强度、scene badge/label opacity；`clear/close/select` 时统一回到基础 node scene。
- 移动端 `<=900px` 下，panel 内部折叠为单列顺序流，`390x844` 不再横向溢出；为避免长标题节点出现 cartouche/panel 叠压，学习态移动端隐藏 map-side cartouche，保留正文与证据顺序。
- `app/scripts/learning-focus.test.mjs` 新增 evidence rail data reuse、desktop/mobile layout contract、explicit emphasis controls、以及 mobile cartouche hide contract；`app/scripts/node-scenes.test.mjs` 新增 emphasis paint retuning regression。

## Task 9 验证证据

- `npm run test:learning`：PASS（7 个断言通过，覆盖新 evidence/model/layout/emphasis/mobile 合同）。
- `npm run test:scenes`：PASS（11 个断言通过，新增 emphasis 图层回归）。
- `npm run test:loading`：PASS（21 个断言通过）。
- `npm run test:timeline`：PASS（13 个断言通过）。
- `npm run test:stories`：PASS（8 个断言通过）。
- `npm run build`：PASS（`tsc -b && vite build` 成功，产物 `dist/assets/index-CkFaISZv.css` gzip `21.98 kB`，`dist/assets/index-CGNRr6w6.js` gzip `405.13 kB`）。
- `git diff --check`：PASS（无空白错误；仅 LF→CRLF 提示）。

## Task 9 视觉证据

- 截图：`.omx/screenshots/node-map-terrain/task9/node-01-1440x900.png`
- 截图：`.omx/screenshots/node-map-terrain/task9/node-05-1440x900.png`
- 截图：`.omx/screenshots/node-map-terrain/task9/node-08-1440x900.png`
- 截图：`.omx/screenshots/node-map-terrain/task9/node-01-1920x1080.png`
- 截图：`.omx/screenshots/node-map-terrain/task9/node-05-1920x1080.png`
- 截图：`.omx/screenshots/node-map-terrain/task9/node-05-390x844.png`
- 截图：`.omx/screenshots/node-map-terrain/task9/node-08-390x844.png`
- 视觉评分：93/100
- 主要差异：桌面端右栏不再留下大块空白，主叙事与证据的阅读职责分开得更清楚；node-05 / node-08 的路线 certainty、地形 cue、海拔摘要和证据摘录都能在一屏内形成有效对照。
- 移动端结论：`390x844` 下无横向裁切，修复后不再出现 cartouche 压住 panel 标题的问题；node-08 的长标题会自然换行，但仍处于可读范围。
- 余留观察：移动端首屏主要展示 header + emphasis + narrative 开头，证据摘录与 stories/source 入口需要继续向下滚动，这是单列布局下的可接受取舍。
