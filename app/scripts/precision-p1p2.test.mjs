import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { parse } from "node:path";
import { nodes } from "../src/data/nodes.ts";
import { segments } from "../src/data/sources.ts";
import {
  candidateLinesForSegments,
  nodePrecisionConsistencyIssues,
  parsePrecisionKind,
  lineIdsForSegment,
} from "../src/map/precisionExplain.ts";
import { precisionWidthScale, applyPrecisionEmphasisPaint } from "../src/map/precisionEmphasisPaint.ts";

test("node precision is consistent with adjacent segment certainty", () => {
  const issues = nodePrecisionConsistencyIssues(nodes, segments);
  assert.deepEqual(issues, []);
});

test("confirmed node may sit next to disputed route (遵义)", () => {
  const zhenyi = nodes.find((n) => n.id === "node-04");
  assert.equal(zhenyi?.precision, "confirmed");
  const adjacent = segments.filter((s) => s.fromNodeId === "node-04" || s.toNodeId === "node-04");
  assert.ok(adjacent.some((s) => s.certainty === "disputed"));
  assert.deepEqual(nodePrecisionConsistencyIssues(nodes, segments), []);
});

test("disputed segments expose dispute notes and candidate lines", () => {
  const disputed = segments.filter((s) => s.certainty === "disputed");
  assert.ok(disputed.length >= 2);
  for (const segment of disputed) {
    assert.ok((segment.disputeNote ?? "").length > 40, `${segment.id} needs disputeNote`);
    assert.deepEqual(lineIdsForSegment(segment.id), [`${segment.id}a`, `${segment.id}b`]);
  }
  const candidates = candidateLinesForSegments(disputed);
  assert.equal(candidates.length, 4);
});

test("route segment register certainty matches app segment meta", async () => {
  const csvPath = new URL("../../research/route-segment-register.csv", import.meta.url);
  const csv = await readFile(csvPath, "utf8");
  const lines = csv.trim().split(/\r?\n/);
  const header = lines[0].split(",");
  const idIdx = header.indexOf("segment_id");
  const certIdx = header.indexOf("certainty");
  const reasonIdx = header.indexOf("reasoning");
  assert.ok(idIdx >= 0 && certIdx >= 0 && reasonIdx >= 0);

  const rows = lines.slice(1).map((line) => {
    // 简易 CSV：字段内无逗号（台账当前如此）
    const cols = line.split(",");
    return {
      id: cols[idIdx],
      certainty: cols[certIdx],
      reasoning: cols[reasonIdx],
    };
  });

  for (const row of rows) {
    const meta = segments.find((s) => s.id === row.id);
    assert.ok(meta, `missing segment ${row.id}`);
    assert.equal(meta.certainty, row.certainty, `${row.id} certainty drift`);
    assert.equal(meta.reasoning, row.reasoning, `${row.id} reasoning drift`);
  }
});

test("parsePrecisionKind and width scale", () => {
  assert.equal(parsePrecisionKind("disputed"), "disputed");
  assert.equal(parsePrecisionKind("nope"), null);
  assert.equal(precisionWidthScale(1200), 1);
  assert.equal(precisionWidthScale(1600), 1.15);
});

test("focus candidate dims sibling disputed lines", () => {
  const writes = [];
  const map = {
    getLayer: () => ({}),
    setPaintProperty: (id, name, value) => writes.push({ id, name, value }),
  };
  applyPrecisionEmphasisPaint(map, "disputed", { focusCandidateLineId: "seg-04a", widthScale: 1 });
  const aOpacity = writes.find((w) => w.id === "seg-04a-cand" && w.name === "line-opacity");
  const bOpacity = writes.find((w) => w.id === "seg-04b-cand" && w.name === "line-opacity");
  assert.equal(aOpacity?.value, 1);
  assert.equal(bOpacity?.value, 0.22);
});

test("UI exposes P1/P2 entry points", async () => {
  const root = new URL("../src/", import.meta.url);
  const appText = await readFile(new URL("App.tsx", root), "utf8");
  const legendText = await readFile(new URL("components/Legend.tsx", root), "utf8");
  const cardText = await readFile(new URL("components/PrecisionExplainCard.tsx", root), "utf8");
  const topbarText = await readFile(new URL("components/TopBar.tsx", root), "utf8");
  const mapText = await readFile(new URL("map/MapCanvas.tsx", root), "utf8");

  assert.match(appText, /p=\$\{params\.precision\}|p=\$\{precision/);
  assert.match(appText, /disputeDockOn/);
  assert.match(appText, /precisionFocusCandidateId/);
  assert.match(legendText, /onPrecisionToggle/);
  assert.match(cardText, /分歧是什么/);
  assert.match(cardText, /查看全部依据/);
  assert.match(cardText, /争议候选线/);
  assert.match(topbarText, /争议停靠/);
  assert.match(mapText, /precisionWidthScale/);
  assert.match(mapText, /precisionFocusCandidateId/);
});
