import test from "node:test";
import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";

const stylePath = new URL("../src/map/style.ts", import.meta.url);
const terrainDir = new URL("../public/terrain/", import.meta.url);

async function readStyleText() {
  return readFile(stylePath, "utf8");
}

function onlineRasterDemSources(styleText) {
  return Array.from(
    styleText.matchAll(
      /(\w+):\s*\{\s*type:\s*"raster-dem",[\s\S]*?tiles:\s*\[\s*"([^"]+)"\s*\][\s\S]*?\}/g
    ),
    ([, id, url]) => ({ id, url })
  ).filter((source) => source.url.startsWith("https://"));
}

function localTerrainRasterReferences(styleText) {
  return Array.from(
    styleText.matchAll(/"terrain\/(terrain-tint\.png|hillshade\.png)"/g),
    ([, file]) => file
  ).sort();
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
  const styleText = await readStyleText();
  assert.deepEqual(
    onlineRasterDemSources(styleText),
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

test("baseline: local terrain rasters exist on disk but are not yet represented by the base style", async () => {
  const styleText = await readStyleText();
  const rasters = await terrainRasterSizes();

  assert.deepEqual(rasters.map((raster) => raster.file).sort(), ["hillshade.png", "terrain-tint.png"]);
  assert.ok(rasters.every((raster) => raster.size > 1000), "baseline terrain raster artifacts should be present");
  assert.deepEqual(localTerrainRasterReferences(styleText), []);
});

test.todo("future contract: base style does not permanently depend on two online raster-dem sources");
test.todo("future contract: base style represents terrain-tint.png and hillshade.png in the base style");
