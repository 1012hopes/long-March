export const NODE_TERRAIN_LONG_EDGE_CANDIDATES = [960, 840, 720, 600, 480];
export const NODE_TERRAIN_PAIR_BUDGET_BYTES = 1_500_000;

export function nodeTerrainDimensions(aspect, longEdge) {
  const width = aspect >= 1 ? longEdge : Math.max(320, Math.round(longEdge * aspect));
  const height = aspect >= 1 ? Math.max(320, Math.round(longEdge / aspect)) : longEdge;
  return { width, height };
}

function byteCount(value) {
  if (typeof value === "number") return value;
  if (value?.byteLength !== undefined) return value.byteLength;
  if (value?.length !== undefined) return value.length;
  return 0;
}

export async function selectNodeTerrainVariant({ aspect, measure, budgetBytes = NODE_TERRAIN_PAIR_BUDGET_BYTES, candidates = NODE_TERRAIN_LONG_EDGE_CANDIDATES }) {
  const tried = [];

  for (const longEdge of candidates) {
    const { width, height } = nodeTerrainDimensions(aspect, longEdge);
    const { tint, hillshade } = await measure(width, height);
    const tintBytes = byteCount(tint);
    const hillshadeBytes = byteCount(hillshade);
    const pairBytes = tintBytes + hillshadeBytes;
    const attempt = { longEdge, width, height, tintBytes, hillshadeBytes, pairBytes };
    tried.push(attempt);
    if (pairBytes <= budgetBytes) return { ...attempt, tint, hillshade };
  }

  const summary = tried.map((attempt) => `${attempt.longEdge}px=${attempt.pairBytes}`).join(", ");
  const budgetLabel = budgetBytes >= 1_000_000 ? `${(budgetBytes / 1_000_000).toFixed(1)}MB` : `${budgetBytes} bytes`;
  throw new Error(`node terrain pair exceeds ${budgetLabel} (${budgetBytes} bytes) for all candidates: ${summary}`);
}
