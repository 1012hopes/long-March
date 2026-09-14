import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { BEAT_EMPHASIS, expandBounds } from "../src/map/narrativeSync.ts";

test("expandBounds grows outward and keeps order", () => {
  const out = expandBounds([100, 25, 102, 27], 0.38);
  assert.ok(out[0] < 100);
  assert.ok(out[1] < 25);
  assert.ok(out[2] > 102);
  assert.ok(out[3] > 27);
});

test("beat emphasis mapping is intentional", () => {
  assert.equal(BEAT_EMPHASIS.intro, null);
  assert.equal(BEAT_EMPHASIS.question, "route");
  assert.equal(BEAT_EMPHASIS.quote, "evidence");
  assert.equal(BEAT_EMPHASIS.sensory, "terrain");
});

test("UI wires narrative beats and wider framing", async () => {
  const appText = await readFile(new URL("../src/App.tsx", import.meta.url), "utf8");
  const rightText = await readFile(new URL("../src/components/RightPanel.tsx", import.meta.url), "utf8");
  const cssText = await readFile(new URL("../src/styles.css", import.meta.url), "utf8");

  assert.match(appText, /expandBounds/);
  assert.match(appText, /right: 560/);
  assert.match(rightText, /data-beat/);
  assert.match(rightText, /narrative-beat-rail/);
  assert.match(rightText, /syncPausedUntilRef/);
  assert.match(cssText, /learning-muted/);
  assert.match(cssText, /beat-cursor/);
});
