import { useEffect, useMemo } from "react";
import type { PrecisionKind } from "../map/precisionExplain";
import {
  PRECISION_MAP_LEGEND,
  PRECISION_ORDER,
  buildPrecisionExplain,
  sourcePreview,
  type PrecisionExplain,
} from "../map/precisionExplain";
import type { NodeUnit } from "../data/nodes";

type Props = {
  kind: PrecisionKind;
  node: NodeUnit | null;
  focusCandidateLineId?: string | null;
  onClose: () => void;
  onKindChange?: (kind: PrecisionKind) => void;
  onFocusCandidate?: (lineId: string | null) => void;
  onOpenSources?: (nodeId?: string) => void;
};

export default function PrecisionExplainCard({
  kind,
  node,
  focusCandidateLineId = null,
  onClose,
  onKindChange,
  onFocusCandidate,
  onOpenSources,
}: Props) {
  const explain: PrecisionExplain = useMemo(() => buildPrecisionExplain({ kind, node }), [kind, node]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onClose]);

  return (
    <aside
      className={`precision-card kind-${kind} sheet`}
      role="dialog"
      aria-label={`精度说明：${explain.title}`}
      aria-live="polite"
    >
      <header className="precision-card-head">
        <div>
          <span className="precision-kicker mono">PRECISION · {kind.toUpperCase()}</span>
          <h3>
            {explain.title}
            <span className="precision-map-mark" aria-hidden="true">
              {kind === "confirmed" ? "━━" : kind === "approximate" ? "▬▬" : "╌╌"}
            </span>
          </h3>
        </div>
        <button type="button" className="mini-btn precision-close" onClick={onClose} aria-label="关闭精度说明">
          关闭
        </button>
      </header>

      <dl className="precision-rows">
        <div>
          <dt>你会看到</dt>
          <dd>{explain.see}</dd>
        </div>
        <div>
          <dt>为什么这样画</dt>
          <dd>{explain.reasoning ?? explain.why}</dd>
        </div>
        {explain.disputeNote && (
          <div>
            <dt>分歧是什么</dt>
            <dd className="precision-dispute-note">{explain.disputeNote}</dd>
          </div>
        )}
        <div>
          <dt>范围</dt>
          <dd>{explain.scopeLabel}</dd>
        </div>
        <div>
          <dt>图例</dt>
          <dd>{PRECISION_MAP_LEGEND[kind]}</dd>
        </div>
      </dl>

      <p className="precision-fine">
        路线为史料绘制的可视化还原，不是逐日 GPS。争议段不预设唯一正确答案。
      </p>

      {explain.candidates.length > 0 && onFocusCandidate && (
        <div className="precision-candidates">
          <span className="precision-sources-label mono">争议候选线</span>
          <div className="precision-candidate-row" role="group" aria-label="选择候选线">
            <button
              type="button"
              className={`precision-candidate-btn ${focusCandidateLineId === null ? "active" : ""}`}
              aria-pressed={focusCandidateLineId === null}
              onClick={() => onFocusCandidate(null)}
            >
              全部并列
            </button>
            {explain.candidates.map((candidate) => (
              <button
                key={candidate.id}
                type="button"
                className={`precision-candidate-btn ${focusCandidateLineId === candidate.id ? "active" : ""}`}
                aria-pressed={focusCandidateLineId === candidate.id}
                onClick={() => onFocusCandidate(candidate.id)}
              >
                {candidate.label}
                <span className="mono">{candidate.id}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {explain.sourceCount > 0 && (
        <div className="precision-sources">
          <span className="precision-sources-label mono">依据 {explain.sourceCount} 条</span>
          <ul>
            {explain.sourceIds.slice(0, 3).map((id) => {
              const preview = sourcePreview(id);
              if (!preview) return null;
              return (
                <li key={id}>
                  <span className="mono">{id}</span> {preview.title}
                </li>
              );
            })}
            {explain.sourceCount > 3 && <li className="fine">…其余见史料与出处</li>}
          </ul>
          {onOpenSources && (
            <button
              type="button"
              className="ghost-btn precision-sources-open"
              onClick={() => onOpenSources(explain.focusNodeId ?? undefined)}
            >
              查看全部依据
            </button>
          )}
        </div>
      )}

      <div className="precision-switch" role="group" aria-label="切换精度说明">
        {PRECISION_ORDER.map((item) => (
          <button
            key={item}
            type="button"
            className={`precision-switch-btn ${item === kind ? "active" : ""}`}
            aria-pressed={item === kind}
            onClick={() => onKindChange?.(item)}
          >
            {PRECISION_MAP_LEGEND[item]}
          </button>
        ))}
      </div>
    </aside>
  );
}
