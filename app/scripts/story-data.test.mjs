import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const storyPath = new URL("../src/data/stories.json", import.meta.url);
const sourcesPath = new URL("../src/data/sources.ts", import.meta.url);
const validKinds = new Set(["decision", "march", "battle", "crossing", "people", "terrain", "meeting"]);
const validPrecision = new Set(["confirmed", "approximate"]);

test("story dataset is complete, traceable, and geographically valid", async () => {
  const stories = JSON.parse(await readFile(storyPath, "utf8"));
  const sourcesText = await readFile(sourcesPath, "utf8");

  assert.ok(Array.isArray(stories));
  assert.ok(stories.length >= 12, "at least 12 story points are required");
  assert.equal(new Set(stories.map((story) => story.id)).size, stories.length, "story IDs must be unique");

  for (const story of stories) {
    assert.match(story.id, /^story-\d{2}$/);
    assert.match(story.nodeId, /^node-\d{2}$/);
    assert.ok(story.title.length >= 4);
    assert.ok(story.summary.length >= 45 && story.summary.length <= 220);
    assert.ok(validKinds.has(story.kind), "invalid kind for " + story.id);
    assert.ok(validPrecision.has(story.precision), "invalid precision for " + story.id);
    assert.ok(Array.isArray(story.location) && story.location.length === 2);
    assert.ok(story.location[0] >= 95 && story.location[0] <= 120, "longitude out of range for " + story.id);
    assert.ok(story.location[1] >= 20 && story.location[1] <= 40, "latitude out of range for " + story.id);
    assert.ok(Array.isArray(story.people) && story.people.length >= 1, "people or participant group missing for " + story.id);
    assert.ok(story.people.every((person) => person.name && person.role));
    assert.ok(Array.isArray(story.sourceIds) && story.sourceIds.length >= 1);
    for (const sourceId of story.sourceIds) {
      assert.ok(sourcesText.includes('id: "' + sourceId + '"'), "unknown source " + sourceId + " in " + story.id);
    }
    assert.ok(story.question.length >= 8);
  }
});

test("terrain profiles are bundled with the bottom panel instead of fetched from a missing public path", async () => {
  const panelText = await readFile(new URL("../src/components/BottomPanel.tsx", import.meta.url), "utf8");
  assert.ok(panelText.includes('elevation-profiles.json'), "BottomPanel must import the generated profile data");
  assert.ok(!panelText.includes('fetch("terrain/elevation-profiles.json")'), "BottomPanel must not fetch a non-existent public file");
});

test("DEM preprocessing produces three valid contour levels", async () => {
  for (const interval of [200, 100, 50]) {
    const contourPath = new URL("../public/terrain/contour-" + interval + ".geojson", import.meta.url);
    const data = JSON.parse(await readFile(contourPath, "utf8"));
    assert.equal(data.type, "FeatureCollection");
    assert.ok(data.features.length >= 20, "contour-" + interval + " must contain usable line features");
    assert.ok(
      data.features.every(
        (feature) =>
          feature.geometry?.type === "LineString" &&
          feature.geometry.coordinates.length >= 2 &&
          feature.properties?.elevation % interval === 0
      ),
      "contour-" + interval + " contains invalid geometry or elevation"
    );
  }
  const labels = JSON.parse(
    await readFile(new URL("../public/terrain/contour-labels.geojson", import.meta.url), "utf8")
  );
  assert.ok(labels.features.length >= 20);
  assert.ok(labels.features.every((feature) => feature.geometry?.type === "Point"));
});

test("map exposes contour layers, layer controls, and compact zoom-aware markers", async () => {
  const styleText = await readFile(new URL("../src/map/style.ts", import.meta.url), "utf8");
  const mapText = await readFile(new URL("../src/map/MapCanvas.tsx", import.meta.url), "utf8");
  const terrainRuntimeText = await readFile(new URL("../src/map/terrainRuntime.ts", import.meta.url), "utf8");
  const appText = await readFile(new URL("../src/App.tsx", import.meta.url), "utf8");
  const cssText = await readFile(new URL("../src/styles.css", import.meta.url), "utf8");

  assert.ok(!styleText.includes('data: "terrain/contour-200.geojson"'));
  assert.ok(styleText.includes('contours: ["contour-major", "contour-mid", "contour-fine"]'));
  assert.ok(terrainRuntimeText.includes("contour-200.geojson"));
  assert.ok(terrainRuntimeText.includes("contour-100.geojson"));
  assert.ok(terrainRuntimeText.includes("contour-50.geojson"));
  assert.ok(mapText.includes("ensureMajorContours"));
  assert.ok(mapText.includes("ensureDetailContours"));
  assert.ok(mapText.includes("NavigationControl"));
  assert.ok(mapText.includes("ScaleControl"));
  assert.ok(mapText.includes("loadContourLabels"));
  assert.ok(mapText.includes("contour-elevation-label"));
  assert.ok(appText.includes("LayerPanel"));
  assert.ok(cssText.includes(".story-marker") && cssText.includes("width: 16px"));
});

test("editorial title system replaces the flat toolbar heading", async () => {
  const topBarText = await readFile(new URL("../src/components/TopBar.tsx", import.meta.url), "utf8");
  const rightPanelText = await readFile(new URL("../src/components/RightPanel.tsx", import.meta.url), "utf8");
  const appText = await readFile(new URL("../src/App.tsx", import.meta.url), "utf8");
  const cssText = await readFile(new URL("../src/styles.css", import.meta.url), "utf8");

  assert.ok(topBarText.includes("brand-primary"));
  assert.ok(topBarText.includes("brand-secondary"));
  // 日期范围只在左栏面板出现一次；顶栏以分组线区分模式 / 视图开关 / 帮助。
  assert.ok(!topBarText.includes("brand-period"));
  assert.ok(topBarText.includes("topbar-sep"));
  assert.ok(!topBarText.includes("brand-seal"));
  assert.ok(!topBarText.includes("原型演示"));
  assert.ok(rightPanelText.includes("panel-heading-main"));
  assert.ok(rightPanelText.includes("panel-heading-sub"));
  assert.ok(appText.includes("MapTitleReveal"));
  assert.ok(cssText.includes("@keyframes title-reveal"));
});

test("natural topographic base uses elevation tint and restrained multidirectional relief", async () => {
  const terrainScript = await readFile(new URL("./build-terrain.mjs", import.meta.url), "utf8");
  const styleText = await readFile(new URL("../src/map/style.ts", import.meta.url), "utf8");
  const terrainRuntimeText = await readFile(new URL("../src/map/terrainRuntime.ts", import.meta.url), "utf8");
  const layerPanelText = await readFile(new URL("../src/components/LayerPanel.tsx", import.meta.url), "utf8");
  const tint = new URL("../public/terrain/terrain-tint.png", import.meta.url);

  const tintBytes = await readFile(tint);
  assert.ok(tintBytes.length > 100000, "terrain tint raster is missing or empty");
  assert.ok(terrainScript.includes("MULTI_AZIMUTHS"));
  assert.ok(terrainScript.includes("ELEVATION_COLORS"));
  assert.ok(!styleText.includes("terrainColorDem"));
  assert.ok(styleText.includes('type: "image"'));
  assert.ok(styleText.includes("offlineTerrainTint"));
  assert.ok(styleText.includes("offline-terrain-color"));
  assert.ok(styleText.includes("offline-terrain-relief"));
  assert.ok(terrainRuntimeText.includes('type: "raster-dem"'));
  assert.ok(terrainRuntimeText.includes("terrainDem"));
  assert.ok(styleText.includes('"raster-opacity": 0.38'));
  assert.ok(styleText.includes('["get", "scalerank"]'));
  assert.ok(layerPanelText.includes("高程分层设色"));
});

test("map cartouche is visually separated from controls and geographic labels are legible", async () => {
  const topBarText = await readFile(new URL("../src/components/TopBar.tsx", import.meta.url), "utf8");
  const cssText = await readFile(new URL("../src/styles.css", import.meta.url), "utf8");

  assert.ok(topBarText.includes("topbar-cartouche"));
  assert.ok(topBarText.includes("topbar-controls"));
  assert.ok(cssText.includes("/* ---------- 地图图名与地名清晰度 ---------- */"));
  assert.ok(cssText.includes(".topbar-cartouche"));
  assert.ok(cssText.includes(".topbar-controls"));
  assert.ok(cssText.includes(".geo-label.city"));
  assert.ok(cssText.includes("font-size: 13px"));
  assert.ok(cssText.includes(".geo-label.river"));
});

test("DOM contour labels load at runtime after style load instead of blocking first paint", async () => {
  const mapText = await readFile(new URL("../src/map/MapCanvas.tsx", import.meta.url), "utf8");
  const runtimeText = await readFile(new URL("../src/map/terrainRuntime.ts", import.meta.url), "utf8");
  assert.ok(mapText.includes('map.once("style.load"'));
  assert.ok(mapText.includes('loadedMap.on("idle"'));
  assert.ok(mapText.includes("loadContourLabels"));
  assert.ok(!mapText.includes('fetch("terrain/contour-labels.geojson")'));
  assert.ok(runtimeText.includes('fetch("terrain/contour-labels.geojson")'));
  assert.ok(!mapText.includes('map.on("load"'));
});
