---
feature: share-card-and-scene-photos
status: delivered
updated: 2026-09-03
branch: codex/node-map-terrain
commits: working-tree
---

# 截取卡片修复 + 地点场景照片弹窗

## Report

**What was built** — 主图与对照图开启 `preserveDrawingBuffer`，修复「截取卡片」导出空白；九站各配 AI 生成「当时 / 当今」场景图，地图点选节点弹出场景照片，古今对照开启时默认看当今，可手动切换。

**Verification** — `tsc -b` PASS；scene-share + share-card + narrative + timeline 测试通过。

**Journey log** — MapLibre 类型可能未声明 `preserveDrawingBuffer`，需断言；场景图必须在 `app/public/scenes/`。

## [S1] Problem

1. 分享卡片导出后看不到地图画面  
2. 点击地点希望看到「当时场景」；开古今对照时看「当今场景」

## [S2] Design

### 2.1 分享卡片

- `preserveDrawingBuffer: true`（主图 + 对照图）
- 合成逻辑不变

### 2.2 场景照片

- `public/scenes/node-0X-then.png` / `node-0X-now.png`
- `ScenePhotoModal`：标题、日期、图、版权说明、当时/当今切换、「进入学习卷宗」
- 地图 marker 点击 → 弹窗；账簿/上下站 → 只进卷宗不弹窗
- `compareOn` 决定默认 era

## [S3] Out of Scope

- 非授权历史档案扫描件替换（正式版权流程）

## Tasks

- [x] T1: preserveDrawingBuffer 修复导出空白 (covers: S2.1)
- [x] T2: 生成九站 then/now 场景图 (covers: S2.2)
- [x] T3: ScenePhotoModal + 地图点选接线 + 古今默认 (covers: S2.2)
- [x] T4: 测试与 typecheck (covers: S2)
