---
feature: map-context-narrative
status: delivered
updated: 2026-09-03
branch: codex/node-map-terrain
commits: working-tree
---

# 地图取景减负 + 文图同步叙事

## Report

**What was built** — 节点取景外扩并按卷宗宽度留白；学习态压低城市标签、保留地理参照；卷宗滚动按「总览→问题→名句→感官→深入→回看」驱动地图看路线/地形/证据，手动点选会暂停自动同步 12s。

**Verification** — `tsc -b` PASS；narrative + timeline + marker 测试 18/18 PASS。

**Journey log** — 学习态不要隐藏全部 geo，否则地图更空更「别扭」；滚动同步回调须走 ref，避免 effect 依赖整个 props 对象。

## [S1] Problem

1. 打开节点后取景过碎，路线被卷宗面板挤压，与详细页抢空间  
2. 城市/图层在学习态仍偏导航软件感，色彩与地形偏花  
3. 详细页与地图静态并列，缺少「读到哪、图亮到哪」的巧妙联动

## [S2] Design

### 2.1 取景

- `expandBounds(bounds, 0.38)`：节点场景 focusBounds 外扩，保留前后文路线  
- 卷宗打开时相机 `padding.right ≈ 560`，主体不被面板压住  
- 非 scene 节点 fallback 外扩 ±0.8°（原 0.5°）

### 2.2 地图观感

- learningFocus：隐藏/淡化大城市标签，降低非强调走廊存在感  
- 卷宗左缘纸色渐变，减少「硬切一刀」

### 2.3 文-图同步叙事

- 卷宗正文段落挂 `data-beat`：  
  `intro → question → quote → sensory → deep → close`  
- `IntersectionObserver` 取视口中最上一条 beat → 驱动 `learningEmphasis`：  
  - intro: null  
  - question / deep: route  
  - quote: evidence  
  - sensory: terrain  
  - close: null  
- 用户手动点「看路线/看地形/看证据」时暂停自动同步 12s  
- 卷宗头下显示当前 beat 细条（非游戏进度条，测绘尺语气）

## [S3] Out of Scope

- 不重做 MapLibre 底图数据源  
- 不改巡航/播放逻辑  
- 不做多节点编排

## Tasks

- [x] T1: expandBounds + flyToNode 外扩与卷宗 padding — acceptance: 打开节点可见更多周边路线 (covers: S2.1)
- [x] T2: learningFocus 标签减负 + 卷宗左缘柔化 — acceptance: 学习态城市标签明显减少 (covers: S2.2)
- [x] T3: Dossier narrative beats + observer — acceptance: 滚动到引文时 emphasis=evidence (covers: S2.3)
- [x] T4: 手动强调暂停自动同步 — acceptance: 点「看地形」后 12s 内滚动不覆盖 (covers: S2.3)
- [x] T5: tsc + 测试 — acceptance: typecheck 与既有测试通过 (covers: S2)
