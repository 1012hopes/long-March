import { useEffect, useLayoutEffect, useRef, useState } from "react";
import maplibregl, { type Map as MlMap, type LngLatBoundsLike } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { buildStyle, MAP_LAYER_IDS, probeHillshade } from "./style";
import routeGeometry from "../data/route-geometry.json";
import { nodes, epilogue } from "../data/nodes";
import { stories } from "../data/stories";
import { segments } from "../data/sources";
import type { MapLayerVisibility } from "../components/LayerPanel";
import { LINE_WINDOWS, NODE_FRACTIONS } from "../data/time";
import { getChinaOverviewBounds } from "./overview";
import { getMarkerZoomState, getStoryMarkerPresentation } from "./markerPresentation";
import { shouldHideMarkerForLearning } from "../layout/rightPanelPresentation";

export type CameraReq = {
  seq: number;
  bounds?: [number, number, number, number]; // west, south, east, north
  center?: [number, number];
  zoom?: number;
  pitch?: number;
  duration?: number;
};

type Props = {
  progress: number;
  selectedNodeId: string | null;
  selectedStoryId: string | null;
  layers: MapLayerVisibility;
  terrain3d: boolean;
  showEpilogue: boolean;
  learningFocus: boolean;
  padding: { top: number; right: number; bottom: number; left: number };
  cameraReq: CameraReq | null;
  onSelectNode: (id: string) => void;
  onSelectStory: (id: string) => void;
  onUserGesture: () => void;
};

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const transparentOf = (rgb: string) => rgb.replace("rgb(", "rgba(").replace(")", ",0)");

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

export default function MapCanvas(props: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MlMap | null>(null);
  const markerRefs = useRef<Map<string, { el: HTMLDivElement; mapMarker: maplibregl.Marker }>>(new Map());
  const storyRefs = useRef<Map<string, { el: HTMLDivElement; mapMarker: maplibregl.Marker }>>(new Map());
  const secondaryRefs = useRef<HTMLDivElement[]>([]);
  const geoRefs = useRef<HTMLDivElement[]>([]);
  const contourLabelRefs = useRef<HTMLDivElement[]>([]);
  const epilogueRef = useRef<HTMLDivElement | null>(null);
  const lastFracRef = useRef<Record<string, number>>({});
  const [ready, setReady] = useState(false);
  const propsRef = useRef(props);
  propsRef.current = props;

  // 初始化
  useEffect(() => {
    let disposed = false;
    let map: MlMap | null = null;

    probeHillshade().then((hillshade) => {
      if (disposed || !containerRef.current) return;
      const [west, south, east, north] = getChinaOverviewBounds();
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
      });
      mapRef.current = map;
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
      map.on("zoom", syncZoomDensity);
      syncZoomDensity();

      const gesture = () => propsRef.current.onUserGesture();
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
          el.addEventListener("click", (e) => {
            e.stopPropagation();
            propsRef.current.onSelectNode(node.id);
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

        fetch("terrain/contour-labels.geojson")
          .then((response) => response.json())
          .then((data: GeoJSON.FeatureCollection<GeoJSON.Point, { elevation: number }>) => {
            if (disposed) return;
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
          })
          .catch(() => {
            /* 等高线数字标注加载失败时保留线条 */
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
            if (layerId.endsWith("-line")) loadedMap.setPaintProperty(layerId, "line-width", 5.2);
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
            if (layerId.endsWith("-line")) loadedMap.setPaintProperty(layerId, "line-width", 3.4);
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
      });
    });

    return () => {
      disposed = true;
      map?.remove();
      mapRef.current = null;
      markerRefs.current.clear();
      storyRefs.current.clear();
      secondaryRefs.current = [];
      geoRefs.current = [];
      contourLabelRefs.current = [];
    };
  }, []);

  // 进度 → 路线显影
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const t = props.progress;

    for (const line of routeGeometry) {
      const [wa, wb] = LINE_WINDOWS[line.id];
      const f = clamp01((t - wa) / (wb - wa));
      const last = lastFracRef.current[line.id];
      if (last !== undefined && Math.abs(last - f) < 0.0008) continue;
      lastFracRef.current[line.id] = f;

      const isCandidate = line.id.endsWith("a") || line.id.endsWith("b");
      if (isCandidate) {
        map.setPaintProperty(`${line.id}-cand`, "line-opacity", t >= wa - 1e-6 ? 0.95 : 0);
      } else {
        const stops: unknown[] = ["step", ["line-progress"]];
        if (f <= 0) {
          stops.push(transparentOf("rgb(166,50,43)"));
        } else {
          stops.push("rgb(166,50,43)", Math.max(0.0001, f), transparentOf("rgb(166,50,43)"));
        }
        try {
          map.setPaintProperty(`${line.id}-line`, "line-gradient", stops);
          map.setPaintProperty(
            `${line.id}-corridor`,
            "line-gradient",
            f <= 0
              ? transparentOf("rgb(216,163,157)")
              : ["step", ["line-progress"], "rgb(216,163,157)", Math.max(0.0001, f), transparentOf("rgb(216,163,157)")]
          );
        } catch {
          /* 图层未就绪 */
        }
      }
    }

    // 节点标记显影
    for (const node of nodes) {
      const rec = markerRefs.current.get(node.id);
      if (!rec) continue;
      const visible = props.layers.nodes && t >= NODE_FRACTIONS[node.id] - 1e-6;
      rec.el.classList.toggle("visible", visible);
    }
  }, [props.progress, props.layers.nodes, ready]);

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
    for (const [storyId, rec] of storyRefs.current) {
      rec.el.classList.toggle("selected", props.selectedStoryId === storyId);
      rec.el.classList.toggle("hidden", !props.layers.stories);
    }
  }, [props.selectedStoryId, props.layers.stories, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const visibility = (value: boolean) => (value ? "visible" : "none");
    const setLayers = (ids: string[], value: boolean) => {
      for (const id of ids) {
        if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", visibility(value));
      }
    };
    setLayers(MAP_LAYER_IDS.terrain, props.layers.terrain);
    setLayers(MAP_LAYER_IDS.contours, props.layers.contours);
    setLayers(MAP_LAYER_IDS.water, props.layers.water);
    setLayers(MAP_LAYER_IDS.route, props.layers.route);
    for (const marker of geoRefs.current) marker.classList.toggle("hidden", !props.layers.labels);
    for (const marker of secondaryRefs.current) marker.classList.toggle("hidden", !props.layers.nodes);
    for (const marker of contourLabelRefs.current) {
      marker.classList.toggle("hidden", !props.layers.contours || !props.layers.labels);
    }
  }, [props.layers, ready]);

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

  // 3D 地形
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    if (props.terrain3d) {
      map.setTerrain({ source: "terrainDem", exaggeration: 1.3 });
      map.easeTo({ pitch: 52, duration: 1400 });
    } else {
      map.setTerrain(null);
      map.easeTo({ pitch: 0, duration: 1400 });
    }
  }, [props.terrain3d, ready]);

  // 相机请求
  useEffect(() => {
    const map = mapRef.current;
    const req = props.cameraReq;
    if (!map || !ready || !req) return;
    const opts = { padding: props.padding, essential: true };
    if (req.bounds) {
      const b: LngLatBoundsLike = [
        [req.bounds[0], req.bounds[1]],
        [req.bounds[2], req.bounds[3]],
      ];
      map.fitBounds(b, {
        ...opts,
        duration: req.duration ?? 2200,
        maxZoom: req.zoom ?? 9.2,
      });
      if (req.pitch !== undefined) {
        setTimeout(() => map.easeTo({ pitch: req.pitch, duration: 900 }), (req.duration ?? 2200) * 0.7);
      }
    } else if (req.center) {
      map.flyTo({
        ...opts,
        center: req.center,
        zoom: req.zoom ?? 7.4,
        pitch: req.pitch,
        duration: req.duration ?? 2200,
      });
    }
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
