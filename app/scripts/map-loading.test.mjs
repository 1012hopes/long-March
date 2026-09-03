import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const stylePath = new URL("../src/map/style.ts", import.meta.url);
const routeGeometryPath = new URL("../src/data/route-geometry.json", import.meta.url);
const terrainDir = new URL("../public/terrain/", import.meta.url);

async function loadStyleModule() {
  const [styleText, routeGeometryText] = await Promise.all([
    readFile(stylePath, "utf8"),
    readFile(routeGeometryPath, "utf8"),
  ]);
  const patchedStyle = styleText.replace(
    'import routeGeometry from "../data/route-geometry.json";',
    "const routeGeometry = " + routeGeometryText + ";"
  );
  const transpiled = ts.transpileModule(patchedStyle, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const tempDir = await mkdtemp(join(tmpdir(), "map-style-test-"));
  const tempPath = join(tempDir, "style.mjs");
  await writeFile(tempPath, transpiled);
  try {
    return await import(pathToFileURL(tempPath).href + "?t=" + Date.now());
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
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

test("baseline: base style currently depends on two online raster-dem sources", async () => {
  const { buildStyle } = await loadStyleModule();
  const style = buildStyle(null);
  assert.deepEqual(
    Object.entries(style.sources)
      .filter(([, source]) => source.type === "raster-dem")
      .map(([id, source]) => ({ id, url: source.tiles?.[0] }))
      .filter((source) => typeof source.url === "string" && source.url.startsWith("https://")),
    [
      {
        id: "terrainDem",
        url: "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png",
      },
      {
        id: "terrainColorDem",
        url: "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png",
      },
    ],
    "baseline should record the two current online raster-dem dependencies before Tasks 2-3 remove them"
  );
});

test("local terrain rasters are wired into the base style when bbox metadata is available", async () => {
  const { buildStyle } = await loadStyleModule();
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
  assert.ok(layers.indexOf("offline-terrain-relief") < layers.indexOf("contour-major"));
  assert.ok(layers.indexOf("offline-terrain-relief") < layers.indexOf("lakes-fill"));
  assert.ok(layers.indexOf("offline-terrain-relief") < layers.indexOf("rivers-line"));
  assert.ok(layers.indexOf("offline-terrain-relief") < layers.indexOf("seg-01-corridor"));
});

test("base style omits offline terrain sources and layers when bbox metadata is unavailable", async () => {
  const { buildStyle } = await loadStyleModule();
  const style = buildStyle(null);
  const layers = style.layers.map((layer) => layer.id);

  assert.equal(style.sources.offlineTerrainTint, undefined);
  assert.equal(style.sources.offlineHillshade, undefined);
  assert.ok(!layers.includes("offline-terrain-color"));
  assert.ok(!layers.includes("offline-terrain-relief"));
});

test.todo("future contract: base style does not permanently depend on two online raster-dem sources");
