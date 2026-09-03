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

- `app/src/map/style.ts` 现在会在 `hillshade-bbox.json` 与两张本地 PNG 均可用时创建两个 `image` source：`offlineTerrainTint`、`offlineHillshade`。
- 影像坐标按 MapLibre `[[west,north],[east,north],[east,south],[west,south]]` 顺序生成，并由 `app/scripts/map-loading.test.mjs` 直接断言。
- 基础样式新增 `offline-terrain-color` 与 `offline-terrain-relief` 两个 `raster` layer，位置在 `land-fill` 之上、`coastline-overlay` / 等高线 / 水系 / 路线之下。
- 本地 relief 当前使用 `raster-opacity: 0.38`，tint 使用 `raster-opacity: 0.34`，保持路线红与河流蓝仍是视觉主层。
- 若 bbox 或任一本地 PNG 缺失，`probeHillshade()` 返回 `null`，基础样式保留现有纸面底图，不阻断地图初始化。
- 在线 `terrainDem` 与 `terrainColorDem` source 仍保留，供 Task 3 的渐进增强与首屏剥离继续处理。

## Task 2 验证证据

- `npm run test:loading`：PASS（3 个断言通过，1 个 Task 3 TODO 保留）。
- `npm run test:stories`：PASS（8 个断言通过）。
- `npm run test:map`：PASS（2 个断言通过）。
- `npm run build`：PASS（`tsc -b && vite build` 成功，产物 `dist/assets/index-uL_U2Wpz.js` gzip 392.70 kB）。
- `git diff --check`：PASS（无空白错误；仅有 Git 的 LF→CRLF 提示）。
