# 时间线与叙事动效改进实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将当前“进度条 + 节点列表”的时间线改造成能准确表达历史时间、当前阅读位置和导览节奏的叙事时间轴。

**Architecture:** 将历史时间位置与路线显影进度分离。自由探索模式保持整条路线可见，时间指针跟随用户选中的日期或节点；导览/播放模式使用独立的路线显影进度。左侧节点时间轴和底部拖动条共享同一时间模型，视觉上只保留一套“当前时间”语义。

**Tech Stack:** React 18, TypeScript, Vite, MapLibre GL, Node built-in test runner, native CSS.

**Spec:** `docs/superpowers/specs/2026-09-02-realistic-map-stories-design.md`，以及本计划中的时间线状态与动效约束。

## Global Constraints

- 不改变九个教学节点、路线精度标签和来源 ID。
- 自由探索、导览、史料三种模式的入口文案保持不变。
- 不把时间线视觉做成游戏式“完成度/奖励”进度条。
- 所有新增动效必须提供 `prefers-reduced-motion` 降级。
- 不增加新依赖；继续使用现有 Node 测试脚本和 MapLibre。
- 时间线交互必须支持鼠标、触摸、键盘和屏幕阅读器。

---

## Requirements Summary

当前问题集中在四个层面：

1. `progress` 同时表示历史时间、路线显影和播放进度，导致自由探索与导览语义冲突（`app/src/App.tsx:78,272`）。
2. 左侧红色填充按面板高度计算，与可滚动节点列表和真实日期比例不一致（`app/src/components/LeftTimeline.tsx:30-75`）。
3. 底部 `input[type=range]` 与左侧红线重复表达时间，且没有明确的“当前日期指针”（`app/src/components/BottomPanel.tsx:109-139`）。
4. 当前动效在播放、节点选择、镜头移动和列表滚动之间缺少明确层级，容易让用户感觉“自动播放”而非“我在读历史”。

## Supplemental Experience Requirements

以下问题不只是时间轴样式问题，也需要在执行时一并验证：

- 开场不能短暂显示 `progress = 1` 的“终点状态”，再跳回导览起点；初始化状态应与当前模式一致。
- 导览需要有明确的“停靠、阅读、继续”节奏，不能让路线显影、镜头移动、旁白和面板文字同时抢注意力。
- 地图镜头移动应保留用户对地图的控制权；手动拖动后不能立刻被自动镜头夺回。
- 选择节点后应保留上下文，允许用户返回刚才的时间位置，不因一次点击丢失浏览进度。
- 九个教学节点与八个导览停靠点必须有可见的章节映射，合并站和尾声不能让用户误以为节点缺失。
- 移动端时间线应优先支持“当前节点 + 前后邻近节点”，不强迫用户在半屏中滚完整条九节点列表。
- 声音、镜头和路线动画都应是可独立关闭的增强层；关闭其中一项不能破坏主叙事。
- 时间线上要同时表达“历史时间”和“阅读位置”，但不能再增加第三种类似游戏进度的状态。

## Visual Quality Gate

“美观”是本计划的硬性验收条件，不是完成后的可选润色。时间线应延续项目已有的“国家档案测绘桌 × 历史地理图志”方向：克制、纸面、具有编辑性和空间感，而不是通用后台、游戏 HUD 或装饰性科技界面。

- 时间线必须有清晰的视觉层级：年份刻度 < 路线段 < 节点标题 < 当前站点，不允许所有元素同等抢眼。
- 颜色只使用现有纸面、墨色、路线红、证据蓝和解释赭体系；红色只强调当前时间和关键节点，不做大面积“完成度填充”。
- 真实日期比例带来的大间距必须转化为留白和节奏，不用压缩成均匀九格，也不让长距离节点显得空洞。
- 当前节点应具有“展签/图钉”般的精致强调：实心圆、细环、短引线或纸签均可，但每一屏最多一个主焦点。
- 动效必须有方向、速度和停稳感；禁止无限循环、同时闪烁、连续漂移和为展示技术而展示技术的动画。
- 左侧时间轴、底部时间控件、地图路线和右侧节点面板必须共享同一套视觉语言：线宽、圆点、标签边框和过渡曲线不能各自为政。
- 桌面端要有编辑展陈感，手机端要有单手可读的秩序感；不能简单把桌面三栏缩小到手机。
- 每次视觉迭代必须检查：首屏焦点是否明确、文字是否拥挤、路线是否被面板遮挡、红色是否过量、动画是否抢过正文。
- `prefers-reduced-motion` 版本也必须美观，不能退化为没有层次的瞬间跳变。

### Visual Acceptance Criteria

- 1440×900 首屏在 3 秒内能看出项目标题、当前时间、当前节点和路线主方向。
- 当前时间指针在不看文字说明的情况下可被识别；节点状态不依赖颜色 alone，至少同时使用形状、环线或标签。
- 任意时刻最多一个主要运动焦点；地图、时间线和面板不会同时进行高对比运动。
- 视觉评审中不得出现：大面积纯红填充、等间距打孔式节点、过多胶囊按钮、连续闪烁、文字覆盖地图关键地名、面板开合导致画面跳动。
- 手机 390×844 下，当前节点、日期和下一步操作在首次打开抽屉时无需滚动即可看到。

## Acceptance Criteria

- 自由探索初始状态不再显示“完成度已满”的红色时间线；整条路线仍可见。
- 点击任意节点后，当前日期指针、选中节点、底部日期和节点面板保持一致；点击早期节点不会强制隐藏后续路线。
- 节点在时间轴上的位置按 `NODE_FRACTIONS` 计算，而非九等分。
- 左侧节点时间轴和底部拖动条使用同一个 `timelineT`，不会出现两个互相矛盾的当前时间。
- 导览模式仍能按停靠点显影路线，并保留现有导览停靠点顺序。
- 键盘可完成时间指针移动、节点跳转和暂停/继续；触摸目标不小于 44×44px。
- 开启 `prefers-reduced-motion` 时不发生平滑滚动、镜头飞行和连续脉冲动画，但功能仍可完成。
- `npm run build`、四组现有测试、时间线新增测试和对比度审计全部通过。

## Implementation Steps

### Task 1: 锁定现状并建立时间线模型测试

**Files:**
- Create: `app/scripts/timeline-model.test.mjs`
- Modify: `app/src/data/time.ts`

**Interfaces:**
- Produce `TimelineMarker` 类型或等价结构：`{ id, t, title, dateLabel, precision }`。
- Produce纯函数 `timelineMarkers()`，按 `NODE_FRACTIONS` 返回稳定排序的九个节点。
- Produce `clampTimelineT(value: number): number`，保证时间位置始终位于 `[0, 1]`。

- [ ] **Step 1: 写失败测试**

测试真实日期比例、节点排序、边界裁剪，并断言节点 8→9 的间距大于相邻早期节点的间距。

- [ ] **Step 2: 运行测试确认失败**

Run: `npm run test:timeline`（先在 `app/package.json` 增加脚本）

Expected: FAIL，因为时间线纯函数尚不存在。

- [ ] **Step 3: 实现最小时间线纯函数**

复用现有 `NODE_FRACTIONS`、`NODE_DATES`、`isoToDateLabel`，不复制节点日期。

- [ ] **Step 4: 运行测试确认通过**

Run: `npm run test:timeline`

Expected: PASS。

### Task 2: 分离 `timelineT` 与 `revealT`

**Files:**
- Modify: `app/src/App.tsx:78-115,220-285,430-620`
- Modify: `app/src/components/BottomPanel.tsx`
- Modify: `app/src/components/LeftTimeline.tsx`
- Test: `app/scripts/timeline-model.test.mjs`

**Interfaces:**
- `timelineT: number`：当前阅读/拖动的历史时间。
- `revealT: number`：路线和节点的显影进度，仅由导览或播放驱动。
- `onTimelineChange(t: number): void`：更新 `timelineT`，并在需要时选择相邻节点。

- [ ] **Step 1: 先补回归测试**

覆盖以下行为：

```text
自由探索：revealT = 1，timelineT 可独立移动
导览：revealT 与停靠点 revealT 同步
点击早期节点：timelineT 跳到该节点，revealT 不倒退
```

- [ ] **Step 2: 修改 App 状态和序列化**

将 hash 中的 `t`解释为 `timelineT`；如需保留播放恢复，再增加独立的 `r` 参数，不改变已有 `#t=` 分享链接的含义。

- [ ] **Step 3: 调整节点选择逻辑**

移除 `Math.max(progress, NODE_FRACTIONS[id])` 这一限制；节点选择只改变 `timelineT` 与选中态，自由探索不隐藏后续路线。

- [ ] **Step 4: 调整播放循环**

播放时递增 `revealT`，并将 `timelineT`跟随 `revealT`；暂停或手动拖动后停止播放。

- [ ] **Step 5: 运行回归测试**

Run: `npm run test:map; npm run test:markers; npm run test:learning; npm run test:stories; npm run test:timeline`

Expected: 全部 PASS。

### Task 3: 重做左侧时间轴为真实比例的叙事脊柱

**Files:**
- Modify: `app/src/components/LeftTimeline.tsx`
- Modify: `app/src/styles.css:313-390,1902-1930`
- Test: `app/scripts/timeline-model.test.mjs`

**Interfaces:**
- 左侧组件接收 `timelineT`、`selectedNodeId`、`onTimelineChange`。
- 节点位置由 `style={{ top: `${marker.t * 100}%` }}` 或等价 CSS 变量生成。

- [ ] **Step 1: 移除面板高度填充语义**

删除或停用表示“已完成”的 `.timeline-fill`；保留一条中性基线和一条当前时间指针。

- [ ] **Step 2: 增加年份/月刻度**

至少显示 `1934年10月`、`1935年1月`、`1935年5月`、`1935年10月` 四个刻度，并确保小屏不重叠。

- [ ] **Step 3: 按真实时间位置布局节点**

节点圆点定位使用 `timelineMarkers()` 的 `t`，文本卡片仍可滚动，但滚动不改变时间指针。

- [ ] **Step 4: 明确三种状态**

选中节点使用实心圆；当前时间附近节点使用强调环；其余节点使用中性圆点。不要使用“已完成/未完成”文案。

- [ ] **Step 5: 运行浏览器构建验证**

Run: `npm run build`

Expected: TypeScript 和 Vite 构建通过，节点列表仍可点击和滚动。

### Task 4: 统一底部拖动条与节点跳转

**Files:**
- Modify: `app/src/components/BottomPanel.tsx:90-150`
- Modify: `app/src/styles.css:895-940,2111-2150`
- Modify: `app/src/App.tsx`

- [ ] **Step 1: 让 range 控件读写 `timelineT`**

底部日期、当前段和节点刻度全部从同一时间值派生。

- [ ] **Step 2: 增加可见拖动指针和日期提示**

拖动时显示 `tToDateLabel(timelineT)`；键盘左右箭头按固定步长移动，Home/End 跳到起止时间。

- [ ] **Step 3: 节点刻度点击只改变时间位置**

点击刻度调用 `onTimelineChange(frac)`，不重复执行一套独立的进度逻辑。

- [ ] **Step 4: 处理移动端触摸尺寸和遮挡**

保证 range、节点刻度和播放按钮在 390×844 下可操作，不被底部抽屉遮挡。

### Task 5: 重排动效层级，减少“自动驾驶感”

**Files:**
- Modify: `app/src/App.tsx:180-220,330-390`
- Modify: `app/src/components/LeftTimeline.tsx`
- Modify: `app/src/map/MapCanvas.tsx:360-430`
- Modify: `app/src/styles.css`

- [ ] **Step 1: 限制镜头自动移动触发条件**

连续拖动时间指针时不持续 `fly/fitBounds`；仅在点击节点、导览换站或跨越路线段时移动镜头。

- [ ] **Step 2: 统一过渡时长**

时间指针 160–220ms，节点卡片 160ms，导览路线显影 900–1200ms，镜头 1200–1600ms。

- [ ] **Step 3: 清理高频列表滚动**

`scrollIntoView` 只在选中节点变化或导览换站时触发，不在每次播放帧更新时触发。

- [ ] **Step 4: 增加 reduced-motion 分支**

所有平滑滚动、CSS transition、MapLibre ease/fly 动作在减少动态偏好下切换为即时状态。

### Task 6: 桌面与手机验收

**Files:**
- Modify: `app/src/styles.css`
- Create: `docs/superpowers/plans/2026-09-03-timeline-experience-qa.md`（记录手工验收结果）

- [ ] **Step 1: 桌面验收**

在 1440×900 和 1920×1080 检查：时间刻度、节点位置、底部拖动条、右侧面板打开时的安全区。

- [ ] **Step 2: 手机验收**

在 390×844 检查：抽屉打开/关闭、时间拖动、节点按钮、横竖屏下的文本和触摸目标。

- [ ] **Step 3: 键盘与无障碍验收**

检查 Tab 顺序、Enter/Space 激活、左右箭头、Home/End、Escape、焦点返回和 `aria-current`。

- [ ] **Step 4: 性能验收**

检查拖动时主线程无明显卡顿；MapLibre 不因每个 range input 事件反复重排镜头。

### Task 7: 文档与门禁同步

**Files:**
- Modify: `docs/06-产品信息架构与功能边界.md`
- Modify: `docs/16-全屏地图与可收缩面板.md`
- Modify: `README.md`
- Modify: `docs/11-当前门禁状态.md`（仅更新“原型已完成项”，不改变 NO GO 结论）

- [ ] **Step 1: 记录时间线状态模型**

明确 `timelineT` 与 `revealT` 的区别，以及自由探索不隐藏后续路线的规则。

- [ ] **Step 2: 更新动效规范**

记录过渡时长、触发条件和 reduced-motion 行为。

- [ ] **Step 3: 更新当前状态**

将项目描述从“尚未进入产品设计与开发”改为“已有可演示原型，时间线体验改造进行中；正式开发仍受六类门禁约束”。

## Risks and Mitigations

| 风险 | 缓解措施 |
| --- | --- |
| 拆分状态后 hash 分享链接失效 | 保留 `#t=` 作为 `timelineT`，增加兼容解析测试 |
| 真实比例导致节点文本重叠 | 点位与文本层分离；小屏使用可滚动文本和当前节点聚焦 |
| 拖动时间指针造成地图卡顿 | 拖动只更新路线显影和日期；镜头移动仅在释放或跨节点时触发 |
| 播放与手动选择产生竞态 | 播放循环使用 refs；任何手动拖动、点击节点、地图手势都停止播放 |
| 动效调整后无障碍退化 | 保留现有焦点样式，新增键盘和 reduced-motion 验收项 |
| 文档与实现再次漂移 | Task 7 与代码变更同一提交批次完成，并在 CI/本地运行校验命令 |

## Verification Steps

1. `npm run test:timeline`
2. `npm run test:map`
3. `npm run test:markers`
4. `npm run test:learning`
5. `npm run test:stories`
6. `npm run build`
7. `node scripts/validate-prep.mjs`（根目录）
8. `node app/scripts/contrast-audit.mjs`（根目录）
9. `npm audit --omit=dev --audit-level=high`（`app`目录）
10. 按 Task 6 完成桌面、手机、键盘和 reduced-motion 手工验收并记录结果。

## Recommended Execution Order

严格按 Task 1 → Task 2 → Task 3 → Task 4 → Task 5 → Task 6 → Task 7 执行。每个任务独立通过测试后再进入下一个任务；不要在状态模型未稳定前先做大规模 CSS 重排。

执行 Task 5 和 Task 6 时，额外检查开场状态、导览停靠节奏、地图控制权、节点/停靠点映射、移动端邻近节点聚焦和声音独立关闭这六项体验要求。

所有实现任务都必须通过 Visual Quality Gate；如果功能通过但画面出现拥挤、廉价或动效互相争抢，应视为未完成，继续迭代而不是直接进入下一任务。

## Definition of Done

- 时间线表达真实日期比例，而不是完成度；
- 自由探索与导览的时间语义分离；
- 节点选择、日期指针、地图路线、底部摘要和右侧面板同步；
- 动效节制、可解释、可关闭且支持减少动态；
- 桌面、手机、键盘和屏幕阅读器均完成验收；
- 所有自动化测试、构建和项目校验通过；
- 文档已同步，且正式开发 NO GO 的内容、版权、地图和竞赛门禁结论没有被误改。
