import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";
import { annotationPresentation } from "../src/map/nodeScenePresentation.ts";
import {
  NODE_HYDROGRAPHY_LINE_LAYER_ID,
  NODE_HYDROGRAPHY_POINT_LAYER_ID,
  NODE_HYDROGRAPHY_SOURCE_ID,
  sceneHydrography,
} from "../src/data/nodeHydrography.ts";
import { nodeScenes } from "../src/data/nodeScenes.ts";

const stylePath = new URL("../src/map/style.ts", import.meta.url);
const routeGeometryPath = new URL("../src/data/route-geometry.json", import.meta.url);

async function importTranspiledModule(filename, sourceText) {
  const transpiled = ts.transpileModule(sourceText, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const tempDir = await mkdtemp(join(tmpdir(), "hydrography-test-"));
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
  const patchedStyle = styleText
    .replace(
      'import routeGeometry from "../data/route-geometry.json";',
      "const routeGeometry = " + routeGeometryText + ";"
    )
    .replace(
      /import \{\r?\n  NODE_HYDROGRAPHY_LINE_LAYER_ID,\r?\n  NODE_HYDROGRAPHY_POINT_LAYER_ID,\r?\n  NODE_HYDROGRAPHY_SOURCE_ID,\r?\n\} from "\.\.\/data\/nodeHydrography";/,
      'const NODE_HYDROGRAPHY_LINE_LAYER_ID = "node-hydrography-line";\nconst NODE_HYDROGRAPHY_POINT_LAYER_ID = "node-hydrography-point";\nconst NODE_HYDROGRAPHY_SOURCE_ID = "node-hydrography";'
    );
  return importTranspiledModule("style.mjs", patchedStyle);
}

function expectBounds(bounds) {
  assert.equal(bounds.length, 4);
  assert.ok(bounds[0] < bounds[2]);
  assert.ok(bounds[1] < bounds[3]);
}

test("node hydrography scenes cover the six required water systems with source-backed provenance", () => {
  const expectations = new Map([
    ["node-01", ["于都河"]],
    ["node-02", ["湘江"]],
    ["node-03", ["乌江", "乌蒙山地"]],
    ["node-05", ["赤水河", "云贵高原"]],
    ["node-06", ["金沙江"]],
    ["node-07", ["大渡河"]],
    ["node-08", ["雪山"]],
  ]);

  const requiredSystems = new Set(["yuduhe", "xiangjiang", "wujiang", "chishuihe", "jinsha", "dadu"]);
  const seenSystems = new Set();

  for (const scene of nodeScenes) {
    const hydro = sceneHydrography(scene);
    const expectedLabels = expectations.get(scene.nodeId) ?? [];

    assert.ok(hydro.labels.length <= 2, scene.nodeId + " should keep hydro focus to two groups or fewer");
    assert.deepEqual(
      hydro.labels.map((label) => label.label).sort(),
      expectedLabels.sort(),
      scene.nodeId + " hydro labels drifted"
    );
    assert.equal(hydro.featureCollection.features.length, hydro.provenance.length, scene.nodeId + " provenance should track every feature");
    assert.equal(hydro.provenance.length, hydro.labels.length, scene.nodeId + " label/provenance counts should align");

    for (const provenance of hydro.provenance) {
      seenSystems.add(provenance.systemId);
      expectBounds(provenance.clipBounds);
      assert.ok(
        provenance.sourceRef.includes("stories.json") ||
          provenance.sourceRef.includes("rivers.json") ||
          provenance.sourceRef.includes("nodes.ts") ||
          provenance.sourceRef.includes("sources.ts")
      );
    }

    for (const feature of hydro.featureCollection.features) {
      assert.ok(feature.properties.clipBounds);
      assert.ok(feature.properties.sourceRef);
      expectBounds(feature.properties.clipBounds);

      if (scene.nodeId === "node-06" || scene.nodeId === "node-07") {
        assert.equal(feature.geometry.type, "MultiLineString", scene.nodeId + " should keep real river line geometry");
      } else {
        assert.equal(feature.geometry.type, "Point", scene.nodeId + " should fall back to point annotations");
      }
    }
  }

  for (const systemId of requiredSystems) {
    assert.ok(seenSystems.has(systemId), systemId + " should be represented in the hydro overlay");
  }
});

test("approximate crossing presentation uses the约略渡口 wording and distinct glyph", () => {
  const presentation = annotationPresentation({
    id: "mock-crossing",
    kind: "crossing",
    label: "江界河",
    location: [0, 0],
    sourceIds: ["hist-036"],
    certainty: "approximate",
  });

  assert.equal(presentation.glyph, "渡");
  assert.match(presentation.ariaLabel, /约略渡口/);
  assert.match(presentation.className, /crossing/);
  assert.match(presentation.className, /approximate/);
});

test("hydrography layers ride inside the water stack and stay below the route layers", async () => {
  const { MAP_LAYER_IDS, buildStyle } = await loadStyleModule();
  const style = buildStyle(null);
  const layerIds = style.layers.map((layer) => layer.id);

  assert.ok(style.sources[NODE_HYDROGRAPHY_SOURCE_ID], "hydrography source should exist in the base style");
  assert.deepEqual(MAP_LAYER_IDS.water.slice(-2), [NODE_HYDROGRAPHY_LINE_LAYER_ID, NODE_HYDROGRAPHY_POINT_LAYER_ID]);
  assert.ok(layerIds.indexOf(NODE_HYDROGRAPHY_LINE_LAYER_ID) > layerIds.indexOf("rivers-line"));
  assert.ok(layerIds.indexOf(NODE_HYDROGRAPHY_POINT_LAYER_ID) > layerIds.indexOf(NODE_HYDROGRAPHY_LINE_LAYER_ID));
  assert.ok(layerIds.indexOf(NODE_HYDROGRAPHY_POINT_LAYER_ID) < layerIds.indexOf("seg-01-corridor"));
});
