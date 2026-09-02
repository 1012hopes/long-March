import test from "node:test";
import assert from "node:assert/strict";
import {
  getMarkerZoomState,
  getStoryMarkerPresentation,
} from "../src/map/markerPresentation.ts";

test("overview keeps only primary nodes and hides their labels", () => {
  assert.deepEqual(getMarkerZoomState(4), {
    level: "overview",
    showNodeLabels: false,
    showStories: false,
    showSecondaryPlaces: false,
  });
});

test("mid zoom labels primary nodes without adding story or secondary clutter", () => {
  assert.deepEqual(getMarkerZoomState(6.5), {
    level: "mid",
    showNodeLabels: true,
    showStories: false,
    showSecondaryPlaces: false,
  });
});

test("detail zoom reveals named stories and secondary places", () => {
  assert.deepEqual(getMarkerZoomState(8), {
    level: "detail",
    showNodeLabels: false,
    showStories: true,
    showSecondaryPlaces: true,
  });
});

test("story markers use semantic glyphs and real event names instead of ordinal numbers", () => {
  assert.deepEqual(getStoryMarkerPresentation("遵义会议", "meeting"), {
    glyph: "议",
    label: "遵义会议",
    ariaLabel: "打开沿途故事：遵义会议",
  });
  assert.deepEqual(getStoryMarkerPresentation("湘江抢渡", "battle"), {
    glyph: "战",
    label: "湘江抢渡",
    ariaLabel: "打开沿途故事：湘江抢渡",
  });
});
