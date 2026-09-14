import { useMemo, useState } from "react";
import { nodes } from "../data/nodes";
import { segments } from "../data/sources";
import { activeSegmentAt, tToDateLabel, NODE_FRACTIONS } from "../data/time";
import { NODE_DATES } from "../data/time";
import profilesData from "../data/elevation-profiles.json";
import type { PrecisionKind } from "../map/precisionExplain";

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
  scrubbingLocked: boolean;
  timelineT: number;
  selectedNodeId: string | null;
  expanded: boolean;
  onToggle: () => void;
  onTimelineChange: (t: number) => void;
  playing: boolean;
  onPlayToggle: () => void;
  voiceOn: boolean;
  onVoiceToggle: () => void;
  ambientOn: boolean;
  onAmbientToggle: () => void;
  precisionEmphasis?: PrecisionKind | null;
  onPrecisionToggle?: (kind: PrecisionKind) => void;
};

const CERT_LABEL = {
  confirmed: "确定 · 史料明确",
  approximate: "约略 · 走廊示意",
  disputed: "争议 · 多候选并列",
} as const;

const CERT_HINT = {
  confirmed: "当前路段的走向有明确史料支撑，按史料绘制。",
  approximate: "当前路段的史料只给出大致范围，路线按走廊示意。",
  disputed: "当前路段存在多条候选走向，图中以虚线并列呈现，不作唯一结论。",
} as const;

export default function BottomPanel(p: Props) {
  const [scrubActive, setScrubActive] = useState(false);
  const activeSeg = activeSegmentAt(p.timelineT);
  const segMeta = segments.find((s) => s.id === activeSeg)!;
  const currentLabel = tToDateLabel(p.timelineT);

  const profileSegId = useMemo(() => {
    if (p.selectedNodeId) {
      const n = nodes.find((x) => x.id === p.selectedNodeId)!;
      return n.segmentIds[0];
    }
    return activeSeg;
  }, [p.selectedNodeId, activeSeg]);

  // 剖面台账以候选线为键（seg-04a/seg-08b…）；段级 ID 依次回退到主、次候选线。
  const profKey = useMemo(() => {
    const candidates = [profileSegId, `${profileSegId}a`, `${profileSegId}b`];
    return candidates.find((key) => profiles.profiles[key]) ?? null;
  }, [profileSegId]);
  const prof = profKey ? profiles.profiles[profKey] : null;
  const profFromCandidate = profKey !== null && profKey !== profileSegId;
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
    <div className={`bottom-panel instrument ${p.expanded ? "half" : "summary"}`}>
      <button className="bottom-grabber" onClick={p.onToggle} aria-expanded={p.expanded}>
        <span className="grabber-line" aria-hidden="true" />
        <span className="sr-only">展开或收起地形面板</span>
      </button>

      <div className="bottom-summary">
        <div className="bs-date">
          <button
            className={`play-orb ${p.playing ? "playing" : ""}`}
            onClick={p.onPlayToggle}
            aria-label={p.playing ? "暂停时间轴" : "播放时间轴"}
            title={p.playing ? "暂停" : "播放全程"}
          >
            <span aria-hidden="true">{p.playing ? "❚❚" : "▶"}</span>
          </button>
          <span className="bs-time-readout">
            <span className="bs-time-kicker">当前时点</span>
            <span className="bs-date-label mono">{currentLabel}</span>
          </span>
        </div>

        <div className="scrub-wrap">
          <span className={`scrub-preview ${scrubActive ? "active" : ""}`} aria-hidden="true">
            拖动中 · {currentLabel}
          </span>
          <input
            className="time-scrubber"
            type="range"
            min={0}
            max={1}
            step={0.001}
            value={p.timelineT}
            disabled={p.scrubbingLocked}
            onPointerDown={() => setScrubActive(true)}
            onPointerUp={() => setScrubActive(false)}
            onPointerCancel={() => setScrubActive(false)}
            onFocus={() => setScrubActive(true)}
            onBlur={() => setScrubActive(false)}
            onChange={(e) => p.onTimelineChange(parseFloat(e.target.value))}
            aria-label="时间进度"
            aria-valuetext={currentLabel}
          />
          <div className="scrub-ticks">
            {nodes.map((n) => {
              const frac = NODE_FRACTIONS[n.id];
              const reached = p.timelineT >= frac - 1e-6;
              return (
                <button
                  key={n.id}
                  className={`scrub-tick ${reached ? "reached" : ""}`}
                  style={{ left: `${frac * 100}%` }}
                  title={`${n.shortTitle}（${n.displayDateLabel}）`}
                  aria-label={`时间轴跳到节点：${n.shortTitle}`}
                  disabled={p.scrubbingLocked}
                  onClick={() => p.onTimelineChange(frac)}
                />
              );
            })}
          </div>
        </div>

        <div className="bs-seg">
          <button
            type="button"
            className={`cert-chip cert-${segMeta.certainty} chip-toggle ${p.precisionEmphasis === segMeta.certainty ? "active" : ""}`}
            title={CERT_HINT[segMeta.certainty]}
            aria-label={`当前路段精度：${CERT_LABEL[segMeta.certainty]}。${CERT_HINT[segMeta.certainty]}`}
            aria-pressed={p.precisionEmphasis === segMeta.certainty}
            onClick={() => p.onPrecisionToggle?.(segMeta.certainty)}
          >
            {CERT_LABEL[segMeta.certainty]}
          </button>
          <span className="bs-seg-range">
            {fromNode.shortTitle} → {toNode.shortTitle}
          </span>
        </div>

        <div className="bs-elev">
          <span className="bs-elev-readout mono">
            {prof ? (
              <>
                <span className="bs-elev-label">海拔</span>
                {prof.minElevMeters}–{prof.maxElevMeters} m
                <span className="bs-elev-sep" aria-hidden="true">·</span>
                <span className="bs-elev-label">爬升</span>
                ≈{prof.ascentMeters} m
              </>
            ) : (
              <span className="fine">暂无剖面</span>
            )}
          </span>
          <div className="bs-audio">
            <button
              className={`mini-btn toggle-btn ${p.voiceOn ? "on" : ""}`}
              onClick={p.onVoiceToggle}
              aria-pressed={p.voiceOn}
              title="播放时朗读旁白（使用浏览器自带语音，默认关闭）"
            >
              ♪ 旁白
            </button>
            <button
              className={`mini-btn toggle-btn ${p.ambientOn ? "on" : ""}`}
              onClick={p.onAmbientToggle}
              aria-pressed={p.ambientOn}
              title="风声环境音（浏览器实时合成，无素材，默认关闭）"
            >
              ≋ 环境
            </button>
            <button className="mini-btn profile-toggle" onClick={p.onToggle} aria-label="展开海拔剖面">
              {p.expanded ? "收起" : "剖面"}
            </button>
          </div>
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
                  {profFromCandidate ? "按该段主候选线计算。" : ""}
                </span>
              </div>
            </>
          ) : (
            <div className="profile-meta">
              <span className="fine">该段暂无剖面数据：在 app 目录运行 npm run terrain 生成。</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
