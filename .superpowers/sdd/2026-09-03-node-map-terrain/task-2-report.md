# Task 2 report — offline terrain first paint

日期：2026-09-03

## Files changed

- `app/src/map/style.ts`
- `app/scripts/map-loading.test.mjs`
- `app/scripts/story-data.test.mjs`
- `docs/superpowers/plans/2026-09-03-node-map-terrain-qa.md`
- `.superpowers/sdd/2026-09-03-node-map-terrain/task-2-report.md`

## Design decisions

- 保留 `terrainDem` 与 `terrainColorDem` 两个在线 `raster-dem` source，不在 Task 2 中提前移除，避免侵入 Task 3 的首屏剥离范围。
- 将基础底图首屏地形改为条件式本地 `image` source：`offlineTerrainTint` 指向 `terrain/terrain-tint.png`，`offlineHillshade` 指向 `terrain/hillshade.png`。
- 统一通过 `hillshade-bbox.json` 生成 MapLibre 影像四角坐标，顺序为 `[[west,north],[east,north],[east,south],[west,south]]`，避免图片翻转或错位。
- 本地地形图层使用 `raster` layer 而不是继续绑定在线 DEM：
  - `offline-terrain-color` 以低饱和、低对比、`0.34` 透明度叠在纸面底图上。
  - `offline-terrain-relief` 以 `0.38` 透明度提供克制的山体起伏，不压过路线红与河流蓝。
- `probeHillshade()` 只在地图初始化前请求体积很小的 `hillshade-bbox.json`；不再对两张 PNG 做 `HEAD` 或 `Image` 预探测，避免阻塞初始化和重复下载。
- 当 bbox 缺失时，`buildStyle(null)` 会保留原有在线 `global-terrain-color` 与 `terrain-relief` 图层，作为 Task 2 阶段的在线回退路径；Task 3 再移除这一基础依赖。
- `MAP_LAYER_IDS.terrain` 同时覆盖离线与在线 terrain layer ID，使现有图层显隐控制在两种样式路径下都成立。

## Test work

### Red

- 将 `app/scripts/map-loading.test.mjs` 从“源码文本基线 + TODO”改成可执行的行为契约：
  - 直接加载 `buildStyle()`，断言存在 `offlineTerrainTint` / `offlineHillshade` 两个 `image` source。
  - 断言 bbox 坐标顺序正确。
  - 断言 `offline-terrain-color` / `offline-terrain-relief` 两个 layer 存在且位于 `land-fill` 之上、`coastline-overlay` / 等高线 / 水系 / 路线之下。
  - 断言 bbox 缺失时不创建离线 source/layer，但保留在线 `global-terrain-color` / `terrain-relief` 回退层。
  - 断言 `probeHillshade()` 在地图构建前只请求 `terrain/hillshade-bbox.json`。
- 首次执行 `npm run test:loading` 失败，原因是 `buildStyle()` 尚未创建离线 terrain source。

### Green

- 在 `app/src/map/style.ts` 中加入条件式离线 source/layer 生成逻辑，并恢复 `null` metadata 路径的在线 terrain fallback 后，`npm run test:loading` 转绿。
- 同步修正 `app/scripts/story-data.test.mjs` 中仍描述旧 DEM 首屏样式的断言，使其匹配 Task 2 的离线首屏契约，同时继续保留“在线 DEM source 仍存在”的检查。

## Verification output

- `npm run test:loading`
  - PASS
  - 4 个测试通过，保留 1 个 Task 3 TODO。
- `npm run test:stories`
  - PASS
  - 8 个测试通过。
- `npm run test:map`
  - PASS
  - 2 个测试通过。
- `npm run build`
  - PASS
  - `tsc -b && vite build` 成功。
  - 产物摘要：`dist/assets/index-DNGvmrT_.js` 1,388.66 kB，gzip 392.83 kB；`dist/assets/index-C64BJNep.css` 123.37 kB，gzip 20.47 kB。
- `git diff --check`
  - PASS
  - 无空白错误；Git 仅提示若未来触碰文件会将 LF 写回为 CRLF。

## Self-review

- 变更范围保持在 Task 2 所需的底图样式、加载契约测试和 QA 文档，没有提前处理 Task 3 的在线 DEM 移除或 contour 懒加载。
- 离线 terrain 只要 bbox 存在就会接入样式；缺图时不做阻塞性预探测，交由 MapLibre 按现有图层栈自然回退。
- 现有 3D 地形开关仍依赖 `terrainDem`，因此 Task 2 不会破坏后续在线增强路径。
- 我额外修改了 `app/scripts/story-data.test.mjs`，这是为了让必跑的 `npm run test:stories` 与新的首屏契约保持一致；否则该门禁会继续锁定旧实现。
- Review follow-up 额外确保了 `null` metadata 路径仍保留旧的在线 terrain layer，因此 Task 2 没有把 Task 3 的迁移责任提前做掉。

## Remaining concerns

- 当前验证覆盖样式对象、构建和既有测试，但没有在本任务中补做浏览器截图或 HAR 采集，因此“视觉是否足够克制”仍主要依赖参数选择与现有视觉约束，建议在 Task 3/Task 10 一并复核。
- 当 bbox 存在但本地 raster 资源实际缺失时，本轮不会在代码里捕获 MapLibre 的单图层 404 事件做更细粒度 UI 提示；当前行为是直接让纸面/已有底层显示出来，若后续需要提示文案，可在 Task 3 的运行时地形管理中统一处理。
