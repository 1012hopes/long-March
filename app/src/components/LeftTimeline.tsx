import { nodes } from "../data/nodes";
import { NODE_FRACTIONS, isoToDateLabel, NODE_DATES } from "../data/time";

type Props = {
  progress: number;
  selectedNodeId: string | null;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onSelect: (id: string) => void;
};

const PRECISION_TEXT = {
  confirmed: "史料明确",
  approximate: "约略",
  disputed: "多候选",
} as const;

export default function LeftTimeline(p: Props) {
  return (
    <aside className={`left-panel ${p.collapsed ? "rail" : "expanded"}`}>
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
            <div className="timeline-fill" style={{ height: `${p.progress * 100}%` }} />
          </div>
          <ol className="timeline-list">
            {nodes.map((n) => {
              const frac = NODE_FRACTIONS[n.id];
              const reached = p.progress >= frac - 1e-6;
              const selected = p.selectedNodeId === n.id;
              return (
                <li key={n.id} className={selected ? "selected" : reached ? "reached" : ""}>
                  <button className="timeline-item" onClick={() => p.onSelect(n.id)}>
                    <span className="tl-dot" aria-hidden="true" />
                    <span className="tl-body">
                      <span className="tl-date">{n.displayDateLabel}</span>
                      <span className="tl-title">{n.shortTitle}</span>
                      <span className="tl-precision">{PRECISION_TEXT[n.precision]}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
          <div className="left-footer">
            <span className="mono">1934-10-10 → 1935-10-22</span>
            <span className="fine">中央红军主线 · {isoToDateLabel(NODE_DATES["node-09"][1])}政治局扩大会议收束</span>
          </div>
        </div>
      )}
    </aside>
  );
}
