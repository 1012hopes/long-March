import test from "node:test";
import assert from "node:assert/strict";
import { readFile, access } from "node:fs/promises";
import { nodes } from "../src/data/nodes.ts";
import {
  defaultSceneEra,
  scenePhotoForNode,
  scenePhotoExistsForNodes,
} from "../src/data/scenePhotos.ts";

test("every teaching node has then/now scene images on disk", async () => {
  assert.ok(scenePhotoExistsForNodes(nodes));
  for (const node of nodes) {
    const photo = scenePhotoForNode(node.id);
    assert.ok(photo, node.id);
    const base = new URL("../public/", import.meta.url);
    await access(new URL(photo.thenSrc, base));
    await access(new URL(photo.nowSrc, base));
  }
});

test("compare mode defaults to modern scene", () => {
  assert.equal(defaultSceneEra(true), "now");
  assert.equal(defaultSceneEra(false), "then");
});

test("share map enables preserveDrawingBuffer and scene modal is wired", async () => {
  const mapText = await readFile(new URL("../src/map/MapCanvas.tsx", import.meta.url), "utf8");
  const appText = await readFile(new URL("../src/App.tsx", import.meta.url), "utf8");
  const modalText = await readFile(new URL("../src/components/ScenePhotoModal.tsx", import.meta.url), "utf8");

  assert.ok(mapText.includes("preserveDrawingBuffer: true"));
  assert.match(appText, /ScenePhotoModal/);
  assert.match(appText, /openScene/);
  assert.match(modalText, /当时/);
  assert.match(modalText, /当今/);
});
