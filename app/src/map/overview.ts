export type MapBounds = [number, number, number, number];

// 全国总览留出约 1° 外边距，保证新疆、黑龙江与海南不会贴边或被面板遮挡。
const CHINA_OVERVIEW_BOUNDS: MapBounds = [72, 17, 136, 55];

export function getChinaOverviewBounds(): MapBounds {
  return [...CHINA_OVERVIEW_BOUNDS];
}
