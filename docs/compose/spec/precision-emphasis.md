---
feature: precision-emphasis
status: delivered
updated: 2026-09-03
branch: codex/node-map-terrain
commits: working-tree
---

# 精度标签地图解释 · P1/P2

## Report

**What was built** — 在 P0「点精度 chip → 地图强调 + 解释卡」之上，补齐 P1 入口一致性（图例、故事点位、来源跳转、URL `#p=`/`c=`、争议候选 a/b、移动端 sheet）与 P2 教学完整（争议停靠、宽屏加粗、disputeNote、台账校验、场景标注同步）。

**Verification** — `npx tsc -b` PASS；`precision-emphasis` + `precision-p1p2` + `timeline` + `map-overview` 25/25 PASS；`map-loading` 1 条 PRE-EXISTING（terrain manifest 日期断言）。

**Journey log** — 台账 CSV 路径从 scripts 出发应为 `../../research/`；场景标注 certainty 仅 confirmed/approximate，disputed 主要作用于候选线；confirmed 节点邻接 disputed 段（遵义）是合法教学形态，一致性规则须放行。同分支还含更早的「去左栏 / PlaceRouteStrip」布局改动，不属本 spec 范围。

## [S1] Problem

P0 已实现「点精度 chip → 地图三档强调 + 解释卡」。P1 要求入口处处一致、可分享、可读争议候选；P2 要求教学完整：播放停靠、投影可读、争议内容说清、台账同源、场景标注同步。

## [S2] Design

### 2.1 共享状态

- App 持有 `precisionEmphasis: PrecisionKind | null`
- 可选 `focusCandidateLineId: string | null`（争议段单条候选，如 `seg-04a`）
- URL：`#p=confirmed|approximate|disputed`，与现有 `n/s/t/r/m/i` 并列写入/解析

### 2.2 入口（P1）

| 入口 | 行为 |
|---|---|
| 图例三档图元 | 可点 toggle，`aria-pressed`，与 chip 同源 |
| 故事卡精度 | toggle 同档；地图同时强调故事点位圈注（CSS class） |
| 解释卡「依据」 | 打开 sources 视图并按当前节点筛选 |
| 争议候选条目 | 解释卡列出 a/b 候选，点选单条只抬升该线 |

### 2.3 地图 paint（P1/P2 增强）

- `focusCandidateLineId` 非空时：该 cand 全亮更粗，其他 cand 更淡
- 投影/大屏：`@media (min-width: 1400px)` 或 `body.projection` 下强调线宽再 +15%（由 CSS 无法改 MapLibre paint，用 JS 读 `window.innerWidth >= 1400` 加倍系数）
- 场景标注：精度强调时 `.map-scene-annotation.approximate` 等类加 `precision-active`，虚线框/色随档同步

### 2.4 播放（P2）

- TopBar 增加「争议停靠」开关（默认关）
- 开启时播放进入 `certainty===disputed` 段：暂停 + `precisionEmphasis=disputed` + 解释卡
- 再点播放继续

### 2.5 内容与台账（P2）

- `precisionExplain` / `sources.ts` 为 seg-04、seg-08 增加 `disputeNote`（2–3 句分歧说明）
- 测试：disputed/approximate 节点须有对应出入段；**confirmed 可邻接 disputed**（遵义：点位明确、走向候选）
- 脚本校验：`segments[].reasoning` 非空；与 `research/route-segment-register.csv` 的 certainty 字段一致

### 2.6 无障碍 / 移动

- 解释卡在 `max-width:900px` 已有底部定位；补 `precision-card.sheet` 视觉（上缘圆角、更大关闭区）
- 图例按钮 min-height 36px+，焦点可见

## [S3] Out of Scope

- 不改路线几何数据本身
- 不做完整投影模式 UI 重排
- 不自动修改 research CSV（只读校验）

## Tasks

- [x] T1: URL `p=` 深链接读写 — acceptance: 刷新带 `#p=disputed` 时地图为争议强调且解释卡打开 (covers: S2.1)
- [x] T2: 图例三档可点 — acceptance: 点击图例行切换强调并打开解释卡 (covers: S2.2)
- [x] T3: 故事卡精度 toggle + 点位圈注 class — acceptance: 故事视图点精度 chip 强调对应档且地图 marker 有 story-precision 类 (covers: S2.2)
- [x] T4: 解释卡来源跳转 sources — acceptance: 点「查看全部依据」进入 sources 且 filter=当前节点 (covers: S2.2)
- [x] T5: 争议候选 a/b 选择 — acceptance: 解释卡列出候选，点选后仅该 cand 更亮 (covers: S2.2 S2.3)
- [x] T6: 移动端 sheet 样式 — acceptance: ≤900px 解释卡全宽贴底可关闭 (covers: S2.6)
- [x] T7: 争议短文 disputeNote — acceptance: 争议解释卡展示 2–3 句分歧说明 (covers: S2.5)
- [x] T8: 争议停靠播放开关 — acceptance: 开启后进入争议段自动暂停并打开争议解释 (covers: S2.4)
- [x] T9: 宽屏强调加粗 — acceptance: width≥1400 时强调 lineWidth 系数更高 (covers: S2.3)
- [x] T10: 场景标注 precision-active — acceptance: 强调约略/确定/争议时场景标注类同步 (covers: S2.3)
- [x] T11: 一致性测试 + 台账校验 — acceptance: 节点/段一致性与 CSV certainty 校验测试通过 (covers: S2.5)
- [x] T12: 回归测试与 tsc — acceptance: precision + timeline + map 测试通过 (covers: S2)
