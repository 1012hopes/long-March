import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const file = fileURLToPath(new URL("../research/source-register.csv", import.meta.url));
const lines = (await readFile(file, "utf8")).trim().split(/\r?\n/).slice(1);
const sources = lines.map((line) => {
  const cells = line.split(",");
  return { id: cells[0], url: cells[6] };
});

const results = await Promise.all(
  sources.map(async ({ id, url }) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12_000);

    try {
      const response = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 preparation-link-check" },
        redirect: "follow",
        signal: controller.signal
      });
      return { id, ok: response.ok, status: response.status, finalUrl: response.url };
    } catch (error) {
      return { id, ok: false, status: "ERROR", finalUrl: error instanceof Error ? error.message : String(error) };
    } finally {
      clearTimeout(timeout);
    }
  })
);

for (const result of results) {
  console.log([result.id, result.ok ? "OK" : "CHECK", result.status, result.finalUrl].join("\t"));
}

const failed = results.filter((result) => !result.ok);
console.log(`Summary: ${results.length - failed.length}/${results.length} reachable, ${failed.length} require manual follow-up.`);

