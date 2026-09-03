// WCAG 2.2 对比度实测：解析 styles.css 的 :root 变量，对界面实际使用的前景/背景组合逐对计算。
// 文本：正文阈值 4.5:1；大字（≥24px，或 ≥18.66px 粗体）3:1。图形控件（拖动条、焦点环等）3:1。
// 用法：node scripts/contrast-audit.mjs   （有任何不达标组合时退出码 1）
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "src");
const css = readFileSync(join(root, "styles.css"), "utf8");

// ---- 解析 :root 变量（文件里有多个 :root 块，全部收集） ----
const vars = {};
for (const block of css.matchAll(/:root\s*\{([^}]*)\}/g)) {
  for (const m of block[1].matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)) {
    vars[m[1]] = m[2].trim();
  }
}

// ---- 颜色解析 ----
const hex2rgb = (hex) => {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  return [parseInt(full.slice(0, 2), 16), parseInt(full.slice(2, 4), 16), parseInt(full.slice(4, 6), 16), 1];
};

const parseColor = (spec) => {
  const value = spec.startsWith("--") ? vars[spec.slice(2)] : spec;
  if (value === undefined) throw new Error(`未定义的颜色: ${spec}`);
  const v = value.trim();
  if (v.startsWith("#")) return hex2rgb(v);
  const rgb = v.match(/rgba?\(([^)]+)\)/);
  if (rgb) {
    const parts = rgb[1].split(",").map((s) => parseFloat(s));
    return [parts[0], parts[1], parts[2], parts[3] ?? 1];
  }
  throw new Error(`无法解析的颜色: ${spec} → ${v}`);
};

const composite = (fg, bg) => {
  const a = fg[3];
  if (a >= 1) return fg;
  return [0, 1, 2].map((i) => fg[i] * a + bg[i] * (1 - a)).concat([1]);
};

const luminance = (rgb) => {
  const lin = rgb.map((c) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
};

const ratio = (fgSpec, bgSpec) => {
  const bg = parseColor(bgSpec);
  const fg = composite(parseColor(fgSpec), bg);
  const l1 = luminance(fg);
  const l2 = luminance(bg);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
};

// ---- 审计清单：[前景, 背景, 说明, 阈值] ----
const PAPER = "--paper";
const PANEL = "--paper-light";
const TERRAIN_DARK = "#b8ac98"; // 底图高海拔最暗色带（地名标签的实际落点）
const TERRAIN_MID = "#c9ba97";

const PAIRS = [
  ["--ink", PANEL, "正文与标题（面板底）", 4.5],
  ["--ink-soft", PANEL, "辅助小字 .fine / 标注（面板底）", 4.5],
  ["--ink-soft", PAPER, "chip 与按钮文字（纸面底）", 4.5],
  ["#484c46", PANEL, "顶栏口号 brand-sub", 4.5],
  ["--route-red", PANEL, "红色强调文字（选中节点、图例开关）", 4.5],
  ["--route-red-dark", PANEL, "深红强调文字", 4.5],
  ["--evidence-blue", PANEL, "史料蓝标签与链接", 4.5],
  ["--interp-ochre", PANEL, "解释赭标签 / 核心问题", 4.5],
  ["--interp-ochre", PAPER, "解释赭标签（纸面底）", 4.5],
  ["--recon-orange", PANEL, "还原橙标签 / chip-demo", 4.5],
  ["--disputed-violet", PANEL, "争议紫 chip 与尾声卡", 4.5],
  [PANEL, "--ink", "depth-switch 激活项（白字黑底）", 4.5],
  [PANEL, "--evidence-blue", "tool-btn.on 白字蓝底", 4.5],
  [PANEL, "--route-red", "primary-btn / node-no 白字红底", 4.5],
  [PANEL, "--route-red-dark", "mode-btn.active 白字深红底", 4.5],
  ["--ink", "rgba(216,163,157,0.18)", "cert-approximate（粉底黑字）", 4.5],
  // 地图标签：实际落在底图色带上，文字带纸色描边光晕
  ["#383c37", TERRAIN_DARK, "城市名标签（最暗地形带）", 4.5],
  ["#363a35", TERRAIN_MID, "次级地名标签", 4.5],
  ["#3f6a84", PANEL, "河流名标签（光晕底）", 4.5],
  ["#4d5145", "rgba(242,238,228,0.9)", "等高线数字（半透明纸底叠地形）", 4.5],
  // 图形控件 3:1
  ["#8f8878", PANEL, "底栏拖动条 grabber", 3],
  ["--route-red", PANEL, "路线红线 / 时间轴填充", 3],
  ["--evidence-blue", PANEL, "键盘焦点环", 3],
];

let failed = 0;
console.log("WCAG 2.2 对比度审计（styles.css）\n");
for (const [fg, bg, label, min] of PAIRS) {
  const r = ratio(fg, bg);
  const ok = r >= min;
  if (!ok) failed += 1;
  console.log(
    `${ok ? "通过" : "不达标"}  ${r.toFixed(2).padStart(5)} : 1  (需 ${min})  ${label}  [${fg} on ${bg}]`
  );
}
console.log(failed === 0 ? "\n全部达标。" : `\n${failed} 组不达标，请调整颜色后重跑。`);
process.exit(failed === 0 ? 0 : 1);
