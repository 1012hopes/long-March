import { useMemo } from "react";
import { nodes } from "../data/nodes";
import { segments } from "../data/sources";
import { activeSegmentAt, tToDateLabel, SEG_FRACTIONS } from "../data/time";
import { NODE_DATES } from "../data/time";
import profilesData from "../data/elevation-profiles.json";

type ProfilePoint = { d: number; e: number };
type SegmentProfile = {
  demSource: string;
  zoomLevel: number;
  approxSampleStepMeters: number;
  minElevMeters: number;
  maxElevMeters: number;
  ascentMeters: number;
  totalKm: number;
  profile: ProfilePoint[];
};
type ProfilesFile = { generated: string; profiles: Record<string, SegmentProfile> };
const profiles = profilesData as ProfilesFile;

type Props = {
  progress: number;
  selectedNodeId: string | null;
  expanded: boolean;
  onToggle: () => void;
  onScrub: (t: number) => void;
  playing: boolean;
  onPlayToggle: () => void;
};

const CERT_LABEL = {
  confirmed: "确定 · 史料明确",
  approximate: "约略 · 走廊示意",
  disputed: "争议 · 多候选并列",
} as const;

export default function BottomPanel(p: Props) {
  const activeSeg = activeSegmentAt(p.progress);
  const segMeta = segments.find((s) => s.id === activeSeg)!;

  const profileSegId = useMemo(() => {
    if (p.selectedNodeId) {
      const n = nodes.find((x) => x.id === p.selectedNodeId)!;
      return n.segmentIds[0];
    }
    return activeSeg;
  }, [p.selectedNodeId, activeSeg]);

  const prof = profiles.profiles[profileSegId] ?? null;
  const fromNode = nodes.find((n) => n.id === segMeta.fromNodeId)!;
  const toNode = nodes.find((n) => n.id === segMeta.toNodeId)!;

  // 剖面 SVG 路径
  const profilePath = useMemo(() => {
    if (!prof) return null;
    const W = 640;
    const H = 120;
    const pad = 6;
    const min = Math.min(...prof.profile.map((q) => q.e));
    const max = Math.max(...prof.profile.map((q) => q.e));
    const span = Math.max(200, max - min);
    const pts = prof.profile.map((q) => {
      const x = pad + (q.d / prof.totalKm) * (W - pad * 2);
      const y = H - pad - ((q.e - min) / span) * (H - pad * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });
    return {
      line: `M${pts.join("L")}`,
      area: `M${pad},${H - pad}L${pts.join("L")}L${W - pad},${H - pad}Z`,
      W,
      H,
      min,
      max,
    };
  }, [prof]);

  return (
    <div className={`bottom-panel ${p.expanded ? "half" : "summary"}`}>
      <button className="bottom-grabber" onClick={p.onToggle} aria-expanded={p.expanded}>
        <span className="grabber-line" aria-hidden="true" />
        <span className="sr-only">展开或收起地形面板</span>
      </button>

      <div className="bottom-summary">
        <div className="bs-date">
          <span className="bs-date-label mono">{tToDateLabel(p.progress)}</span>
          <button className="mini-btn" onClick={p.onPlayToggle}>
            {p.playing ? "暂停" : "▶"}
          </button>
          <input
            className="time-scrubber"
            type="range"
            min={0}
            max={1}
            step={0.001}
            value={p.progress}
            onChange={(e) => p.onScrub(parseFloat(e.target.value))}
            aria-label="时间进度"
          />
        </div>
        <div className="bs-seg">
          <span className={`cert-chip cert-${segMeta.certainty}`}>{CERT_LABEL[segMeta.certainty]}</span>
          <span className="bs-seg-range">
            {fromNode.shortTitle} → {toNode.shortTitle}
          </span>
        </div>
        <div className="bs-elev">
          {prof ? (
            <span className="mono">
              海拔 {prof.minElevMeters}-{prof.maxElevMeters} m · 累计爬升 ≈{prof.ascentMeters} m
            </span>
          ) : (
            <span className="fine">剖面数据生成中</span>
          )}
          <button className="mini-btn" onClick={p.onToggle} aria-label="展开海拔剖面">
            {p.expanded ? "收起 ▾" : "剖面 ▴"}
          </button>
        </div>
      </div>

      {p.expanded && (
        <div className="bottom-detail">
          {profilePath && prof ? (
            <>
              <svg
                className="profile-svg"
                viewBox={`0 0 ${profilePath.W} ${profilePath.H}`}
                preserveAspectRatio="none"
                role="img"
                aria-label={`${fromNode.title}至${toNode.title}的海拔剖面`}
              >
                <path d={profilePath.area} fill="rgba(114,121,99,0.22)" />
                <path d={profilePath.line} fill="none" stroke="#727963" strokeWidth="1.6" />
                <line x1="6" y1={profilePath.H - 6} x2={profilePath.W - 6} y2={profilePath.H - 6} stroke="#C9C1B3" strokeWidth="1" />
              </svg>
              <div className="profile-meta">
                <span>
                  {fromNode.shortTitle} → {toNode.title} · 全程约 {prof.totalKm} km（示意直线距离）
                </span>
                <span className="fine">
                  海拔剖面依据开放 DEM（{prof.demSource.split("(")[0].trim()}）派生，属可视化还原，不证明历史路线。
                </span>
              </div>
            </>
          ) : (
            <div className="profile-meta">
              <span className="fine">海拔剖面数据尚未生成：在 app 目录运行 npm run terrain。</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
