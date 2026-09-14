export type ShareCardMeta = {
  title: string;
  dateLabel: string;
  precisionLabel: string;
  footer?: string;
};

const PAPER = "#F2EEE4";
const PAPER_LIGHT = "#FCFAF5";
const INK = "#1C1D1B";
const INK_SOFT = "#565952";
const ARCHIVE_LINE = "#C9C1B3";
const ROUTE_RED = "#A6322B";

export function shareCardFileName(title: string): string {
  const slug =
    title
      .replace(/\s+/g, "-")
      .replace(/[\\/:*?"<>|]/g, "")
      .slice(0, 24) || "route";
  return `长征地图卡片-${slug}.png`;
}

/** 把当前地图取景合成档案风单块卡片 */
export function composeShareCard(mapCanvas: HTMLCanvasElement, meta: ShareCardMeta): HTMLCanvasElement {
  const mapW = Math.max(320, mapCanvas.width);
  const mapH = Math.max(240, mapCanvas.height);
  const scale = mapW < 960 ? Math.min(2, 960 / mapW) : 1;
  const drawW = Math.round(mapW * scale);
  const drawH = Math.round(mapH * scale);
  const pad = Math.round(18 * scale);
  const footerH = Math.round(88 * scale);
  const out = document.createElement("canvas");
  out.width = drawW + pad * 2;
  out.height = drawH + pad * 2 + footerH;

  const ctx = out.getContext("2d");
  if (!ctx) return out;

  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, out.width, out.height);

  // 地图区（轻微描边，档案卡感）
  ctx.fillStyle = PAPER_LIGHT;
  ctx.fillRect(pad - 2, pad - 2, drawW + 4, drawH + 4);
  ctx.drawImage(mapCanvas, pad, pad, drawW, drawH);
  ctx.strokeStyle = ARCHIVE_LINE;
  ctx.lineWidth = Math.max(1, scale);
  ctx.strokeRect(pad - 0.5, pad - 0.5, drawW + 1, drawH + 1);

  const footY = pad + drawH + pad;
  ctx.fillStyle = PAPER_LIGHT;
  ctx.fillRect(pad, footY, drawW, footerH - pad);
  ctx.strokeStyle = ARCHIVE_LINE;
  ctx.strokeRect(pad + 0.5, footY + 0.5, drawW - 1, footerH - pad - 1);

  const textX = pad + Math.round(14 * scale);
  let textY = footY + Math.round(22 * scale);

  ctx.fillStyle = ROUTE_RED;
  ctx.beginPath();
  ctx.arc(textX + Math.round(4 * scale), textY - Math.round(4 * scale), Math.round(4 * scale), 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = INK;
  ctx.font = `600 ${Math.round(18 * scale)}px "Noto Serif SC", "Songti SC", serif`;
  ctx.textBaseline = "alphabetic";
  ctx.fillText(meta.title, textX + Math.round(14 * scale), textY, drawW - Math.round(40 * scale));

  textY += Math.round(20 * scale);
  ctx.fillStyle = INK_SOFT;
  ctx.font = `${Math.round(12 * scale)}px "IBM Plex Mono", Consolas, monospace`;
  const mid = `${meta.dateLabel}  ·  ${meta.precisionLabel}`;
  ctx.fillText(mid, textX, textY, drawW - Math.round(28 * scale));

  textY += Math.round(18 * scale);
  ctx.font = `${Math.round(11 * scale)}px "Noto Sans SC", "Microsoft YaHei", sans-serif`;
  ctx.fillText(meta.footer ?? "长征·一条路的来处 · 示意还原，非逐日 GPS", textX, textY, drawW - Math.round(28 * scale));

  return out;
}

export function downloadCanvasPng(canvas: HTMLCanvasElement, filename: string): void {
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }, "image/png");
}
