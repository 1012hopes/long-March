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
import { readFile } from "node:fs/promises";

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

test("App separates timelineT from revealT and keeps explore mode pinned to revealT=1", async () => {
  const appText = await readFile(new URL("../src/App.tsx", import.meta.url), "utf8");

  assert.match(appText, /function resolveTimelineAndRevealFromHash\(params: HashParams\)/);
  assert.match(appText, /const mode = params\.mode \?\? "explore";/);
  assert.match(appText, /const \[timelineT, setTimelineT\]/);
  assert.match(appText, /const \[revealT, setRevealT\]/);
  assert.match(appText, /resolveTimelineAndRevealFromHash\(initialHash\)/);
  assert.match(appText, /resolveTimelineAndRevealFromHash\(params\)/);
  assert.match(appText, /`t` 始终表示阅读时间；缺省 mode 视为 explore，因此 reveal 不从 `t` 回填。/);
  assert.match(appText, /setTimelineT\(next\)/);
  assert.match(appText, /setRevealT\(next\)/);
});

test("early node selection updates timelineT directly instead of clamping to later route progress", async () => {
  const appText = await readFile(new URL("../src/App.tsx", import.meta.url), "utf8");

  assert.match(appText, /setTimelineT\(NODE_FRACTIONS\[id\]\)/);
  assert.ok(!appText.includes("Math.max(t, NODE_FRACTIONS[id])"));
});

test("tour mode locks the bottom scrubber instead of desynchronizing the timeline", async () => {
  const appText = await readFile(new URL("../src/App.tsx", import.meta.url), "utf8");
  const bottomText = await readFile(new URL("../src/components/BottomPanel.tsx", import.meta.url), "utf8");

  assert.match(appText, /if \(mode === "tour"\) return;/);
  assert.match(appText, /<BottomPanel[\s\S]{0,120}scrubbingLocked=\{mode === "tour"\}/);
  assert.match(bottomText, /disabled=\{p\.scrubbingLocked\}/);
  assert.match(bottomText, /scrubbingLocked/);
  assert.match(bottomText, /aria-valuetext=\{currentLabel\}/);
  assert.match(bottomText, /onTimelineChange/);
  assert.ok(!bottomText.includes("onScrub"));
});

test("play restarts from zero when revealT is already at the end", async () => {
  const appText = await readFile(new URL("../src/App.tsx", import.meta.url), "utf8");

  assert.match(appText, /if \(willPlay && revealRef\.current >= 1\) \{/);
  assert.match(appText, /setRevealT\(0\);\s*setTimelineT\(0\);/s);
  assert.ok(!appText.includes("timelineRef.current >= 1 ? 0 : timelineRef.current"));
});

test("left rail renders a neutral track and current-time indicator instead of a completion fill", async () => {
  const leftText = await readFile(new URL("../src/components/LeftTimeline.tsx", import.meta.url), "utf8");
  const cssText = await readFile(new URL("../src/styles.css", import.meta.url), "utf8");

  assert.ok(!leftText.includes("timeline-fill"));
  assert.match(leftText, /timelineMarkers\(\)/);
  assert.match(leftText, /onTimelineChange/);
  assert.match(leftText, /style=\{\{ top: `\$\{marker\.t \* 100\}%` \}\}/);
  assert.match(leftText, /1934年10月/);
  assert.match(leftText, /1935年1月/);
  assert.match(leftText, /1935年5月/);
  assert.match(leftText, /1935年10月/);
  assert.ok(!leftText.includes('timeline-side" aria-hidden="true"'));
  assert.match(leftText, /timeline-current/);
  assert.match(cssText, /timeline-current/);
  assert.match(cssText, /timeline-scale/);
  assert.match(cssText, /timeline-scale-label/);
  assert.match(cssText, /timeline-marker\.selected/);
  assert.match(cssText, /timeline-marker\.current/);
  assert.ok(!cssText.includes(".timeline-fill {"));
});

test("bottom scrubber provides a drag preview and 44px touch targets", async () => {
  const bottomText = await readFile(new URL("../src/components/BottomPanel.tsx", import.meta.url), "utf8");
  const cssText = await readFile(new URL("../src/styles.css", import.meta.url), "utf8");

  assert.match(bottomText, /scrub-preview/);
  assert.match(bottomText, /onPointerDown/);
  assert.match(bottomText, /onPointerUp/);
  assert.match(bottomText, /onPointerCancel/);
  assert.match(bottomText, /onBlur/);
  assert.ok(cssText.includes("min-height: 44px;"));
  assert.ok(cssText.includes("min-width: 44px;"));
  assert.ok(cssText.includes(".scrub-preview"));
});

test("motion stays event-driven and honors reduced-motion camera fallbacks", async () => {
  const appText = await readFile(new URL("../src/App.tsx", import.meta.url), "utf8");
  const leftText = await readFile(new URL("../src/components/LeftTimeline.tsx", import.meta.url), "utf8");
  const mapText = await readFile(new URL("../src/map/MapCanvas.tsx", import.meta.url), "utf8");

  assert.ok(!leftText.includes("activeNodeId"), "left timeline should not auto-scroll from timeline playback state");
  assert.match(mapText, /prefers-reduced-motion: reduce/);
  assert.match(mapText, /jumpTo\(/);
  assert.match(appText, /setCameraReq\(/);
});

test("app scopes the restored selected-node scroll suppression to the initial page load", async () => {
  const appText = await readFile(new URL("../src/App.tsx", import.meta.url), "utf8");
  const leftText = await readFile(new URL("../src/components/LeftTimeline.tsx", import.meta.url), "utf8");

  assert.ok(appText.includes("const suppressInitialSelectedScrollRef = useRef(true);"));
  assert.match(appText, /suppressInitialSelectedScroll=\{suppressInitialSelectedScrollRef\.current\}/);
  assert.match(appText, /suppressInitialSelectedScrollRef\.current = false;/);
  assert.ok(!leftText.includes("const suppressInitialSelectedScrollRef = useRef(true);"));
  assert.match(leftText, /suppressInitialSelectedScroll/);
});

test("left timeline markers use 44px hit areas while keeping a compact visible dot", async () => {
  const cssText = await readFile(new URL("../src/styles.css", import.meta.url), "utf8");

  assert.match(cssText, /\.timeline-marker\s*\{[\s\S]*width:\s*44px;[\s\S]*height:\s*44px;/);
  assert.match(cssText, /\.timeline-marker-dot\s*\{[\s\S]*width:\s*11px;[\s\S]*height:\s*11px;/);
});

test("app hides the mobile timeline toggle in tour mode and shares the normalized timeline handler", async () => {
  const appText = await readFile(new URL("../src/App.tsx", import.meta.url), "utf8");

  assert.ok(appText.includes("onTimelineChange={onTimelineChange}"));
  assert.ok(appText.includes('{mode !== "tour" && ('));
  assert.ok(appText.includes('!focusMode && mode !== "sources" && ('));
  assert.match(appText, /setMobileTimelineOpen\(false\)/);
});
