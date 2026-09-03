import { useState, type CSSProperties } from "react";
import { nodes, type NodeUnit, type ContentTag } from "../data/nodes";
import { sources, sourcesByNode } from "../data/sources";
import { stories, type StoryPoint } from "../data/stories";
import { getStoryMarkerPresentation } from "../map/markerPresentation";
import { getRightPanelPresentation } from "../layout/rightPanelPresentation";

export type RightView =
  | { type: "node"; nodeId: string }
  | { type: "story"; storyId: string }
  | { type: "sources"; nodeId?: string }
  | null;

const TAG_LABEL: Record<ContentTag, string> = {
  fact: "事实",
  interp: "解释",
  recon: "可视化还原",
  disputed: "来源有争议",
};

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
  return <span className={`tag tag-${tag}`}>{TAG_LABEL[tag]}</span>;
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
  tourChrome?: { index: number; total: number; stopTitle: string } | null;
};

function NodeCard({ node, p }: { node: NodeUnit; p: Props }) {
  const nodeSources = sourcesByNode(node.id);
  const nodeStories = stories.filter((story) => story.nodeId === node.id);
  return (
    <div className="node-card">
      <div className="node-head">
        <span className="node-index mono">单元 {String(node.seq).padStart(2, "0")} / 09</span>
        <h2>{node.title}</h2>
        <div className="node-meta">
          <span className="chip chip-date">{node.displayDateLabel}</span>
          <span className="chip chip-precision">
            {node.precision === "confirmed" ? "史料明确" : node.precision === "approximate" ? "约略" : "多候选 · 争议"}
          </span>
          {node.secondary.length > 0 && (
            <span className="chip chip-place">
              {[...node.secondary.map((s) => s.name)].join(" · ")}
            </span>
          )}
        </div>
      </div>

      <div className="depth-switch" role="tablist" aria-label="阅读层级">
        <button className={p.depth === "concise" ? "active" : ""} onClick={() => p.onDepth("concise")}>
          简明
        </button>
        <button className={p.depth === "deep" ? "active" : ""} onClick={() => p.onDepth("deep")}>
          深入
        </button>
      </div>

      <section className="concise-block">
        <h3>这一站</h3>
        <p>{node.concise}</p>
      </section>

      <blockquote className="core-question">
        <span className="cq-mark">问</span>
        {node.coreQuestion}
      </blockquote>

      {p.depth === "deep" && (
        <section className="deep-blocks">
          {node.deep.map((b, i) => (
            <p key={i} className="deep-item">
              <TagChip tag={b.tag} />
              <span>{b.text}</span>
            </p>
          ))}
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

      <div className="watch-note">
        <span className="watch-mark">回看</span>
        {node.watch}
      </div>

      {nodeStories.length > 0 && (
        <section className="node-stories">
          <h3>本节点沿途故事</h3>
          <div className="node-story-list">
            {nodeStories.map((story) => {
              const presentation = getStoryMarkerPresentation(story.shortTitle, story.kind);
              return (
                <button key={story.id} className="node-story-link" onClick={() => p.onSelectStory(story.id)}>
                  <span className="node-story-glyph" aria-hidden="true">{presentation.glyph}</span>
                  <span className="node-story-body">
                    <strong>{story.title}</strong>
                    <small>{story.dateLabel} · {story.place}</small>
                  </span>
                  <span aria-hidden="true">→</span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      <div className="node-footer">
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
          <span className="chip chip-precision">
            {story.precision === "confirmed" ? "点位可确认" : "约略位置"}
          </span>
        </div>
      </header>

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
      <h2>史料与出处</h2>
      <p className="sources-sub">
        每个节点 30 秒内可找到来源。此处仅展示书目与链接，不复制受版权保护的原文与影像。
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
              <span className="mono source-id">{s.id}</span>
              <span className="chip chip-rel">可靠性 {s.reliability === "high" ? "高" : "中"}</span>
              <span className="chip chip-rights">引用署名</span>
            </div>
            <h3>{s.title}</h3>
            <p className="source-org">
              {s.org} · {s.sourceType}
              {s.date ? ` · ${s.date}` : ""}
            </p>
            <p className="source-claim">支持：{s.claim}</p>
            <div className="source-foot">
              <a className="ghost-btn" href={s.url} target="_blank" rel="noreferrer">
                打开原始页面 ↗
              </a>
              {s.note && <span className="source-note">{s.note}</span>}
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
