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
- `probeHillshade()` 现在除了读取 bbox，还会确认两张本地 PNG 可访问；如果静态托管不支持 `HEAD`，会退回真实图片加载探测。任何一步失败都回退到原有纸面底图，并允许地图继续初始化。
- `MAP_LAYER_IDS.terrain` 改为指向新的离线图层 ID，这样现有图层显隐控制无需额外改动。

## Test work

### Red

- 将 `app/scripts/map-loading.test.mjs` 从“源码文本基线 + TODO”改成可执行的行为契约：
  - 直接加载 `buildStyle()`，断言存在 `offlineTerrainTint` / `offlineHillshade` 两个 `image` source。
  - 断言 bbox 坐标顺序正确。
  - 断言 `offline-terrain-color` / `offline-terrain-relief` 两个 layer 存在且位于 `land-fill` 之上、`coastline-overlay` / 等高线 / 水系 / 路线之下。
  - 断言 bbox 缺失时不创建离线 source/layer。
- 首次执行 `npm run test:loading` 失败，原因是 `buildStyle()` 尚未创建离线 terrain source。

### Green

- 在 `app/src/map/style.ts` 中加入条件式离线 source/layer 生成逻辑后，`npm run test:loading` 转绿。
- 同步修正 `app/scripts/story-data.test.mjs` 中仍描述旧 DEM 首屏样式的断言，使其匹配 Task 2 的离线首屏契约，同时继续保留“在线 DEM source 仍存在”的检查。

## Verification output

- `npm run test:loading`
  - PASS
  - 3 个测试通过，保留 1 个 Task 3 TODO。
- `npm run test:stories`
  - PASS
  - 8 个测试通过。
- `npm run test:map`
  - PASS
  - 2 个测试通过。
- `npm run build`
  - PASS
  - `tsc -b && vite build` 成功。
  - 产物摘要：`dist/assets/index-uL_U2Wpz.js` 1,388.24 kB，gzip 392.70 kB；`dist/assets/index-C64BJNep.css` 123.37 kB，gzip 20.47 kB。
- `git diff --check`
  - PASS
  - 无空白错误；Git 仅提示若未来触碰文件会将 LF 写回为 CRLF。

## Self-review

- 变更范围保持在 Task 2 所需的底图样式、加载契约测试和 QA 文档，没有提前处理 Task 3 的在线 DEM 移除或 contour 懒加载。
- 离线 terrain 只在 bbox 和图片均可用时启用，满足“缺资源不阻断初始化”的要求。
- 现有 3D 地形开关仍依赖 `terrainDem`，因此 Task 2 不会破坏后续在线增强路径。
- 我额外修改了 `app/scripts/story-data.test.mjs`，这是为了让必跑的 `npm run test:stories` 与新的首屏契约保持一致；否则该门禁会继续锁定旧实现。

## Remaining concerns

- 当前验证覆盖样式对象、构建和既有测试，但没有在本任务中补做浏览器截图或 HAR 采集，因此“视觉是否足够克制”仍主要依赖参数选择与现有视觉约束，建议在 Task 3/Task 10 一并复核。
- `probeHillshade()` 的图片探测会在首屏前额外触发本地图片可用性检查；在本地静态资源场景下这是可接受的，但如果后续希望进一步压缩首屏等待时间，可以在 Task 3 结合运行时懒加载一起评估。
