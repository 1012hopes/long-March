import { useState } from "react";

export type MapLayerVisibility = {
  terrain: boolean;
  contours: boolean;
  water: boolean;
  labels: boolean;
  route: boolean;
  nodes: boolean;
  stories: boolean;
};

type Props = {
  layers: MapLayerVisibility;
  onChange: (key: keyof MapLayerVisibility, value: boolean) => void;
  onPreset: (preset: "map" | "all") => void;
};

const LABELS: Array<[keyof MapLayerVisibility, string, string]> = [
  ["terrain", "高程分层设色", "分层色带 + 柔和晕渲"],
  ["contours", "等高线", "200 / 100 / 50 米"],
  ["water", "河流湖泊", "自然地理参照"],
  ["labels", "地名山系", "随缩放分级"],
  ["route", "长征路线", "含精度编码"],
  ["nodes", "教学节点", "九个核心单元"],
  ["stories", "沿途故事", "人物与事件"],
];

export default function LayerPanel(p: Props) {
  const [open, setOpen] = useState(false);
  const activeCount = Object.values(p.layers).filter(Boolean).length;

  return (
    <div className={"layer-panel " + (open ? "open" : "closed")}>
      <button className="layer-panel-toggle" onClick={() => setOpen((value) => !value)} aria-expanded={open}>
        <span>图层</span>
        <span className="mono">{activeCount}/7</span>
      </button>
      {open && (
        <div className="layer-panel-body">
          <div className="layer-presets">
            <button onClick={() => p.onPreset("map")}>纯地图</button>
            <button onClick={() => p.onPreset("all")}>全部信息</button>
          </div>
          <div className="elevation-key" aria-label="高程分层设色色带">
            <span className="elevation-key-title">高程</span>
            <span className="elevation-key-bar" aria-hidden="true" />
            <span className="elevation-key-labels">
              <small>0</small>
              <small>1000</small>
              <small>3000</small>
              <small>5000 m</small>
            </span>
          </div>
          {LABELS.map(([key, label, detail]) => (
            <label className="layer-row" key={key}>
              <input
                type="checkbox"
                checked={p.layers[key]}
                onChange={(event) => p.onChange(key, event.target.checked)}
              />
              <span>
                <strong>{label}</strong>
                <small>{detail}</small>
              </span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
