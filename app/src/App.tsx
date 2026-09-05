import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import MapCanvas, { ROUTE_BOUNDS, lineBounds, type CameraReq } from "./map/MapCanvas";
import TopBar, { type Mode } from "./components/TopBar";
import NodeSceneCartouche from "./components/NodeSceneCartouche";
import LeftTimeline from "./components/LeftTimeline";
import RightPanel, { type RightView } from "./components/RightPanel";
import BottomPanel from "./components/BottomPanel";
import Legend from "./components/Legend";
import InfoSheet from "./components/InfoSheet";
import StoryCatalog from "./components/StoryCatalog";
import LayerPanel, { type MapLayerVisibility } from "./components/LayerPanel";
import MapTitleReveal from "./components/MapTitleReveal";
import CompareGuide from "./components/CompareGuide";
import { altitudeForSegment, type LearningEmphasis } from "./components/nodeLearning";
import { TOUR_STOPS } from "./tour";
import { nodes, type NodeUnit } from "./data/nodes";
import { sceneForNode } from "./data/nodeScenes";
import { stories, type StoryPoint } from "./data/stories";
import { NODE_FRACTIONS, SEG_FRACTIONS, activeSegmentAt, marchDayAt, marchDistanceLi } from "./data/time";
import { narrationFor } from "./data/narration";
import { startAmbient, stopAmbient } from "./audio/ambient";
import { SEG_PRIMARY_LINE } from "./map/cruise";
import {
  applyTerrainActivation,
  cancelTerrainActivationRequest,
  createTerrainUiState,
  disableTerrain3d,
  requestTerrainActivation,
  syncTerrainStatus,
  type TerrainStatus,
  type TerrainUiState,
} from "./map/terrainRuntime";
import { getRightPanelPresentation } from "./layout/rightPanelPresentation";
import { scenePlaceLabel } from "./map/nodeScenePresentation";

const CAMERA_MOTION_MS = 1400;
const TOUR_CAMERA_MOTION_MS = 1500;

function unionBounds(lineIds: string[], margin = 0.4): [number, number, number, number] {
  let w = 180;
  let s = 90;
  let e = -180;
  let n = -90;
  for (const id of lineIds) {
    const [a, b, c, d] = lineBounds(id);
    w = Math.min(w, a + margin);
    s = Math.min(s, b + margin);
    e = Math.max(e, c - margin);
    n = Math.max(n, d - margin);
  }
  return [w, s, e, n];
}

// ---- URL 深链接：#n=节点 & s=故事 & t=时间线 & r=显影 & m=模式 & i=导览站 ----
type HashParams = {
  mode?: Mode;
  tourIndex?: number;
  nodeId?: string;
  storyId?: string;
  timelineT?: number;
  revealT?: number;
};

function parseHash(hash: string): HashParams {
  const out: HashParams = {};
  const raw = hash.replace(/^#/, "");
  if (!raw) return out;
  for (const part of raw.split("&")) {
    const [key, value] = part.split("=");
    if (!key || !value) continue;
    if (key === "n") out.nodeId = value;
    else if (key === "s") out.storyId = value;
    else if (key === "t") {
      const t = parseFloat(value);
      if (Number.isFinite(t)) out.timelineT = Math.max(0, Math.min(1, t));
    } else if (key === "r") {
      const r = parseFloat(value);
      if (Number.isFinite(r)) out.revealT = Math.max(0, Math.min(1, r));
    } else if (key === "m" && (value === "tour" || value === "explore" || value === "sources")) {
      out.mode = value;
    } else if (key === "i") {
      const i = parseInt(value, 10);
      if (Number.isFinite(i) && i >= 0) out.tourIndex = i;
    }
  }
  return out;
}

function serializeHash(params: HashParams): string {
  const parts: string[] = [];
  if (params.mode && params.mode !== "explore") parts.push(`m=${params.mode}`);
  if (params.mode === "tour" && typeof params.tourIndex === "number") parts.push(`i=${params.tourIndex}`);
  if (params.nodeId) parts.push(`n=${params.nodeId}`);
  if (params.storyId) parts.push(`s=${params.storyId}`);
  if (typeof params.timelineT === "number" && params.timelineT > 0 && params.timelineT < 1) {
    parts.push(`t=${params.timelineT.toFixed(3)}`);
  }
  if (typeof params.revealT === "number" && params.revealT > 0 && params.revealT < 1) {
    parts.push(`r=${params.revealT.toFixed(3)}`);
  }
  return parts.length ? `#${parts.join("&")}` : "";
}

function resolveTimelineAndRevealFromHash(params: HashParams): { timelineT: number; revealT: number } {
  const mode = params.mode ?? "explore";
  const timelineT =
    typeof params.timelineT === "number"
      ? params.timelineT
      : typeof params.revealT === "number"
        ? params.revealT
        : 1;
  // `t` 始终表示阅读时间；缺省 mode 视为 explore，因此 reveal 不从 `t` 回填。
  const revealT =
    mode === "explore"
      ? 1
      : typeof params.revealT === "number"
        ? params.revealT
        : timelineT;
  return { timelineT, revealT };
}

function nodeAtTimelineT(t: number): NodeUnit {
  let current = nodes[0];
  for (const node of nodes) {
    if (t >= NODE_FRACTIONS[node.id] - 1e-6) current = node;
  }
  return current;
}

export default function App() {
  // 初始状态允许从 URL hash 恢复（分享链接 / 刷新不丢状态）
  const initialHash = useMemo(() => parseHash(window.location.hash), []);
  const initialTimelineState = useMemo(() => resolveTimelineAndRevealFromHash(initialHash), [initialHash]);
  const [mode, setMode] = useState<Mode>(initialHash.mode ?? "explore");
  const [tourIndex, setTourIndex] = useState(initialHash.tourIndex ?? 0);
  const [timelineT, setTimelineT] = useState(initialTimelineState.timelineT);
  const [revealT, setRevealT] = useState(initialTimelineState.revealT);
  const [playing, setPlaying] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(initialHash.nodeId ?? null);
  const [selectedStoryId, setSelectedStoryId] = useState<string | null>(initialHash.storyId ?? null);
  const [mapLayers, setMapLayers] = useState<MapLayerVisibility>({
    terrain: true,
    contours: true,
    water: true,
    labels: true,
    route: true,
    nodes: true,
    stories: true,
  });
  const [rightView, setRightView] = useState<RightView>(() =>
    initialHash.storyId
      ? { type: "story", storyId: initialHash.storyId }
      : initialHash.nodeId
        ? { type: "node", nodeId: initialHash.nodeId }
        : initialHash.mode === "sources"
          ? { type: "sources" }
          : null
  );
  const [depth, setDepth] = useState<"concise" | "deep">("concise");
  const [terrainUi, setTerrainUi] = useState<TerrainUiState>(() => createTerrainUiState());
  const [compareOn, setCompareOn] = useState(false);
  const [cruising, setCruising] = useState(false);
  const [showEpilogue, setShowEpilogue] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [mobileTimelineOpen, setMobileTimelineOpen] = useState(false);
  const [bottomExpanded, setBottomExpanded] = useState(false);
  const [cameraReq, setCameraReq] = useState<CameraReq | null>(null);
  const [learningEmphasis, setLearningEmphasis] = useState<LearningEmphasis>(null);
  const [voiceOn, setVoiceOn] = useState(false);
  const [ambientOn, setAmbientOn] = useState(false);
  const suppressInitialSelectedScrollRef = useRef(true);
  const seqRef = useRef(0);
  const timelineRef = useRef(timelineT);
  timelineRef.current = timelineT;
  const revealRef = useRef(revealT);
  revealRef.current = revealT;
  const selectedNodeRef = useRef(selectedNodeId);
  selectedNodeRef.current = selectedNodeId;
  const selectedStoryRef = useRef(selectedStoryId);
  selectedStoryRef.current = selectedStoryId;
  const rightViewRef = useRef(rightView);
  rightViewRef.current = rightView;
  const playingRef = useRef(playing);
  playingRef.current = playing;
  const cruiseRef = useRef(cruising);
  cruiseRef.current = cruising;
  const activeSegRef = useRef<string | null>(null);

  const fly = useCallback((req: Omit<CameraReq, "seq">) => {
    setCameraReq({ ...req, seq: ++seqRef.current });
  }, []);

  const flyToNode = useCallback(
    (node: NodeUnit) => {
      const scene = sceneForNode(node.id);
      if (scene) {
        const isNarrow = window.innerWidth < 900;
        fly({
          bounds: scene.focusBounds,
          duration: CAMERA_MOTION_MS,
          padding: isNarrow
            ? { top: 84, right: 24, bottom: 160, left: 24 }
            : { top: 90, right: 108, bottom: 48, left: 34 },
        });
        return;
      }

      const pts: Array<[number, number]> = [node.anchor, ...node.secondary.map((s) => [s.lon, s.lat] as [number, number])];
      const w = Math.min(...pts.map((q) => q[0])) - 0.5;
      const e2 = Math.max(...pts.map((q) => q[0])) + 0.5;
      const s = Math.min(...pts.map((q) => q[1])) - 0.5;
      const n2 = Math.max(...pts.map((q) => q[1])) + 0.5;
      fly({ bounds: [w, s, e2, n2], duration: CAMERA_MOTION_MS });
    },
    [fly]
  );

  const flyToStory = useCallback(
    (story: StoryPoint) => {
      const [lon, lat] = story.location;
      fly({ bounds: [lon - 0.3, lat - 0.3, lon + 0.3, lat + 0.3], duration: TOUR_CAMERA_MOTION_MS, zoom: 9 });
    },
    [fly]
  );

  const togglePlay = useCallback(() => {
    const willPlay = !playingRef.current;
    // 到达结尾后重新播放时，重置两条时间线，但保留当前模式与导览停靠点。
    if (willPlay && revealRef.current >= 1) {
      setRevealT(0);
      setTimelineT(0);
    } else if (willPlay) {
      const start = mode === "tour" ? revealRef.current : timelineRef.current;
      setRevealT(start);
      setTimelineT(start);
    }
    activeSegRef.current = null;
    setPlaying(willPlay);
  }, [mode]);

  const exitCruise = useCallback(() => {
    setCruising(false);
    setPlaying(false);
    setTerrainUi((current) => disableTerrain3d(current));
    fly({ bounds: ROUTE_BOUNDS, zoom: 6.4, duration: CAMERA_MOTION_MS });
  }, [fly]);

  const toggleCruise = useCallback(() => {
    if (cruiseRef.current) {
      exitCruise();
    } else {
      if (revealRef.current >= 1) {
        setRevealT(0);
        setTimelineT(0);
      }
      activeSegRef.current = null;
      setCruising(true);
      setTerrainUi((current) => requestTerrainActivation(current).state);
      setPlaying(true);
    }
  }, [exitCruise]);

  const stop = mode === "tour" ? TOUR_STOPS[tourIndex] : null;
  const tourRightView: RightView =
    stop && stop.kind !== "intro" ? { type: "node", nodeId: stop.nodeIds[0] } : null;
  const effectiveRightView = focusMode ? null : mode === "tour" ? tourRightView : rightView;
  const rightPanelPresentation = getRightPanelPresentation(effectiveRightView?.type ?? null);

  // 面板安全区（docs/16 §6）
  const padding = useMemo(() => {
    if (focusMode) return { top: 72, right: 28, bottom: 28, left: 28 };
    if (rightPanelPresentation.learningFocus) return { top: 28, right: 28, bottom: 28, left: 28 };
    const isNarrow = window.innerWidth < 900;
    if (isNarrow) return { top: 64, right: 12, bottom: bottomExpanded ? 300 : 150, left: 12 };
    return {
      top: 76,
      right: rightPanelPresentation.mapPaddingRight,
      bottom: bottomExpanded ? 310 : 100,
      left: leftCollapsed ? 92 : 316,
    };
  }, [focusMode, rightPanelPresentation.learningFocus, rightPanelPresentation.mapPaddingRight, bottomExpanded, leftCollapsed]);

  // 播放循环：路线沿时间顺序显影；巡航时相机由 MapCanvas 低空接管
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      if (!playingRef.current) return;
      const dt = now - last;
      last = now;
      const next = Math.min(1, revealRef.current + dt / 42000);
      setRevealT(next);
      setTimelineT(next);
      const nextNode = nodeAtTimelineT(next);
      if (selectedNodeRef.current !== nextNode.id || selectedStoryRef.current !== null || rightViewRef.current?.type !== "node") {
        setSelectedNodeId(nextNode.id);
        setSelectedStoryId(null);
        setRightView({ type: "node", nodeId: nextNode.id });
      }
      const seg = activeSegmentAt(next);
      if (seg !== activeSegRef.current) {
        activeSegRef.current = seg;
        if (!cruiseRef.current) {
          const primary = SEG_PRIMARY_LINE[seg];
          fly({ bounds: lineBounds(primary), duration: CAMERA_MOTION_MS });
        }
      }
      if (next >= 1) {
        setPlaying(false);
        if (cruiseRef.current) exitCruise();
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, fly, exitCruise]);

  // 导览：进度与相机随停靠点走
  const applyTourStop = useCallback(
    (index: number) => {
      const stop = TOUR_STOPS[index];
      setRevealT(stop.revealT);
      setTimelineT(stop.revealT);
      setShowEpilogue(stop.kind === "final");
      setSelectedNodeId(stop.nodeIds[0] ?? null);
      setBottomExpanded(false);
      if (stop.kind === "intro" || stop.kind === "final") {
        fly({ bounds: ROUTE_BOUNDS, duration: TOUR_CAMERA_MOTION_MS, zoom: 6.4 });
      } else {
        const lineIds = stop.nodeIds.flatMap((nid) => nodes.find((x) => x.id === nid)!.segmentIds);
        fly({ bounds: unionBounds(lineIds), duration: TOUR_CAMERA_MOTION_MS });
      }
    },
    [fly]
  );

  const enterMode = useCallback(
    (m: Mode) => {
      setMode(m);
      setPlaying(false);
      setFocusMode(false);
      setLearningEmphasis(null);
      setMobileTimelineOpen(false);
      setSelectedStoryId(null);
      if (m !== "tour") setRevealT(1);
      if (m === "tour") {
        setTourIndex(0);
        setRightView(null);
        applyTourStop(0);
      } else if (m === "explore") {
        setShowEpilogue(false);
        setRightView(null);
        setRevealT(1);
        fly({ bounds: ROUTE_BOUNDS, duration: CAMERA_MOTION_MS });
      } else {
        setRightView({ type: "sources" });
      }
    },
    [applyTourStop, fly]
  );

  // 节点选择（地图标记 / 左侧列表 / 面板翻页）
  const selectNode = useCallback(
    (id: string) => {
      const node = nodes.find((x) => x.id === id)!;
      setMode("explore");
      setPlaying(false);
      setLearningEmphasis(null);
      setSelectedNodeId(id);
      setSelectedStoryId(null);
      setShowEpilogue(false);
      setRightView({ type: "node", nodeId: id });
      setRevealT(1);
      setTimelineT(NODE_FRACTIONS[id]);
      flyToNode(node);
    },
    [flyToNode]
  );

  const selectStory = useCallback(
    (id: string) => {
      const story = stories.find((item) => item.id === id);
      if (!story) return;
      setMode("explore");
      setPlaying(false);
      setLearningEmphasis(null);
      setSelectedStoryId(id);
      setSelectedNodeId(story.nodeId);
      setRevealT(1);
      setTimelineT(NODE_FRACTIONS[story.nodeId]);
      setRightView({ type: "story", storyId: id });
      flyToStory(story);
    },
    [flyToStory]
  );

  const prevNext = useCallback(
    (dir: -1 | 1) => {
      if (mode === "tour") {
        const nextIndex = tourIndex + dir;
        if (nextIndex < 0) return;
        if (nextIndex >= TOUR_STOPS.length) {
          enterMode("explore");
          return;
        }
        setTourIndex(nextIndex);
        applyTourStop(nextIndex);
      } else if (selectedNodeId) {
        const cur = nodes.find((x) => x.id === selectedNodeId)!;
        const target = nodes.find((x) => x.seq === cur.seq + dir);
        if (target) selectNode(target.id);
      }
    },
    [mode, tourIndex, selectedNodeId, applyTourStop, enterMode, selectNode]
  );

  // Esc 逐层关闭；←/→ 翻站/翻节点；空格播放；? 打开说明
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const onInput = (e.target as HTMLElement | null)?.tagName === "INPUT";
      if (e.key === "Escape") {
        if (infoOpen) setInfoOpen(false);
        else if (catalogOpen) setCatalogOpen(false);
        else if (cruising) exitCruise();
        else if (focusMode) {
          setFocusMode(false);
          setLearningEmphasis(null);
        } else if (rightView) {
          setRightView(null);
          setLearningEmphasis(null);
        }
        else if (bottomExpanded) setBottomExpanded(false);
        else if (mobileTimelineOpen) setMobileTimelineOpen(false);
      } else if (e.key === "?" ) {
        setInfoOpen(true);
      } else if (e.key === " " && (e.target as HTMLElement | null)?.tagName === "BODY") {
        e.preventDefault();
        togglePlay();
      } else if (e.key === "ArrowRight" && !onInput && (mode === "tour" || mode === "explore")) {
        prevNext(1);
      } else if (e.key === "ArrowLeft" && !onInput && (mode === "tour" || mode === "explore")) {
        prevNext(-1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [infoOpen, catalogOpen, cruising, focusMode, rightView, bottomExpanded, mobileTimelineOpen, mode, prevNext, exitCruise, togglePlay]);

  // 深链接：首次进入按 hash 内容定位相机（相机请求会在地图就绪后生效）
  useEffect(() => {
    if (initialHash.storyId) {
      const story = stories.find((item) => item.id === initialHash.storyId);
      if (story) flyToStory(story);
    } else if (initialHash.nodeId) {
      const node = nodes.find((item) => item.id === initialHash.nodeId);
      if (node) flyToNode(node);
    }
    if (initialHash.mode === "tour") applyTourStop(initialHash.tourIndex ?? 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    suppressInitialSelectedScrollRef.current = false;
  }, []);

  // 状态 → hash（防抖，避免播放时高频改写地址）
  const lastHashRef = useRef("");
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const hash = serializeHash({
        mode,
        tourIndex,
        nodeId: selectedNodeId ?? undefined,
        storyId: selectedStoryId ?? undefined,
        timelineT,
        revealT: mode === "explore" ? undefined : revealT,
      });
      if (hash !== window.location.hash) {
        lastHashRef.current = hash;
        history.replaceState(null, "", hash || `${window.location.pathname}${window.location.search}`);
      }
    }, 350);
    return () => window.clearTimeout(timer);
  }, [mode, tourIndex, selectedNodeId, selectedStoryId, timelineT, revealT]);

  // 外部 hash 变化（浏览器前进/后退、手动编辑）→ 应用状态
  useEffect(() => {
    const onHashChange = () => {
      if (window.location.hash === lastHashRef.current) return;
      const params = parseHash(window.location.hash);
      if (params.storyId) selectStory(params.storyId);
      else if (params.nodeId) selectNode(params.nodeId);
      else {
        setSelectedNodeId(null);
        setSelectedStoryId(null);
        setRightView(params.mode === "sources" ? { type: "sources" } : null);
      }
      if (params.mode) setMode(params.mode);
      const resolved = resolveTimelineAndRevealFromHash(params);
      setTimelineT(resolved.timelineT);
      setRevealT(resolved.revealT);
      if (params.mode === "tour") {
        setTourIndex(params.tourIndex ?? 0);
        applyTourStop(params.tourIndex ?? 0);
      }
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, [selectStory, selectNode, applyTourStop]);

  // 旁白语音（浏览器 TTS）：进入新段时朗读，暂停/关闭即停
  const activeSeg = activeSegmentAt(revealT);
  const narrationLine = narrationFor(activeSeg);
  useEffect(() => {
    if (typeof speechSynthesis === "undefined") return;
    if (!voiceOn || !playing || !narrationLine) {
      speechSynthesis.cancel();
      return;
    }
    const utter = new SpeechSynthesisUtterance(narrationLine);
    utter.lang = "zh-CN";
    utter.rate = 0.95;
    speechSynthesis.cancel();
    speechSynthesis.speak(utter);
    return () => speechSynthesis.cancel();
  }, [voiceOn, playing, narrationLine]);

  // 环境声开关
  useEffect(() => {
    if (ambientOn) startAmbient();
    else stopAmbient();
  }, [ambientOn]);

  const selectedStory = selectedStoryId ? stories.find((item) => item.id === selectedStoryId) : null;
  const selectedNode = selectedNodeId ? nodes.find((item) => item.id === selectedNodeId) : null;
  const selectedNodeScene = selectedNodeId ? sceneForNode(selectedNodeId) : null;
  const activeNodeScene = effectiveRightView?.type === "node" ? selectedNodeScene : null;
  const activeNodePlaceLabel = activeNodeScene && selectedNode ? scenePlaceLabel(activeNodeScene, selectedNode) : "";
  const revealTitle = selectedStory?.title ?? selectedNode?.title ?? null;
  const revealMeta = selectedStory
    ? selectedStory.dateLabel + " / " + selectedStory.place
    : selectedNode
      ? selectedNode.displayDateLabel
      : "";

  const onTimelineChange = useCallback(
    (t: number) => {
      if (mode === "tour") return;
      const next = Math.max(0, Math.min(1, t));
      const nextNode = nodeAtTimelineT(next);
      setPlaying(false);
      setLearningEmphasis(null);
      setShowEpilogue(false);
      setTimelineT(next);
      if (selectedNodeRef.current !== nextNode.id || selectedStoryRef.current !== null || rightViewRef.current?.type !== "node") {
        setSelectedStoryId(null);
        setSelectedNodeId(nextNode.id);
        setRightView({ type: "node", nodeId: nextNode.id });
      }
    },
    [mode]
  );

  const toggleTerrain3d = useCallback(() => {
    userTouched3dRef.current = true;
    setTerrainUi((current) => {
      if (current.active || current.pendingActivationRequestId !== null) return disableTerrain3d(current);
      return requestTerrainActivation(current).state;
    });
  }, []);

  // 3D 默认开启：首次「就绪」且用户尚未碰过 3D 开关时自动激活一次；
  // 用户随后关闭即尊重其选择，不再自动开启。偏好减少动效的观众跳过。
  const auto3dDoneRef = useRef(false);
  const userTouched3dRef = useRef(false);
  useEffect(() => {
    if (auto3dDoneRef.current || userTouched3dRef.current) return;
    if (terrainUi.status !== "ready" || terrainUi.active || terrainUi.pendingActivationRequestId !== null) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    auto3dDoneRef.current = true;
    setTerrainUi((current) => requestTerrainActivation(current).state);
  }, [terrainUi.status, terrainUi.active, terrainUi.pendingActivationRequestId]);

  // 「行至诗句」：播放/巡航行至某节点时，右下浮现该节点名句，数秒后淡出
  const [quoteCard, setQuoteCard] = useState<{ id: string; key: number } | null>(null);
  const playingNodeId = playing || cruising ? nodeAtTimelineT(timelineT)?.id ?? null : null;
  useEffect(() => {
    if ((!playing && !cruising) || !playingNodeId) {
      setQuoteCard(null);
      return;
    }
    const node = nodes.find((item) => item.id === playingNodeId);
    if (!node?.quote) {
      setQuoteCard(null);
      return;
    }
    setQuoteCard({ id: playingNodeId, key: Date.now() });
    const timer = window.setTimeout(() => setQuoteCard(null), 5400);
    return () => window.clearTimeout(timer);
  }, [playing, cruising, playingNodeId]);

  // 行军计程仪：第几天 / 已行里数 / 当前海拔（播放与巡航时实时更新）
  const marchActive = playing || cruising;
  const marchDay = marchDayAt(timelineT);
  const marchLi = marchDistanceLi(timelineT);
  const [segStart, segEnd] = SEG_FRACTIONS[activeSeg];
  const segFrac = Math.max(0, Math.min(1, (revealT - segStart) / (segEnd - segStart || 1)));
  const currentAltitude = altitudeForSegment(activeSeg, segFrac);

  // 氛围：播放/巡航跟随时间轴上的节点，静态时跟随选中节点
  const atmosphereNodeId = (playing || cruising ? playingNodeId : selectedNodeId) ?? null;
  const atmosphere = nodes.find((item) => item.id === atmosphereNodeId)?.atmosphere ?? null;

  // 终点总结卡：时间轴抵达 1935-10-22 时浮现
  const [finaleOpen, setFinaleOpen] = useState(false);
  useEffect(() => {
    setFinaleOpen(timelineT >= 0.995 && mode !== "tour");
  }, [timelineT, mode]);

  return (
    <div
      className={`app ${focusMode ? "focus" : ""} ${
        rightPanelPresentation.learningFocus ? "learning-focus" : ""
      } ${leftCollapsed && mode !== "sources" ? "left-rail" : ""}`}
      style={
        {
          "--learning-map-width": rightPanelPresentation.mapWidth,
          "--learning-panel-width": rightPanelPresentation.panelWidth,
        } as CSSProperties
      }
    >
      <MapCanvas
        progress={revealT}
        selectedNodeId={selectedNodeId}
        selectedStoryId={selectedStoryId}
        nodeScene={activeNodeScene}
        layers={mapLayers}
        terrainStatus={terrainUi.status}
        terrain3dActive={terrainUi.active}
        terrain3dRequestId={terrainUi.pendingActivationRequestId}
        showEpilogue={showEpilogue}
        learningFocus={rightPanelPresentation.learningFocus}
        learningEmphasis={learningEmphasis}
        padding={padding}
        cameraReq={cameraReq}
        onSelectNode={selectNode}
        onSelectStory={selectStory}
        onUserGesture={() => {
          setPlaying(false);
          setTerrainUi((current) => cancelTerrainActivationRequest(current));
        }}
        cruise={cruising}
        compare={compareOn}
        atmosphere={atmosphere}
        onTerrainStatusChange={(status: TerrainStatus) => setTerrainUi((current) => syncTerrainStatus(current, status))}
        onTerrainActivationApplied={(requestId) => setTerrainUi((current) => applyTerrainActivation(current, requestId))}
      />

      {compareOn && <CompareGuide />}

      {marchActive && (
        <div className="march-odometer" role="status">
          <strong>长征第 {marchDay} 天</strong>
          <span>已行约 {marchLi.toLocaleString("zh-CN")} 里（按图示路线）</span>
          <span>当前海拔 ≈ {currentAltitude !== null ? currentAltitude.toLocaleString("zh-CN") : "—"} 米</span>
        </div>
      )}

      {finaleOpen && (
        <div className="finale-card" role="dialog" aria-label="中央红军长征结束">
          <p className="finale-date">1935年10月22日 · 吴起镇</p>
          <h3>中央红军长征结束</h3>
          <ul>
            <li>历时约一年 · 370 余天</li>
            <li>行程约二万五千里</li>
            <li>转战十一省</li>
          </ul>
          <blockquote className="finale-quote">
            「长征是历史纪录上的第一次，长征是宣言书，长征是宣传队，长征是播种机。」
          </blockquote>
          <p className="finale-attribution">—— 毛泽东《论反对日本帝国主义的策略》（1935年12月）</p>
          <p className="finale-fine">1936年10月三大主力会师，是长征总史的终点。</p>
          <div className="finale-actions">
            <button
              className="primary-btn"
              onClick={() => {
                setFinaleOpen(false);
                fly({ bounds: ROUTE_BOUNDS, duration: CAMERA_MOTION_MS });
              }}
            >
              回看全程
            </button>
            <button className="ghost-btn" onClick={() => setFinaleOpen(false)}>
              继续探索
            </button>
          </div>
        </div>
      )}

      {activeNodeScene && selectedNode && !focusMode && (
        <NodeSceneCartouche node={selectedNode} scene={activeNodeScene} placeLabel={activeNodePlaceLabel} />
      )}

      {revealTitle && (
        <MapTitleReveal
          key={selectedStoryId ?? selectedNodeId ?? revealTitle}
          title={revealTitle}
          meta={revealMeta}
        />
      )}

      {playing && narrationLine && !focusMode && !rightPanelPresentation.learningFocus && (
        <div className="narration-caption" key={activeSeg} role="status">
          {narrationLine}
        </div>
      )}

      {quoteCard &&
        (() => {
          const quotedNode = nodes.find((item) => item.id === quoteCard.id);
          if (!quotedNode?.quote) return null;
          return (
            <figure className="quote-float" key={quoteCard.key} role="status">
              <blockquote>{quotedNode.quote.text}</blockquote>
              <figcaption>—— {quotedNode.quote.attribution}</figcaption>
            </figure>
          );
        })()}

      {!focusMode && (
        <TopBar
          mode={mode}
          onMode={enterMode}
          terrainStatus={terrainUi.status}
          terrain3dActive={terrainUi.active}
          terrainPendingActivation={terrainUi.pendingActivationRequestId !== null}
          compareOn={compareOn}
          onCompareToggle={() => setCompareOn((v) => !v)}
          onTerrain3d={toggleTerrain3d}
          cruising={cruising}
          onCruiseToggle={toggleCruise}
          focusMode={focusMode}
          onFocusToggle={() => setFocusMode(true)}
          onInfo={() => setInfoOpen(true)}
          onOpenCatalog={() => setCatalogOpen(true)}
        />
      )}

      {focusMode && (
        <button
          className="focus-exit"
          onClick={() => {
            setFocusMode(false);
            setLearningEmphasis(null);
          }}
        >
          退出专注地图
        </button>
      )}

      {!focusMode && mode !== "sources" && (
        <>
          <LeftTimeline
            timelineT={timelineT}
            selectedNodeId={selectedNodeId}
            collapsed={leftCollapsed || mode === "tour"}
            mobileOpen={mobileTimelineOpen}
            suppressInitialSelectedScroll={suppressInitialSelectedScrollRef.current}
            onToggleCollapse={() => setLeftCollapsed((v) => !v)}
            onTimelineChange={onTimelineChange}
            onSelect={(id) => {
              selectNode(id);
              setMobileTimelineOpen(false);
            }}
          />
          {mode !== "tour" && !effectiveRightView && (
            <button
              className="mobile-sheet-toggle"
              onClick={() => setMobileTimelineOpen((v) => !v)}
              aria-expanded={mobileTimelineOpen}
            >
              {mobileTimelineOpen ? "▾ 收起时间与节点" : "▴ 时间与节点"}
            </button>
          )}
        </>
      )}

      <RightPanel
        view={effectiveRightView}
        depth={depth}
        onDepth={setDepth}
        onClose={() => {
          setLearningEmphasis(null);
          setSelectedStoryId(null);
          if (mode === "tour") enterMode("explore");
          else setRightView(null);
        }}
        onSelectNode={selectNode}
        onSelectStory={selectStory}
        onOpenSources={(nodeId) => {
          setMode("explore");
          setLearningEmphasis(null);
          setSelectedStoryId(null);
          setRightView({ type: "sources", nodeId });
        }}
        onPrevNext={prevNext}
        learningEmphasis={learningEmphasis}
        onLearningEmphasisChange={setLearningEmphasis}
        tourChrome={
          stop && stop.kind !== "intro"
            ? { index: tourIndex + 1, total: TOUR_STOPS.length, stopTitle: stop.title }
            : null
        }
      />

      {!focusMode && mode !== "sources" && (
        <BottomPanel
          scrubbingLocked={mode === "tour"}
          timelineT={timelineT}
          selectedNodeId={selectedNodeId}
          expanded={bottomExpanded}
          onToggle={() => setBottomExpanded((v) => !v)}
          onTimelineChange={onTimelineChange}
          playing={playing}
          onPlayToggle={togglePlay}
          voiceOn={voiceOn}
          onVoiceToggle={() => setVoiceOn((v) => !v)}
          ambientOn={ambientOn}
          onAmbientToggle={() => setAmbientOn((v) => !v)}
        />
      )}

      {!focusMode && mode !== "sources" && (
        <LayerPanel
          layers={mapLayers}
          onChange={(key, value) => setMapLayers((current) => ({ ...current, [key]: value }))}
          onPreset={(preset) =>
            setMapLayers(
              preset === "map"
                ? {
                    terrain: true,
                    contours: true,
                    water: true,
                    labels: true,
                    route: false,
                    nodes: false,
                    stories: false,
                  }
                : {
                    terrain: true,
                    contours: true,
                    water: true,
                    labels: true,
                    route: true,
                    nodes: true,
                    stories: true,
                  }
            )
          }
        />
      )}

      {!focusMode && mode !== "sources" && (
        <Legend
          showEpilogue={showEpilogue}
          onEpilogue={setShowEpilogue}
          showStories={mapLayers.stories}
          onStories={(value) => setMapLayers((current) => ({ ...current, stories: value }))}
          onResetView={() => fly({ bounds: ROUTE_BOUNDS, duration: CAMERA_MOTION_MS })}
        />
      )}

      <StoryCatalog open={catalogOpen} onClose={() => setCatalogOpen(false)} onSelect={selectStory} />

      {mode === "tour" && stop && (
        <>
          {stop.kind === "intro" && (
            <div className="intro-card" role="dialog" aria-label="导览总览">
              <span className="chip chip-demo">导览 · 第 1 / {TOUR_STOPS.length} 站</span>
              <h2>{stop.title}</h2>
              <blockquote>{stop.question}</blockquote>
              <p>{stop.text}</p>
              <div className="intro-actions">
                <button className="primary-btn" onClick={() => prevNext(1)}>
                  出发 →
                </button>
                <button className="ghost-btn" onClick={() => enterMode("explore")}>
                  先自己看看地图
                </button>
              </div>
            </div>
          )}
          <div className="tour-nav">
            <button className="ghost-btn" onClick={() => prevNext(-1)} disabled={tourIndex === 0}>
              ◀ 上一站
            </button>
            <span className="tour-nav-title">
              第 {tourIndex + 1} / {TOUR_STOPS.length} 站 · {stop.title}
            </span>
            {tourIndex < TOUR_STOPS.length - 1 ? (
              <button className="primary-btn" onClick={() => prevNext(1)}>
                下一站 ▶
              </button>
            ) : (
              <button className="primary-btn" onClick={() => enterMode("explore")}>
                完成导览
              </button>
            )}
          </div>
        </>
      )}

      {infoOpen && <InfoSheet onClose={() => setInfoOpen(false)} />}
    </div>
  );
}
