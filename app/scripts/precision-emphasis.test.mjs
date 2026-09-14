import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { nodes } from "../src/data/nodes.ts";
import { segments } from "../src/data/sources.ts";
import {
  PRECISION_CHIP_LABEL,
  PRECISION_ORDER,
  buildPrecisionExplain,
  lineIdsForCertainty,
  lineIdsForSegment,
  segmentsForNode,
} from "../src/map/precisionExplain.ts";
import { applyPrecisionEmphasisPaint, resetPrecisionEmphasisPaint } from "../src/map/precisionEmphasisPaint.ts";

test("precision explain covers all three kinds with see/why/legend copy", () => {
  for (const kind of PRECISION_ORDER) {
    const explain = buildPrecisionExplain({ kind, node: nodes[0] });
    assert.equal(explain.kind, kind);
    assert.ok(explain.title.length > 0);
    assert.ok(explain.see.includes("地图"));
    assert.ok(explain.why.length > 0);
    assert.ok(explain.mapLegend.length > 0);
    assert.equal(explain.chipLabel, PRECISION_CHIP_LABEL[kind]);
  }
});

test("precision explain pulls segment reasoning when the node has matching certainty", () => {
  const disputedNode = nodes.find((node) => node.id === "node-05");
  assert.ok(disputedNode);
  const explain = buildPrecisionExplain({ kind: "disputed", node: disputedNode });
  assert.ok(explain.reasoning?.includes("四渡赤水") || explain.sourceCount > 0);
  assert.ok(explain.sourceCount > 0);
});

test("segment line ids map disputed segments to candidate pairs", () => {
  assert.deepEqual(lineIdsForSegment("seg-04"), ["seg-04a", "seg-04b"]);
  assert.deepEqual(lineIdsForSegment("seg-08"), ["seg-08a", "seg-08b"]);
  assert.deepEqual(lineIdsForSegment("seg-01"), ["seg-01"]);
  const disputedLines = lineIdsForCertainty("disputed");
  assert.ok(disputedLines.includes("seg-04a"));
  assert.ok(disputedLines.includes("seg-08b"));
  assert.ok(!disputedLines.includes("seg-01"));
});

test("node 01 is adjacent only to approximate start segment", () => {
  const related = segmentsForNode("node-01");
  assert.ok(related.every((segment) => segment.certainty === "approximate"));
});

test("precision paint helpers write layer properties without throwing on a stub map", () => {
  const writes = [];
  const map = {
    getLayer: () => ({}),
    setPaintProperty: (id, name, value) => writes.push([id, name, value]),
  };
  applyPrecisionEmphasisPaint(map, "disputed");
  assert.ok(writes.length > 0);
  assert.ok(writes.some(([id]) => String(id).endsWith("-cand")));
  writes.length = 0;
  resetPrecisionEmphasisPaint(map);
  assert.ok(writes.some(([id, name]) => String(id).endsWith("-line") && name === "line-width"));
});

test("UI wires precision emphasis into map and clickable chips", async () => {
  const appText = await readFile(new URL("../src/App.tsx", import.meta.url), "utf8");
  const mapText = await readFile(new URL("../src/map/MapCanvas.tsx", import.meta.url), "utf8");
  const rightText = await readFile(new URL("../src/components/RightPanel.tsx", import.meta.url), "utf8");
  const bottomText = await readFile(new URL("../src/components/BottomPanel.tsx", import.meta.url), "utf8");
  const stripText = await readFile(new URL("../src/components/PlaceRouteStrip.tsx", import.meta.url), "utf8");
  const cardText = await readFile(new URL("../src/components/PrecisionExplainCard.tsx", import.meta.url), "utf8");

  assert.match(appText, /precisionEmphasis/);
  assert.match(appText, /PrecisionExplainCard/);
  assert.match(appText, /onPrecisionToggle/);
  assert.match(mapText, /applyPrecisionEmphasisPaint/);
  assert.match(mapText, /precisionEmphasis/);
  assert.match(rightText, /onPrecisionToggle/);
  assert.match(rightText, /chip-precision chip-toggle/);
  assert.match(bottomText, /onPrecisionToggle/);
  assert.match(stripText, /onPrecisionToggle/);
  assert.match(cardText, /你会看到/);
  assert.match(cardText, /为什么这样画/);
  assert.ok(segments.some((segment) => segment.certainty === "disputed"));
});
