import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const stylePath = new URL("../src/map/style.ts", import.meta.url);
const terrainRuntimePath = new URL("../src/map/terrainRuntime.ts", import.meta.url);
const routeGeometryPath = new URL("../src/data/route-geometry.json", import.meta.url);
const terrainDir = new URL("../public/terrain/", import.meta.url);

async function importTranspiledModule(filename, sourceText) {
  const transpiled = ts.transpileModule(sourceText, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const tempDir = await mkdtemp(join(tmpdir(), "map-style-test-"));
  const tempPath = join(tempDir, filename);
  await writeFile(tempPath, transpiled);
  try {
    return await import(pathToFileURL(tempPath).href + "?t=" + Date.now());
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

async function loadStyleModule() {
  const [styleText, routeGeometryText] = await Promise.all([
    readFile(stylePath, "utf8"),
    readFile(routeGeometryPath, "utf8"),
  ]);
  const patchedStyle = styleText.replace(
    'import routeGeometry from "../data/route-geometry.json";',
    "const routeGeometry = " + routeGeometryText + ";"
  );
  return importTranspiledModule("style.mjs", patchedStyle);
}

async function loadTerrainRuntimeModule() {
  const runtimeText = await readFile(terrainRuntimePath, "utf8");
  return importTranspiledModule("terrainRuntime.mjs", runtimeText);
}

async function terrainRasterSizes() {
  const files = ["terrain-tint.png", "hillshade.png"];
  return Promise.all(
    files.map(async (file) => ({
      file,
      size: (await stat(new URL(file, terrainDir))).size,
    }))
  );
}

class FakeMap {
  constructor(options = {}) {
    this.options = options;
    this.sources = new Map();
    this.layers = [{ id: "graticule" }, { id: "lakes-fill" }, { id: "rivers-line" }];
    this.visibility = new Map(this.layers.map((layer) => [layer.id, "visible"]));
    this.listeners = new Map();
    this.sourceAdds = [];
    this.layerAdds = [];
    this.removed = false;
  }

  assertActive() {
    if (this.removed) throw new Error("map removed");
  }

  getSource(id) {
    this.assertActive();
    return this.sources.get(id);
  }

  addSource(id, source) {
    this.assertActive();
    this.sources.set(id, source);
    this.sourceAdds.push({ id, source });
    if (id === "terrainDem" && this.options.autoSourceLoaded) {
      queueMicrotask(() => {
        if (!this.removed) this.emit("sourcedata", { sourceId: id, isSourceLoaded: true });
      });
    }
    if (id === "terrainDem" && this.options.autoSourceError) {
      queueMicrotask(() => {
        if (!this.removed) this.emit("error", { sourceId: id });
      });
    }
  }

  removeSource(id) {
    this.assertActive();
    this.sources.delete(id);
  }

  getLayer(id) {
    this.assertActive();
    return this.layers.find((layer) => layer.id === id);
  }

  addLayer(layer, beforeId) {
    this.assertActive();
    this.layerAdds.push({ id: layer.id, beforeId });
    const nextLayer = {
      ...layer,
      layout: { visibility: layer.layout?.visibility ?? "visible", ...layer.layout },
    };
    const index = beforeId ? this.layers.findIndex((candidate) => candidate.id === beforeId) : -1;
    if (index >= 0) this.layers.splice(index, 0, nextLayer);
    else this.layers.push(nextLayer);
    this.visibility.set(nextLayer.id, nextLayer.layout.visibility ?? "visible");
  }

  setLayoutProperty(id, key, value) {
    this.assertActive();
    if (key === "visibility") this.visibility.set(id, value);
  }

  on(type, listener) {
    const handlers = this.listeners.get(type) ?? new Set();
    handlers.add(listener);
    this.listeners.set(type, handlers);
  }

  off(type, listener) {
    this.listeners.get(type)?.delete(listener);
  }

  listenerCount(type) {
    return this.listeners.get(type)?.size ?? 0;
  }

  emit(type, event) {
    for (const listener of [...(this.listeners.get(type) ?? [])]) {
      listener(event);
    }
  }

  getZoom() {
    return this.options.zoom ?? 6;
  }

  remove() {
    this.removed = true;
    this.listeners.clear();
    this.sources.clear();
    this.layers = [];
    this.visibility.clear();
  }
}

test("base style removes online DEM and contour sources from first paint", async () => {
  const { buildStyle } = await loadStyleModule();
  const style = buildStyle(null);
  const sourceIds = Object.keys(style.sources);
  const layerIds = style.layers.map((layer) => layer.id);

  assert.equal(
    Object.values(style.sources).filter((source) => source.type === "raster-dem").length,
    0,
    "first paint must not declare online DEM sources"
  );
  assert.ok(!sourceIds.includes("terrainDem"));
  assert.ok(!sourceIds.includes("terrainColorDem"));
  assert.ok(!sourceIds.includes("contourMajor"));
  assert.ok(!sourceIds.includes("contourMid"));
  assert.ok(!sourceIds.includes("contourFine"));
  assert.ok(!layerIds.includes("global-terrain-color"));
  assert.ok(!layerIds.includes("terrain-relief"));
  assert.ok(!layerIds.includes("contour-major"));
  assert.ok(!layerIds.includes("contour-mid"));
  assert.ok(!layerIds.includes("contour-fine"));
});

test("local terrain rasters are wired into the base style when bbox metadata is available", async () => {
  const { MAP_LAYER_IDS, buildStyle } = await loadStyleModule();
  const hillshade = {
    west: 97.25,
    east: 109.5,
    south: 23.75,
    north: 35.125,
    generated: "2026-09-03T00:00:00.000Z",
  };
  const style = buildStyle(hillshade);
  const rasters = await terrainRasterSizes();
  const sources = style.sources;
  const layers = style.layers.map((layer) => layer.id);

  assert.deepEqual(rasters.map((raster) => raster.file).sort(), ["hillshade.png", "terrain-tint.png"]);
  assert.ok(rasters.every((raster) => raster.size > 1000), "baseline terrain raster artifacts should be present");
  assert.deepEqual(sources.offlineTerrainTint, {
    type: "image",
    url: "terrain/terrain-tint.png",
    coordinates: [
      [hillshade.west, hillshade.north],
      [hillshade.east, hillshade.north],
      [hillshade.east, hillshade.south],
      [hillshade.west, hillshade.south],
    ],
  });
  assert.deepEqual(sources.offlineHillshade, {
    type: "image",
    url: "terrain/hillshade.png",
    coordinates: [
      [hillshade.west, hillshade.north],
      [hillshade.east, hillshade.north],
      [hillshade.east, hillshade.south],
      [hillshade.west, hillshade.south],
    ],
  });
  assert.ok(layers.includes("offline-terrain-color"));
  assert.ok(layers.includes("offline-terrain-relief"));
  assert.ok(layers.indexOf("land-fill") < layers.indexOf("offline-terrain-color"));
  assert.ok(layers.indexOf("offline-terrain-relief") < layers.indexOf("coastline-overlay"));
  assert.ok(layers.indexOf("offline-terrain-relief") < layers.indexOf("lakes-fill"));
  assert.ok(layers.indexOf("offline-terrain-relief") < layers.indexOf("rivers-line"));
  assert.ok(layers.indexOf("offline-terrain-relief") < layers.indexOf("seg-01-corridor"));
  assert.ok(!layers.includes("contour-major"));
  assert.ok(!layers.includes("contour-mid"));
  assert.ok(!layers.includes("contour-fine"));
  assert.ok(MAP_LAYER_IDS.terrain.includes("offline-terrain-color"));
  assert.ok(MAP_LAYER_IDS.terrain.includes("offline-terrain-relief"));
});

test("base style falls back to paper land water and route when bbox metadata is unavailable", async () => {
  const { MAP_LAYER_IDS, buildStyle } = await loadStyleModule();
  const style = buildStyle(null);
  const layers = style.layers.map((layer) => layer.id);

  assert.equal(style.sources.offlineTerrainTint, undefined);
  assert.equal(style.sources.offlineHillshade, undefined);
  assert.ok(!layers.includes("offline-terrain-color"));
  assert.ok(!layers.includes("offline-terrain-relief"));
  assert.ok(!layers.includes("global-terrain-color"));
  assert.ok(!layers.includes("terrain-relief"));
  assert.ok(!layers.includes("contour-major"));
  assert.ok(!layers.includes("contour-mid"));
  assert.ok(!layers.includes("contour-fine"));
  assert.deepEqual(MAP_LAYER_IDS.terrain, ["offline-terrain-color", "offline-terrain-relief"]);
});

test("probeHillshade fetches only bbox metadata before map construction", async () => {
  const { probeHillshade } = await loadStyleModule();
  const calls = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    calls.push(String(input));
    return {
      ok: true,
      async json() {
        return {
          west: 100,
          east: 101,
          south: 20,
          north: 21,
          generated: "2026-09-03T00:00:00.000Z",
        };
      },
    };
  };

  try {
    const hillshade = await probeHillshade();
    assert.deepEqual(hillshade, {
      west: 100,
      east: 101,
      south: 20,
      north: 21,
      generated: "2026-09-03T00:00:00.000Z",
    });
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.deepEqual(calls, ["terrain/hillshade-bbox.json"]);
});

test("ensureMajorContours adds the 200m contour layer once and preserves requested visibility", async () => {
  const { ensureMajorContours } = await loadTerrainRuntimeModule();
  const map = new FakeMap();

  await ensureMajorContours(map, false);
  await ensureMajorContours(map, true);

  assert.deepEqual(map.sourceAdds.map((entry) => entry.id), ["contourMajor"]);
  assert.deepEqual(map.layerAdds.map((entry) => entry.id), ["contour-major"]);
  assert.equal(map.layerAdds[0].beforeId, "graticule");
  assert.equal(map.visibility.get("contour-major"), "visible");
});

test("ensureDetailContours adds 100m and 50m layers at their zoom thresholds without duplication", async () => {
  const { ensureDetailContours } = await loadTerrainRuntimeModule();
  const map = new FakeMap();

  await ensureDetailContours(map, 7.19, false);
  assert.deepEqual(map.layerAdds, []);

  await ensureDetailContours(map, 7.2, false);
  await ensureDetailContours(map, 8.49, false);
  await ensureDetailContours(map, 8.5, false);
  await ensureDetailContours(map, 9.1, true);

  assert.deepEqual(map.sourceAdds.map((entry) => entry.id), ["contourMid", "contourFine"]);
  assert.deepEqual(map.layerAdds.map((entry) => entry.id), ["contour-mid", "contour-fine"]);
  assert.equal(map.visibility.get("contour-mid"), "visible");
  assert.equal(map.visibility.get("contour-fine"), "visible");
});

test("loadContourLabels fetches label data once for runtime contour startup", async () => {
  const { loadContourLabels } = await loadTerrainRuntimeModule();
  const calls = [];
  const payload = {
    type: "FeatureCollection",
    features: [{ type: "Feature", properties: { elevation: 1800 }, geometry: { type: "Point", coordinates: [103, 27] } }],
  };
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    calls.push(String(input));
    return {
      ok: true,
      async json() {
        return payload;
      },
    };
  };

  try {
    const first = await loadContourLabels();
    const second = await loadContourLabels();
    assert.deepEqual(first, payload);
    assert.equal(second, first);
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.deepEqual(calls, ["terrain/contour-labels.geojson"]);
});

test("ensureOnlineTerrain resolves ready once and reuses the on-demand DEM source", async () => {
  const { ensureOnlineTerrain } = await loadTerrainRuntimeModule();
  const map = new FakeMap({ autoSourceLoaded: true });

  assert.equal(await ensureOnlineTerrain(map), "ready");
  assert.equal(await ensureOnlineTerrain(map), "ready");
  assert.deepEqual(map.sourceAdds.map((entry) => entry.id), ["terrainDem"]);
});

test("ensureOnlineTerrain resolves offline on timeout without throwing into callers", async () => {
  const { ensureOnlineTerrain } = await loadTerrainRuntimeModule();
  const map = new FakeMap();
  const originalSetTimeout = globalThis.setTimeout;
  const originalClearTimeout = globalThis.clearTimeout;
  globalThis.setTimeout = (callback, _delay, ...args) => {
    queueMicrotask(() => callback(...args));
    return 1;
  };
  globalThis.clearTimeout = () => {};

  try {
    assert.equal(await ensureOnlineTerrain(map), "offline");
  } finally {
    globalThis.setTimeout = originalSetTimeout;
    globalThis.clearTimeout = originalClearTimeout;
  }

  assert.equal(map.getSource("terrainDem"), undefined);
});

test("cancelOnlineTerrain clears pending listeners and timers before map removal", async () => {
  const { cancelOnlineTerrain, ensureOnlineTerrain } = await loadTerrainRuntimeModule();
  const map = new FakeMap();
  const pendingTimers = new Map();
  const clearedTimers = [];
  let nextTimerId = 1;
  const originalSetTimeout = globalThis.setTimeout;
  const originalClearTimeout = globalThis.clearTimeout;
  globalThis.setTimeout = (callback, delay, ...args) => {
    const timer = { callback, delay, args };
    const timerId = nextTimerId++;
    pendingTimers.set(timerId, timer);
    return timerId;
  };
  globalThis.clearTimeout = (timerId) => {
    clearedTimers.push(timerId);
    pendingTimers.delete(timerId);
  };

  try {
    const promise = ensureOnlineTerrain(map);
    assert.equal(map.listenerCount("sourcedata"), 1);
    assert.equal(map.listenerCount("error"), 1);
    assert.equal(pendingTimers.size, 1);

    cancelOnlineTerrain(map);
    map.remove();
    map.emit("sourcedata", { sourceId: "terrainDem", isSourceLoaded: true });
    map.emit("error", { sourceId: "terrainDem" });

    assert.equal(map.listenerCount("sourcedata"), 0);
    assert.equal(map.listenerCount("error"), 0);
    assert.equal(pendingTimers.size, 0);
    assert.equal(clearedTimers.length, 1);
    assert.equal(await promise, "offline");
  } finally {
    globalThis.setTimeout = originalSetTimeout;
    globalThis.clearTimeout = originalClearTimeout;
  }
});

test("runtime helpers return safely after map removal", async () => {
  const { cancelOnlineTerrain, ensureDetailContours, ensureMajorContours, ensureOnlineTerrain } =
    await loadTerrainRuntimeModule();
  const map = new FakeMap();
  map.remove();

  await assert.doesNotReject(async () => {
    cancelOnlineTerrain(map);
    await ensureMajorContours(map, true);
    await ensureDetailContours(map, 9, true);
    assert.equal(await ensureOnlineTerrain(map), "offline");
  });
});
