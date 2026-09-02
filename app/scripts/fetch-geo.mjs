// 下载 Natural Earth 50m 物理要素（公有领域），裁剪到路线范围，输出精简 GeoJSON。
// 只取陆地、河流、湖泊等自然地理要素，不包含任何行政边界图层。
import { writeFile, mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import * as topojson from "topojson-client";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const outDir = join(root, "public", "geo");

// 路线活动范围外扩，保留地理语境
const BBOX = { west: 97.5, east: 120.5, south: 23.5, north: 39.5 };

const inBbox = ([lon, lat]) =>
  lon >= BBOX.west && lon <= BBOX.east && lat >= BBOX.south && lat <= BBOX.north;

// 线要素裁剪：保留落在范围内的部分，跨界处用边界点收束
function clipLineFeatures(fc) {
  const features = [];
  for (const f of fc.features) {
    if (!f.geometry) continue;
    const g = f.geometry;
    const lines = g.type === "LineString" ? [g.coordinates] : g.coordinates;
    const outLines = [];
    for (const line of lines) {
      let cur = null;
      for (let i = 0; i < line.length; i++) {
        const p = line[i];
        if (inBbox(p)) {
          if (!cur) cur = [];
          if (cur.length === 0 && i > 0) cur.push(line[i - 1]);
          cur.push(p);
        } else if (cur) {
          cur.push(p);
          if (cur.length > 1) outLines.push(cur);
          cur = null;
        }
      }
      if (cur && cur.length > 1) outLines.push(cur);
    }
    for (const l of outLines) {
      features.push({ type: "Feature", properties: pickProps(f.properties), geometry: { type: "LineString", coordinates: l } });
    }
  }
  return { type: "FeatureCollection", features };
}

function clipPolygonFeatures(fc) {
  const features = [];
  for (const f of fc.features) {
    if (!f.geometry) continue;
    const g = f.geometry;
    const polys = g.type === "Polygon" ? [g.coordinates] : g.coordinates;
    const outPolys = [];
    for (const poly of polys) {
      const keptRings = poly.filter((ring) => ring.some(inBbox));
      if (keptRings.length > 0) outPolys.push(keptRings);
    }
    for (const p of outPolys) {
      features.push({ type: "Feature", properties: pickProps(f.properties), geometry: { type: "Polygon", coordinates: p } });
    }
  }
  return { type: "FeatureCollection", features };
}

function pickProps(p) {
  if (!p) return {};
  return {
    name: p.name || p.name_cn || p.NAME || p.Name || "",
    scalerank: p.scalerank ?? p.featurecla ?? undefined,
  };
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

async function main() {
  await mkdir(outDir, { recursive: true });

  // 陆地：world-atlas land-50m（TopoJSON，Natural Earth 数据）
  const landTopo = await fetchJson("https://cdn.jsdelivr.net/npm/world-atlas@2/land-50m.json");
  const landFc = topojson.feature(landTopo, landTopo.objects.land);
  const landClipped = clipPolygonFeatures(landFc);
  await writeFile(join(outDir, "land.json"), JSON.stringify(landClipped));
  console.log(`land: ${landClipped.features.length} polygons`);

  // 河流
  const rivers = await fetchJson(
    "https://cdn.jsdelivr.net/gh/martynafford/natural-earth-geojson@master/50m/physical/ne_50m_rivers_lake_centerlines.json"
  );
  const riversClipped = clipLineFeatures(rivers);
  await writeFile(join(outDir, "rivers.json"), JSON.stringify(riversClipped));
  console.log(`rivers: ${riversClipped.features.length} lines`);

  // 湖泊
  const lakes = await fetchJson(
    "https://cdn.jsdelivr.net/gh/martynafford/natural-earth-geojson@master/50m/physical/ne_50m_lakes.json"
  );
  const lakesClipped = clipPolygonFeatures(lakes);
  await writeFile(join(outDir, "lakes.json"), JSON.stringify(lakesClipped));
  console.log(`lakes: ${lakesClipped.features.length} polygons`);

  console.log("done ->", outDir);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
