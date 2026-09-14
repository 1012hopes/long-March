---
feature: map-share-card
status: delivered
updated: 2026-09-03
branch: codex/node-map-terrain
commits: working-tree
---

# 可分享地图单块 PNG 卡片

## Report

**What was built** — 默认仍显示全程长征地图；顶栏新增「截取卡片」，将当前相机取景合成档案风 PNG（标题 / 日期 / 精度 + 项目脚注）并下载。支持节点、故事与全程默认文案。

**Verification** — `npx tsc -b` PASS；`share-card` + precision 测试 16/16 PASS。

**Journey log** — MapLibre `getCanvas()` 即可取帧；Node 侧只测文件名与接线，像素合成需浏览器。

## [S1] Problem

用户希望把「当前这一块」长征地图变成可分享的卡片，而不是只分享整站链接。默认交互仍是全程地图；分块/截取是可选动作。

## [S2] Design

### 2.1 行为

- 顶栏增加「截取卡片」按钮（探索/导览均可，专注模式隐藏与其它 chrome 一致）
- 点击后：读取当前 MapLibre canvas 像素 → 合成纸色边框卡片 → 下载 PNG
- 卡片内容：
  - 地图画面（当前相机取景）
  - 主标题：当前节点 `title` / 故事 `title` / 否则「中央红军长征路线」
  - 副标题：日期（节点 `displayDateLabel` 或故事 `dateLabel`）
  - 精度标签：当前节点/故事 precision 或当前段 certainty 文案
  - 脚注：`长征·一条路的来处` + 「示意还原，非逐日 GPS」
- 默认全程地图不变；不强制进入分块浏览模式

### 2.2 合成契约

```ts
type ShareCardMeta = {
  title: string;
  dateLabel: string;
  precisionLabel: string;
  footer?: string;
};

function composeShareCard(mapCanvas: HTMLCanvasElement, meta: ShareCardMeta): HTMLCanvasElement
```

- 输出宽度 max(地图宽, 960)，高度按地图比例 + 页脚条
- 纸色底 `#F2EEE4`，页脚条 `#FCFAF5`，路线红用于精度点
- 导出文件名：`长征地图卡片-{slug}.png`

### 2.3 地图取帧

- MapCanvas 通过 `captureRef` 暴露 `captureCanvas(): HTMLCanvasElement | null`
- 使用 `map.getCanvas()`；若 preserveDrawingBuffer 未开，导出前调用 `map.triggerRepaint` 并等待一帧

## [S3] Out of Scope

- 不做服务端图床
- 不做多块网格画廊 UI
- 不保证跨浏览器像素级一致（以当前会话 canvas 为准）

## Tasks

- [x] T1: shareCard 合成函数 — acceptance: 单测断言输出尺寸与 meta 绘制存在 (covers: S2.2)
- [x] T2: MapCanvas captureRef — acceptance: 点击导出能拿到 canvas (covers: S2.3)
- [x] T3: 顶栏按钮 + App 接线 + 下载 — acceptance: 有选中节点时文件名含节点短名 (covers: S2.1)
- [x] T4: tsc + 相关测试 — acceptance: typecheck 与新测试通过 (covers: S2)
