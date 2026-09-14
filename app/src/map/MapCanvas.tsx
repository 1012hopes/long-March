import { useEffect, useLayoutEffect, useRef, useState, type Ref } from "react";
import maplibregl, { type Map as MlMap, type LngLatBoundsLike } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { buildStyle, MAP_LAYER_IDS, probeHillshade, type HillshadeBbox } from "./style";
import type { NodeMapScene } from "../data/nodeScenes";
import type { LearningEmphasis } from "../components/nodeLearning";
import {
  emptyNodeHydrography,
  NODE_HYDROGRAPHY_SOURCE_ID,
  NODE_HYDROGRAPHY_LINE_LAYER_ID,
  NODE_HYDROGRAPHY_POINT_LAYER_ID,
  sceneHydrography,
} from "../data/nodeHydrography";
import {
  COMPARE_HILLSHADE_LAYER_ID,
  cancelOnlineTerrain,
  ensureCompareHillshade,
  ensureDetailContours,
  ensureMajorContours,
  ensureOnlineTerrain,
  loadContourLabels,
  resetOnlineTerrain,
  terrainExaggerationForMode,
} from "./terrainRuntime";
import {
  SCENE_ANNOTATION_LAYER_ID,
  SCENE_BADGE_LAYER_ID,
  type SceneMapLike,
  annotationPresentation,
  applyNodeScene,
  applyNodeSceneEmphasis,
  clearNodeScene,
  hoverRouteLineWidth,
  restoreHoveredRouteLineWidth,
} from "./nodeScenePresentation";
import { applyLearningEmphasisSupportPaint } from "./learningEmphasisPaint";
import {
  applyPrecisionEmphasisPaint,
  precisionWidthScale,
  resetPrecisionEmphasisPaint,
  type PrecisionPaintMapLike,
} from "./precisionEmphasisPaint";
import type { PrecisionKind } from "./precisionExplain";
import { applyNodeTerrain, clearNodeTerrain, type NodeTerrainMapLike } from "./nodeTerrainRuntime";
import routeGeometry from "../data/route-geometry.json";
import { nodes, epilogue } from "../data/nodes";
import { stories } from "../data/stories";
import { segments } from "../data/sources";
import type { MapLayerVisibility } from "../components/LayerPanel";
import { LINE_WINDOWS, NODE_FRACTIONS } from "../data/time";
import { INTRO_DELAY_MS } from "./overview";
import { SEG_PRIMARY_LINE, cruisePose, segmentWindow } from "./cruise";
import { activeSegmentAt } from "../data/time";
import { getMarkerZoomState, getStoryMarkerPresentation } from "./markerPresentation";
import { shouldHideMarkerForLearning } from "../layout/rightPanelPresentation";

export type CameraPadding = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

export type CameraReq = {
  seq: number;
  bounds?: [number, number, number, number]; // west, south, east, north
  center?: [number, number];
  zoom?: number;
  pitch?: number;
  duration?: number;
  padding?: Partial<CameraPadding>;
};

type Props = {
  progress: number;
  selectedNodeId: string | null;
  selectedStoryId: string | null;
  nodeScene: NodeMapScene | null;
  layers: MapLayerVisibility;
  terrainStatus: "local" | "loading" | "ready" | "offline";
  terrain3dActive: boolean;
  terrain3dRequestId: number | null;
  showEpilogue: boolean;
  learningFocus: boolean;
  learningEmphasis: LearningEmphasis;
  precisionEmphasis: PrecisionKind | null;
  precisionFocusCandidateId?: string | null;
  storyPrecisionActive?: boolean;
  padding: CameraPadding;
  cameraReq: CameraReq | null;
  onSelectNode: (id: string) => void;
  onSelectStory: (id: string) => void;
  onUserGesture: () => void;
  cruise?: boolean;
  /** 古今对照：右侧「当今地形」同步地图 */
  compare?: boolean;
  /** 氛围预设（昼夜/天气），叠加在地图上的轻量色调层 */
  atmosphere?: string | null;
  onTerrainStatusChange: (status: "local" | "loading" | "ready" | "offline") => void;
  onTerrainActivationApplied: (requestId: number) => void;
  /** 暴露当前地图 canvas，供分享卡片导出 */
  captureRef?: Ref<{ captureCanvas: () => HTMLCanvasElement | null }>;
};

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const transparentOf = (rgb: string) => rgb.replace("rgb(", "rgba(").replace(")", ",0)");
const CAMERA_MOTION_MS = 1400;
const ROUTE_REVEAL_MS = 1100;
const PITCH_MOTION_MS = 900;
const TERRAIN_3D_PITCH = 42;

const prefersReducedMotion = () =>
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

// 开场路线脉冲：轻拂既有走廊图层（routeRedSoft，静态透明度 0.2），
// 两个半周期后回落，把视线引向屏幕上的主线。
const CORRIDOR_BASE_OPACITY = 0.2;
const ROUTE_PULSE_MS = 3600;
const ROUTE_PULSE_CYCLES = 2.5;

const CITY_LABELS: Array<{ name: string; lon: number; lat: number }> = [
  { name: "贵阳", lon: 106.63, lat: 26.65 },
  { name: "昆明", lon: 102.83, lat: 24.88 },
  { name: "成都", lon: 104.07, lat: 30.57 },
  { name: "重庆", lon: 106.55, lat: 29.56 },
  { name: "西安", lon: 108.94, lat: 34.34 },
  { name: "兰州", lon: 103.83, lat: 36.06 },
  { name: "长沙", lon: 112.94, lat: 28.23 },
  { name: "南宁", lon: 108.37, lat: 22.82 },
];

const RIVER_LABELS: Array<{ name: string; lon: number; lat: number }> = [
  { name: "长江", lon: 104.9, lat: 28.85 },
  { name: "金沙江", lon: 101.3, lat: 27.3 },
  { name: "大渡河", lon: 103.15, lat: 29.4 },
  { name: "赤水河", lon: 105.72, lat: 28.12 },
  { name: "乌江", lon: 106.95, lat: 27.6 },
  { name: "湘江", lon: 110.9, lat: 26.6 },
  { name: "黄河", lon: 102.6, lat: 36.3 },
];

const LANDFORM_LABELS: Array<{ name: string; lon: number; lat: number }> = [
  { name: "云贵高原", lon: 104.2, lat: 26.2 },
  { name: "乌蒙山地", lon: 104.1, lat: 27.4 },
  { name: "横断山脉", lon: 100.9, lat: 29.4 },
  { name: "大凉山", lon: 102.4, lat: 28.0 },
  { name: "岷山", lon: 103.3, lat: 33.0 },
  { name: "六盘山", lon: 106.2, lat: 35.5 },
  { name: "陕北高原", lon: 109.3, lat: 36.4 },
];

function makeMarker(className: string, html: string): HTMLDivElement {
  const el = document.createElement("div");
  el.className = className;
  el.innerHTML = html;
  return el;
}

/** 把一条路线的显影状态写到指定地图（主图与「当今」对照图共用） */
function paintLineReveal(map: MlMap, line: (typeof routeGeometry)[number], f: number, t: number) {
  const isCandidate = line.id.endsWith("a") || line.id.endsWith("b");
  try {
    if (isCandidate) {
      if (map.getLayer(`${line.id}-cand`)) {
        const wa = LINE_WINDOWS[line.id][0];
        map.setPaintProperty(`${line.id}-cand`, "line-opacity", t >= wa - 1e-6 ? 0.95 : 0);
      }
      return;
    }
    const stops: unknown[] = ["step", ["line-progress"]];
    if (f <= 0) {
      stops.push(transparentOf("rgb(166,50,43)"));
    } else {
      stops.push("rgb(166,50,43)", Math.max(0.0001, f), transparentOf("rgb(166,50,43)"));
    }
    if (map.getLayer(`${line.id}-line`)) {
      map.setPaintProperty(`${line.id}-line`, "line-gradient", stops);
    }
    if (map.getLayer(`${line.id}-corridor`)) {
      map.setPaintProperty(
        `${line.id}-corridor`,
        "line-gradient",
        f <= 0
          ? transparentOf("rgb(216,163,157)")
          : ["step", ["line-progress"], "rgb(216,163,157)", Math.max(0.0001, f), transparentOf("rgb(216,163,157)")]
      );
    }
  } catch {
    /* 图层未就绪 */
  }
}

/** 无条件重放整条路线的显影状态（对照图创建时用） */
function paintRouteReveal(map: MlMap, t: number) {
  for (const line of routeGeometry) {
    const [wa, wb] = LINE_WINDOWS[line.id];
    paintLineReveal(map, line, clamp01((t - wa) / (wb - wa)), t);
  }
}

export default function MapCanvas(props: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MlMap | null>(null);
  const markerRefs = useRef<Map<string, { el: HTMLDivElement; mapMarker: maplibregl.Marker }>>(new Map());
  const storyRefs = useRef<Map<string, { el: HTMLDivElement; mapMarker: maplibregl.Marker }>>(new Map());
  const sceneAnnotationRefs = useRef<maplibregl.Marker[]>([]);
  const hydroLabelRefs = useRef<maplibregl.Marker[]>([]);
  const secondaryRefs = useRef<HTMLDivElement[]>([]);
  const geoRefs = useRef<HTMLDivElement[]>([]);
  const contourLabelRefs = useRef<HTMLDivElement[]>([]);
  const epilogueRef = useRef<HTMLDivElement | null>(null);
  const lastFracRef = useRef<Record<string, number>>({});
  const gesturedRef = useRef(false);
  const hillshadeRef = useRef<HillshadeBbox | null>(null);
  const compareMapRef = useRef<MlMap | null>(null);
  const compareHostRef = useRef<HTMLDivElement | null>(null);
  const compareNodeMarkerRefs = useRef<HTMLDivElement[]>([]);
  const syncingRef = useRef(false);
  const atmosphereVeilRef = useRef<HTMLDivElement | null>(null);
  const [ready, setReady] = useState(false);
  const propsRef = useRef(props);
  const contourRuntimeStartedRef = useRef(false);
  const terrainPrefetchStartedRef = useRef(false);
  propsRef.current = props;

  useEffect(() => {
    const handle = props.captureRef;
    if (!handle) return;
    const value = {
      captureCanvas: () => {
        const map = mapRef.current;
        if (!map) return null;
        try {
          return map.getCanvas();
        } catch {
          return null;
        }
      },
    };
    if (typeof handle === "function") {
      handle(value);
      return () => handle(null);
    }
    (handle as { current: typeof value | null }).current = value;
    return () => {
      (handle as { current: typeof value | null }).current = null;
    };
  }, [props.captureRef]);

  const clearSceneAnnotations = () => {
    for (const marker of sceneAnnotationRefs.current) marker.remove();
    sceneAnnotationRefs.current = [];
  };

  const clearHydroLabels = () => {
    for (const marker of hydroLabelRefs.current) marker.remove();
    hydroLabelRefs.current = [];
  };

  const setSceneTransitions = (map: MlMap, duration: number) => {
    for (const line of routeGeometry) {
      const isCandidate = line.id.endsWith("a") || line.id.endsWith("b");
      if (isCandidate) {
        if (map.getLayer(`${line.id}-cand`)) {
          map.setPaintProperty(`${line.id}-cand`, "line-opacity-transition", { duration, delay: 0 });
        }
        continue;
      }
      if (map.getLayer(`${line.id}-corridor`)) {
        map.setPaintProperty(`${line.id}-corridor`, "line-opacity-transition", { duration, delay: 0 });
        map.setPaintProperty(`${line.id}-corridor`, "line-width-transition", { duration, delay: 0 });
      }
      if (map.getLayer(`${line.id}-line`)) {
        map.setPaintProperty(`${line.id}-line`, "line-opacity-transition", { duration, delay: 0 });
        map.setPaintProperty(`${line.id}-line`, "line-width-transition", { duration, delay: 0 });
      }
    }

    if (map.getLayer(SCENE_BADGE_LAYER_ID)) {
      map.setPaintProperty(SCENE_BADGE_LAYER_ID, "circle-opacity-transition", { duration, delay: 0 });
    }
    if (map.getLayer(SCENE_ANNOTATION_LAYER_ID)) {
      map.setPaintProperty(SCENE_ANNOTATION_LAYER_ID, "text-opacity-transition", { duration, delay: 0 });
    }
  };

  // 初始化
  useEffect(() => {
    let disposed = false;
    let map: MlMap | null = null;

    probeHillshade().then((hillshade) => {
      if (disposed || !containerRef.current) return;
      hillshadeRef.current = hillshade;
      // 初始相机直接取景长征路线全景（ROUTE_BOUNDS 由整条主线外扩 0.6° 计算得出）。
      const [west, south, east, north] = ROUTE_BOUNDS;
      map = new maplibregl.Map({
        container: containerRef.current,
        style: buildStyle(hillshade),
        bounds: [
          [west, south],
          [east, north],
        ],
        fitBoundsOptions: { padding: props.padding },
        minZoom: 2.6,
        maxZoom: 13.5,
        maxPitch: 70,
        attributionControl: false,
        dragRotate: true,
        // 分享卡片需要读取当前帧像素；部分类型定义未列出该标准 WebGL 选项
        preserveDrawingBuffer: true,
      } as ConstructorParameters<typeof maplibregl.Map>[0]);
      mapRef.current = map;
      // 氛围层：昼夜/天气色调，位于两张地图之上、UI 之下
      const veil = document.createElement("div");
      veil.className = "atmosphere-veil";
      containerRef.current.appendChild(veil);
      atmosphereVeilRef.current = veil;
      map.addControl(new maplibregl.NavigationControl({ showCompass: true, showZoom: true, visualizePitch: true }), "bottom-right");
      map.addControl(new maplibregl.ScaleControl({ maxWidth: 120, unit: "metric" }), "bottom-left");

      const syncZoomDensity = () => {
        if (!containerRef.current || !map) return;
        const zoom = map.getZoom();
        const state = getMarkerZoomState(zoom);
        containerRef.current.classList.toggle("zoom-overview", state.level === "overview");
        containerRef.current.classList.toggle("zoom-mid", state.level === "mid");
        containerRef.current.classList.toggle("zoom-detail", state.level === "detail");
        for (const rec of markerRefs.current.values()) {
          rec.el.classList.toggle("zoom-label-visible", state.showNodeLabels);
        }
        for (const rec of storyRefs.current.values()) {
          rec.el.classList.toggle("zoom-visible", state.showStories);
        }
        for (const marker of secondaryRefs.current) {
          marker.classList.toggle("zoom-visible", state.showSecondaryPlaces);
        }
        for (const label of contourLabelRefs.current) {
          label.classList.toggle("zoom-hidden", state.level !== "detail");
        }
      };
      const syncRuntimeContours = () => {
        if (!map || !contourRuntimeStartedRef.current) return;
        const visible = propsRef.current.layers.contours && !propsRef.current.learningFocus;
        void ensureDetailContours(map, map.getZoom(), visible);
      };
      map.on("zoom", syncZoomDensity);
      map.on("zoom", syncRuntimeContours);
      syncZoomDensity();

      const gesture = () => {
        gesturedRef.current = true;
        // 不调用 map.stop()：用户输入本就会打断相机动画，
        // 而在 pointerdown 阶段强制 stop 会取消刚激活的拖拽与俯仰过渡（MapLibre 5.24）。
        propsRef.current.onUserGesture();
      };
      for (const ev of ["mousedown", "wheel", "touchstart", "dragstart"]) {
        map.on(ev as never, gesture);
      }

      map.once("style.load", () => {
        if (disposed) return;
        const loadedMap = map!;

        // 节点标记
        for (const node of nodes) {
          const el = makeMarker(
            "node-marker",
            `<div class="node-ring"></div><div class="node-dot"></div>
             <div class="node-label"><span class="node-no">${String(node.seq).padStart(2, "0")}</span>${node.shortTitle}</div>`
          );
          // 键盘可达：与鼠标点击等价的打开方式（WCAG 2.1.1）
          el.setAttribute("role", "button");
          el.setAttribute("tabindex", "0");
          el.setAttribute("aria-label", `打开教学节点：${node.shortTitle}`);
          const openNode = (e: Event) => {
            e.stopPropagation();
            propsRef.current.onSelectNode(node.id);
          };
          el.addEventListener("click", openNode);
          el.addEventListener("keydown", (e) => {
            if (e.key === "Enter" || e.key === " ") openNode(e);
          });
          const mk = new maplibregl.Marker({ element: el, anchor: "center" })
            .setLngLat(node.anchor)
            .addTo(map!);
          markerRefs.current.set(node.id, { el, mapMarker: mk });

          for (const sub of node.secondary) {
            const subEl = makeMarker(
              "sub-marker",
              `<span class="sub-dot"></span><span class="sub-name">${sub.name}</span>`
            );
            new maplibregl.Marker({ element: subEl, anchor: "center" })
              .setLngLat([sub.lon, sub.lat])
              .addTo(map!);
            subEl.classList.add("visible");
            secondaryRefs.current.push(subEl);
          }
        }

        // 沿途故事：独立于九个教学节点，点击后进入人物与事件档案。
        for (const story of stories) {
          const presentation = getStoryMarkerPresentation(story.shortTitle, story.kind);
          const el = makeMarker(
            "story-marker",
            '<span class="story-symbol" aria-hidden="true">' +
              presentation.glyph +
              '</span><span class="story-map-label">' +
              presentation.label +
              "</span>"
          );
          el.setAttribute("role", "button");
          el.setAttribute("tabindex", "0");
          el.setAttribute("aria-label", presentation.ariaLabel);
          const openStory = (event: Event) => {
            event.stopPropagation();
            propsRef.current.onSelectStory(story.id);
          };
          el.addEventListener("click", openStory);
          el.addEventListener("keydown", (event) => {
            if (event.key === "Enter" || event.key === " ") openStory(event);
          });
          const marker = new maplibregl.Marker({ element: el, anchor: "center" })
            .setLngLat(story.location)
            .addTo(map!);
          storyRefs.current.set(story.id, { el, mapMarker: marker });
        }
        syncZoomDensity();

        // 1936 尾声幽灵标记
        const epiEl = makeMarker(
          "epilogue-marker",
          `<div class="epilogue-card"><span class="epilogue-tag">尾声</span>1936 · 三大主力会师</div>`
        );
        epilogueRef.current = epiEl;
        // 首次地图加载时同步当前开关，避免 useEffect 先于标记创建而短暂显影。
        epiEl.classList.toggle("visible", propsRef.current.showEpilogue);
        epiEl.style.display = propsRef.current.showEpilogue ? "" : "none";
        new maplibregl.Marker({ element: epiEl, anchor: "center" })
          .setLngLat(epilogue.anchor)
          .addTo(map!);

        // 地理参照标签
        for (const c of CITY_LABELS) {
          const el = makeMarker("geo-label city", c.name);
          new maplibregl.Marker({ element: el, anchor: "center" }).setLngLat([c.lon, c.lat]).addTo(map!);
          geoRefs.current.push(el);
        }
        for (const r of RIVER_LABELS) {
          const el = makeMarker("geo-label river", r.name);
          new maplibregl.Marker({ element: el, anchor: "center" }).setLngLat([r.lon, r.lat]).addTo(map!);
          geoRefs.current.push(el);
        }
        for (const landform of LANDFORM_LABELS) {
          const el = makeMarker("geo-label landform", landform.name);
          new maplibregl.Marker({ element: el, anchor: "center" })
            .setLngLat([landform.lon, landform.lat])
            .addTo(map!);
          geoRefs.current.push(el);
        }

        const loadContourLabelsWhenIdle = async () => {
          const data = await loadContourLabels();
          if (disposed || contourLabelRefs.current.length > 0) return;
          if (!data) {
            contourLabelRetryTimer = window.setTimeout(() => {
              contourLabelRetryTimer = null;
              if (!disposed) void loadContourLabelsWhenIdle();
            }, 1500);
            return;
          }
          for (const feature of data.features) {
            const elevation = feature.properties?.elevation;
            if (typeof elevation !== "number") continue;
            const el = makeMarker("contour-elevation-label", elevation + " m");
            el.classList.toggle("hidden", !propsRef.current.layers.contours || !propsRef.current.layers.labels);
            el.classList.toggle("zoom-hidden", loadedMap.getZoom() < 7.4);
            new maplibregl.Marker({ element: el, anchor: "center" })
              .setLngLat(feature.geometry.coordinates as [number, number])
              .addTo(loadedMap);
            contourLabelRefs.current.push(el);
          }
          syncZoomDensity();
        };

        const activateRuntimeContours = () => {
          if (disposed || contourRuntimeStartedRef.current) return;
          contourRuntimeStartedRef.current = true;
          loadedMap.off("idle", activateRuntimeContours);
          window.clearTimeout(contourKickoffTimer);
          const visible = propsRef.current.layers.contours && !propsRef.current.learningFocus;
          void ensureMajorContours(loadedMap, visible)
            .then(() => loadContourLabelsWhenIdle())
            .then(() => ensureDetailContours(loadedMap, loadedMap.getZoom(), visible))
            .catch(() => {
              /* 轮廓线运行时按需加载，失败时保留纸面底图 */
            });
        };
        const contourKickoffTimer = window.setTimeout(activateRuntimeContours, 900);
        let contourLabelRetryTimer: ReturnType<typeof setTimeout> | null = null;
        loadedMap.on("idle", activateRuntimeContours);
        loadedMap.once("remove", () => {
          window.clearTimeout(contourKickoffTimer);
          if (contourLabelRetryTimer !== null) {
            window.clearTimeout(contourLabelRetryTimer);
          }
          loadedMap.off("idle", activateRuntimeContours);
          loadedMap.off("zoom", syncZoomDensity);
          loadedMap.off("zoom", syncRuntimeContours);
        });

        const routePopup = new maplibregl.Popup({
          closeButton: false,
          closeOnClick: false,
          offset: 12,
          className: "route-hover-popup",
        });
        for (const line of routeGeometry) {
          const layerId = line.id.endsWith("a") || line.id.endsWith("b") ? line.id + "-cand" : line.id + "-line";
          const meta = segments.find((segment) => segment.id === line.segmentId);
          if (!meta || !loadedMap.getLayer(layerId)) continue;
          loadedMap.on("mouseenter", layerId, () => {
            loadedMap.getCanvas().style.cursor = "pointer";
            if (layerId.endsWith("-line")) {
              loadedMap.setPaintProperty(
                layerId,
                "line-width",
                hoverRouteLineWidth(
                  propsRef.current.learningFocus ? propsRef.current.nodeScene : null,
                  propsRef.current.learningFocus ? propsRef.current.learningEmphasis : null,
                  line.segmentId
                )
              );
            }
          });
          loadedMap.on("mousemove", layerId, (event) => {
            routePopup
              .setLngLat(event.lngLat)
              .setHTML(
                '<strong>' +
                  meta.displayDateLabel +
                  '</strong><span>' +
                  (meta.certainty === "confirmed" ? "史料明确" : meta.certainty === "approximate" ? "约略路线" : "争议候选") +
                  "</span><small>" +
                  meta.reasoning +
                  "</small>"
              )
              .addTo(loadedMap);
          });
          loadedMap.on("mouseleave", layerId, () => {
            loadedMap.getCanvas().style.cursor = "";
            routePopup.remove();
            if (layerId.endsWith("-line")) {
              restoreHoveredRouteLineWidth(
                loadedMap as unknown as SceneMapLike,
                line.segmentId,
                propsRef.current.learningFocus ? propsRef.current.nodeScene : null,
                propsRef.current.learningFocus ? propsRef.current.learningEmphasis : null
              );
            }
          });
        }

        const inspectPopup = new maplibregl.Popup({ closeButton: true, offset: 10, className: "map-inspect-popup" });
        loadedMap.on("click", (event) => {
          let elevation: number | null = null;
          try {
            elevation = loadedMap.queryTerrainElevation(event.lngLat) ?? null;
          } catch {
            elevation = null;
          }
          const elevationText =
            elevation === null ? "开启 3D 地形后可读取估算海拔" : "估算海拔 " + Math.round(elevation) + " 米";
          inspectPopup
            .setLngLat(event.lngLat)
            .setHTML(
              '<strong>地图取点</strong><span class="mono">' +
                event.lngLat.lng.toFixed(4) +
                ", " +
                event.lngLat.lat.toFixed(4) +
                "</span><small>" +
                elevationText +
                "</small>"
            )
            .addTo(loadedMap);
        });

        setReady(true);

        // 开场：轻拂路线走廊把视线引向主线；用户已动手或偏好减动效时跳过。
        const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        const pulseTimer = window.setTimeout(() => {
          if (disposed || gesturedRef.current || reducedMotion) return;
          const startedAt = performance.now();
          let raf = 0;
          const tick = (now: number) => {
            if (disposed || !map) return;
            if (gesturedRef.current) {
              // 用户接手地图：走廊恢复静态基线后停止脉冲。
              for (const line of routeGeometry) {
                if (line.id.endsWith("a") || line.id.endsWith("b")) continue;
                if (map.getLayer(`${line.id}-corridor`)) {
                  map.setPaintProperty(`${line.id}-corridor`, "line-opacity", CORRIDOR_BASE_OPACITY);
                }
              }
              return;
            }
            const t = Math.min(1, (now - startedAt) / ROUTE_PULSE_MS);
            const wave = Math.pow(Math.max(0, Math.sin(Math.PI * ROUTE_PULSE_CYCLES * t)), 1.5);
            const envelope = Math.min(1, t / 0.12) * Math.min(1, (1 - t) / 0.15);
            const opacity = CORRIDOR_BASE_OPACITY + 0.38 * wave * envelope;
            for (const line of routeGeometry) {
              if (line.id.endsWith("a") || line.id.endsWith("b")) continue;
              if (map.getLayer(`${line.id}-corridor`)) {
                map.setPaintProperty(`${line.id}-corridor`, "line-opacity", t >= 1 ? CORRIDOR_BASE_OPACITY : opacity);
              }
            }
            if (t < 1) raf = requestAnimationFrame(tick);
          };
          raf = requestAnimationFrame(tick);
        }, INTRO_DELAY_MS);
        const stopPulse = () => window.clearTimeout(pulseTimer);
        loadedMap.once("remove", stopPulse);
      });
    });

    return () => {
      disposed = true;
      if (map) resetOnlineTerrain(map);
      map?.remove();
      mapRef.current = null;
      atmosphereVeilRef.current = null;
      contourRuntimeStartedRef.current = false;
      terrainPrefetchStartedRef.current = false;
      markerRefs.current.clear();
      storyRefs.current.clear();
      secondaryRefs.current = [];
      geoRefs.current = [];
      contourLabelRefs.current = [];
      clearSceneAnnotations();
      clearHydroLabels();
    };
  }, []);

  // 进度 → 路线显影（主图 + 古今对照图共用同一显影状态）
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const t = props.progress;
    const targets: MlMap[] = compareMapRef.current ? [map, compareMapRef.current] : [map];

    for (const line of routeGeometry) {
      const [wa, wb] = LINE_WINDOWS[line.id];
      const f = clamp01((t - wa) / (wb - wa));
      const last = lastFracRef.current[line.id];
      if (last !== undefined && Math.abs(last - f) < 0.0008) continue;
      lastFracRef.current[line.id] = f;

      for (const target of targets) {
        paintLineReveal(target, line, f, t);
      }
    }

    // 显影写完后叠一层精度强调，避免被 reveal 覆盖
    if (props.precisionEmphasis) {
      for (const target of targets) {
        applyPrecisionEmphasisPaint(target as unknown as PrecisionPaintMapLike, props.precisionEmphasis, {
          focusCandidateLineId: props.precisionFocusCandidateId,
          widthScale: precisionWidthScale(),
        });
      }
    }

    // 节点标记显影（主图 + 对照图同步）
    for (const node of nodes) {
      const rec = markerRefs.current.get(node.id);
      if (!rec) continue;
      const visible = props.layers.nodes && t >= NODE_FRACTIONS[node.id] - 1e-6;
      rec.el.classList.toggle("visible", visible);
    }
    for (let i = 0; i < nodes.length; i++) {
      const el = compareNodeMarkerRefs.current[i];
      if (!el) continue;
      const visible = props.layers.nodes && t >= NODE_FRACTIONS[nodes[i].id] - 1e-6;
      el.classList.toggle("visible", visible);
    }
  }, [props.progress, props.layers.nodes, props.precisionEmphasis, props.precisionFocusCandidateId, ready]);

  // 精度强调独立生效：切换标签时立刻重画，不依赖进度变化
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const targets: MlMap[] = compareMapRef.current ? [map, compareMapRef.current] : [map];
    if (props.precisionEmphasis) {
      for (const target of targets) {
        applyPrecisionEmphasisPaint(target as unknown as PrecisionPaintMapLike, props.precisionEmphasis, {
          focusCandidateLineId: props.precisionFocusCandidateId,
          widthScale: precisionWidthScale(),
        });
      }
      return;
    }
    lastFracRef.current = {};
    for (const target of targets) {
      paintRouteReveal(target, props.progress);
      resetPrecisionEmphasisPaint(target as unknown as PrecisionPaintMapLike);
    }
  }, [props.precisionEmphasis, props.precisionFocusCandidateId, ready]);

  // 故事点位精度圈注 + 场景标注随精度强调同步
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.classList.toggle("story-precision-active", Boolean(props.storyPrecisionActive));
    for (const marker of sceneAnnotationRefs.current) {
      const el = marker.getElement();
      const kind = props.precisionEmphasis;
      el.classList.toggle("precision-active", Boolean(kind));
      el.classList.toggle("precision-match", Boolean(kind) && el.classList.contains(kind as string));
    }
  }, [props.precisionEmphasis, props.storyPrecisionActive, ready]);

  // 选中态
  useEffect(() => {
    for (const [nodeId, rec] of markerRefs.current) {
      rec.el.classList.toggle("selected", props.selectedNodeId === nodeId);
    }
  }, [props.selectedNodeId, ready]);

  // 节点学习时让地图退居为上下文：仅保留当前主节点与路线。
  useEffect(() => {
    containerRef.current?.classList.toggle("learning-focus", props.learningFocus);
    for (const [nodeId, rec] of markerRefs.current) {
      rec.el.classList.toggle(
        "learning-hidden",
        shouldHideMarkerForLearning(props.learningFocus, "node", props.selectedNodeId === nodeId)
      );
    }
    for (const rec of storyRefs.current.values()) {
      rec.el.classList.toggle("learning-hidden", shouldHideMarkerForLearning(props.learningFocus, "story", false));
    }
    for (const marker of secondaryRefs.current) {
      marker.classList.toggle("learning-hidden", shouldHideMarkerForLearning(props.learningFocus, "secondary", false));
    }
    for (const marker of geoRefs.current) {
      marker.classList.toggle("learning-hidden", shouldHideMarkerForLearning(props.learningFocus, "geo", false));
      if (marker.classList.contains("city")) {
        marker.classList.toggle("learning-muted", props.learningFocus);
      }
    }
    for (const marker of contourLabelRefs.current) {
      marker.classList.toggle("learning-hidden", shouldHideMarkerForLearning(props.learningFocus, "contour", false));
    }
    epilogueRef.current?.classList.toggle(
      "learning-hidden",
      shouldHideMarkerForLearning(props.learningFocus, "epilogue", false)
    );
  }, [props.learningFocus, props.selectedNodeId, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const scene = props.learningFocus ? props.nodeScene : null;
    const sceneMap = map as unknown as SceneMapLike;
    const terrainMap = map as unknown as NodeTerrainMapLike;

    if (!scene) {
      setSceneTransitions(map, prefersReducedMotion() ? 0 : 420);
      clearSceneAnnotations();
      clearNodeScene(sceneMap);
      clearNodeTerrain(terrainMap);
      return;
    }

    let terrainCancelled = false;
    void applyNodeTerrain(terrainMap, scene.nodeId, props.layers.terrain).then(() => {
      if (terrainCancelled) return;
      applyLearningEmphasisSupportPaint(
        sceneMap,
        props.learningEmphasis,
        MAP_LAYER_IDS.terrain
      );
    });

    const transitionMs = prefersReducedMotion() ? 0 : 420;
    setSceneTransitions(map, transitionMs);
    applyNodeScene(sceneMap, scene);
    setSceneTransitions(map, transitionMs);
    clearSceneAnnotations();

    const annotationEls: HTMLDivElement[] = [];
    for (const annotation of scene.annotations) {
      const presentation = annotationPresentation(annotation);
      const el = makeMarker(
        presentation.className,
        `<span class="map-scene-annotation-badge" aria-hidden="true">${presentation.glyph}</span><span class="map-scene-annotation-label">${annotation.label}</span>`
      );
      el.setAttribute("role", "img");
      el.setAttribute("aria-label", presentation.ariaLabel);
      el.style.pointerEvents = "none";
      el.style.transitionDuration = `${transitionMs}ms`;
      const marker = new maplibregl.Marker({
        element: el,
        anchor: "left",
        offset: [16, 0],
      })
        .setLngLat(annotation.location)
        .addTo(map);
      sceneAnnotationRefs.current.push(marker);
      annotationEls.push(el);
    }

    if (transitionMs === 0) {
      for (const el of annotationEls) el.classList.add("visible");
    } else {
      const raf = requestAnimationFrame(() => {
        for (const el of annotationEls) el.classList.add("visible");
      });
      return () => {
        terrainCancelled = true;
        cancelAnimationFrame(raf);
        clearSceneAnnotations();
        clearNodeScene(sceneMap);
        clearNodeTerrain(terrainMap);
      };
    }

    return () => {
      terrainCancelled = true;
      clearSceneAnnotations();
      clearNodeScene(sceneMap);
      clearNodeTerrain(terrainMap);
    };
  }, [props.learningFocus, props.nodeScene, props.layers.terrain, ready]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const route = props.learningFocus && props.learningEmphasis === "route";
    const terrain = props.learningFocus && props.learningEmphasis === "terrain";
    const evidence = props.learningFocus && props.learningEmphasis === "evidence";
    container.classList.toggle("emphasis-route", route);
    container.classList.toggle("emphasis-terrain", terrain);
    container.classList.toggle("emphasis-evidence", evidence);
  }, [props.learningFocus, props.learningEmphasis]);

  useEffect(() => {
    const map = mapRef.current;
    const scene = props.learningFocus ? props.nodeScene : null;
    if (!map || !ready) return;

    applyLearningEmphasisSupportPaint(
      map as unknown as SceneMapLike,
      props.learningFocus ? props.learningEmphasis : null,
      MAP_LAYER_IDS.terrain
    );
    if (!scene) return;
    applyNodeSceneEmphasis(map as unknown as SceneMapLike, scene, props.learningEmphasis);
  }, [props.learningFocus, props.learningEmphasis, props.nodeScene, ready]);

  useEffect(() => {
    for (const [storyId, rec] of storyRefs.current) {
      rec.el.classList.toggle("selected", props.selectedStoryId === storyId);
      rec.el.classList.toggle("hidden", !props.layers.stories);
    }
  }, [props.selectedStoryId, props.layers.stories, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const hydroSource = map.getSource(NODE_HYDROGRAPHY_SOURCE_ID) as
      | { setData?: (data: GeoJSON.FeatureCollection) => void }
      | undefined;
    const hydro = props.learningFocus && props.nodeScene ? sceneHydrography(props.nodeScene) : emptyNodeHydrography();
    hydroSource?.setData?.(hydro.featureCollection);

    clearHydroLabels();
    if (!props.learningFocus || !props.layers.labels) return;

    for (const label of hydro.labels) {
      const el = makeMarker(`hydro-label ${label.kind} ${label.certainty}`, label.label);
      el.setAttribute("role", "img");
      el.setAttribute("aria-label", label.ariaLabel);
      el.style.pointerEvents = "none";
      const marker = new maplibregl.Marker({ element: el, anchor: "center", offset: label.offset })
        .setLngLat(label.location)
        .addTo(map);
      hydroLabelRefs.current.push(marker);
    }
  }, [props.learningFocus, props.layers.labels, props.nodeScene, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const visibility = (value: boolean) => (value ? "visible" : "none");
    const contoursVisible = props.layers.contours && !props.learningFocus;
    const setLayers = (ids: string[], value: boolean) => {
      for (const id of ids) {
        if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", visibility(value));
      }
    };
    setLayers(MAP_LAYER_IDS.terrain, props.layers.terrain);
    setLayers(MAP_LAYER_IDS.contours, contoursVisible);
    setLayers(MAP_LAYER_IDS.water, props.layers.water);
    setLayers(MAP_LAYER_IDS.route, props.layers.route);
    if (contourRuntimeStartedRef.current) {
      void ensureMajorContours(map, contoursVisible);
      void ensureDetailContours(map, map.getZoom(), contoursVisible);
    }
    for (const marker of geoRefs.current) marker.classList.toggle("hidden", !props.layers.labels);
    for (const marker of secondaryRefs.current) marker.classList.toggle("hidden", !props.layers.nodes);
    for (const marker of contourLabelRefs.current) {
      marker.classList.toggle("hidden", !contoursVisible || !props.layers.labels);
    }
  }, [props.layers, props.learningFocus, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !map.getLayer("rivers-line")) return;
    map.setPaintProperty(
      "rivers-line",
      "line-opacity",
      props.learningFocus
        ? 0.82
        : ["interpolate", ["linear"], ["get", "scalerank"], 3, 0.88, 7, 0.58]
    );
  }, [props.learningFocus, ready]);

  // 1936 尾声
  useEffect(() => {
    const marker = epilogueRef.current;
    if (!marker) return;
    marker.classList.toggle("visible", props.showEpilogue);
    marker.style.display = props.showEpilogue ? "" : "none";
  }, [props.showEpilogue, ready]);

  // 分屏改变了地图画布尺寸，先同步 MapLibre 的内部视口，再处理相机请求。
  useLayoutEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    map.resize();
  }, [props.learningFocus, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || terrainPrefetchStartedRef.current) return;
    if (props.terrain3dActive || props.terrain3dRequestId !== null || props.terrainStatus !== "local") return;
    let cancelled = false;
    let kickoffTimer = 0;
    const startPrefetch = () => {
      if (cancelled || terrainPrefetchStartedRef.current) return;
      terrainPrefetchStartedRef.current = true;
      propsRef.current.onTerrainStatusChange("loading");
      void ensureOnlineTerrain(map).then((result) => {
        if (result !== "ready") terrainPrefetchStartedRef.current = false;
        if (cancelled || result === "cancelled") return;
        propsRef.current.onTerrainStatusChange(result);
      });
    };
    const onIdle = () => {
      map.off("idle", onIdle);
      window.clearTimeout(kickoffTimer);
      startPrefetch();
    };
    kickoffTimer = window.setTimeout(startPrefetch, 1200);
    map.on("idle", onIdle);
    return () => {
      cancelled = true;
      window.clearTimeout(kickoffTimer);
      map.off("idle", onIdle);
    };
  }, [props.terrain3dActive, props.terrain3dRequestId, props.terrainStatus, ready]);

  // 3D 地形
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const reduceMotion = prefersReducedMotion();
    let cancelled = false;
    const exaggeration = terrainExaggerationForMode(props.nodeScene?.terrainMode ?? "plain");

    const clearTerrain = () => {
      try {
        map.setTerrain(null);
        if (compareMapRef.current) compareMapRef.current.setTerrain(null);
        // 档案图 2D 时收回 DEM 阴影，保持纸面风格
        if (map.getLayer(COMPARE_HILLSHADE_LAYER_ID)) {
          map.setLayoutProperty(COMPARE_HILLSHADE_LAYER_ID, "visibility", "none");
        }
      } catch {
        return;
      }
      if (reduceMotion) {
        map.jumpTo({ center: map.getCenter(), zoom: map.getZoom(), bearing: map.getBearing(), pitch: 0 });
      } else if (Math.abs(map.getPitch()) > 0.2) {
        map.easeTo({ pitch: 0, duration: CAMERA_MOTION_MS });
      }
    };

    const applyTerrain = () => {
      try {
        map.setTerrain({ source: "terrainDem", exaggeration });
        // 对照图的样式可能尚未加载完（源未注册），单独容错，不能拖垮主图激活
        if (compareMapRef.current) {
          try {
            compareMapRef.current.setTerrain({ source: "terrainDem", exaggeration });
          } catch {
            /* mapB 地形源未就绪，style.load 后会同步 */
          }
        }
        // 档案图 3D 时叠加轻量 DEM 阴影，让起伏可感知
        ensureCompareHillshade(map, { exaggeration: 0.34, visible: true, shadowColor: "#9A8A7C" });
      } catch {
        propsRef.current.onTerrainStatusChange("offline");
        clearTerrain();
        return false;
      }
      if (reduceMotion) {
        map.jumpTo({
          center: map.getCenter(),
          zoom: map.getZoom(),
          bearing: map.getBearing(),
          pitch: TERRAIN_3D_PITCH,
        });
      } else if (Math.abs(map.getPitch() - TERRAIN_3D_PITCH) > 0.2) {
        map.easeTo({ pitch: TERRAIN_3D_PITCH, duration: CAMERA_MOTION_MS });
      }
      return true;
    };

    const syncTerrain = async () => {
      if (props.terrain3dActive) {
        propsRef.current.onTerrainStatusChange("ready");
        applyTerrain();
        return;
      }
      if (props.terrain3dRequestId === null) {
        clearTerrain();
        return;
      }
      propsRef.current.onTerrainStatusChange("loading");
      const status = await ensureOnlineTerrain(map);
      if (cancelled || status === "cancelled") return;
      propsRef.current.onTerrainStatusChange(status);
      if (status !== "ready") {
        clearTerrain();
        return;
      }
      if (!applyTerrain()) return;
      propsRef.current.onTerrainActivationApplied(props.terrain3dRequestId);
    };

    void syncTerrain();
    return () => {
      cancelled = true;
      if (!props.terrain3dActive) cancelOnlineTerrain(map);
    };
  }, [props.nodeScene?.terrainMode, props.terrain3dActive, props.terrain3dRequestId, ready]);

  // 古今对照：右侧「当今地形」同步地图（DEM 动态山体阴影 + 高程着色增强）
  useEffect(() => {    const container = containerRef.current;
    const mapA = mapRef.current;
    if (!container || !mapA || !ready) return;

    if (!props.compare) {
      compareNodeMarkerRefs.current = [];
      if (compareMapRef.current) {
        compareMapRef.current.remove();
        compareMapRef.current = null;
      }
      if (compareHostRef.current) {
        compareHostRef.current.remove();
        compareHostRef.current = null;
      }
      return;
    }

    if (compareMapRef.current || compareHostRef.current) return;

    const host = document.createElement("div");
    host.className = "map-compare-host";
    container.appendChild(host);
    compareHostRef.current = host;

    const mapB = new maplibregl.Map({
      container: host,
      style: buildStyle(hillshadeRef.current, { modern: true }),
      center: mapA.getCenter(),
      zoom: mapA.getZoom(),
      pitch: mapA.getPitch(),
      bearing: mapA.getBearing(),
      attributionControl: false,
      preserveDrawingBuffer: true,
    } as ConstructorParameters<typeof maplibregl.Map>[0]);
    compareMapRef.current = mapB;

    const sync = (from: MlMap, to: MlMap) => {
      if (syncingRef.current) return;
      syncingRef.current = true;
      to.jumpTo({
        center: from.getCenter(),
        zoom: from.getZoom(),
        pitch: from.getPitch(),
        bearing: from.getBearing(),
      });
      syncingRef.current = false;
    };
    const onMoveA = () => sync(mapA, mapB);
    const onMoveB = () => sync(mapB, mapA);
    mapA.on("move", onMoveA);
    mapB.on("move", onMoveB);

    const syncTerrainToB = () => {
      const exaggeration = terrainExaggerationForMode(propsRef.current.nodeScene?.terrainMode ?? "plain");
      try {
        mapB.setTerrain(propsRef.current.terrain3dActive ? { source: "terrainDem", exaggeration } : null);
      } catch {
        /* 地形源未就绪 */
      }
    };

    mapB.once("style.load", () => {
      if (compareMapRef.current !== mapB) return;
      ensureCompareHillshade(mapB, { exaggeration: 0.52, shadowColor: "#7A6552" });
      paintRouteReveal(mapB, propsRef.current.progress);
      syncTerrainToB();

      // 「当今」侧地点标注：与档案侧同一套地名数据，让对照可定位
      compareNodeMarkerRefs.current = [];
      for (const c of CITY_LABELS) {
        const el = makeMarker("geo-label city", c.name);
        new maplibregl.Marker({ element: el, anchor: "center" }).setLngLat([c.lon, c.lat]).addTo(mapB);
      }
      for (const r of RIVER_LABELS) {
        const el = makeMarker("geo-label river", r.name);
        new maplibregl.Marker({ element: el, anchor: "center" }).setLngLat([r.lon, r.lat]).addTo(mapB);
      }
      for (const landform of LANDFORM_LABELS) {
        const el = makeMarker("geo-label landform", landform.name);
        new maplibregl.Marker({ element: el, anchor: "center" }).setLngLat([landform.lon, landform.lat]).addTo(mapB);
      }
      for (const node of nodes) {
        const el = makeMarker(
          "node-marker",
          `<div class="node-ring"></div><div class="node-dot"></div>
           <div class="node-label"><span class="node-no">${String(node.seq).padStart(2, "0")}</span>${node.shortTitle}</div>`
        );
        el.classList.add("visible");
        new maplibregl.Marker({ element: el, anchor: "center" }).setLngLat(node.anchor).addTo(mapB);
        compareNodeMarkerRefs.current.push(el);
      }

      // 与档案侧一致的地图取点
      const inspectPopup = new maplibregl.Popup({ closeButton: true, offset: 10, className: "map-inspect-popup" });
      mapB.on("click", (event) => {
        let elevation: number | null = null;
        try {
          elevation = mapB.queryTerrainElevation(event.lngLat) ?? null;
        } catch {
          elevation = null;
        }
        const elevationText =
          elevation === null ? "开启 3D 地形后可读取估算海拔" : "估算海拔 " + Math.round(elevation) + " 米";
        inspectPopup
          .setLngLat(event.lngLat)
          .setHTML(
            '<strong>当今地形取点</strong><span class="mono">' +
              event.lngLat.lng.toFixed(4) + ", " + event.lngLat.lat.toFixed(4) +
              "</span><small>" + elevationText + "</small>"
          )
          .addTo(mapB);
      });

      sync(mapA, mapB);
    });

    // 分割线：可拖动，默认居中；两侧角标提示左右各是什么
    const divider = document.createElement("div");
    divider.className = "map-compare-divider";
    divider.innerHTML =
      '<span class="map-compare-badge map-compare-badge-left">1935 · 档案</span>' +
      '<span class="map-compare-badge map-compare-badge-right">当今 · 测绘</span>' +
      '<span class="map-compare-grip" aria-hidden="true">⇔</span>';
    let frac = 0.5;
    const applyFrac = () => {
      const pct = Math.round(frac * 10000) / 100;
      host.style.clipPath = `inset(0 0 0 ${pct}%)`;
      divider.style.left = `${pct}%`;
    };
    applyFrac();
    container.appendChild(divider);

    let draggingDivider = false;
    const onDividerDown = (e: PointerEvent) => {
      draggingDivider = true;
      try {
        divider.setPointerCapture(e.pointerId);
      } catch {
        /* 合成事件无有效指针 */
      }
      e.preventDefault();
    };
    const onDividerMove = (e: PointerEvent) => {
      if (!draggingDivider) return;
      const rect = container.getBoundingClientRect();
      frac = Math.max(0.12, Math.min(0.88, (e.clientX - rect.left) / rect.width));
      applyFrac();
    };
    const onDividerUp = (e: PointerEvent) => {
      draggingDivider = false;
      try {
        divider.releasePointerCapture(e.pointerId);
      } catch {
        /* 已释放 */
      }
    };
    divider.addEventListener("pointerdown", onDividerDown);
    divider.addEventListener("pointermove", onDividerMove);
    divider.addEventListener("pointerup", onDividerUp);
    divider.addEventListener("pointercancel", onDividerUp);

    return () => {
      mapA.off("move", onMoveA);
      mapB.off("move", onMoveB);
      divider.removeEventListener("pointerdown", onDividerDown);
      divider.removeEventListener("pointermove", onDividerMove);
      divider.removeEventListener("pointerup", onDividerUp);
      divider.removeEventListener("pointercancel", onDividerUp);
      divider.remove();
      compareMapRef.current = null;
      compareHostRef.current = null;
      compareNodeMarkerRefs.current = [];
      mapB.remove();
      host.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.compare, ready]);

  // 氛围层：昼夜/天气随节点切换（夜渡于都河、夹金山的雪、草地的雾…）
  useEffect(() => {
    const veil = atmosphereVeilRef.current;
    if (!veil) return;
    veil.className = `atmosphere-veil${props.atmosphere ? ` atmo-${props.atmosphere}` : ""}`;
  }, [props.atmosphere, ready]);

  // 巡航：进入或换段时，镜头贴路线低空滑翔到段尾（时长与该段剩余播放时间对齐）。
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !props.cruise) return;
    const t = props.progress;
    const reduceMotion = prefersReducedMotion();
    const seg = activeSegmentAt(t);
    const [w0, w1] = segmentWindow(seg);
    const lineId = SEG_PRIMARY_LINE[seg];
    if (!lineId) return;
    const f = clamp01((t - w0) / (w1 - w0));
    const startPose = cruisePose(seg, f);
    const endPose = cruisePose(seg, 1);
    map.jumpTo({ center: startPose.center, zoom: startPose.zoom, pitch: startPose.pitch, bearing: startPose.bearing });
    if (reduceMotion) {
      map.jumpTo({ center: endPose.center, zoom: endPose.zoom, pitch: endPose.pitch, bearing: endPose.bearing });
    } else {
      map.easeTo({
        center: endPose.center,
        zoom: endPose.zoom,
        pitch: endPose.pitch,
        bearing: endPose.bearing,
        duration: Math.max(ROUTE_REVEAL_MS, (w1 - t) * 42000),
        easing: (x) => x, // 线性滑翔，与路线显影速度一致
        essential: true,
      });
    }
    // 仅在进入巡航或跨越段边界时重排镜头；段内滑翔交给 easeTo 本身。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.cruise, props.cruise ? activeSegmentAt(props.progress) : null, ready]);

  // 相机请求
  useEffect(() => {
    const map = mapRef.current;
    const req = props.cameraReq;
    if (!map || !ready || !req) return;
    const reduceMotion = prefersReducedMotion();
    const opts = { padding: req.padding ? { ...props.padding, ...req.padding } : props.padding, essential: true };
    let pitchTimer = 0;
    if (req.bounds) {
      const b: LngLatBoundsLike = [
        [req.bounds[0], req.bounds[1]],
        [req.bounds[2], req.bounds[3]],
      ];
      map.fitBounds(b, {
        ...opts,
        duration: reduceMotion ? 0 : req.duration ?? CAMERA_MOTION_MS,
        maxZoom: req.zoom ?? 9.2,
      });
      if (req.pitch !== undefined) {
        if (reduceMotion) {
          map.jumpTo({ center: map.getCenter(), zoom: map.getZoom(), bearing: map.getBearing(), pitch: req.pitch });
        } else {
          pitchTimer = window.setTimeout(
            () => map.easeTo({ pitch: req.pitch, duration: PITCH_MOTION_MS }),
            (req.duration ?? CAMERA_MOTION_MS) * 0.7
          );
        }
      }
    } else if (req.center) {
      if (reduceMotion) {
        map.jumpTo({
          center: req.center,
          zoom: req.zoom ?? 7.4,
          pitch: req.pitch ?? map.getPitch(),
          bearing: map.getBearing(),
        });
      } else {
        map.flyTo({
          ...opts,
          center: req.center,
          zoom: req.zoom ?? 7.4,
          pitch: req.pitch,
          duration: req.duration ?? CAMERA_MOTION_MS,
        });
      }
    }
    return () => window.clearTimeout(pitchTimer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.cameraReq?.seq, ready]);

  return <div className="map-canvas" ref={containerRef} />;
}

/** 整条主线的范围（导览首尾站与路线总览用） */
export const ROUTE_BOUNDS: [number, number, number, number] = (() => {
  let w = 180;
  let s = 90;
  let e = -180;
  let n = -90;
  for (const line of routeGeometry) {
    for (const [lon, lat] of line.coordinates) {
      w = Math.min(w, lon);
      s = Math.min(s, lat);
      e = Math.max(e, lon);
      n = Math.max(n, lat);
    }
  }
  return [w - 0.6, s - 0.6, e + 0.6, n + 0.6];
})();

/** 单条候选线的范围 */
export function lineBounds(lineId: string): [number, number, number, number] {
  const line = routeGeometry.find((l) => l.id === lineId)!;
  let w = 180;
  let s = 90;
  let e = -180;
  let n = -90;
  for (const [lon, lat] of line.coordinates) {
    w = Math.min(w, lon);
    s = Math.min(s, lat);
    e = Math.max(e, lon);
    n = Math.max(n, lat);
  }
  return [w - 0.35, s - 0.35, e + 0.35, n + 0.35];
}
