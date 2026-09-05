import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { nodes } from "../src/data/nodes.ts";
import { sources, sourcesByNode } from "../src/data/sources.ts";
import { stories } from "../src/data/stories.ts";
import {
  getRightPanelPresentation,
  shouldHideMarkerForLearning,
} from "../src/layout/rightPanelPresentation.ts";
import { buildNodeEvidenceRailModel } from "../src/components/nodeLearning.ts";
import {
  applyLearningEmphasisSupportPaint,
  DEFAULT_TERRAIN_LAYER_IDS,
} from "../src/map/learningEmphasisPaint.ts";

function makePaintMap() {
  const layers = new Map();
  for (const id of [...DEFAULT_TERRAIN_LAYER_IDS, "node-hydrography-line", "node-hydrography-point"]) {
    layers.set(id, { id, paint: {} });
  }
  return {
    getLayer(id) {
      return layers.get(id);
    },
    setPaintProperty(id, name, value) {
      const layer = layers.get(id);
      if (!layer) return;
      layer.paint[name] = value;
    },
  };
}

test("node learning view becomes an immersive 45/55 map and reading split", () => {
  assert.deepEqual(getRightPanelPresentation("node"), {
    panelWidth: "55vw",
    mapWidth: "45vw",
    mapPaddingRight: 28,
    learningFocus: true,
    hideChrome: true,
  });
});

test("story and source views retain the compact panel without learning focus", () => {
  assert.deepEqual(getRightPanelPresentation("story"), {
    panelWidth: "440px",
    mapWidth: "100vw",
    mapPaddingRight: 472,
    learningFocus: false,
    hideChrome: false,
  });
  assert.deepEqual(getRightPanelPresentation("sources"), {
    panelWidth: "440px",
    mapWidth: "100vw",
    mapPaddingRight: 472,
    learningFocus: false,
    hideChrome: false,
  });
});

test("learning focus keeps only the selected primary node marker", () => {
  assert.equal(shouldHideMarkerForLearning(true, "node", true), false);
  assert.equal(shouldHideMarkerForLearning(true, "node", false), true);

  for (const kind of ["story", "secondary", "geo", "contour", "epilogue"]) {
    assert.equal(shouldHideMarkerForLearning(true, kind, false), true);
  }
});

test("closing learning focus restores every marker category", () => {
  for (const kind of ["node", "story", "secondary", "geo", "contour", "epilogue"]) {
    assert.equal(shouldHideMarkerForLearning(false, kind, false), false);
  }
});

test("node learning wiring creates scene markers and the map-side cartouche contract", async () => {
  const mapText = await readFile(new URL("../src/map/MapCanvas.tsx", import.meta.url), "utf8");
  const appText = await readFile(new URL("../src/App.tsx", import.meta.url), "utf8");
  const cartoucheText = await readFile(new URL("../src/components/NodeSceneCartouche.tsx", import.meta.url), "utf8");
  const cssText = await readFile(new URL("../src/styles.css", import.meta.url), "utf8");

  assert.ok(mapText.includes("applyNodeScene"), "MapCanvas should apply node scene presentation when learning focus is active");
  assert.ok(mapText.includes("clearNodeScene"), "MapCanvas should clear node scene presentation when learning focus closes");
  assert.ok(appText.includes("sceneForNode"), "App should resolve the active node scene from selectedNodeId");
  assert.ok(appText.includes("placeLabel={activeNodePlaceLabel}"), "App should pass an explicit place label into the cartouche");
  assert.ok(appText.includes("NodeSceneCartouche"), "App should render a dedicated node scene cartouche on the map side");
  assert.ok(cartoucheText.includes("node-scene-cartouche-place-value"), "cartouche should render an explicit place label");
  assert.ok(cssText.includes(".node-scene-cartouche"), "styles should include the node scene cartouche treatment");
  assert.ok(cssText.includes(".map-scene-annotation"), "styles should include map scene annotation styling");
  assert.match(cssText, /\.node-scene-cartouche\s*\{[\s\S]*?left: 10px;[\s\S]*?right: 10px;[\s\S]*?width: auto;/);
});

test("evidence rail model reuses existing node stories, sources, and profile data", () => {
  const node = nodes.find((item) => item.id === "node-05");
  assert.ok(node);

  const model = buildNodeEvidenceRailModel(node);

  assert.equal(model.routeSegments.length, node.segmentIds.length);
  for (const segment of model.routeSegments) {
    assert.deepEqual(
      segment.sources.map((source) => source.id),
      segment.sourceIds,
      "route segment evidence should resolve to registered sources in order"
    );
  }
  assert.deepEqual(
    model.relatedStories.map((story) => story.id),
    stories.filter((story) => story.nodeId === node.id).map((story) => story.id),
    "related stories should come from existing story data"
  );
  assert.deepEqual(
    model.nodeSources.map((source) => source.id),
    sourcesByNode(node.id).map((source) => source.id),
    "source entry should list every source registered to the node"
  );
  assert.equal(model.elevationSummary?.profileId, "seg-04a");
  assert.equal(model.elevationSummary?.fromCandidate, true);
});

test("deep excerpts carry resolvable per-claim citations", () => {
  for (const node of nodes) {
    const citedIds = new Set(node.deep.flatMap((block) => block.sourceIds ?? []));
    assert.ok(citedIds.size >= 2, `${node.id} should cite at least two sources in its deep excerpts`);
    for (const id of citedIds) {
      assert.ok(
        sources.some((source) => source.id === id),
        `${node.id} cites ${id}, which is missing from the source register`
      );
    }
  }
});

test("every teaching node carries an attributed quotation", () => {
  for (const node of nodes) {
    assert.ok(node.quote, `${node.id} should carry a quotation`);
    assert.ok(node.quote.text.trim().length >= 6, `${node.id} quotation text is too short`);
    assert.ok(node.quote.attribution.trim().length >= 6, `${node.id} quotation must carry a traceable attribution`);
    assert.ok(!node.quote.text.includes("——"), "attribution dash belongs in the attribution field, not the text");
  }
});

test("node learning panel exposes desktop split structure, mobile collapse rules, and explicit emphasis controls", async () => {
  const panelText = await readFile(new URL("../src/components/RightPanel.tsx", import.meta.url), "utf8");
  const railText = await readFile(new URL("../src/components/NodeEvidenceRail.tsx", import.meta.url), "utf8");
  const appText = await readFile(new URL("../src/App.tsx", import.meta.url), "utf8");
  const mapText = await readFile(new URL("../src/map/MapCanvas.tsx", import.meta.url), "utf8");
  const cssText = await readFile(new URL("../src/styles.css", import.meta.url), "utf8");

  assert.match(panelText, /node-learning-grid/);
  assert.match(panelText, /node-main-column/);
  assert.match(panelText, /NodeEvidenceRail/);
  assert.doesNotMatch(panelText, /className="node-stories"/, "related stories should not remain duplicated in the main column");

  assert.match(railText, /learning-emphasis-toolbar/);
  assert.match(railText, /aria-pressed/);
  assert.match(railText, /onFocus/);
  assert.match(railText, /onBlur/);
  assert.match(railText, /onClick/);
  assert.doesNotMatch(railText, /evidenceItems/, "the evidence rail must not duplicate the deep excerpts");
  assert.doesNotMatch(railText, /rail-emphasis-toggle/, "per-section emphasis buttons should not duplicate the toolbar");

  assert.match(appText, /useState<LearningEmphasis>\(null\)/);
  assert.match(appText, /learningEmphasis=\{learningEmphasis\}/);
  assert.match(mapText, /learningEmphasis: LearningEmphasis/);

  assert.match(cssText, /\.node-learning-grid\s*\{[\s\S]*grid-template-columns:\s*minmax\(0,\s*2\.1fr\)\s+minmax\(240px,\s*0\.9fr\)/);
  assert.match(cssText, /@media \(max-width: 900px\)[\s\S]*\.node-learning-grid\s*\{[\s\S]*grid-template-columns:\s*1fr/);
  assert.match(cssText, /@media \(max-width: 900px\)[\s\S]*\.app\.learning-focus \.node-scene-cartouche\s*\{[\s\S]*display:\s*none/);
});

test("learning emphasis support paint resets to base when focus ends before a scene survives the render", () => {
  const map = makePaintMap();

  applyLearningEmphasisSupportPaint(map, "terrain");
  assert.equal(map.getLayer("offline-terrain-color").paint["raster-opacity"], 0.44);
  assert.equal(map.getLayer("offline-terrain-relief").paint["raster-opacity"], 0.54);
  assert.equal(map.getLayer("node-hydrography-line").paint["line-opacity"], 1);
  assert.equal(map.getLayer("node-hydrography-point").paint["circle-opacity"], 0.98);

  applyLearningEmphasisSupportPaint(map, null);
  assert.equal(map.getLayer("offline-terrain-color").paint["raster-opacity"], 0.34);
  assert.equal(map.getLayer("offline-terrain-relief").paint["raster-opacity"], 0.38);
  assert.equal(map.getLayer("node-hydrography-line").paint["line-opacity"], 0.9);
  assert.deepEqual(
    map.getLayer("node-hydrography-line").paint["line-width"],
    ["case", ["==", ["get", "prominence"], "focus"], 3.1, 2.2]
  );
  assert.equal(map.getLayer("node-hydrography-point").paint["circle-opacity"], 0.9);
  assert.deepEqual(
    map.getLayer("node-hydrography-point").paint["circle-radius"],
    ["case", ["==", ["get", "prominence"], "focus"], 6.2, 4.6]
  );
});
