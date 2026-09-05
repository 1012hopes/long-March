import type { TerrainStatus } from "../map/terrainRuntime";

export type Mode = "tour" | "explore" | "sources";

type Props = {
  mode: Mode;
  onMode: (m: Mode) => void;
  terrainStatus: TerrainStatus;
  terrain3dActive: boolean;
  terrainPendingActivation: boolean;
  onTerrain3d: () => void;
  cruising: boolean;
  onCruiseToggle: () => void;
  focusMode: boolean;
  onFocusToggle: () => void;
  onInfo: () => void;
  onOpenCatalog: () => void;
  compareOn: boolean;
  onCompareToggle: () => void;
};

type TerrainButtonModel = {
  label: string;
  title: string;
  announcement: string;
  busy: boolean;
  disabled: boolean;
  pressed: boolean;
  className: string;
};

export function terrainButtonModel(
  status: TerrainStatus,
  active: boolean,
  pendingActivation: boolean
): TerrainButtonModel {
  if (active) {
    return {
      label: "关闭 3D",
      title: "关闭 3D 地形",
      announcement: "3D 地形已开启",
      busy: false,
      disabled: false,
      pressed: true,
      className: "tool-btn on",
    };
  }
  if (pendingActivation) {
    return {
      label: "3D 加载中",
      title: "3D 地形加载中，准备后将自动开启",
      announcement: "3D 地形加载中，准备后将自动开启",
      busy: true,
      disabled: true,
      pressed: false,
      className: "tool-btn busy",
    };
  }
  if (status === "ready") {
    return {
      label: "开启 3D",
      title: "本地 3D 地形已就绪",
      announcement: "3D 地形已就绪",
      busy: false,
      disabled: false,
      pressed: false,
      className: "tool-btn ready",
    };
  }
  if (status === "offline") {
    return {
      label: "3D 离线/重试",
      title: "3D 地形暂不可用，点击重试",
      announcement: "3D 地形暂不可用，可重试",
      busy: false,
      disabled: false,
      pressed: false,
      className: "tool-btn retry",
    };
  }
  if (status === "loading") {
    return {
      label: "3D 加载中",
      title: "3D 地形后台准备中，点击后就绪时自动开启",
      announcement: "3D 地形后台准备中",
      busy: true,
      disabled: false,
      pressed: false,
      className: "tool-btn busy",
    };
  }
  return {
    label: "3D 地形",
    title: "开启本地 3D 地形",
    announcement: "当前显示本地地形",
    busy: false,
    disabled: false,
    pressed: false,
    className: "tool-btn",
  };
}

export default function TopBar(p: Props) {
  const terrainButton = terrainButtonModel(p.terrainStatus, p.terrain3dActive, p.terrainPendingActivation);

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
        <button
          className={terrainButton.className}
          onClick={p.onTerrain3d}
          title={terrainButton.title}
          aria-pressed={terrainButton.pressed}
          aria-busy={terrainButton.busy}
          aria-describedby="terrain-status-live"
          disabled={terrainButton.disabled}
        >
          {terrainButton.label}
        </button>
        <button
          className={`tool-btn ${p.compareOn ? "on" : ""}`}
          onClick={p.onCompareToggle}
          title="古今对照：左看 1935 纸面档案，右看当今地形，拖动分割线比较"
          aria-pressed={p.compareOn}
        >
          古今对照
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
      <span id="terrain-status-live" className="sr-only" role="status" aria-live="polite">
        {terrainButton.announcement}
      </span>
      </div>
    </header>
  );
}
