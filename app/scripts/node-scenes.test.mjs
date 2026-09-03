import test from "node:test";
import assert from "node:assert/strict";
import routeGeometry from "../src/data/route-geometry.json" with { type: "json" };
import { nodeScenes, sceneForNode } from "../src/data/nodeScenes.ts";
import { nodes } from "../src/data/nodes.ts";
import { sources, segments } from "../src/data/sources.ts";
import { stories } from "../src/data/stories.ts";

const validKinds = new Set(["origin", "destination", "crossing", "meeting", "direction", "river", "mountain"]);
const validTerrainModes = new Set(["plain", "river-valley", "mountain", "plateau"]);
const expectedTerrainByNode = new Map([
  ["node-01", "river-valley"],
  ["node-02", "river-valley"],
  ["node-03", "mountain"],
  ["node-04", "plain"],
  ["node-05", "river-valley"],
  ["node-06", "river-valley"],
  ["node-07", "river-valley"],
  ["node-08", "mountain"],
  ["node-09", "plateau"],
]);

function pointKey([lon, lat]) {
  return `${lon},${lat}`;
}

function withinBounds([lon, lat], [west, south, east, north]) {
  return lon >= west && lon <= east && lat >= south && lat <= north;
}

function routeBounds() {
  let west = Infinity;
  let south = Infinity;
  let east = -Infinity;
  let north = -Infinity;

  for (const line of routeGeometry) {
    for (const [lon, lat] of line.coordinates) {
      west = Math.min(west, lon);
      south = Math.min(south, lat);
      east = Math.max(east, lon);
      north = Math.max(north, lat);
    }
  }

  return [west, south, east, north];
}

test("node scene registry covers all nine teaching nodes and lookup stays exact", () => {
  const expectedNodeIds = nodes.map((node) => node.id).sort();
  const actualNodeIds = nodeScenes.map((scene) => scene.nodeId).sort();

  assert.equal(nodeScenes.length, nodes.length, "scene count must match teaching node count");
  assert.deepEqual(actualNodeIds, expectedNodeIds, "scene node IDs must match nodes.ts exactly");

  for (const scene of nodeScenes) {
    assert.equal(sceneForNode(scene.nodeId), scene, "lookup should return the exported scene object");
  }

  assert.equal(sceneForNode("node-99"), null);
});

test("node scenes use valid bounds, references, and traceable annotations", () => {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const knownSegmentIds = new Set(segments.map((segment) => segment.id));
  const knownSourceIds = new Set(sources.map((source) => source.id));
  const nodePoints = new Set([
    ...nodes.map((node) => pointKey(node.anchor)),
    ...nodes.flatMap((node) => node.secondary.map((place) => pointKey([place.lon, place.lat]))),
  ]);
  const storyPoints = new Set(stories.map((story) => pointKey(story.location)));
  const routePoints = new Set(routeGeometry.flatMap((line) => line.coordinates.map((point) => pointKey(point))));
  const approximateTraceablePoints = new Set([...nodePoints, ...storyPoints, ...routePoints]);
  const annotationIds = new Set();
  const chinaRouteBounds = routeBounds();

  for (const scene of nodeScenes) {
    const node = nodeById.get(scene.nodeId);
    assert.ok(node, "unknown nodeId " + scene.nodeId);

    assert.ok(validTerrainModes.has(scene.terrainMode), "invalid terrain mode for " + scene.nodeId);
    assert.equal(scene.terrainMode, expectedTerrainByNode.get(scene.nodeId), "terrain mode drift for " + scene.nodeId);

    assert.ok(scene.highlightedSegmentIds.length >= 1, scene.nodeId + " needs highlighted segments");
    assert.ok(scene.annotations.length >= 2, scene.nodeId + " needs at least two annotations");

    const [west, south, east, north] = scene.focusBounds;
    assert.ok(west < east, scene.nodeId + " focusBounds west/east invalid");
    assert.ok(south < north, scene.nodeId + " focusBounds south/north invalid");
    assert.ok(withinBounds(node.anchor, scene.focusBounds), scene.nodeId + " focusBounds must include node anchor");
    assert.ok(west >= chinaRouteBounds[0], scene.nodeId + " focusBounds exceeds western route bound");
    assert.ok(south >= chinaRouteBounds[1], scene.nodeId + " focusBounds exceeds southern route bound");
    assert.ok(east <= chinaRouteBounds[2], scene.nodeId + " focusBounds exceeds eastern route bound");
    assert.ok(north <= chinaRouteBounds[3], scene.nodeId + " focusBounds exceeds northern route bound");

    const allSegmentIds = [...scene.highlightedSegmentIds, ...scene.contextSegmentIds];
    assert.equal(new Set(scene.highlightedSegmentIds).size, scene.highlightedSegmentIds.length, scene.nodeId + " has duplicate highlighted segments");
    assert.equal(new Set(scene.contextSegmentIds).size, scene.contextSegmentIds.length, scene.nodeId + " has duplicate context segments");
    assert.equal(new Set(allSegmentIds).size, allSegmentIds.length, scene.nodeId + " repeats segment IDs across scene buckets");
    assert.ok(allSegmentIds.every((segmentId) => knownSegmentIds.has(segmentId)), scene.nodeId + " references unknown segment IDs");

    for (const annotation of scene.annotations) {
      assert.ok(!annotationIds.has(annotation.id), "duplicate annotation ID " + annotation.id);
      annotationIds.add(annotation.id);

      assert.ok(validKinds.has(annotation.kind), "invalid annotation kind for " + annotation.id);
      assert.ok(annotation.label.length >= 1 && annotation.label.length <= 12, "annotation label should stay concise for " + annotation.id);
      assert.ok(withinBounds(annotation.location, scene.focusBounds), annotation.id + " must stay inside focusBounds");
      assert.ok(annotation.sourceIds.length >= 1, annotation.id + " must cite at least one source");
      assert.ok(annotation.sourceIds.every((sourceId) => knownSourceIds.has(sourceId)), annotation.id + " cites an unknown source");
      assert.ok(annotation.certainty === "confirmed" || annotation.certainty === "approximate", annotation.id + " has invalid certainty");

      if (annotation.kind === "direction") {
        assert.equal(annotation.certainty, "approximate", annotation.id + " direction labels must stay approximate");
      }

      if (annotation.certainty === "confirmed") {
        assert.ok(nodePoints.has(pointKey(annotation.location)) || storyPoints.has(pointKey(annotation.location)), annotation.id + " must reuse a node or story point");
      }

      if (annotation.certainty === "approximate") {
        assert.ok(approximateTraceablePoints.has(pointKey(annotation.location)), annotation.id + " must reuse a node, story, or route point");
      }
    }
  }
});
