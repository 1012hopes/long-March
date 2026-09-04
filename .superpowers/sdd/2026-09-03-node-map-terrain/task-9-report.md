# Task 9 report

日期：2026-09-04

状态：完成

## 结果

- 节点学习右侧面板重组为编辑式阅读布局：桌面端维持地图 `45 / 55` 分屏，面板内部改为主叙事列 + 证据侧栏；移动端 `<=900px` 自动折叠为单列顺序流。
- 新增 `NodeEvidenceRail`，只复用既有 `node.deep`、`fiveQuestions`、`watch`、`stories`、`sources`、`scene terrain mode/read cue`、`elevation-profiles` 数据，不新增历史文本。
- 故事链接改为只在证据侧栏呈现，避免与主叙事列重复渲染。
- 新增 typed `LearningEmphasis = "route" | "terrain" | "evidence" | null`，由显式按钮、焦点与点击驱动地图样式强调；强调只改图层强度，不改节点、时间线或相机请求。
- `route / terrain / evidence` 强调分别调节路线候选线、离线地形、水系、scene annotation 与 DOM 标签透明度；`blur/close/select` 都会回到基础 node scene。
- 修复了移动端学习态的 cartouche / 面板叠压：`390x844` 下不再与长标题卡片冲突。

## 修改文件

- `app/src/components/RightPanel.tsx`
- `app/src/components/NodeEvidenceRail.tsx`
- `app/src/components/nodeLearning.ts`
- `app/src/App.tsx`
- `app/src/map/MapCanvas.tsx`
- `app/src/map/nodeScenePresentation.ts`
- `app/src/styles.css`
- `app/scripts/learning-focus.test.mjs`
- `app/scripts/node-scenes.test.mjs`
- `docs/superpowers/plans/2026-09-03-node-map-terrain-qa.md`

## 验证

- `npm run test:learning`：PASS
- `npm run test:scenes`：PASS
- `npm run test:loading`：PASS
- `npm run test:timeline`：PASS
- `npm run test:stories`：PASS
- `npm run build`：PASS
- `git diff --check`：PASS（仅 LF→CRLF 提示）

## 视觉 QA

- 截图目录：`.omx/screenshots/node-map-terrain/task9/`
- 已捕获：
  - `node-01-1440x900.png`
  - `node-05-1440x900.png`
  - `node-08-1440x900.png`
  - `node-01-1920x1080.png`
  - `node-05-1920x1080.png`
  - `node-05-390x844.png`
  - `node-08-390x844.png`
- 视觉评分：93/100
- 结论：桌面端两列明显减轻了短节点的留白浪费，证据密度更均衡；`390x844` 下无横向溢出，修复后也没有 cartouche 压住标题的问题。

## 关注点

- `node-08` 这类长标题在 `390x844` 下会自然换成三行，虽然没有遮挡，但会把正文起点继续往下推；如果后续还要磨移动端，可优先微调标题字号或行高，而不是继续压缩卡片间距。
- 证据摘录与来源入口目前位于移动端首屏以下，顺序正确，但需要继续依赖滚动阅读；这是单列信息密度的可接受取舍。

## Review follow-up（2026-09-04）

- 新增 `app/src/map/learningEmphasisPaint.ts`，把 terrain/hydro emphasis 的底层 paint 复位逻辑做成独立 helper；`MapCanvas` 现在即使在同一次 render 中 `learningFocus` 关闭且 `nodeScene` 变为 `null`，也会先把离线地形和水系强调恢复到基础值，再退出 scene emphasis。
- 路线 hover 不再在 `mouseleave` 时硬编码恢复到 `3.4`。`app/src/map/nodeScenePresentation.ts` 新增 scene-aware width helpers，当前若仍处于 learning scene，会按当前 `LearningEmphasis` 恢复 highlight/context/dim 对应宽度；若不在 scene 中，则回退到基础宽度。
- 回归测试新增：
  - `learning emphasis support paint resets to base when focus ends before a scene survives the render`
  - `hover leave restores highlighted context and dim line widths for the active scene emphasis`
- 这次 follow-up 没有视觉布局改动，因此沿用 Task 9 的截图与 `93/100` 视觉判断。

## Review follow-up 验证

- `npm run test:learning`：PASS（8 个断言通过）
- `npm run test:scenes`：PASS（12 个断言通过）
- `npm run test:loading`：PASS
- `npm run test:timeline`：PASS
- `npm run test:stories`：PASS
- `npm run build`：PASS
- `git diff --check`：PASS（仅 LF→CRLF 提示）
