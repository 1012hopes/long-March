import test from "node:test";
import assert from "node:assert/strict";
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
