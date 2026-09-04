import test from "node:test";
import assert from "node:assert/strict";
import routeGeometry from "../src/data/route-geometry.json" with { type: "json" };
import { nodeScenes, sceneForNode } from "../src/data/nodeScenes.ts";
import { nodes } from "../src/data/nodes.ts";
import { sources, segments } from "../src/data/sources.ts";
import { stories } from "../src/data/stories.ts";
import {
  SCENE_ANNOTATION_LAYER_ID,
  SCENE_ANNOTATION_SOURCE_ID,
  SCENE_BADGE_LAYER_ID,
  applyNodeSceneEmphasis,
  hoverRouteLineWidth,
  restoreHoveredRouteLineWidth,
  annotationPresentation,
  applyNodeScene,
  clearNodeScene,
  scenePlaceLabel,
  routeSceneRole,
} from "../src/map/nodeScenePresentation.ts";

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

function makeFakeMap() {
  const layers = new Map();
  const sources = new Map();

  const addSeedLayer = (id, paint = {}) => {
    layers.set(id, { id, paint: { ...paint } });
  };

  for (const line of routeGeometry) {
    if (line.id.endsWith("a") || line.id.endsWith("b")) {
      addSeedLayer(`${line.id}-cand`, {
        "line-color": "#765B78",
        "line-dasharray": [2, 2.2],
        "line-opacity": 0.95,
      });
    } else {
      addSeedLayer(`${line.id}-corridor`, {
        "line-opacity": 0.2,
        "line-width": 18,
      });
      addSeedLayer(`${line.id}-line`, {
        "line-opacity": 1,
        "line-width": 3.4,
      });
    }
  }

  return {
    addLayer(layer) {
      layers.set(layer.id, { ...layer, paint: { ...(layer.paint ?? {}) } });
    },
    addSource(id, source) {
      sources.set(id, {
        ...source,
        setData(data) {
          this.data = data;
        },
      });
    },
    getLayer(id) {
      return layers.get(id);
    },
    getSource(id) {
      return sources.get(id);
    },
    removeLayer(id) {
      layers.delete(id);
    },
    removeSource(id) {
      sources.delete(id);
    },
    setPaintProperty(id, name, value) {
      const layer = layers.get(id);
      if (!layer) return;
      layer.paint[name] = value;
    },
  };
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

test("route scene role isolates highlight, context, and dim states by segment", () => {
  const scene = sceneForNode("node-05");
  assert.ok(scene);

  assert.equal(routeSceneRole("seg-04", scene), "highlight");
  assert.equal(routeSceneRole("seg-05", scene), "context");
  assert.equal(routeSceneRole("seg-02", scene), "dim");
});

test("annotation presentation exposes kind styling and approximate accessible wording", () => {
  const approx = annotationPresentation(sceneForNode("node-07").annotations[1]);
  const confirmed = annotationPresentation(sceneForNode("node-06").annotations[1]);

  assert.equal(approx.glyph, "川");
  assert.match(approx.className, /approximate/);
  assert.match(approx.ariaLabel, /约略位置/);

  assert.equal(confirmed.glyph, "渡");
  assert.doesNotMatch(confirmed.className, /approximate/);
  assert.doesNotMatch(confirmed.ariaLabel, /约略位置/);
});

test("scene place labels stay explicit and reuse existing node or annotation names", () => {
  const scene = sceneForNode("node-05");
  const node = nodes.find((item) => item.id === "node-05");

  assert.ok(scene);
  assert.ok(node);
  assert.equal(scenePlaceLabel(scene, node), "娄山关 · 太平渡");
});

test("applying and clearing a node scene manages annotation layers and preserves disputed candidate styling", () => {
  const scene = sceneForNode("node-05");
  assert.ok(scene);
  const map = makeFakeMap();

  applyNodeScene(map, scene);

  assert.ok(map.getSource(SCENE_ANNOTATION_SOURCE_ID), "scene annotation source should be registered");
  assert.ok(map.getLayer(SCENE_BADGE_LAYER_ID), "scene badge layer should be registered");
  assert.ok(map.getLayer(SCENE_ANNOTATION_LAYER_ID), "scene label layer should be registered");

  const source = map.getSource(SCENE_ANNOTATION_SOURCE_ID);
  assert.equal(source.data.features.length, scene.annotations.length);
  const approximateFeature = source.data.features.find((feature) => feature.properties.certainty === "approximate");
  assert.ok(approximateFeature);
  assert.match(approximateFeature.properties.ariaLabel, /约略位置/);

  assert.equal(map.getLayer("seg-04a-cand").paint["line-color"], "#765B78");
  assert.deepEqual(map.getLayer("seg-04a-cand").paint["line-dasharray"], [2, 2.2]);
  assert.equal(map.getLayer("seg-04a-cand").paint["line-opacity"], 0.95);
  assert.equal(map.getLayer("seg-05-line").paint["line-opacity"], 0.24);
  assert.equal(map.getLayer("seg-02-line").paint["line-opacity"], 0.08);

  clearNodeScene(map);

  assert.equal(map.getSource(SCENE_ANNOTATION_SOURCE_ID), undefined);
  assert.equal(map.getLayer(SCENE_BADGE_LAYER_ID), undefined);
  assert.equal(map.getLayer(SCENE_ANNOTATION_LAYER_ID), undefined);
  assert.equal(map.getLayer("seg-05-line").paint["line-opacity"], 1);
  assert.equal(map.getLayer("seg-02-line").paint["line-opacity"], 1);
  assert.equal(map.getLayer("seg-04a-cand").paint["line-opacity"], 0.95);
});

test("learning emphasis retunes route and evidence paint without touching scene membership", () => {
  const scene = sceneForNode("node-05");
  assert.ok(scene);
  const map = makeFakeMap();

  applyNodeScene(map, scene);
  const baseCandidateOpacity = map.getLayer("seg-04a-cand").paint["line-opacity"];
  const baseContextOpacity = map.getLayer("seg-05-line").paint["line-opacity"];

  applyNodeSceneEmphasis(map, scene, "route");
  assert.ok(map.getLayer("seg-04a-cand").paint["line-opacity"] > baseCandidateOpacity);
  assert.ok(map.getLayer("seg-05-line").paint["line-opacity"] <= baseContextOpacity);

  applyNodeSceneEmphasis(map, scene, "evidence");
  assert.ok(map.getLayer(SCENE_BADGE_LAYER_ID).paint["circle-opacity"] > 0.88);
  assert.ok(map.getLayer(SCENE_ANNOTATION_LAYER_ID).paint["text-opacity"] >= 1);

  applyNodeSceneEmphasis(map, scene, null);
  assert.equal(map.getLayer("seg-04a-cand").paint["line-opacity"], baseCandidateOpacity);
  assert.equal(map.getSource(SCENE_ANNOTATION_SOURCE_ID).data.features.length, scene.annotations.length);
});

test("hover leave restores highlighted context and dim line widths for the active scene emphasis", () => {
  const scene = sceneForNode("node-07");
  assert.ok(scene);
  const map = makeFakeMap();

  applyNodeSceneEmphasis(map, scene, "route");

  map.setPaintProperty("seg-06-line", "line-width", hoverRouteLineWidth(scene, "route", "seg-06"));
  map.setPaintProperty("seg-05-line", "line-width", hoverRouteLineWidth(scene, "route", "seg-05"));
  map.setPaintProperty("seg-02-line", "line-width", hoverRouteLineWidth(scene, "route", "seg-02"));

  restoreHoveredRouteLineWidth(map, "seg-06", scene, "route");
  restoreHoveredRouteLineWidth(map, "seg-05", scene, "route");
  restoreHoveredRouteLineWidth(map, "seg-02", scene, "route");

  assert.equal(map.getLayer("seg-06-line").paint["line-width"], 5.4);
  assert.equal(map.getLayer("seg-05-line").paint["line-width"], 2.45);
  assert.equal(map.getLayer("seg-02-line").paint["line-width"], 1.85);
});
