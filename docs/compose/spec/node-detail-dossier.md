---
feature: node-detail-dossier
status: delivered
updated: 2026-09-03
branch: codex/node-map-terrain
commits: working-tree
---

# 节点详细页 · 档案研究卷宗

## Report

**What was built** — 节点详细页从 55vw 对切改为右侧浮动研究卷宗（约 520px）：卷宗头 → 核心问题 → 沿线位置（默认收起）→ 读图工具 → 正文 → 边注证据 → 粘性页脚。地图保持全宽，相机右侧留白。

**Verification** — `tsc -b` PASS；timeline 测试 11/11 PASS。

**Journey log** — learningFocus 仍用于隐藏杂标记，但不再用 map width 45vw 切割；learning-hidden 样式须保留。

## [S1] Problem

打开节点后的学习面板信息堆叠、层级乱：路线条、工具条、正文、证据栏并列抢戏；55vw 全高对切让面板「太宽太满」；排版不够像研究卷宗。

## [S2] Design

### 2.1 布局

- 面板改为地图右侧**浮动研究卡**：宽 `min(520px, 42vw)`，上下留 18px，圆角与细边框
- 地图保持全宽，相机 `padding.right ≈ 540`，不再把地图压成 45vw 固定列
- 仍保留 learningFocus：隐藏其它标记，突出当前节点场景

### 2.2 信息架构（自上而下）

1. **卷宗头**（sticky）：单元号 / 宋体标题 / 日期·精度·地名 / 简明·深入
2. **核心问题**（论题条）：问字章 + 一句问题
3. **沿线位置**（默认收起的 details）：PlaceRouteStrip
4. **读图工具**：三档强调改为紧凑一行
5. **正文栏**（阅读宽 ~34–36em）：这一站 → 引文 → 感官 → 深入 → 五问 → 回看
6. **边注栏**：证据轨改为正文下「边注」区，左侧细线，不再与正文抢双栏
7. **页脚**（sticky）：史料入口 + 上下站

### 2.3 排版

- 标题 28–30px 宋体，字距略开
- 正文 16.5–17px / 1.85，最大宽 36em
- 段间距 16–20px；用发丝线分区，少用多层卡片阴影
- chip 缩小为标签条，去掉「地图解释」长 hint 的视觉噪音（保留 title）

## [S3] Out of Scope

- 不改节点文案数据
- 不改故事卡 / 史料卡（可后续同样卷宗化）
- 不引入新字体文件

## Tasks

- [x] T1: presentation 宽度与 map padding — acceptance: 打开节点后面板约 520px，地图不被压成 45vw (covers: S2.1)
- [x] T2: NodeCard 结构重排 — acceptance: 顺序为头→问题→沿线(收起)→工具→正文→边注→页脚 (covers: S2.2)
- [x] T3: 卷宗排版 CSS — acceptance: 标题/正文/边注/页脚符合 S2.3 (covers: S2.3)
- [x] T4: tsc + 相关测试 — acceptance: typecheck 与 timeline/precision 测试不回归 (covers: S2)
