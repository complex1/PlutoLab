import type { ExportFormat, HarmonyScheme, PaletteColor } from "./types";

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

export interface Hsl {
  h: number;
  s: number;
  l: number;
}

export function normalizeHex(hex: string): string {
  const raw = hex.trim().replace(/^#/, "");
  if (/^[0-9a-fA-F]{3}$/.test(raw)) {
    return `#${raw
      .split("")
      .map((c) => c + c)
      .join("")
      .toLowerCase()}`;
  }
  if (/^[0-9a-fA-F]{6}$/.test(raw)) {
    return `#${raw.toLowerCase()}`;
  }
  return "#000000";
}

export function parseHex(hex: string): Rgb | null {
  const normalized = normalizeHex(hex);
  const raw = normalized.slice(1);
  if (raw.length !== 6) return null;
  return {
    r: parseInt(raw.slice(0, 2), 16),
    g: parseInt(raw.slice(2, 4), 16),
    b: parseInt(raw.slice(4, 6), 16),
  };
}

export function toHex(r: number, g: number, b: number): string {
  return `#${[r, g, b]
    .map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, "0"))
    .join("")}`;
}

export function rgbToHsl(r: number, g: number, b: number): Hsl {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rn:
        h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
        break;
      case gn:
        h = ((bn - rn) / d + 2) / 6;
        break;
      default:
        h = ((rn - gn) / d + 4) / 6;
    }
  }

  return { h: h * 360, s: s * 100, l: l * 100 };
}

export function hslToRgb(h: number, s: number, l: number): Rgb {
  const sn = s / 100;
  const ln = l / 100;

  if (sn === 0) {
    const v = Math.round(ln * 255);
    return { r: v, g: v, b: v };
  }

  const hue2rgb = (p: number, q: number, t: number) => {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };

  const q = ln < 0.5 ? ln * (1 + sn) : ln + sn - ln * sn;
  const p = 2 * ln - q;
  const hn = h / 360;

  return {
    r: Math.round(hue2rgb(p, q, hn + 1 / 3) * 255),
    g: Math.round(hue2rgb(p, q, hn) * 255),
    b: Math.round(hue2rgb(p, q, hn - 1 / 3) * 255),
  };
}

export function hexToHsl(hex: string): Hsl | null {
  const rgb = parseHex(hex);
  if (!rgb) return null;
  return rgbToHsl(rgb.r, rgb.g, rgb.b);
}

export function hexToRgbString(hex: string): string {
  const rgb = parseHex(hex);
  if (!rgb) return "rgb(0, 0, 0)";
  return `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
}

export function hexToHslString(hex: string): string {
  const hsl = hexToHsl(hex);
  if (!hsl) return "hsl(0, 0%, 0%)";
  return `hsl(${Math.round(hsl.h)}, ${Math.round(hsl.s)}%, ${Math.round(hsl.l)}%)`;
}

function rotateHue(hex: string, degrees: number): string {
  const hsl = hexToHsl(hex);
  if (!hsl) return hex;
  const rgb = hslToRgb((hsl.h + degrees + 360) % 360, hsl.s, hsl.l);
  return toHex(rgb.r, rgb.g, rgb.b);
}

function adjustLightness(hex: string, lightness: number): string {
  const hsl = hexToHsl(hex);
  if (!hsl) return hex;
  const rgb = hslToRgb(hsl.h, hsl.s, Math.min(95, Math.max(5, lightness)));
  return toHex(rgb.r, rgb.g, rgb.b);
}

function adjustSaturation(hex: string, saturation: number): string {
  const hsl = hexToHsl(hex);
  if (!hsl) return hex;
  const rgb = hslToRgb(hsl.h, Math.min(100, Math.max(0, saturation)), hsl.l);
  return toHex(rgb.r, rgb.g, rgb.b);
}

export function generateHarmony(baseHex: string, scheme: HarmonyScheme, count = 5): string[] {
  const base = normalizeHex(baseHex);
  const unique = (colors: string[]) =>
    [...new Set(colors.map(normalizeHex))].slice(0, Math.max(count, 2));

  switch (scheme) {
    case "complementary":
      return unique([base, rotateHue(base, 180)]);
    case "analogous":
      return unique([
        rotateHue(base, -60),
        rotateHue(base, -30),
        base,
        rotateHue(base, 30),
        rotateHue(base, 60),
      ]);
    case "triadic":
      return unique([base, rotateHue(base, 120), rotateHue(base, 240)]);
    case "tetradic":
      return unique([base, rotateHue(base, 90), rotateHue(base, 180), rotateHue(base, 270)]);
    case "split-complementary":
      return unique([base, rotateHue(base, 150), rotateHue(base, 210)]);
    case "monochromatic":
      return unique([
        adjustSaturation(base, 90),
        adjustSaturation(base, 70),
        base,
        adjustLightness(base, 35),
        adjustLightness(base, 65),
        adjustLightness(base, 85),
      ]);
    case "shades":
      return unique([
        adjustLightness(base, 15),
        adjustLightness(base, 30),
        adjustLightness(base, 45),
        base,
        adjustLightness(base, 70),
        adjustLightness(base, 85),
      ]);
    default:
      return [base];
  }
}

export function pickColorFromImageData(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  x: number,
  y: number
): string | null {
  const px = Math.floor(x);
  const py = Math.floor(y);
  if (px < 0 || py < 0 || px >= width || py >= height) return null;
  const i = (py * width + px) * 4;
  const [r, g, b, a] = [data[i], data[i + 1], data[i + 2], data[i + 3]];
  if (a < 128) return null;
  return toHex(r, g, b);
}

export function extractPaletteFromImageData(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  count = 6
): string[] {
  const buckets = new Map<string, number>();

  for (let y = 0; y < height; y += 2) {
    for (let x = 0; x < width; x += 2) {
      const i = (y * width + x) * 4;
      const a = data[i + 3];
      if (a < 128) continue;
      const r = Math.round(data[i] / 24) * 24;
      const g = Math.round(data[i + 1] / 24) * 24;
      const b = Math.round(data[i + 2] / 24) * 24;
      const key = toHex(r, g, b);
      buckets.set(key, (buckets.get(key) ?? 0) + 1);
    }
  }

  const sorted = [...buckets.entries()].sort((a, b) => b[1] - a[1]).map(([hex]) => hex);

  const diverse: string[] = [];
  for (const hex of sorted) {
    if (diverse.length >= count) break;
    const hsl = hexToHsl(hex);
    if (!hsl) continue;
    const tooClose = diverse.some((existing) => {
      const eh = hexToHsl(existing);
      if (!eh) return false;
      const dh = Math.min(Math.abs(eh.h - hsl.h), 360 - Math.abs(eh.h - hsl.h));
      return dh < 18 && Math.abs(eh.l - hsl.l) < 12;
    });
    if (!tooClose) diverse.push(hex);
  }

  return diverse.length > 0 ? diverse : sorted.slice(0, count);
}

function relativeLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

export function getContrastRatio(hex1: string, hex2: string): number {
  const a = parseHex(hex1);
  const b = parseHex(hex2);
  if (!a || !b) return 1;
  const l1 = relativeLuminance(a.r, a.g, a.b);
  const l2 = relativeLuminance(b.r, b.g, b.b);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function varName(prefix: string, color: PaletteColor, index: number): string {
  const slug = color.label?.trim().toLowerCase().replace(/\s+/g, "-");
  return slug ? `${prefix}-${slug}` : `${prefix}-${index + 1}`;
}

export function formatExport(
  colors: PaletteColor[],
  format: ExportFormat,
  prefix = "color"
): string {
  if (colors.length === 0) return "";

  if (format === "tailwind") {
    return colors
      .map((c, i) => {
        const name = varName(prefix, c, i).replace(`${prefix}-`, "");
        return `"${name}": "${c.hex}",`;
      })
      .join("\n");
  }

  const lines = colors.map((c, i) => {
    const name = varName(prefix, c, i);
    if (format === "scss") return `$${name}: ${c.hex};`;
    return `  --${name}: ${c.hex};`;
  });

  if (format === "scss") return lines.join("\n");
  return `:root {\n${lines.join("\n")}\n}`;
}

export function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export function drawImageToCanvas(
  canvas: HTMLCanvasElement,
  img: HTMLImageElement,
  maxSize = 480
): { width: number; height: number } {
  const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
  const width = Math.max(1, Math.round(img.width * scale));
  const height = Math.max(1, Math.round(img.height * scale));
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return { width, height };
  ctx.clearRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);
  return { width, height };
}

export function isValidHex(input: string): boolean {
  return /^#?[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/.test(input.trim());
}

export function getReadableTextColor(hex: string): string {
  const rgb = parseHex(hex);
  if (!rgb) return "#ffffff";
  const lum = relativeLuminance(rgb.r, rgb.g, rgb.b);
  return lum > 0.45 ? "#111111" : "#ffffff";
}
