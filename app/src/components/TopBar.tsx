export type Mode = "tour" | "explore" | "sources";

type Props = {
  mode: Mode;
  onMode: (m: Mode) => void;
  terrain3d: boolean;
  onTerrain3d: () => void;
  cruising: boolean;
  onCruiseToggle: () => void;
  focusMode: boolean;
  onFocusToggle: () => void;
  onInfo: () => void;
  onOpenCatalog: () => void;
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

      <span className="topbar-sep" aria-hidden="true" />

      <div className="topbar-actions">
        <button className="tool-btn" onClick={p.onOpenCatalog} title="按时间线浏览全部沿途故事">
          故事目录
        </button>
        <button className={`tool-btn ${p.terrain3d ? "on" : ""}`} onClick={p.onTerrain3d} title="3D 地形">
          3D 地形
        </button>
        <button
          className={`tool-btn ${p.cruising ? "on" : ""}`}
          onClick={p.onCruiseToggle}
          title="3D 沿线巡航：镜头贴着路线低空飞行，按 Esc 退出"
        >
          {p.cruising ? "退出巡航" : "巡航"}
        </button>
        <button className="tool-btn" onClick={p.onFocusToggle} title="收起全部面板">
          {p.focusMode ? "退出专注" : "专注地图"}
        </button>
        <span className="topbar-sep" aria-hidden="true" />
        <button className="tool-btn" onClick={p.onInfo} title="关于本演示">
          说明
        </button>
      </div>
      </div>
    </header>
  );
}
