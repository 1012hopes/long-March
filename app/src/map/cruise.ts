// 巡航相机：沿当前路线段做低空滑翔（俯仰 60°、镜头贴路线走）。
// 主线候选映射与逐段几何在此集中管理，App 的播放循环与 MapCanvas 共用。
import routeGeometry from "../data/route-geometry.json";
import { SEG_FRACTIONS } from "../data/time";

export const SEG_PRIMARY_LINE: Record<string, string> = {
  "seg-01": "seg-01",
  "seg-02": "seg-02",
  "seg-03": "seg-03",
  "seg-04": "seg-04a",
  "seg-05": "seg-05",
  "seg-06": "seg-06",
  "seg-07": "seg-07",
  "seg-08": "seg-08a",
};

export const CRUISE_PITCH = 60;
export const CRUISE_ZOOM = 8.1;

type CruisePath = {
  coords: Array<[number, number]>;
  cumulative: number[]; // 每个点的累计平面距离（度）
  total: number;
};

const pathCache = new Map<string, CruisePath>();

function getLineCoords(lineId: string): Array<[number, number]> {
  const line = routeGeometry.find((l) => l.id === lineId);
  return (line?.coordinates ?? []) as Array<[number, number]>;
}

function buildPath(lineId: string): CruisePath {
  const cached = pathCache.get(lineId);
  if (cached) return cached;
  const coords = getLineCoords(lineId);
  const cumulative = [0];
  for (let i = 1; i < coords.length; i += 1) {
    const [dx, dy] = [coords[i][0] - coords[i - 1][0], coords[i][1] - coords[i - 1][1]];
    cumulative.push(cumulative[i - 1] + Math.hypot(dx, dy));
  }
  const path: CruisePath = { coords, cumulative, total: cumulative[cumulative.length - 1] ?? 0 };
  pathCache.set(lineId, path);
  return path;
}

/** 按累计距离的比例取线上的点 */
export function pointAtFraction(path: CruisePath, f: number): [number, number] {
  const target = Math.max(0, Math.min(1, f)) * path.total;
  for (let i = 1; i < path.cumulative.length; i += 1) {
    if (path.cumulative[i] >= target) {
      const segLen = path.cumulative[i] - path.cumulative[i - 1] || 1e-9;
      const k = (target - path.cumulative[i - 1]) / segLen;
      const [a, b] = [path.coords[i - 1], path.coords[i]];
      return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
    }
  }
  return path.coords[path.coords.length - 1] ?? [0, 0];
}

/** 两点间的罗盘方位角（度），用于巡航时让镜头朝向行进方向 */
export function bearingBetween(from: [number, number], to: [number, number]): number {
  const [lon1, lat1] = from.map((d) => (d * Math.PI) / 180) as [number, number];
  const [lon2, lat2] = to.map((d) => (d * Math.PI) / 180) as [number, number];
  const dLon = lon2 - lon1;
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

export type CruisePose = {
  center: [number, number];
  bearing: number;
  zoom: number;
  pitch: number;
};

/**
 * 给定段 id 与段内进度 f（0..1），返回低空巡航的相机位姿：
 * 中心取行进方向前方的观察点，朝向沿路段整体走向。
 */
export function cruisePose(segmentId: string, f: number): CruisePose {
  const path = buildPath(SEG_PRIMARY_LINE[segmentId] ?? "");
  const head = pointAtFraction(path, f);
  const ahead = pointAtFraction(path, Math.min(1, f + 0.12));
  const bearing = bearingBetween(head, ahead);
  return { center: ahead, bearing, zoom: CRUISE_ZOOM, pitch: CRUISE_PITCH };
}

/** 段的显示窗口（t 值），供滑翔时长换算使用 */
export const segmentWindow = (segmentId: string): [number, number] => SEG_FRACTIONS[segmentId];
