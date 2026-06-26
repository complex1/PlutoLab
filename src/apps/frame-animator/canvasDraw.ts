import { strokeAlongPath } from "./brushTextures";
import {
  drawLassoPath,
  drawTransformHandles,
  drawTransformedPiece,
  type FloatingSelection,
} from "./lassoTransform";
import type { BrushSettings, DrawTool, GridSettings } from "./types";
import type { OnionLayer } from "./onionSkin";

export interface Point {
  x: number;
  y: number;
}

const imageCache = new Map<string, HTMLImageElement>();
const MAX_CACHE = 40;

function cacheImage(src: string, img: HTMLImageElement) {
  if (imageCache.size >= MAX_CACHE) {
    const first = imageCache.keys().next().value;
    if (first) imageCache.delete(first);
  }
  imageCache.set(src, img);
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  const cached = imageCache.get(src);
  if (cached?.complete) return Promise.resolve(cached);

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      cacheImage(src, img);
      resolve(img);
    };
    img.onerror = reject;
    img.src = src;
  });
}

function ensureCanvasSize(canvas: HTMLCanvasElement, width: number, height: number) {
  if (canvas.width !== width) canvas.width = width;
  if (canvas.height !== height) canvas.height = height;
}

async function drawTintedOnionLayer(
  ctx: CanvasRenderingContext2D,
  layer: OnionLayer,
  width: number,
  height: number,
  background: string,
  transparent: boolean
) {
  try {
    const img = await loadImage(layer.imageData);
    const off = document.createElement("canvas");
    off.width = width;
    off.height = height;
    const octx = off.getContext("2d");
    if (!octx) return;

    octx.drawImage(img, 0, 0, width, height);

    if (!transparent) {
      knockOutBackground(octx, width, height, background);
    }

    octx.globalCompositeOperation = "source-atop";
    octx.fillStyle = layer.tint;
    octx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.globalAlpha = layer.opacity;
    ctx.drawImage(off, 0, 0, width, height);
    ctx.restore();
  } catch {
    /* ignore broken onion frame */
  }
}

function knockOutBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  background: string
) {
  const bg = hexToRgb(background);
  if (!bg) return;
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  const threshold = 14;

  for (let i = 0; i < data.length; i += 4) {
    const dr = Math.abs(data[i] - bg.r);
    const dg = Math.abs(data[i + 1] - bg.g);
    const db = Math.abs(data[i + 2] - bg.b);
    if (dr <= threshold && dg <= threshold && db <= threshold) {
      data[i + 3] = 0;
    }
  }

  ctx.putImageData(imageData, 0, 0);
}

function hexToRgb(hex: string) {
  const raw = hex.replace("#", "");
  if (raw.length !== 6) return null;
  return {
    r: parseInt(raw.slice(0, 2), 16),
    g: parseInt(raw.slice(2, 4), 16),
    b: parseInt(raw.slice(4, 6), 16),
  };
}

function backgroundLuminance(background: string): number {
  const rgb = hexToRgb(background);
  if (!rgb) return 1;
  return (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
}

export function drawGridOverlay(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  grid: GridSettings,
  background: string
) {
  if (!grid.enabled) return;
  const lightBg = backgroundLuminance(background) > 0.55;
  const lineAlpha = Math.max(0.15, grid.opacity);

  ctx.save();
  ctx.lineWidth = 1;
  ctx.strokeStyle = lightBg
    ? `rgba(0, 0, 0, ${lineAlpha})`
    : `rgba(255, 255, 255, ${lineAlpha})`;

  const size = grid.size;

  for (let x = size; x < width; x += size) {
    ctx.beginPath();
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, height);
    ctx.stroke();
  }
  for (let y = size; y < height; y += size) {
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(width, y + 0.5);
    ctx.stroke();
  }

  ctx.strokeStyle = "rgba(38, 128, 235, 0.55)";
  ctx.beginPath();
  ctx.moveTo(width / 2 + 0.5, 0);
  ctx.lineTo(width / 2 + 0.5, height);
  ctx.moveTo(0, height / 2 + 0.5);
  ctx.lineTo(width, height / 2 + 0.5);
  ctx.stroke();

  ctx.restore();
}

/** Build onion skin layer only (transparent background). */
export async function buildOnionCanvas(
  onion: HTMLCanvasElement,
  width: number,
  height: number,
  onionLayers: OnionLayer[],
  background: string,
  transparent: boolean
) {
  ensureCanvasSize(onion, width, height);
  const ctx = onion.getContext("2d");
  if (!ctx) return;

  ctx.clearRect(0, 0, width, height);

  for (const layer of onionLayers) {
    await drawTintedOnionLayer(ctx, layer, width, height, background, transparent);
  }
}

export interface ViewOverlays {
  lassoPath?: Point[];
  floating?: FloatingSelection;
}

/** Composite: below layers → active layer → above layers → onion → floating → lasso → grid. */
export function compositeView(
  view: HTMLCanvasElement,
  below: HTMLCanvasElement,
  content: HTMLCanvasElement,
  above: HTMLCanvasElement,
  onion: HTMLCanvasElement,
  width: number,
  height: number,
  grid: GridSettings,
  background: string,
  overlays?: ViewOverlays,
  linePreview?: { from: Point; to: Point; brush: BrushSettings }
) {
  ensureCanvasSize(view, width, height);
  const ctx = view.getContext("2d");
  if (!ctx) return;

  ctx.clearRect(0, 0, width, height);
  ctx.drawImage(below, 0, 0, width, height);
  ctx.drawImage(content, 0, 0, width, height);
  ctx.drawImage(above, 0, 0, width, height);
  ctx.drawImage(onion, 0, 0, width, height);

  if (overlays?.floating) {
    drawTransformedPiece(ctx, overlays.floating.piece, overlays.floating.transform);
    drawTransformHandles(ctx, overlays.floating.transform);
  }

  if (overlays?.lassoPath?.length) {
    drawLassoPath(ctx, overlays.lassoPath);
  }

  drawGridOverlay(ctx, width, height, grid, background);

  if (linePreview) {
    drawLinePreview(ctx, linePreview.from, linePreview.to, linePreview.brush);
  }
}

export async function loadImageToCanvas(
  canvas: HTMLCanvasElement,
  imageData: string,
  width: number,
  height: number,
  background: string,
  transparent: boolean
) {
  ensureCanvasSize(canvas, width, height);
  clearCanvas(canvas, background, transparent);
  if (!imageData) return;
  try {
    const img = await loadImage(imageData);
    const ctx = canvas.getContext("2d");
    ctx?.drawImage(img, 0, 0, width, height);
  } catch {
    /* ignore */
  }
}

export function canvasToDataUrl(canvas: HTMLCanvasElement, quality = 0.92): string {
  return canvas.toDataURL("image/png", quality);
}

export function snapshotCanvas(canvas: HTMLCanvasElement): string {
  return canvas.toDataURL("image/png");
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function drawSmoothLine(
  ctx: CanvasRenderingContext2D,
  from: Point,
  to: Point,
  smoothing: number
) {
  const midX = lerp(from.x, to.x, 0.5);
  const midY = lerp(from.y, to.y, 0.5);
  const cpX = lerp(from.x, midX, smoothing);
  const cpY = lerp(from.y, midY, smoothing);
  ctx.quadraticCurveTo(cpX, cpY, to.x, to.y);
}

export function beginStroke(
  ctx: CanvasRenderingContext2D,
  tool: DrawTool,
  brush: BrushSettings,
  point: Point
) {
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = tool === "eraser" ? brush.size * 2 : brush.size;

  if (tool === "eraser") {
    ctx.globalCompositeOperation = "destination-out";
    ctx.strokeStyle = "rgba(0,0,0,1)";
  } else {
    ctx.globalCompositeOperation = "source-over";
    const a = brush.opacity;
    const rgb = hexToRgb(brush.color);
    ctx.strokeStyle = rgb ? `rgba(${rgb.r},${rgb.g},${rgb.b},${a})` : brush.color;
    ctx.fillStyle = ctx.strokeStyle;
  }

  if (tool === "brush" && brush.texture !== "solid") {
    return;
  }

  ctx.beginPath();
  ctx.moveTo(point.x, point.y);
}

export function continueStroke(
  ctx: CanvasRenderingContext2D,
  tool: DrawTool,
  brush: BrushSettings,
  from: Point,
  to: Point
) {
  if (tool === "brush" && brush.texture !== "solid") {
    const dist = Math.hypot(to.x - from.x, to.y - from.y);
    const steps = Math.max(1, Math.ceil(dist / Math.max(1, brush.size * 0.3)));
    strokeAlongPath(ctx, brush, from, to, steps);
    return;
  }

  drawSmoothLine(ctx, from, to, brush.smoothing);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(to.x, to.y);
}

export function endStroke(ctx: CanvasRenderingContext2D) {
  ctx.stroke();
  ctx.restore();
}

export function drawLine(
  ctx: CanvasRenderingContext2D,
  from: Point,
  to: Point,
  tool: DrawTool,
  brush: BrushSettings
) {
  beginStroke(ctx, tool, brush, from);
  if (tool === "brush" && brush.texture !== "solid") {
    const dist = Math.hypot(to.x - from.x, to.y - from.y);
    const steps = Math.max(1, Math.ceil(dist / Math.max(1, brush.size * 0.3)));
    strokeAlongPath(ctx, brush, from, to, steps);
    ctx.restore();
    return;
  }
  ctx.lineTo(to.x, to.y);
  endStroke(ctx);
}

export function drawLinePreview(
  ctx: CanvasRenderingContext2D,
  from: Point,
  to: Point,
  brush: BrushSettings
) {
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineWidth = brush.size;
  const rgb = hexToRgb(brush.color);
  ctx.strokeStyle = rgb
    ? `rgba(${rgb.r},${rgb.g},${rgb.b},${brush.opacity * 0.7})`
    : brush.color;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
  ctx.stroke();
  ctx.restore();
}

export function clearCanvas(
  canvas: HTMLCanvasElement,
  background: string,
  transparent: boolean
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const { width, height } = canvas;
  ctx.clearRect(0, 0, width, height);
  if (!transparent) {
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, width, height);
  }
}

export function screenToCanvas(
  canvas: HTMLCanvasElement,
  clientX: number,
  clientY: number
): Point {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  return {
    x: (clientX - rect.left) * scaleX,
    y: (clientY - rect.top) * scaleY,
  };
}

export function onionCacheKey(width: number, height: number, onionLayers: OnionLayer[]): string {
  const layerKey = onionLayers
    .map((l) => `${l.label}:${l.opacity}:${l.tint}:${l.imageData.length}:${l.imageData.slice(-48)}`)
    .join("|");
  return `${width}x${height}:${layerKey}`;
}
