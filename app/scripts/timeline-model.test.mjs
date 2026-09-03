import test from "node:test";
import assert from "node:assert/strict";
import { nodes } from "../src/data/nodes.ts";
import {
  NODE_DATES,
  NODE_FRACTIONS,
  clampTimelineT,
  isoToDateLabel,
  timelineMarkers,
} from "../src/data/time.ts";

test("timeline markers preserve the node order and source metadata", () => {
  const markers = timelineMarkers();

  assert.equal(markers.length, 9);
  assert.deepEqual(markers.map((marker) => marker.id), nodes.map((node) => node.id));
  assert.deepEqual(markers.map((marker) => marker.title), nodes.map((node) => node.title));
  assert.deepEqual(markers.map((marker) => marker.precision), nodes.map((node) => node.precision));
  assert.deepEqual(
    markers.map((marker) => marker.t),
    nodes.map((node) => NODE_FRACTIONS[node.id]),
  );
  assert.equal(markers[0].dateLabel, isoToDateLabel(NODE_DATES["node-01"][0]));
  assert.equal(markers[8].dateLabel, isoToDateLabel(NODE_DATES["node-09"][0]));
});

test("timeline markers keep the late 8-to-9 gap larger than earlier adjacent gaps", () => {
  const markers = timelineMarkers();
  const gaps = markers.slice(1).map((marker, index) => marker.t - markers[index].t);

  assert.ok(gaps.every((gap) => gap > 0), "timeline markers must be sorted by time");
  assert.ok(gaps[7] > Math.max(...gaps.slice(0, 7)), "node-08 to node-09 should be the widest gap");
});

test("clampTimelineT keeps values inside the unit interval", () => {
  assert.equal(clampTimelineT(-0.25), 0);
  assert.equal(clampTimelineT(0.5), 0.5);
  assert.equal(clampTimelineT(1.25), 1);
});
