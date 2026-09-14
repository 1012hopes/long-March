import { useEffect, useRef, useState, type CSSProperties } from "react";
import { nodes, type NodeUnit, type ContentTag } from "../data/nodes";
import { sources, sourcesByNode, type SourceEntry } from "../data/sources";
import { stories, type StoryPoint } from "../data/stories";
import { getStoryMarkerPresentation } from "../map/markerPresentation";
import { getRightPanelPresentation } from "../layout/rightPanelPresentation";
import NodeEvidenceRail, { LearningEmphasisToolbar } from "./NodeEvidenceRail";
import PlaceRouteStrip from "./PlaceRouteStrip";
import { CONTENT_TAG_LABEL, type LearningEmphasis } from "./nodeLearning";
import { PRECISION_CHIP_LABEL, type PrecisionKind } from "../map/precisionExplain";
import { BEAT_EMPHASIS, BEAT_LABEL, type NarrativeBeat } from "../map/narrativeSync";

const BEAT_ORDER: NarrativeBeat[] = ["intro", "question", "quote", "sensory", "deep", "close"];

export type RightView =
  | { type: "node"; nodeId: string }
  | { type: "story"; storyId: string }
  | { type: "sources"; nodeId?: string }
  | null;

const STORY_KIND_LABEL: Record<StoryPoint["kind"], string> = {
  decision: "决策",
  march: "行军",
  battle: "战斗",
  crossing: "渡河",
  people: "人物",
  terrain: "地形",
  meeting: "会议",
};

export function TagChip({ tag }: { tag: ContentTag }) {
  return <span className={`tag tag-${tag}`}>{CONTENT_TAG_LABEL[tag]}</span>;
}

const RIGHTS_STATUS_LABEL: Record<SourceEntry["rightsStatus"], string> = {
  cleared: "已获授权",
  "permission-needed": "授权沟通中",
  "citation-only": "仅引用 · 不复制原文",
  blocked: "不可复用",
};

// 深入摘录的脚注编号：按本节点内首次引用顺序排号
function buildCitationNumbers(node: NodeUnit) {
  const ordered: string[] = [];
  for (const block of node.deep) {
    for (const id of block.sourceIds ?? []) {
      if (!ordered.includes(id)) ordered.push(id);
    }
  }
  return new Map(ordered.map((id, index) => [id, index + 1]));
}

type Props = {
  view: RightView;
  depth: "concise" | "deep";
  onDepth: (d: "concise" | "deep") => void;
  onClose: () => void;
  onSelectNode: (id: string) => void;
  onSelectStory: (id: string) => void;
  onOpenSources: (nodeId?: string) => void;
  onPrevNext: (dir: -1 | 1) => void;
  learningEmphasis: LearningEmphasis;
  onLearningEmphasisChange: (value: LearningEmphasis) => void;
  precisionEmphasis: PrecisionKind | null;
  onPrecisionToggle: (kind: PrecisionKind) => void;
  tourChrome?: { index: number; total: number; stopTitle: string } | null;
};

function NodeCard({ node, p }: { node: NodeUnit; p: Props }) {
  const nodeSources = sourcesByNode(node.id);
  const citationNumbers = buildCitationNumbers(node);
  const hasCitations = node.deep.some((block) => (block.sourceIds?.length ?? 0) > 0);
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const [activeBeat, setActiveBeat] = useState<NarrativeBeat>("intro");
  const syncPausedUntilRef = useRef(0);
  const emphasisCbRef = useRef(p.onLearningEmphasisChange);
  emphasisCbRef.current = p.onLearningEmphasisChange;

  const handleManualEmphasis = (value: LearningEmphasis) => {
    syncPausedUntilRef.current = Date.now() + 12000;
    emphasisCbRef.current(value);
  };

  useEffect(() => {
    const root = bodyRef.current;
    if (!root) return;
    const sections = Array.from(root.querySelectorAll<HTMLElement>("[data-beat]"));
    if (sections.length === 0) return;

    const pickBeat = () => {
      if (Date.now() < syncPausedUntilRef.current) return;
      const topPad = 96;
      let current: NarrativeBeat = "intro";
      for (const el of sections) {
        const rect = el.getBoundingClientRect();
        if (rect.top <= topPad + 24) {
          const beat = el.dataset.beat as NarrativeBeat | undefined;
          if (beat) current = beat;
        }
      }
      setActiveBeat((prev) => {
        if (prev === current) return prev;
        emphasisCbRef.current(BEAT_EMPHASIS[current]);
        return current;
      });
    };

    const observer = new IntersectionObserver(pickBeat, {
      root: null,
      rootMargin: "-15% 0px -55% 0px",
      threshold: [0, 0.25, 0.5, 1],
    });
    for (const el of sections) observer.observe(el);
    const onScroll = () => pickBeat();
    window.addEventListener("scroll", onScroll, true);
    pickBeat();
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [node.id]);

  const beatIndex = Math.max(0, BEAT_ORDER.indexOf(activeBeat));
  const beatLeft = `${(beatIndex / (BEAT_ORDER.length - 1)) * 100}%`;

  return (
    <article className="node-card node-dossier">
      <div className="node-card-shell">
        <header className="dossier-head">
          <span className="node-index mono">单元 {String(node.seq).padStart(2, "0")} / 09</span>
          <h2>{node.title}</h2>
          <div className="node-meta dossier-meta">
            <span className="chip chip-date">{node.displayDateLabel}</span>
            <button
              type="button"
              className={`chip chip-precision chip-toggle ${p.precisionEmphasis === node.precision ? "active" : ""}`}
              aria-pressed={p.precisionEmphasis === node.precision}
              onClick={() => p.onPrecisionToggle(node.precision)}
              title="点选后地图将强调对应精度的路线画法，并展开说明"
            >
              {PRECISION_CHIP_LABEL[node.precision]}
            </button>
            {node.secondary.length > 0 && (
              <span className="chip chip-place">
                {[...node.secondary.map((s) => s.name)].join(" · ")}
              </span>
            )}
          </div>
          <div className="depth-switch" role="tablist" aria-label="阅读层级">
            <button className={p.depth === "concise" ? "active" : ""} onClick={() => p.onDepth("concise")}>
              简明
            </button>
            <button className={p.depth === "deep" ? "active" : ""} onClick={() => p.onDepth("deep")}>
              深入
            </button>
          </div>
        </header>

        <div className="narrative-beat-rail" aria-live="polite">
          <span className="beat-label">读到 · {BEAT_LABEL[activeBeat]}</span>
          <span className="beat-track" aria-hidden="true">
            <span className="beat-cursor" style={{ left: beatLeft }} />
          </span>
        </div>

        <blockquote className="core-question dossier-question" data-beat="question">
          <span className="cq-mark">问</span>
          {node.coreQuestion}
        </blockquote>

        <details className="route-position">
          <summary>沿线位置与其它站点</summary>
          <PlaceRouteStrip
            selectedNodeId={node.id}
            onSelectNode={p.onSelectNode}
            precisionEmphasis={p.precisionEmphasis}
            onPrecisionToggle={p.onPrecisionToggle}
          />
        </details>

        <LearningEmphasisToolbar
          activeEmphasis={p.learningEmphasis}
          className="narrative-emphasis-toolbar dossier-tools"
          onEmphasisChange={handleManualEmphasis}
        />

        <div className="node-learning-grid dossier-body" ref={bodyRef}>
          <div className="node-main-column">
            <section className="concise-block" data-beat="intro">
              <h3>这一站</h3>
              <p>{node.concise}</p>
            </section>

            {node.quote && (
              <figure className="node-quote" data-beat="quote">
                <span className="quote-mark" aria-hidden="true">
                  ❝
                </span>
                <blockquote>{node.quote.text}</blockquote>
                <figcaption>
                  <span className="quote-seal" aria-hidden="true">
                    长征
                  </span>
                  <span className="quote-attribution">{node.quote.attribution}</span>
                </figcaption>
              </figure>
            )}

            {node.sensory && (
              <figure className="node-sensory" data-beat="sensory">
                <span className="sensory-mark">你身在其中</span>
                <p>{node.sensory.text}</p>
                <figcaption>{node.sensory.attribution}</figcaption>
              </figure>
            )}

            {p.depth === "deep" && (
              <section className="deep-blocks" data-beat="deep">
                {node.deep.map((b, i) => (
                  <p key={i} className="deep-item">
                    <TagChip tag={b.tag} />
                    <span>
                      {b.text}
                      {(b.sourceIds ?? []).map((id) => {
                        const source = sources.find((item) => item.id === id);
                        const num = citationNumbers.get(id);
                        if (!source || !num) return null;
                        return (
                          <a
                            key={id}
                            className="deep-source-mark"
                            href={source.url}
                            target="_blank"
                            rel="noreferrer"
                            aria-label={`出处〔${num}〕${source.title}（${source.org}），打开原始页面`}
                            title={`出处〔${num}〕${source.title} · ${source.org}`}
                          >
                            〔{num}〕
                          </a>
                        );
                      })}
                    </span>
                  </p>
                ))}
                {hasCitations && (
                  <p className="deep-sources-hint">〔n〕为该条陈述的依据来源，点击打开出处页面。</p>
                )}
              </section>
            )}

            <details className="five-q">
              <summary>五问展开</summary>
              <ol>
                {node.fiveQuestions.map((fq, i) => (
                  <li key={i}>
                    <strong>{fq.q}</strong>
                    <span>{fq.a}</span>
                  </li>
                ))}
              </ol>
            </details>

            <div className="watch-note" data-beat="close">
              <span className="watch-mark">回看</span>
              {node.watch}
            </div>
          </div>

          <aside className="dossier-margin" aria-label="边注与证据">
            <NodeEvidenceRail
              node={node}
              activeEmphasis={p.learningEmphasis}
              onEmphasisChange={p.onLearningEmphasisChange}
              onSelectStory={p.onSelectStory}
              precisionEmphasis={p.precisionEmphasis}
              onPrecisionToggle={p.onPrecisionToggle}
            />
          </aside>
        </div>

        <div className="node-footer dossier-foot">
          <button className="ghost-btn" onClick={() => p.onOpenSources(node.id)}>
            史料与出处 · {nodeSources.length} 条
          </button>
          <div className="pager">
            <button className="ghost-btn" onClick={() => p.onPrevNext(-1)} disabled={node.seq <= 1}>
              上一站
            </button>
            <button className="ghost-btn" onClick={() => p.onPrevNext(1)} disabled={node.seq >= 9}>
              下一站
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

function StoryCard({ story, p }: { story: StoryPoint; p: Props }) {
  const storySources = sources.filter((source) => story.sourceIds.includes(source.id));
  const node = nodes.find((item) => item.id === story.nodeId);

  return (
    <article className={"story-card story-title-" + story.kind}>
      <header className="story-head">
        <div className="story-kicker">
          <span className={"story-kind kind-" + story.kind}>{STORY_KIND_LABEL[story.kind]}</span>
          <span className="mono">{story.id.toUpperCase()}</span>
        </div>
        <h2>{story.title}</h2>
        <div className="node-meta">
          <span className="chip chip-date">{story.dateLabel}</span>
          <span className="chip chip-place">{story.place}</span>
          <button
            type="button"
            className={`chip chip-precision chip-toggle ${p.precisionEmphasis === story.precision ? "active" : ""}`}
            aria-pressed={p.precisionEmphasis === story.precision}
            onClick={() => p.onPrecisionToggle(story.precision)}
            title="点选后地图将强调对应精度的路线画法，并展开说明"
          >
            {story.precision === "confirmed" ? "点位可确认" : "约略位置"}
            <span className="chip-hint">地图解释</span>
          </button>
        </div>
      </header>

      {story.video && (
        <a className="story-video" href={story.video.url} target="_blank" rel="noreferrer">
          <span className="story-video-play" aria-hidden="true">▶</span>
          <span className="story-video-body">
            <strong>官方影像：{story.video.title}</strong>
            <small>{story.video.credit}（平台播放，不复制原始影像）</small>
          </span>
          <span aria-hidden="true">↗</span>
        </a>
      )}

      {story.image && (
        <figure className="story-figure">
          <img src={story.image.src} alt={story.image.alt} loading="lazy" />
          <figcaption>{story.image.credit}</figcaption>
        </figure>
      )}

      <section className="story-summary">
        <h3>这里发生了什么</h3>
        <p>{story.summary}</p>
      </section>

      <section className="people-section">
        <h3>人物与参与者</h3>
        <div className="people-list">
          {story.people.map((person) => (
            <div className="person-record" key={person.name}>
              <span className="person-name">{person.name}</span>
              <span className="person-role">{person.role}</span>
            </div>
          ))}
        </div>
      </section>

      <blockquote className="core-question story-question">
        <span className="cq-mark">问</span>
        {story.question}
      </blockquote>

      <section className="story-sources">
        <h3>依据与来源</h3>
        {storySources.map((source) => (
          <a className="story-source-link" href={source.url} target="_blank" rel="noreferrer" key={source.id}>
            <span className="mono">{source.id}</span>
            <span>
              <strong>{source.title}</strong>
              <small>{source.org}</small>
            </span>
            <span aria-hidden="true">↗</span>
          </a>
        ))}
      </section>

      <p className="story-disclaimer">
        人物角色与事件概述依据所列史料整理，不使用虚构对白；地图位置按“确定 / 约略”标注。
      </p>

      <div className="node-footer">
        {node && (
          <button className="primary-btn" onClick={() => p.onSelectNode(node.id)}>
            进入教学节点
          </button>
        )}
        <button className="ghost-btn" onClick={() => p.onOpenSources(story.nodeId)}>
          查看本节点全部史料
        </button>
      </div>
    </article>
  );
}

function SourcesCard({ nodeId, p }: { nodeId?: string; p: Props }) {
  const [filter, setFilter] = useState<string>(nodeId ?? "all");
  const list = filter === "all" ? sources : sourcesByNode(filter);
  return (
    <div className="sources-card">
      <p className="sources-sub">
        每个节点 30 秒内可找到来源。此处仅展示书目与链接及各条来源支持的内容，不复制受版权保护的原文与影像。
      </p>
      <div className="filter-row" role="tablist" aria-label="按节点筛选">
        <button className={`filter-chip ${filter === "all" ? "active" : ""}`} onClick={() => setFilter("all")}>
          全部
        </button>
        {nodes.map((n) => (
          <button
            key={n.id}
            className={`filter-chip ${filter === n.id ? "active" : ""}`}
            onClick={() => setFilter(n.id)}
          >
            {String(n.seq).padStart(2, "0")}
          </button>
        ))}
      </div>
      <div className="sources-list">
        {list.map((s) => (
          <article key={s.id} className="source-item">
            <div className="source-top">
              <span className="chip chip-rel">可靠性 {s.reliability === "high" ? "高" : "中"}</span>
              <span className="chip chip-rights">{RIGHTS_STATUS_LABEL[s.rightsStatus]}</span>
            </div>
            <h3>{s.title}</h3>
            <p className="source-org">
              {s.org} · {s.sourceType}
              {s.date ? ` · ${s.date}` : ""}
            </p>
            <p className="source-claim">支持：{s.claim}</p>
            {s.note && <p className="source-note">备注：{s.note}</p>}
            <div className="source-foot">
              <a className="ghost-btn" href={s.url} target="_blank" rel="noreferrer">
                打开原始页面 ↗
              </a>
              <span className="mono source-id">{s.id}</span>
            </div>
          </article>
        ))}
      </div>
      <p className="sources-fine">
        台账版本：research/source-register.csv · 访问日期 2026-09-01 · 权利状态待逐项确认，正式版使用前完成授权。
      </p>
      <button className="ghost-btn back-to-map" onClick={() => p.onClose()}>
        返回地图
      </button>
    </div>
  );
}

export default function RightPanel(p: Props) {
  const view = p.view;
  if (!view) return null;
  const presentation = getRightPanelPresentation(view.type);
  const node = view.type === "node" ? nodes.find((n) => n.id === view.nodeId) : undefined;
  const story = view.type === "story" ? stories.find((item) => item.id === view.storyId) : undefined;
  const heading =
    view.type === "sources"
      ? { main: "史料与出处", sub: "证据目录与引用边界" }
      : view.type === "story"
        ? { main: "沿途故事", sub: "人物、地点与事件关系" }
        : { main: "节点学习", sub: "从地图进入历史问题" };

  return (
    <aside
      className={`right-panel right-panel-${view.type}`}
      style={{ "--right-panel-width": presentation.panelWidth } as CSSProperties}
    >
      <div className="panel-header">
        {p.tourChrome ? (
          <div className="tour-chrome">
            <span className="tour-step mono">
              第 {p.tourChrome.index} / {p.tourChrome.total} 站
            </span>
            <span className="tour-stop-title">{p.tourChrome.stopTitle}</span>
          </div>
        ) : (
          <div className="panel-heading">
            <span className="panel-heading-sub">{heading.sub}</span>
            <h2 className="panel-heading-main panel-title">{heading.main}</h2>
          </div>
        )}
        <button className="mini-btn" onClick={p.onClose} aria-label="收起面板">
          收起
        </button>
      </div>
      <div className="right-inner">
        {view.type === "sources" ? (
          <SourcesCard nodeId={view.nodeId} p={p} />
        ) : view.type === "story" && story ? (
          <StoryCard story={story} p={p} />
        ) : node ? (
          <NodeCard node={node} p={p} />
        ) : null}
      </div>
    </aside>
  );
}
