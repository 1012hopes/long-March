export type Mode = "tour" | "explore" | "sources";

type Props = {
  mode: Mode;
  onMode: (m: Mode) => void;
  playing: boolean;
  onPlayToggle: () => void;
  terrain3d: boolean;
  onTerrain3d: () => void;
  focusMode: boolean;
  onFocusToggle: () => void;
  onInfo: () => void;
};

export default function TopBar(p: Props) {
  return (
    <header className="topbar">
      <div className="topbar-cartouche">
        <div className="topbar-brand">
        <div className="brand-text">
          <h1>
            <span className="brand-primary">长征</span>
            <span className="brand-secondary">一条路的来处</span>
          </h1>
          <span className="brand-sub">沿真实地理、时间与史料进入历史现场</span>
        </div>
        <div className="brand-period" aria-label="中央红军长征主线时间">
          <span>1934.10</span>
          <i aria-hidden="true" />
          <span>1935.10</span>
        </div>
        </div>
      </div>

      <div className="topbar-controls">
      <nav className="topbar-modes" aria-label="学习模式">
        <button className={`mode-btn ${p.mode === "tour" ? "active" : ""}`} onClick={() => p.onMode("tour")}>
          跟我走一遍
        </button>
        <button className={`mode-btn ${p.mode === "explore" ? "active" : ""}`} onClick={() => p.onMode("explore")}>
          自己查地图
        </button>
        <button className={`mode-btn ${p.mode === "sources" ? "active" : ""}`} onClick={() => p.onMode("sources")}>
          查史料与出处
        </button>
      </nav>

      <div className="topbar-actions">
        {p.mode !== "sources" && (
          <button
            className={`tool-btn ${p.playing ? "on" : ""}`}
            onClick={p.onPlayToggle}
            title="沿时间顺序播放路线"
          >
            {p.playing ? "暂停" : "▶ 播放"}
          </button>
        )}
        <button className={`tool-btn ${p.terrain3d ? "on" : ""}`} onClick={p.onTerrain3d} title="3D 地形">
          3D 地形
        </button>
        <button className="tool-btn" onClick={p.onFocusToggle} title="收起全部面板">
          {p.focusMode ? "退出专注" : "专注地图"}
        </button>
        <button className="tool-btn" onClick={p.onInfo} title="关于本演示">
          说明
        </button>
      </div>
      </div>
    </header>
  );
}
