import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { INTRO_DELAY_MS } from "../src/map/overview.ts";

// 用户决策（2026-09）：地图默认只显示长征路线附近，不再从全国总览开场。
test("地图默认定位在长征路线附近，全国总览取景已移除", async () => {
  const overviewText = await readFile(new URL("../src/map/overview.ts", import.meta.url), "utf8");
  assert.ok(!overviewText.includes("CHINA_OVERVIEW_BOUNDS"), "全国总览常量应已删除");
  assert.ok(!overviewText.includes("getChinaOverviewBounds"), "全国总览取景函数应已删除");

  const mapText = await readFile(new URL("../src/map/MapCanvas.tsx", import.meta.url), "utf8");
  assert.ok(mapText.includes("ROUTE_BOUNDS"), "地图初始化必须使用路线全景范围");
  assert.ok(!mapText.includes("getChinaOverviewBounds"), "地图初始化不得再引用全国总览");

  const appText = await readFile(new URL("../src/App.tsx", import.meta.url), "utf8");
  assert.ok(!appText.includes("getChinaOverviewBounds"), "探索模式与重置视图不得再引用全国总览");
  assert.ok(appText.includes("bounds: ROUTE_BOUNDS"), "探索模式与重置视图应回到路线全景");

  const legendText = await readFile(new URL("../src/components/Legend.tsx", import.meta.url), "utf8");
  assert.ok(legendText.includes("回到路线全景"), "图例重置按钮文案应指向路线全景");
});

test("开场脉冲延时常量保持可用且取值合理", () => {
  assert.equal(typeof INTRO_DELAY_MS, "number");
  assert.ok(INTRO_DELAY_MS >= 0 && INTRO_DELAY_MS <= 10_000);
});
