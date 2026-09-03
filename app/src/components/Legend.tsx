import { useState } from "react";
import { stories } from "../data/stories";

type Props = {
  showEpilogue: boolean;
  onEpilogue: (v: boolean) => void;
  showStories: boolean;
  onStories: (v: boolean) => void;
  onResetView: () => void;
};

export default function Legend(p: Props) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`legend ${open ? "" : "closed"}`}>
      <button className="legend-toggle" onClick={() => setOpen(!open)}>
        {open ? "图例 ▾" : "图例 ▴"}
      </button>
      {open && (
        <div className="legend-body">
          <div className="legend-row">
            <svg width="34" height="10" aria-hidden="true">
              <line x1="1" y1="5" x2="33" y2="5" stroke="#A6322B" strokeWidth="3" />
            </svg>
            <span>确定路线 · 史料明确</span>
          </div>
          <div className="legend-row">
            <svg width="34" height="10" aria-hidden="true">
              <rect x="1" y="1" width="32" height="8" rx="4" fill="#D8A39D" opacity="0.45" />
              <line x1="4" y1="5" x2="30" y2="5" stroke="#A6322B" strokeWidth="1.2" />
            </svg>
            <span>约略走廊 · 范围示意</span>
          </div>
          <div className="legend-row">
            <svg width="34" height="10" aria-hidden="true">
              <line x1="1" y1="3" x2="33" y2="3" stroke="#765B78" strokeWidth="1.8" strokeDasharray="2.5 2.5" />
              <line x1="1" y1="7" x2="33" y2="7" stroke="#765B78" strokeWidth="1.4" strokeDasharray="2.5 2.5" />
            </svg>
            <span>争议候选 · 并列呈现</span>
          </div>
          <label className="legend-check">
            <input type="checkbox" checked={p.showStories} onChange={(e) => p.onStories(e.target.checked)} />
            <span>显示 {stories.length} 个沿途故事与人物事件</span>
          </label>
          <label className="legend-check">
            <input type="checkbox" checked={p.showEpilogue} onChange={(e) => p.onEpilogue(e.target.checked)} />
            <span>显示 1936 三大主力会师尾声</span>
          </label>
          <button className="mini-btn" onClick={p.onResetView}>
            回到路线全景
          </button>
          <p className="legend-fine">图例说明精度，不只靠颜色区分 · 路线为示意还原，不是逐日轨迹</p>
        </div>
      )}
    </div>
  );
}
