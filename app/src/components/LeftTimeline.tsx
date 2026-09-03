import { useEffect, useMemo, useRef } from "react";
import { nodes } from "../data/nodes";
import {
  NODE_DATES,
  dateToT,
  isoToDateLabel,
  timelineMarkers,
  type TimelineMarker,
} from "../data/time";

type Props = {
  timelineT: number;
  selectedNodeId: string | null;
  collapsed: boolean;
  mobileOpen?: boolean;
  onToggleCollapse: () => void;
  onSelect: (id: string) => void;
  onTimelineChange: (t: number) => void;
};

const PRECISION_TEXT = {
  confirmed: "史料明确",
  approximate: "约略",
  disputed: "多候选",
} as const;

const SCALE_TICKS = [
  { label: "1934年10月", t: dateToT("1934-10-10") },
  { label: "1935年1月", t: dateToT("1935-01-01") },
  { label: "1935年5月", t: dateToT("1935-05-01") },
  { label: "1935年10月", t: dateToT("1935-10-01") },
] as const;

const prefersReducedMotion = () =>
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

export default function LeftTimeline(p: Props) {
  const listRef = useRef<HTMLOListElement>(null);
  // 首次渲染不抢占阅读位置；之后跟随选中节点或当前时间定位。
  const mountedRef = useRef(false);
  const markers = useMemo(() => timelineMarkers(), []);

  // 当前时间驱动的“节点脊柱”位置，按真实日期而非等间距列表。
  const activeNodeId = useMemo(() => {
    let current = markers[0]?.id ?? nodes[0].id;
    for (const marker of markers) {
      if (p.timelineT >= marker.t - 1e-6) current = marker.id;
    }
    return current;
  }, [markers, p.timelineT]);

  const activateMarker = (marker: TimelineMarker) => {
    p.onTimelineChange(marker.t);
    p.onSelect(marker.id);
  };

  useEffect(() => {
    if (p.collapsed) return;
    if (!mountedRef.current) {
      mountedRef.current = true;
      if (!p.selectedNodeId) return;
    }
    const target = p.selectedNodeId ?? activeNodeId;
    const el = listRef.current?.querySelector<HTMLLIElement>(`[data-node="${target}"]`);
    el?.scrollIntoView({ block: "nearest", behavior: prefersReducedMotion() ? "auto" : "smooth" });
  }, [activeNodeId, p.collapsed, p.selectedNodeId]);

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

          <div className="timeline-layout">
            <div className="timeline-side">
              <div className="timeline-scale" aria-hidden="true">
                {SCALE_TICKS.map((tick, index) => (
                  <div
                    key={tick.label}
                    className={`timeline-scale-item ${index % 2 === 0 ? "left" : "right"}`}
                    style={{ top: `${tick.t * 100}%` }}
                  >
                    <span className="timeline-scale-label">{tick.label}</span>
                    <span className="timeline-scale-rule" />
                  </div>
                ))}
              </div>
              <div className="timeline-rail" aria-hidden="true">
                <div className="timeline-track" />
                <div className="timeline-current" style={{ top: `${p.timelineT * 100}%` }} />
              </div>
              <div className="timeline-marker-layer">
                {markers.map((marker) => {
                  const selected = p.selectedNodeId === marker.id;
                  const current = marker.id === activeNodeId;
                  return (
                    <button
                      key={marker.id}
                      className={`timeline-marker ${selected ? "selected" : ""} ${current ? "current" : ""}`.trim()}
                      style={{ top: `${marker.t * 100}%` }}
                      title={`${marker.title}（${marker.dateLabel}）`}
                      aria-label={`跳转到节点：${marker.title}，${marker.dateLabel}`}
                      aria-current={current ? "step" : undefined}
                      onClick={() => activateMarker(marker)}
                    >
                      <span className="timeline-marker-dot" aria-hidden="true" />
                    </button>
                  );
                })}
              </div>
            </div>

            <ol className="timeline-list" ref={listRef}>
              {nodes.map((node) => {
                const marker = markers.find((item) => item.id === node.id)!;
                const selected = p.selectedNodeId === node.id;
                const current = node.id === activeNodeId;
                return (
                  <li
                    key={node.id}
                    data-node={node.id}
                    aria-current={current ? "step" : undefined}
                    className={`${selected ? "selected" : ""} ${current ? "current" : ""}`.trim()}
                  >
                    <button className="timeline-item" onClick={() => activateMarker(marker)}>
                      <span className="tl-body">
                        <span className="tl-meta">
                          <span className="tl-date">{node.displayDateLabel}</span>
                          <span className="tl-precision">{PRECISION_TEXT[node.precision]}</span>
                        </span>
                        <span className="tl-title">{node.shortTitle}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>

          <div className="left-footer">
            <span className="fine">中央红军主线 · {isoToDateLabel(NODE_DATES["node-09"][1])}政治局扩大会议收束</span>
          </div>
        </div>
      )}
    </aside>
  );
}
