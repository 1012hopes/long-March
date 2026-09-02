// 时间进度模型：主线 1934-10-10 → 1935-10-22 映射到 0..1
// 窗口数据来自 research/route-segment-register.csv 与 node-register.csv
const T0 = Date.parse("1934-10-10T00:00:00Z");
const T1 = Date.parse("1935-10-22T00:00:00Z");
const SPAN = T1 - T0;

export const dateToT = (iso: string) =>
  Math.max(0, Math.min(1, (Date.parse(`${iso}T00:00:00Z`) - T0) / SPAN));

export const SEG_WINDOWS: Record<string, [string, string]> = {
  "seg-01": ["1934-10-10", "1934-12-01"],
  "seg-02": ["1934-12-01", "1935-01-01"],
  "seg-03": ["1935-01-01", "1935-01-17"],
  "seg-04": ["1935-01-17", "1935-03-30"],
  "seg-05": ["1935-03-30", "1935-05-09"],
  "seg-06": ["1935-05-09", "1935-05-29"],
  "seg-07": ["1935-05-29", "1935-06-17"],
  "seg-08": ["1935-06-17", "1935-10-22"],
};

export const NODE_DATES: Record<string, [string, string]> = {
  "node-01": ["1934-10-10", "1934-10-20"],
  "node-02": ["1934-11-27", "1934-12-01"],
  "node-03": ["1934-12-12", "1935-01-01"],
  "node-04": ["1935-01-15", "1935-01-17"],
  "node-05": ["1935-01-29", "1935-03-30"],
  "node-06": ["1935-05-03", "1935-05-09"],
  "node-07": ["1935-05-24", "1935-05-29"],
  "node-08": ["1935-06-12", "1935-06-17"],
  "node-09": ["1935-09-18", "1935-10-22"],
};

export const SEG_ORDER = Object.keys(SEG_WINDOWS);

/** 每条候选线自己的显示窗口（同段多条候选共享窗口） */
export const LINE_WINDOWS: Record<string, [number, number]> = (() => {
  const out: Record<string, [number, number]> = {};
  const lineToSeg: Record<string, string> = {
    "seg-01": "seg-01",
    "seg-02": "seg-02",
    "seg-03": "seg-03",
    "seg-04a": "seg-04",
    "seg-04b": "seg-04",
    "seg-05": "seg-05",
    "seg-06": "seg-06",
    "seg-07": "seg-07",
    "seg-08a": "seg-08",
    "seg-08b": "seg-08",
  };
  for (const [lineId, segId] of Object.entries(lineToSeg)) {
    const [a, b] = SEG_WINDOWS[segId];
    out[lineId] = [dateToT(a), dateToT(b)];
  }
  return out;
})();

export const NODE_FRACTIONS: Record<string, number> = Object.fromEntries(
  Object.entries(NODE_DATES).map(([id, [a]]) => [id, dateToT(a)])
);

export const SEG_FRACTIONS: Record<string, [number, number]> = Object.fromEntries(
  Object.entries(SEG_WINDOWS).map(([id, [a, b]]) => [id, [dateToT(a), dateToT(b)]])
);

/** 当前 t 落在哪一段 */
export function activeSegmentAt(t: number): string {
  const entries = Object.entries(SEG_FRACTIONS);
  for (const [id, [a, b]] of entries) {
    if (t >= a && t < b) return id;
  }
  return t <= 0 ? entries[0][0] : entries[entries.length - 1][0];
}

const YEAR_MONTH = new Intl.DateTimeFormat("zh-CN", {
  timeZone: "UTC",
  year: "numeric",
  month: "long",
});

/** t → “1935年3月” */
export function tToDateLabel(t: number): string {
  const ms = T0 + Math.max(0, Math.min(1, t)) * SPAN;
  return YEAR_MONTH.format(new Date(ms)).replace("年", "年 ");
}

const MONTH_DAY = new Intl.DateTimeFormat("zh-CN", {
  timeZone: "UTC",
  year: "numeric",
  month: "long",
  day: "numeric",
});

export function isoToDateLabel(iso: string): string {
  return MONTH_DAY.format(new Date(Date.parse(`${iso}T00:00:00Z`)));
}
