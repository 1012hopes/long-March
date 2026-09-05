// 从 AWS Terrain Tiles（Terrarium 编码，开放数据）预提取路线走廊的 DEM 金字塔，
// 落地为 public/terrain/dem/{z}/{x}/{y}.png，供 3D 地形本地化使用：
// 3D 秒开、离线可用，不再依赖运行时访问境外 S3（docs/05：本地离线地形优先）。
// 已有的 .terrain-cache/{z}_{x}_{y}.png 下载缓存会被复用，命中即不重新下载。
import { mkdir, readFile, writeFile, stat } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PNG } from "pngjs";
import routeGeometry from "../src/data/route-geometry.json" with { type: "json" };

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const OUT_DIR = join(root, "public", "terrain", "dem");
const CACHE_DIR = join(root, ".terrain-cache");

// 与 build-terrain.mjs 的 BBOX 一致：路线活动范围外加视觉余量
const BBOX = { west: 100.0, east: 117.5, south: 24.5, north: 37.5 };
const ZOOMS = [5, 6, 7, 8]; // 覆盖路线总览(~5-6.4)到巡航(8.1)；8 以上由 maxzoom 上采样
const CONCURRENCY = 6;
const SOURCE = "AWS Terrain Tiles (SRTM/NASADEM derived, terrarium)";

const lonToX = (lon, z) => Math.floor(((lon + 180) / 360) * 2 ** z);
const latToY = (lat, z) => {
  const rad = (lat * Math.PI) / 180;
  return Math.floor(((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * 2 ** z);
};

function tilesForBbox(z) {
  const x0 = lonToX(BBOX.west, z);
  const x1 = lonToX(BBOX.east, z);
  const y0 = latToY(BBOX.north, z);
  const y1 = latToY(BBOX.south, z);
  const tiles = [];
  for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) tiles.push([x, y]);
  return tiles;
}

async function fetchTileBytes(x, y, z, retry = 2) {
  const cachePath = join(CACHE_DIR, `${z}_${x}_${y}.png`);
  try {
    return await readFile(cachePath);
  } catch {
    /* 未命中缓存继续下载 */
  }
  const url = `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${z}/${x}/${y}.png`;
  for (let i = 0; i <= retry; i++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      await mkdir(CACHE_DIR, { recursive: true });
      await writeFile(cachePath, buf);
      return buf;
    } catch (e) {
      if (i === retry) throw new Error(`tile ${z}/${x}/${y}: ${e.message}`);
      await new Promise((r) => setTimeout(r, 800 * (i + 1)));
    }
  }
}

async function placeTile(x, y, z) {
  const outPath = join(OUT_DIR, String(z), String(x), `${y}.png`);
  try {
    const existing = await stat(outPath);
    if (existing.size > 0) return { tile: `${z}/${x}/${y}`, status: "already" };
  } catch {
    /* 首次生成 */
  }
  const buf = await fetchTileBytes(x, y, z);
  const png = PNG.sync.read(buf);
  if (png.width !== 256 || png.height !== 256) {
    throw new Error(`tile ${z}/${x}/${y} unexpected size ${png.width}x${png.height}`);
  }
  await mkdir(join(OUT_DIR, String(z), String(x)), { recursive: true });
  await writeFile(outPath, buf);
  return { tile: `${z}/${x}/${y}`, status: "written", bytes: buf.length };
}

async function main() {
  // 校验路线几何覆盖范围在 BBOX 内，防止几何更新后金字塔漏覆盖
  let minLon = 180, maxLon = -180, minLat = 90, maxLat = -90;
  for (const line of routeGeometry) {
    for (const [lon, lat] of line.coordinates) {
      minLon = Math.min(minLon, lon); maxLon = Math.max(maxLon, lon);
      minLat = Math.min(minLat, lat); maxLat = Math.max(maxLat, lat);
    }
  }
  if (minLon < BBOX.west || maxLon > BBOX.east || minLat < BBOX.south || maxLat > BBOX.north) {
    throw new Error(
      `route bbox [${minLon},${minLat},${maxLon},${maxLat}] 超出金字塔范围，请先调整 BBOX`
    );
  }

  const jobs = [];
  for (const z of ZOOMS) for (const [x, y] of tilesForBbox(z)) jobs.push({ z, x, y });
  console.log(`DEM 金字塔：z${ZOOMS.join("/")}，共 ${jobs.length} 张瓦片（bbox ${BBOX.west}-${BBOX.east}E, ${BBOX.south}-${BBOX.north}N）`);

  const results = [];
  let cursor = 0;
  async function worker() {
    while (cursor < jobs.length) {
      const job = jobs[cursor++];
      results.push(await placeTile(job.x, job.y, job.z));
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  const written = results.filter((r) => r.status === "written");
  const reused = results.filter((r) => r.status === "already");
  let totalBytes = 0;
  for (const z of ZOOMS) {
    const files = results.filter((r) => r.tile.startsWith(`${z}/`));
    for (const f of files) {
      if (f.bytes) totalBytes += f.bytes;
    }
  }
  // 统计落盘真实体积（包含 previously written）
  const { readdir } = await import("node:fs/promises");
  async function dirSize(dir) {
    let size = 0;
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const p = join(dir, entry.name);
      if (entry.isDirectory()) size += await dirSize(p);
      else size += (await stat(p)).size;
    }
    return size;
  }
  const onDisk = await dirSize(OUT_DIR);

  const manifest = {
    generated: new Date().toISOString().slice(0, 10),
    source: SOURCE,
    encoding: "terrarium",
    bbox: BBOX,
    zooms: ZOOMS,
    tileCount: results.length,
    bytesOnDisk: onDisk,
    note: "本地 DEM 金字塔：3D 地形离线可用；maxzoom 以上由上游瓦片上采样。",
  };
  await writeFile(join(OUT_DIR, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");

  console.log(`完成：新写入 ${written.length}，已有复用 ${reused.length}`);
  console.log(`落盘体积：${(onDisk / 1024 / 1024).toFixed(1)} MB（public/terrain/dem/）`);
  console.log(`清单：public/terrain/dem/manifest.json`);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
