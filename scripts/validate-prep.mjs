import { readFile, readdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));

const parseCsv = (text) => {
  const lines = text.trim().split(/\r?\n/);
  const headers = lines[0].split(",");
  return lines.slice(1).map((line) => {
    const values = line.split(",");
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
  });
};

const sourceRows = parseCsv(await readFile(join(root, "research/source-register.csv"), "utf8"));
const nodeRows = parseCsv(await readFile(join(root, "research/node-register.csv"), "utf8"));
const rightsRows = parseCsv(await readFile(join(root, "research/rights-register.csv"), "utf8"));
const geoRows = parseCsv(await readFile(join(root, "research/geodata-register.csv"), "utf8"));
const segmentRows = parseCsv(await readFile(join(root, "research/route-segment-register.csv"), "utf8"));

const failures = [];
const sourceIds = new Set(sourceRows.map((row) => row.source_id));
const nodeIds = new Set(nodeRows.map((row) => row.node_id));

if (nodeRows.length !== 9) failures.push(`Expected 9 node rows, found ${nodeRows.length}`);
if (nodeIds.size !== nodeRows.length) failures.push("Duplicate node_id found");
if (sourceIds.size !== sourceRows.length) failures.push("Duplicate source_id found");

for (const node of nodeRows) {
  const refs = node.source_ids.split(";").filter(Boolean);
  if (refs.length < 2) failures.push(`${node.node_id} has fewer than two source references`);
  for (const ref of refs) {
    if (!sourceIds.has(ref)) failures.push(`${node.node_id} references missing source ${ref}`);
  }
}

if (nodeRows.some((node) => /来源缺口|来源待补/.test(node.notes))) {
  failures.push("Node register still contains unresolved source-gap notes");
}

for (const row of rightsRows) {
  if (row.source_id !== "all" && !sourceIds.has(row.source_id)) {
    failures.push(`${row.resource_id} references missing source ${row.source_id}`);
  }
}

for (const row of geoRows) {
  if (row.source_id !== "all" && !sourceIds.has(row.source_id)) {
    failures.push(`${row.geodata_id} references missing source ${row.source_id}`);
  }
}

if (segmentRows.length !== 8) failures.push(`Expected 8 route segments, found ${segmentRows.length}`);
for (const row of segmentRows) {
  if (!nodeIds.has(row.from_node_id)) failures.push(`${row.segment_id} has missing from_node_id ${row.from_node_id}`);
  if (!nodeIds.has(row.to_node_id)) failures.push(`${row.segment_id} has missing to_node_id ${row.to_node_id}`);
  const refs = row.source_ids.split(";").filter(Boolean);
  if (refs.length < 2) failures.push(`${row.segment_id} has fewer than two source references`);
  for (const ref of refs) {
    if (!sourceIds.has(ref)) failures.push(`${row.segment_id} references missing source ${ref}`);
  }
  if (!row.reasoning) failures.push(`${row.segment_id} has no reasoning`);
  if (!row.certainty) failures.push(`${row.segment_id} has no certainty`);
}

const markdownFiles = [];
const collectMarkdown = async (directory) => {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) await collectMarkdown(path);
    else if (entry.name.endsWith(".md")) markdownFiles.push(path);
  }
};
await collectMarkdown(root);

for (const path of markdownFiles) {
  const text = await readFile(path, "utf8");
  if (/\bTBD\b|\bTODO\b|待填写|占位符/.test(text)) failures.push(`Placeholder marker in ${path}`);
}

if (failures.length > 0) {
  process.stderr.write(`${failures.join("\n")}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(
    `Preparation package valid: ${nodeRows.length} nodes, ${segmentRows.length} route segments, ${sourceRows.length} sources, ${rightsRows.length} rights records, ${geoRows.length} geodata records, ${markdownFiles.length} markdown files.\n`
  );
}
