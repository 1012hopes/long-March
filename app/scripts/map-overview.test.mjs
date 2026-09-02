import test from "node:test";
import assert from "node:assert/strict";
import { getChinaOverviewBounds } from "../src/map/overview.ts";

test("nationwide overview keeps China's geographic extremes inside the camera", () => {
  const [west, south, east, north] = getChinaOverviewBounds();

  assert.ok(west <= 73, `western edge ${west} excludes western China`);
  assert.ok(east >= 135, `eastern edge ${east} excludes northeastern China`);
  assert.ok(south <= 18, `southern edge ${south} excludes Hainan`);
  assert.ok(north >= 54, `northern edge ${north} excludes northern China`);
});

test("callers cannot mutate the shared nationwide overview", () => {
  const first = getChinaOverviewBounds();
  first[0] = 100;

  assert.deepEqual(getChinaOverviewBounds(), [72, 17, 136, 55]);
});
