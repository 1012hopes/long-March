import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  getRightPanelPresentation,
  shouldHideMarkerForLearning,
} from "../src/layout/rightPanelPresentation.ts";

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
