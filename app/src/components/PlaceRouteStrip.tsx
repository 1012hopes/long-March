import { useMemo } from "react";
import { nodes } from "../data/nodes";
import { NODE_FRACTIONS, timelineMarkers } from "../data/time";
import { PRECISION_SHORT_LABEL, type PrecisionKind } from "../map/precisionExplain";

const SCALE_TICKS = [
  { label: "1934.10", t: 0 },
  { label: "1935.1", t: 0.22 },
  { label: "1935.5", t: 0.58 },
  { label: "1935.10", t: 0.96 },
] as const;

type Props = {
  selectedNodeId: string | null;
  onSelectNode: (id: string) => void;
  precisionEmphasis?: PrecisionKind | null;
  onPrecisionToggle?: (kind: PrecisionKind) => void;
};

/** 地点详情内的「沿线时间与节点」：把原左栏信息收进学习面板 */
export default function PlaceRouteStrip({
  selectedNodeId,
  onSelectNode,
  precisionEmphasis = null,
  onPrecisionToggle,
}: Props) {
  const markers = useMemo(() => timelineMarkers(), []);
  const selectedT = selectedNodeId ? NODE_FRACTIONS[selectedNodeId] : null;
  const selectedNode = selectedNodeId ? nodes.find((n) => n.id === selectedNodeId) : null;

  return (
    <section className="place-route-strip" aria-label="沿线时间与节点">
      <div className="prs-head">
        <div className="prs-heading">
          <span className="prs-kicker mono">ROUTE LEDGER · 01—09</span>
          <h3>沿线时间与节点</h3>
        </div>
        <p className="prs-span mono">
          1934.10 <span aria-hidden="true">—</span> 1935.10
          {selectedNode ? <span className="prs-current-tag"> · 第 {String(selectedNode.seq).padStart(2, "0")} 站</span> : null}
        </p>
      </div>

      {selectedNode && onPrecisionToggle && (
        <div className="prs-precision-row">
          <span className="prs-precision-label">本节点精度</span>
          <button
            type="button"
            className={`chip chip-precision chip-toggle ${precisionEmphasis === selectedNode.precision ? "active" : ""}`}
            aria-pressed={precisionEmphasis === selectedNode.precision}
            onClick={() => onPrecisionToggle(selectedNode.precision)}
            title="点选后地图强调对应精度画法，并展开说明"
          >
            {PRECISION_SHORT_LABEL[selectedNode.precision]}
            <span className="chip-hint">地图解释</span>
          </button>
        </div>
      )}

      <div className="prs-track-wrap">
        <div className="prs-scale" aria-hidden="true">
          {SCALE_TICKS.map((tick) => (
            <span key={tick.label} className="prs-scale-label" style={{ left: `${tick.t * 100}%` }}>
              {tick.label}
            </span>
          ))}
        </div>
        <div className="prs-rail" aria-hidden="true">
          <div className="prs-line" />
          {selectedT !== null && <div className="prs-cursor" style={{ left: `${selectedT * 100}%` }} />}
        </div>
        <ol className="prs-markers">
          {markers.map((marker) => {
            const node = nodes.find((item) => item.id === marker.id)!;
            const selected = selectedNodeId === marker.id;
            return (
              <li key={marker.id} className={`prs-item ${selected ? "selected" : ""}`.trim()}>
                <button
                  type="button"
                  className="prs-btn"
                  style={{ left: `${marker.t * 100}%` }}
                  title={`${marker.title}（${marker.dateLabel}）`}
                  aria-label={`切换到地点：${marker.title}，${marker.dateLabel}`}
                  aria-current={selected ? "step" : undefined}
                  onClick={() => onSelectNode(marker.id)}
                >
                  <span className="prs-dot" aria-hidden="true" />
                  <span className="prs-label">
                    <span className="prs-seq mono">{String(node.seq).padStart(2, "0")}</span>
                    {selected && <span className="prs-title">{node.shortTitle}</span>}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>

      <ol className="prs-list">
        {nodes.map((node) => {
          const selected = selectedNodeId === node.id;
          return (
            <li key={node.id} className={selected ? "selected" : undefined}>
              <button type="button" className="prs-list-btn" onClick={() => onSelectNode(node.id)}>
                <span className="prs-list-seq mono">{String(node.seq).padStart(2, "0")}</span>
                <span className="prs-list-body">
                  <span className="prs-list-title">{node.shortTitle}</span>
                  <span className="prs-list-meta">
                    <span className="mono">{node.displayDateLabel}</span>
                    <span className="prs-list-prec">{PRECISION_SHORT_LABEL[node.precision]}</span>
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      <p className="prs-fine">
        点选站点切换地点。底部时间尺可拖动；路线为史料绘制示意，非逐日 GPS。中央红军主线以 1935-10-22 吴起镇会议收束。
      </p>
    </section>
  );
}
