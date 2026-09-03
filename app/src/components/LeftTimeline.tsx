import { useEffect, useMemo, useRef } from "react";
import { nodes } from "../data/nodes";
import { NODE_FRACTIONS, isoToDateLabel, NODE_DATES } from "../data/time";

type Props = {
  timelineT: number;
  selectedNodeId: string | null;
  collapsed: boolean;
  mobileOpen?: boolean;
  onToggleCollapse: () => void;
  onSelect: (id: string) => void;
};

const PRECISION_TEXT = {
  confirmed: "史料明确",
  approximate: "约略",
  disputed: "多候选",
} as const;

const prefersReducedMotion = () =>
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

export default function LeftTimeline(p: Props) {
  const listRef = useRef<HTMLOListElement>(null);
  // 首次渲染不抢占阅读位置（progress 常为 1，会把列表直接拽到末尾）；
  // 之后的进度变化（拖时间轴、播放、翻页）都跟随。
  const mountedRef = useRef(false);

  // 进度驱动的“当前节点”：最后一条已到达的节点。
  const activeNodeId = useMemo(() => {
    let current = nodes[0].id;
    for (const n of nodes) {
      if (p.timelineT >= NODE_FRACTIONS[n.id] - 1e-6) current = n.id;
    }
    return current;
  }, [p.timelineT]);

  useEffect(() => {
    if (p.collapsed) return;
    if (!mountedRef.current) {
      mountedRef.current = true;
      if (!p.selectedNodeId) return;
    }
    const target = p.selectedNodeId ?? activeNodeId;
    const el = listRef.current?.querySelector<HTMLLIElement>(`[data-node="${target}"]`);
    el?.scrollIntoView({ block: "nearest", behavior: prefersReducedMotion() ? "auto" : "smooth" });
  }, [p.selectedNodeId, activeNodeId, p.collapsed]);

  return (
    <aside className={`left-panel ${p.collapsed ? "rail" : "expanded"} ${p.mobileOpen ? "mobile-open" : ""}`}>
      {p.collapsed ? (
        <button className="rail-expand" onClick={p.onToggleCollapse} aria-label="展开时间与节点">
          <span className="rail-years">1934→1935</span>
          <span className="rail-label">时间与节点</span>
        </button>
      ) : (
        <div className="left-inner">
          <div className="panel-header">
            <div className="panel-heading">
              <span className="panel-heading-sub">1934.10 - 1935.10</span>
              <h2 className="panel-heading-main">时间与节点</h2>
            </div>
            <button className="mini-btn" onClick={p.onToggleCollapse} aria-label="收起">
              收起
            </button>
          </div>
          <div className="timeline-rail" aria-hidden="true">
            <div className="timeline-fill" style={{ height: `${p.timelineT * 100}%` }} />
          </div>
          <ol className="timeline-list" ref={listRef}>
            {nodes.map((n) => {
              const frac = NODE_FRACTIONS[n.id];
              const reached = p.timelineT >= frac - 1e-6;
              const selected = p.selectedNodeId === n.id;
              const current = n.id === activeNodeId;
              return (
                <li
                  key={n.id}
                  data-node={n.id}
                  aria-current={current ? "step" : undefined}
                  className={`${selected ? "selected" : ""} ${current ? "current" : ""} ${
                    reached ? "reached" : ""
                  }`.trim()}
                >
                  <button className="timeline-item" onClick={() => p.onSelect(n.id)}>
                    <span className="tl-dot" aria-hidden="true" />
                    <span className="tl-body">
                      <span className="tl-meta">
                        <span className="tl-date">{n.displayDateLabel}</span>
                        <span className="tl-precision">{PRECISION_TEXT[n.precision]}</span>
                      </span>
                      <span className="tl-title">{n.shortTitle}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
          <div className="left-footer">
            <span className="fine">中央红军主线 · {isoToDateLabel(NODE_DATES["node-09"][1])}政治局扩大会议收束</span>
          </div>
        </div>
      )}
    </aside>
  );
}
