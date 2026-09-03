import { useMemo, useState } from "react";
import { stories, type StoryPoint } from "../data/stories";
import { nodes } from "../data/nodes";
import { NODE_FRACTIONS } from "../data/time";
import { getStoryMarkerPresentation } from "../map/markerPresentation";

type Props = {
  open: boolean;
  onClose: () => void;
  onSelect: (storyId: string) => void;
};

const KIND_CHIP: Record<StoryPoint["kind"], string> = {
  decision: "决策",
  march: "行军",
  battle: "战斗",
  crossing: "渡河",
  people: "人物",
  terrain: "地形",
  meeting: "会议",
};

/** 故事目录：按长征时间线排序，支持关键词过滤，点击直达对应故事。 */
export default function StoryCatalog({ open, onClose, onSelect }: Props) {
  const [query, setQuery] = useState("");

  const ordered = useMemo(() => {
    const nodeSeq = new Map(nodes.map((n) => [n.id, n.seq]));
    return [...stories].sort(
      (a, b) => (nodeSeq.get(a.nodeId)! - nodeSeq.get(b.nodeId)!) || (NODE_FRACTIONS[a.nodeId] - NODE_FRACTIONS[b.nodeId])
    );
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ordered;
    return ordered.filter((s) =>
      [s.title, s.shortTitle, s.place, s.dateLabel, s.summary].some((field) => field.toLowerCase().includes(q))
    );
  }, [ordered, query]);

  if (!open) return null;

  return (
    <div className="info-backdrop" onClick={onClose}>
      <div className="story-catalog" role="dialog" aria-modal="true" aria-label="沿途故事目录" onClick={(e) => e.stopPropagation()}>
        <div className="panel-header">
          <div className="panel-heading">
            <span className="panel-heading-sub">{stories.length} 个沿途故事 · 按时间线排序</span>
            <h2 className="panel-heading-main panel-title">故事目录</h2>
          </div>
          <button className="mini-btn" onClick={onClose} aria-label="关闭目录">
            关闭
          </button>
        </div>
        <div className="catalog-body">
          <div className="catalog-tools">
            <input
              className="catalog-search"
              type="search"
              placeholder="搜索标题、地点或关键词…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="搜索沿途故事"
            />
          </div>
          <ol className="catalog-list">
            {filtered.map((story) => {
              const presentation = getStoryMarkerPresentation(story.shortTitle, story.kind);
              const node = nodes.find((n) => n.id === story.nodeId);
              return (
                <li key={story.id}>
                  <button
                    className="catalog-item"
                    onClick={() => {
                      onSelect(story.id);
                      onClose();
                    }}
                  >
                    <span className="catalog-glyph" aria-hidden="true">{presentation.glyph}</span>
                    <span className="catalog-item-body">
                      <strong>{story.title}</strong>
                      <small>
                        {story.dateLabel} · {story.place} · 单元 {String(node?.seq ?? 0).padStart(2, "0")}
                      </small>
                    </span>
                    <span className={`story-kind kind-${story.kind}`}>{KIND_CHIP[story.kind]}</span>
                    <span className={`catalog-precision ${story.precision}`}>
                      {story.precision === "confirmed" ? "点位可确认" : "约略位置"}
                    </span>
                  </button>
                </li>
              );
            })}
            {filtered.length === 0 && <li className="catalog-empty">没有匹配的故事，换个关键词试试。</li>}
          </ol>
        </div>
      </div>
    </div>
  );
}
