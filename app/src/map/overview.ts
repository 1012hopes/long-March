// 地图默认定位在长征路线附近（不再绕行全国总览）：路线范围在 MapCanvas.tsx
// 中由 route-geometry.json 计算得出（ROUTE_BOUNDS），并作为初始相机、探索模式
// 与“回到路线全景”的统一取景。

// 开场脉冲延时：地图就绪后稍作停顿，再轻拂路线走廊把视线引向主线。
// MapCanvas（路线脉冲）与整体开场共用同一延时。
export const INTRO_DELAY_MS = 1500;
