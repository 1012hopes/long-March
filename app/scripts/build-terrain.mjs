// 从 AWS Terrain Tiles（Terrarium 编码，开放数据）构建：
// 1) 高程网格 -> 山体阴影晕染 PNG（纸面地形底图，地理配准）
// 2) 各路线段海拔剖面 JSON（含来源、基准与采样记录）
// 输出：public/terrain/hillshade.png 与 src/data/elevation-profiles.json
import { writeFile, mkdir, readFile, stat } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PNG } from "pngjs";
import { nodeScenes } from "../src/data/nodeScenes.ts";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));

// 路线活动范围（略小于 geo 裁剪范围，控制瓦片数量）
const BBOX = { west: 100.0, east: 117.5, south: 24.5, north: 37.5 };
const Z = 8; // 约 0.4-0.6 km/px，对剖面与纸面晕渲足够
const SAMPLES_PER_TILE = 96; // 每瓦片降采样格数
const PROFILE_POINTS = 256; // 每段剖面采样点数（docs/07 预算 256-1024）
const MULTI_AZIMUTHS = [315, 45, 225, 135];
const NODE_SAMPLE_Z = 10;
const NODE_TARGET_LONG_EDGE = 960;
const NODE_MIN_LONG_EDGE = 480;
const NODE_BUDGET_BYTES = 1_500_000;
const NODE_SAFE_MARGIN_RATIO = 0.12;
const NODE_SAFE_MARGIN_MIN = { lon: 0.06, lat: 0.05 };
const NODE_DEM_SOURCE = "AWS Terrain Tiles (SRTM/NASADEM derived, terrarium)";
const ELEVATION_COLORS = [
  [-300, [205, 219, 194]],
  [200, [218, 226, 194]],
  [600, [207, 214, 177]],
  [1200, [210, 202, 166]],
  [2000, [202, 187, 151]],
  [3000, [185, 172, 152]],
  [4000, [199, 195, 186]],
  [5400, [235, 235, 229]],
];

const TILE_URL = (x, y, z) => `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${z}/${x}/${y}.png`;
const CACHE_DIR = join(root, ".terrain-cache");
const TILE_MEMORY_CACHE = new Map();

const lonToX = (lon, z) => Math.floor(((lon + 180) / 360) * 2 ** z);
const latToY = (lat, z) => {
  const rad = (lat * Math.PI) / 180;
  return Math.floor(((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * 2 ** z);
};
const xToLon = (x, z) => (x / 2 ** z) * 360 - 180;
const yToLat = (y, z) => {
  const n = Math.PI - (2 * Math.PI * y) / 2 ** z;
  return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
};

async function fetchTile(x, y, z, retry = 2) {
  const cachePath = join(CACHE_DIR, `${z}_${x}_${y}.png`);
  const cacheKey = `${z}/${x}/${y}`;
  if (TILE_MEMORY_CACHE.has(cacheKey)) return TILE_MEMORY_CACHE.get(cacheKey);
  try {
    const tile = PNG.sync.read(await readFile(cachePath));
    TILE_MEMORY_CACHE.set(cacheKey, tile);
    return tile;
  } catch {
    /* 未命中缓存继续下载 */
  }
  for (let i = 0; i <= retry; i++) {
    try {
      const res = await fetch(TILE_URL(x, y, z));
      if (!res.ok) throw new Error(`${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      await mkdir(CACHE_DIR, { recursive: true });
      await writeFile(cachePath, buf);
      const tile = PNG.sync.read(buf);
      TILE_MEMORY_CACHE.set(cacheKey, tile);
      return tile;
    } catch (e) {
      if (i === retry) throw new Error(`tile ${z}/${x}/${y}: ${e.message}`);
      await new Promise((r) => setTimeout(r, 800 * (i + 1)));
    }
  }
}

// terrarium: elevation = (R * 256 + G + B / 256) - 32768
function readElevation(png, px, py) {
  const idx = (py * png.width + px) * 4;
  const r = png.data[idx];
  const g = png.data[idx + 1];
  const b = png.data[idx + 2];
  return r * 256 + g + b / 256 - 32768;
}

function elevationColor(elevation) {
  if (elevation <= ELEVATION_COLORS[0][0]) return ELEVATION_COLORS[0][1];
  for (let i = 1; i < ELEVATION_COLORS.length; i++) {
    const [high, highColor] = ELEVATION_COLORS[i];
    const [low, lowColor] = ELEVATION_COLORS[i - 1];
    if (elevation <= high) {
      const t = (elevation - low) / (high - low);
      return highColor.map((channel, index) => Math.round(lowColor[index] + (channel - lowColor[index]) * t));
    }
  }
  return ELEVATION_COLORS[ELEVATION_COLORS.length - 1][1];
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function nodeCropBbox(scene) {
  const [west, south, east, north] = scene.focusBounds;
  const lonMargin = Math.max(NODE_SAFE_MARGIN_MIN.lon, (east - west) * NODE_SAFE_MARGIN_RATIO);
  const latMargin = Math.max(NODE_SAFE_MARGIN_MIN.lat, (north - south) * NODE_SAFE_MARGIN_RATIO);
  return {
    west: clamp(west - lonMargin, BBOX.west, BBOX.east),
    east: clamp(east + lonMargin, BBOX.west, BBOX.east),
    south: clamp(south - latMargin, BBOX.south, BBOX.north),
    north: clamp(north + latMargin, BBOX.south, BBOX.north),
  };
}

function tileKey(z, x, y) {
  return `${z}/${x}/${y}`;
}

async function loadTileWindow(bounds, z) {
  const x0 = clamp(lonToX(bounds.west, z) - 1, 0, 2 ** z - 1);
  const x1 = clamp(lonToX(bounds.east, z) + 1, 0, 2 ** z - 1);
  const y0 = clamp(latToY(bounds.north, z) - 1, 0, 2 ** z - 1);
  const y1 = clamp(latToY(bounds.south, z) + 1, 0, 2 ** z - 1);
  const tiles = new Map();
  const jobs = [];
  for (let ty = y0; ty <= y1; ty++) {
    for (let tx = x0; tx <= x1; tx++) {
      jobs.push(
        fetchTile(tx, ty, z).then((tile) => {
          tiles.set(tileKey(z, tx, ty), tile);
        })
      );
    }
  }
  await Promise.all(jobs);
  return { tiles, x0, x1, y0, y1 };
}

function elevationAtWorldPixel(tiles, z, worldX, worldY) {
  const tileX = clamp(Math.floor(worldX / 256), 0, 2 ** z - 1);
  const tileY = clamp(Math.floor(worldY / 256), 0, 2 ** z - 1);
  const tile = tiles.get(tileKey(z, tileX, tileY));
  if (!tile) throw new Error(`missing tile ${z}/${tileX}/${tileY}`);
  const px = clamp(Math.floor(worldX - tileX * 256), 0, tile.width - 1);
  const py = clamp(Math.floor(worldY - tileY * 256), 0, tile.height - 1);
  return readElevation(tile, px, py);
}

function sampleElevation(tiles, z, lon, lat) {
  const worldSize = 256 * 2 ** z;
  const worldX = clamp(((lon + 180) / 360) * worldSize, 0, worldSize - 1);
  const worldY = clamp(((1 - Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) / 2) * worldSize, 0, worldSize - 1);
  return elevationAtWorldPixel(tiles, z, worldX, worldY);
}

async function buildElevationGrid(bounds, width, height, z) {
  const { tiles } = await loadTileWindow(bounds, z);
  const grid = new Float32Array(width * height);
  for (let gy = 0; gy < height; gy++) {
    const lat = bounds.north - ((gy + 0.5) / height) * (bounds.north - bounds.south);
    for (let gx = 0; gx < width; gx++) {
      const lon = bounds.west + ((gx + 0.5) / width) * (bounds.east - bounds.west);
      grid[gy * width + gx] = sampleElevation(tiles, z, lon, lat);
    }
  }
  return grid;
}

function resizePng(source, width, height) {
  if (source.width === width && source.height === height) return source;
  const resized = new PNG({ width, height });
  const xScale = source.width / width;
  const yScale = source.height / height;
  for (let y = 0; y < height; y++) {
    const sy = (y + 0.5) * yScale - 0.5;
    const y0 = clamp(Math.floor(sy), 0, source.height - 1);
    const y1 = clamp(y0 + 1, 0, source.height - 1);
    const ty = sy - y0;
    for (let x = 0; x < width; x++) {
      const sx = (x + 0.5) * xScale - 0.5;
      const x0 = clamp(Math.floor(sx), 0, source.width - 1);
      const x1 = clamp(x0 + 1, 0, source.width - 1);
      const tx = sx - x0;
      const idx = (y * width + x) * 4;
      const idx00 = (y0 * source.width + x0) * 4;
      const idx10 = (y0 * source.width + x1) * 4;
      const idx01 = (y1 * source.width + x0) * 4;
      const idx11 = (y1 * source.width + x1) * 4;
      for (let channel = 0; channel < 4; channel++) {
        const c00 = source.data[idx00 + channel];
        const c10 = source.data[idx10 + channel];
        const c01 = source.data[idx01 + channel];
        const c11 = source.data[idx11 + channel];
        const c0 = c00 + (c10 - c00) * tx;
        const c1 = c01 + (c11 - c01) * tx;
        resized.data[idx + channel] = Math.round(c0 + (c1 - c0) * ty);
      }
    }
  }
  return resized;
}

function terrainPreset(mode) {
  switch (mode) {
    case "river-valley":
      return { ambient: 0.68, shadow: 0.45, slope: 0.045, tintAlpha: 0.98, reliefAlpha: 1 };
    case "mountain":
      return { ambient: 0.74, shadow: 0.32, slope: 0.028, tintAlpha: 0.94, reliefAlpha: 0.88 };
    case "plateau":
      return { ambient: 0.71, shadow: 0.36, slope: 0.03, tintAlpha: 0.96, reliefAlpha: 0.9 };
    default:
      return { ambient: 0.76, shadow: 0.28, slope: 0.022, tintAlpha: 0.92, reliefAlpha: 0.8 };
  }
}

function renderTerrainPair(grid, width, height, bounds, mode) {
  const tintPng = new PNG({ width, height });
  const reliefPng = new PNG({ width, height });
  const preset = terrainPreset(mode);
  const metersPerCellX = ((bounds.east - bounds.west) * 111320 * Math.cos(((bounds.north + bounds.south) / 2) * Math.PI / 180)) / width;
  const metersPerCellY = ((bounds.north - bounds.south) * 110540) / height;
  for (let gy = 0; gy < height; gy++) {
    for (let gx = 0; gx < width; gx++) {
      const xPrev = Math.max(0, gx - 1);
      const xNext = Math.min(width - 1, gx + 1);
      const yPrev = Math.max(0, gy - 1);
      const yNext = Math.min(height - 1, gy + 1);
      const dzdx =
        (grid[gy * width + xNext] - grid[gy * width + xPrev]) /
        (Math.max(1, xNext - xPrev) * Math.max(1, metersPerCellX));
      const dzdy =
        (grid[yNext * width + gx] - grid[yPrev * width + gx]) /
        (Math.max(1, yNext - yPrev) * Math.max(1, metersPerCellY));
      const slope = Math.atan(Math.sqrt(dzdx * dzdx + dzdy * dzdy));
      const aspect = Math.atan2(dzdy, -dzdx);
      let shade = 0;
      MULTI_AZIMUTHS.forEach((degrees, index) => {
        const azimuth = (degrees * Math.PI) / 180;
        const light =
          Math.sin((45 * Math.PI) / 180) * Math.cos(slope) +
          Math.cos((45 * Math.PI) / 180) * Math.sin(slope) * Math.cos(azimuth - aspect);
        shade += light * (index === 0 ? 0.55 : 0.15);
      });
      const elev = grid[gy * width + gx];
      const idx = (gy * width + gx) * 4;
      const edgeDistance = Math.min(gx, gy, width - 1 - gx, height - 1 - gy);
      const feather = Math.max(0, Math.min(1, edgeDistance / Math.max(40, Math.round(Math.min(width, height) / 9))));
      const color = elevationColor(elev);
      tintPng.data[idx] = color[0];
      tintPng.data[idx + 1] = color[1];
      tintPng.data[idx + 2] = color[2];
      tintPng.data[idx + 3] = Math.round(224 * preset.tintAlpha * feather);

      const darkness = Math.max(0, Math.min(0.2, (preset.ambient - shade) * preset.shadow + slope * preset.slope));
      reliefPng.data[idx] = 70;
      reliefPng.data[idx + 1] = 74;
      reliefPng.data[idx + 2] = 66;
      reliefPng.data[idx + 3] = Math.round(darkness * 255 * preset.reliefAlpha * feather);
    }
  }
  return { tintPng, reliefPng };
}

function nodeRenderSize(bounds) {
  const aspect = (bounds.east - bounds.west) / (bounds.north - bounds.south);
  const longEdge = NODE_TARGET_LONG_EDGE;
  const width = aspect >= 1 ? longEdge : Math.max(320, Math.round(longEdge * aspect));
  const height = aspect >= 1 ? Math.max(320, Math.round(longEdge / aspect)) : longEdge;
  return { width, height };
}

async function renderNodeTerrain(scene) {
  const bounds = nodeCropBbox(scene);
  let { width, height } = nodeRenderSize(bounds);
  let grid = await buildElevationGrid(bounds, width, height, NODE_SAMPLE_Z);
  let { tintPng, reliefPng } = renderTerrainPair(grid, width, height, bounds, scene.terrainMode);

  while (PNG.sync.write(tintPng).length + PNG.sync.write(reliefPng).length > NODE_BUDGET_BYTES && Math.max(width, height) > NODE_MIN_LONG_EDGE) {
    const nextWidth = Math.max(2, Math.round(width * 0.85));
    const nextHeight = Math.max(2, Math.round(height * 0.85));
    width = nextWidth;
    height = nextHeight;
    tintPng = resizePng(tintPng, width, height);
    reliefPng = resizePng(reliefPng, width, height);
  }

  return {
    bounds,
    width,
    height,
    tintBytes: PNG.sync.write(tintPng),
    reliefBytes: PNG.sync.write(reliefPng),
  };
}

async function writeNodeTerrainAssets() {
  const outDir = join(root, "public", "terrain", "nodes");
  await mkdir(outDir, { recursive: true });
  const generated = new Date().toISOString().slice(0, 10);
  const entries = [];

  for (const scene of nodeScenes) {
    const rendered = await renderNodeTerrain(scene);
    const tintName = `${scene.nodeId}-tint.png`;
    const hillshadeName = `${scene.nodeId}-hillshade.png`;
    await writeFile(join(outDir, tintName), rendered.tintBytes);
    await writeFile(join(outDir, hillshadeName), rendered.reliefBytes);
    const [tintStat, hillshadeStat] = await Promise.all([
      stat(join(outDir, tintName)),
      stat(join(outDir, hillshadeName)),
    ]);
    entries.push({
      nodeId: scene.nodeId,
      terrainMode: scene.terrainMode,
      source: NODE_DEM_SOURCE,
      generated,
      bbox: rendered.bounds,
      sampleZoom: NODE_SAMPLE_Z,
      resolution: { width: rendered.width, height: rendered.height },
      filenames: { tint: tintName, hillshade: hillshadeName },
      sizes: {
        tint: tintStat.size,
        hillshade: hillshadeStat.size,
        pair: tintStat.size + hillshadeStat.size,
      },
    });
  }

  await writeFile(
    join(outDir, "manifest.json"),
    JSON.stringify(
      {
        generated,
        source: NODE_DEM_SOURCE,
        sampleZoom: NODE_SAMPLE_Z,
        budgetBytes: NODE_BUDGET_BYTES,
        nodes: entries,
      },
      null,
      2
    )
  );
}

function contourSegments(grid, width, height, level, step) {
  const segments = [];
  const edgePoint = (ax, ay, av, bx, by, bv) => {
    const span = bv - av;
    const t = Math.abs(span) < 1e-6 ? 0.5 : (level - av) / span;
    return [ax + (bx - ax) * t, ay + (by - ay) * t];
  };
  const crosses = (a, b) => (a < level && b >= level) || (b < level && a >= level);

  for (let y = 0; y < height - step; y += step) {
    for (let x = 0; x < width - step; x += step) {
      const tl = grid[y * width + x];
      const tr = grid[y * width + x + step];
      const br = grid[(y + step) * width + x + step];
      const bl = grid[(y + step) * width + x];
      if (Math.min(tl, tr, br, bl) > level || Math.max(tl, tr, br, bl) < level) continue;

      const points = [];
      if (crosses(tl, tr)) points.push(edgePoint(x, y, tl, x + step, y, tr));
      if (crosses(tr, br)) points.push(edgePoint(x + step, y, tr, x + step, y + step, br));
      if (crosses(br, bl)) points.push(edgePoint(x + step, y + step, br, x, y + step, bl));
      if (crosses(bl, tl)) points.push(edgePoint(x, y + step, bl, x, y, tl));

      if (points.length === 2) {
        segments.push(points);
      } else if (points.length === 4) {
        const center = (tl + tr + br + bl) / 4;
        if (center >= level) {
          segments.push([points[0], points[3]], [points[1], points[2]]);
        } else {
          segments.push([points[0], points[1]], [points[2], points[3]]);
        }
      }
    }
  }
  return segments;
}

function stitchSegments(segments) {
  const keyOf = ([x, y]) => x.toFixed(2) + "," + y.toFixed(2);
  const byEndpoint = new Map();
  segments.forEach((segment, index) => {
    for (const point of segment) {
      const key = keyOf(point);
      const list = byEndpoint.get(key) ?? [];
      list.push(index);
      byEndpoint.set(key, list);
    }
  });

  const unused = new Set(segments.map((_, index) => index));
  const lines = [];
  const extend = (line, atStart) => {
    while (true) {
      const point = atStart ? line[0] : line[line.length - 1];
      const candidates = byEndpoint.get(keyOf(point)) ?? [];
      const nextIndex = candidates.find((index) => unused.has(index));
      if (nextIndex === undefined) return;
      unused.delete(nextIndex);
      const segment = segments[nextIndex];
      const other = keyOf(segment[0]) === keyOf(point) ? segment[1] : segment[0];
      if (atStart) line.unshift(other);
      else line.push(other);
    }
  };

  while (unused.size > 0) {
    const index = unused.values().next().value;
    unused.delete(index);
    const line = [...segments[index]];
    extend(line, false);
    extend(line, true);
    if (line.length >= 2) lines.push(line);
  }
  return lines;
}

async function writeContours({ grid, width, height, outDir, x0, y0, z }) {
  let minElevation = Infinity;
  let maxElevation = -Infinity;
  for (const elevation of grid) {
    minElevation = Math.min(minElevation, elevation);
    maxElevation = Math.max(maxElevation, elevation);
  }
  minElevation = Math.floor(minElevation / 50) * 50;
  maxElevation = Math.ceil(maxElevation / 50) * 50;
  const gridToLngLat = ([gx, gy]) => [
    xToLon(x0 + gx / SAMPLES_PER_TILE, z),
    yToLat(y0 + gy / SAMPLES_PER_TILE, z),
  ];

  for (const config of [
    { interval: 200, step: 4, excludeMultiple: null },
    { interval: 100, step: 5, excludeMultiple: 200 },
    { interval: 50, step: 6, excludeMultiple: 100 },
  ]) {
    const features = [];
    for (
      let elevation = Math.ceil(minElevation / config.interval) * config.interval;
      elevation <= maxElevation;
      elevation += config.interval
    ) {
      if (config.excludeMultiple && elevation % config.excludeMultiple === 0) continue;
      const segments = contourSegments(grid, width, height, elevation, config.step);
      for (const line of stitchSegments(segments)) {
      if (line.length < 5) continue;
      const compactLine = line.filter((_, index) => index === 0 || index === line.length - 1 || index % 2 === 0);
      features.push({
        type: "Feature",
        properties: { elevation, interval: config.interval },
        geometry: {
          type: "LineString",
          coordinates: compactLine.map(gridToLngLat).map(([lon, lat]) => [
            Number(lon.toFixed(4)),
            Number(lat.toFixed(4)),
          ]),
        },
      });
      }
    }
    const output = { type: "FeatureCollection", features };
    await writeFile(join(outDir, "contour-" + config.interval + ".geojson"), JSON.stringify(output));
    console.log("contour " + config.interval + "m: " + features.length + " lines");
    if (config.interval === 200) {
      const labelFeatures = features
        .filter(
          (feature, index) =>
            feature.geometry.coordinates.length >= 3 &&
            feature.properties.elevation >= 200 &&
            index % 512 === 0
        )
        .map((feature) => {
          const coordinates = feature.geometry.coordinates;
          return {
            type: "Feature",
            properties: { elevation: feature.properties.elevation },
            geometry: { type: "Point", coordinates: coordinates[Math.floor(coordinates.length / 2)] },
          };
        });
      await writeFile(
        join(outDir, "contour-labels.geojson"),
        JSON.stringify({ type: "FeatureCollection", features: labelFeatures })
      );
      console.log("contour labels: " + labelFeatures.length);
    }
  }
}

async function main() {
  const x0 = lonToX(BBOX.west, Z);
  const x1 = lonToX(BBOX.east, Z);
  const y0 = latToY(BBOX.north, Z);
  const y1 = latToY(BBOX.south, Z);
  const cols = x1 - x0 + 1;
  const rows = y1 - y0 + 1;
  console.log(`tiles: ${cols}x${rows} @z${Z} = ${cols * rows}`);

  // 合并降采样高程网格
  const gw = cols * SAMPLES_PER_TILE;
  const gh = rows * SAMPLES_PER_TILE;
  const grid = new Float32Array(gw * gh);
  let fetched = 0;
  for (let ty = y0; ty <= y1; ty++) {
    for (let tx = x0; tx <= x1; tx++) {
      const png = await fetchTile(tx, ty, Z);
      const step = png.width / SAMPLES_PER_TILE;
      for (let sy = 0; sy < SAMPLES_PER_TILE; sy++) {
        for (let sx = 0; sx < SAMPLES_PER_TILE; sx++) {
          const px = Math.min(png.width - 1, Math.floor(sx * step));
          const py = Math.min(png.height - 1, Math.floor(sy * step));
          grid[((ty - y0) * SAMPLES_PER_TILE + sy) * gw + ((tx - x0) * SAMPLES_PER_TILE + sx)] =
            readElevation(png, px, py);
        }
      }
      fetched++;
      if (fetched % 20 === 0) console.log(`  fetched ${fetched}/${cols * rows}`);
    }
  }
  console.log("elevation grid:", `${gw}x${gh}`);

  // 网格坐标对应的经纬度（线性近似：网格均匀对应 bbox）
  const lonAt = (gx) => BBOX.west + ((gx + 0.5) / gw) * (BBOX.east - BBOX.west);
  const latAt = (gy) => BBOX.north - ((gy + 0.5) / gh) * (BBOX.north - BBOX.south);

  // 专业自然地形图：高程分层设色 + 四方向柔和晕渲。
  const metersPerCellX = ((BBOX.east - BBOX.west) * 111320 * Math.cos(((BBOX.north + BBOX.south) / 2) * Math.PI / 180)) / gw;
  const metersPerCellY = ((BBOX.north - BBOX.south) * 110540) / gh;
  const alt = (45 * Math.PI) / 180;

  const reliefPng = new PNG({ width: gw, height: gh });
  const tintPng = new PNG({ width: gw, height: gh });
  for (let gy = 0; gy < gh; gy++) {
    for (let gx = 0; gx < gw; gx++) {
      const xPrev = Math.max(0, gx - 1);
      const xNext = Math.min(gw - 1, gx + 1);
      const yPrev = Math.max(0, gy - 1);
      const yNext = Math.min(gh - 1, gy + 1);
      const dzdx = (grid[gy * gw + xNext] - grid[gy * gw + xPrev]) / (Math.max(1, xNext - xPrev) * metersPerCellX);
      const dzdy = (grid[yNext * gw + gx] - grid[yPrev * gw + gx]) / (Math.max(1, yNext - yPrev) * metersPerCellY);
      const slope = Math.atan(Math.sqrt(dzdx * dzdx + dzdy * dzdy));
      const aspect = Math.atan2(dzdy, -dzdx);
      let shade = 0;
      MULTI_AZIMUTHS.forEach((degrees, index) => {
        const azimuth = (degrees * Math.PI) / 180;
        const light =
          Math.sin(alt) * Math.cos(slope) +
          Math.cos(alt) * Math.sin(slope) * Math.cos(azimuth - aspect);
        shade += light * (index === 0 ? 0.55 : 0.15);
      });
      const elev = grid[gy * gw + gx];
      const idx = (gy * gw + gx) * 4;
      const edgeDistance = Math.min(gx, gy, gw - 1 - gx, gh - 1 - gy);
      const feather = Math.max(0, Math.min(1, edgeDistance / 64));
      const color = elevationColor(elev);
      tintPng.data[idx] = color[0];
      tintPng.data[idx + 1] = color[1];
      tintPng.data[idx + 2] = color[2];
      tintPng.data[idx + 3] = Math.round(224 * feather);

      const darkness = Math.max(0, Math.min(0.18, (0.72 - shade) * 0.34 + slope * 0.035));
      reliefPng.data[idx] = 70;
      reliefPng.data[idx + 1] = 74;
      reliefPng.data[idx + 2] = 66;
      reliefPng.data[idx + 3] = Math.round(darkness * 255 * feather);
    }
  }

  const outDir = join(root, "public", "terrain");
  await mkdir(outDir, { recursive: true });
  await writeFile(join(outDir, "terrain-tint.png"), PNG.sync.write(tintPng));
  await writeFile(join(outDir, "hillshade.png"), PNG.sync.write(reliefPng));

  const geoBbox = {
    west: xToLon(x0, Z),
    east: xToLon(x1 + 1, Z),
    south: yToLat(y1 + 1, Z),
    north: yToLat(y0, Z),
  };
  await writeFile(
    join(outDir, "hillshade-bbox.json"),
    JSON.stringify({ ...geoBbox, generated: new Date().toISOString().slice(0, 10) })
  );
  console.log("hillshade ->", join(outDir, "hillshade.png"), JSON.stringify(geoBbox));
  await writeContours({ grid, width: gw, height: gh, outDir, x0, y0, z: Z });
  await writeNodeTerrainAssets();

  // 读取路线段几何，生成剖面
  let routeSegments = [];
  try {
    const segUrl = join(root, "src", "data", "route-geometry.json");
    const { readFileSync } = await import("node:fs");
    routeSegments = JSON.parse(readFileSync(segUrl, "utf8"));
  } catch {
    console.warn("route-geometry.json 未找到，跳过剖面生成（可先写好路线数据后重跑）");
  }

  if (routeSegments.length > 0) {
    const profiles = {};
    for (const seg of routeSegments) {
      const pts = seg.coordinates;
      // 弧长（米）
      const hav = (a, b) => {
        const R = 6371000;
        const dLat = ((b[1] - a[1]) * Math.PI) / 180;
        const dLon = ((b[0] - a[0]) * Math.PI) / 180;
        const s =
          Math.sin(dLat / 2) ** 2 +
          Math.cos((a[1] * Math.PI) / 180) * Math.cos((b[1] * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
        return 2 * R * Math.asin(Math.sqrt(s));
      };
      const cum = [0];
      for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + hav(pts[i - 1], pts[i]));
      const total = cum[cum.length - 1];

      const sampleElev = (lon, lat) => {
        const fx = ((lon - BBOX.west) / (BBOX.east - BBOX.west)) * gw - 0.5;
        const fy = ((BBOX.north - lat) / (BBOX.north - BBOX.south)) * gh - 0.5;
        const x0c = Math.max(0, Math.min(gw - 2, Math.floor(fx)));
        const y0c = Math.max(0, Math.min(gh - 2, Math.floor(fy)));
        const tx = Math.max(0, Math.min(1, fx - x0c));
        const ty = Math.max(0, Math.min(1, fy - y0c));
        const e00 = grid[y0c * gw + x0c];
        const e10 = grid[y0c * gw + x0c + 1];
        const e01 = grid[(y0c + 1) * gw + x0c];
        const e11 = grid[(y0c + 1) * gw + x0c + 1];
        return e00 * (1 - tx) * (1 - ty) + e10 * tx * (1 - ty) + e01 * (1 - tx) * ty + e11 * tx * ty;
      };

      const profile = [];
      for (let i = 0; i < PROFILE_POINTS; i++) {
        const target = (i / (PROFILE_POINTS - 1)) * total;
        let j = cum.findIndex((c) => c >= target);
        if (j < 1) j = 1;
        const seg0 = cum[j - 1];
        const segLen = cum[j] - seg0 || 1;
        const t = (target - seg0) / segLen;
        const lon = pts[j - 1][0] + (pts[j][0] - pts[j - 1][0]) * t;
        const lat = pts[j - 1][1] + (pts[j][1] - pts[j - 1][1]) * t;
        profile.push({
          d: Math.round(target / 100) / 10, // km
          e: Math.round(sampleElev(lon, lat)),
        });
      }
      const elevs = profile.map((p) => p.e);
      let ascent = 0;
      for (let i = 1; i < elevs.length; i++) if (elevs[i] > elevs[i - 1]) ascent += elevs[i] - elevs[i - 1];
      profiles[seg.id] = {
        demSource: "AWS Terrain Tiles (SRTM/NASEDEM derived, terrarium)",
        zoomLevel: Z,
        approxSampleStepMeters: Math.round(total / PROFILE_POINTS),
        minElevMeters: Math.min(...elevs),
        maxElevMeters: Math.max(...elevs),
        ascentMeters: Math.round(ascent),
        totalKm: Math.round(total / 100) / 10,
        profile,
      };
      console.log(`profile ${seg.id}: ${profiles[seg.id].totalKm}km ${profiles[seg.id].minElevMeters}-${profiles[seg.id].maxElevMeters}m`);
    }
    const dataDir = join(root, "src", "data");
    await mkdir(dataDir, { recursive: true });
    await writeFile(
      join(dataDir, "elevation-profiles.json"),
      JSON.stringify({ generated: new Date().toISOString().slice(0, 10), profiles }, null, 1)
    );
  }

  console.log("done");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
