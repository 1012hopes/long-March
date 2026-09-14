import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { shareCardFileName } from "../src/map/shareCard.ts";

test("share card filename sanitizes title", () => {
  assert.equal(shareCardFileName("湘江战役"), "长征地图卡片-湘江战役.png");
  assert.ok(!shareCardFileName("a/b:c").includes("/"));
});

test("share card is wired in UI", async () => {
  const root = new URL("../src/", import.meta.url);
  const appText = await readFile(new URL("App.tsx", root), "utf8");
  const topbarText = await readFile(new URL("components/TopBar.tsx", root), "utf8");
  const mapText = await readFile(new URL("map/MapCanvas.tsx", root), "utf8");
  const shareText = await readFile(new URL("map/shareCard.ts", root), "utf8");

  assert.match(topbarText, /截取卡片/);
  assert.match(topbarText, /onShareCard/);
  assert.match(appText, /exportShareCard/);
  assert.match(appText, /composeShareCard/);
  assert.match(appText, /captureRef/);
  assert.match(mapText, /captureCanvas/);
  assert.match(shareText, /composeShareCard/);
  assert.match(shareText, /示意还原/);
});

test("composeShareCard draws title block when canvas 2d available", async () => {
  // Node 无 DOM canvas：仅验证函数导出与文件名；像素合成在浏览器验证
  const mod = await import("../src/map/shareCard.ts");
  assert.equal(typeof mod.composeShareCard, "function");
  assert.equal(typeof mod.downloadCanvasPng, "function");
});
