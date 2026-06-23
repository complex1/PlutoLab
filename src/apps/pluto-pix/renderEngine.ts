import type { Adjustments, GradientFill, PixLayer, PixProject } from "./types";
import { FILTER_PRESETS } from "./constants";
import { drawSelectionHandles, getSelectionBounds } from "./selectionLogic";

const imageCache = new Map<string, HTMLImageElement>();

export function getCachedImage(src: string): HTMLImageElement | null {
  return imageCache.get(src) ?? null;
}

export async function preloadLayerImages(layers: PixLayer[]): Promise<void> {
  const srcs = new Set<string>();
  for (const l of layers) {
    if (l.type === "image") srcs.add(l.src);
    if (l.type === "background" && l.imageSrc) srcs.add(l.imageSrc);
    if (l.type === "watermark" && l.imageSrc) srcs.add(l.imageSrc);
    if (l.type === "sticker" && !l.isEmoji) srcs.add(l.content);
  }
  await Promise.allSettled(
    [...srcs].map(async (src) => {
      if (imageCache.has(src)) return;
      const img = new Image();
      img.crossOrigin = "anonymous";
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
        img.src = src;
      });
      imageCache.set(src, img);
    })
  );
}

export function adjustmentsToCss(adj: Adjustments, filterId: string | null): string {
  const temp = adj.temperature > 0 ? `sepia(${adj.temperature * 0.3}%)` : "";
  const parts = [
    `brightness(${adj.brightness * (adj.exposure / 100)}%)`,
    `contrast(${adj.contrast * (adj.gamma / 100)}%)`,
    `saturate(${adj.saturation * (adj.vibrance / 100)}%)`,
    `hue-rotate(${adj.hue + adj.temperature * 0.5}deg)`,
    adj.blur > 0 ? `blur(${adj.blur}px)` : "",
    temp,
    `opacity(${adj.opacity / 100})`,
  ];
  const preset = FILTER_PRESETS.find((f) => f.id === filterId);
  if (preset && preset.css !== "none") parts.push(preset.css);
  return parts.filter(Boolean).join(" ");
}

function fillBackground(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  background: string,
  gradient?: GradientFill | null
) {
  if (background === "transparent" && !gradient) {
    ctx.clearRect(0, 0, w, h);
    return;
  }
  if (gradient) {
    const g =
      gradient.kind === "linear"
        ? ctx.createLinearGradient(0, 0, w, h)
        : ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) / 2);
    gradient.colors.forEach((c, i) => {
      g.addColorStop(i / Math.max(1, gradient.colors.length - 1), c);
    });
    ctx.fillStyle = g;
  } else {
    ctx.fillStyle = background;
  }
  ctx.fillRect(0, 0, w, h);
}

export function renderProjectToCanvas(
  canvas: HTMLCanvasElement,
  project: PixProject,
  options?: {
    selectedIds?: string[];
    cropOverlay?: { x: number; y: number; width: number; height: number } | null;
    zoom?: number;
    layerIds?: string[];
  }
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const { canvasWidth, canvasHeight, background, layers } = project;
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;

  fillBackground(ctx, canvasWidth, canvasHeight, background, project.backgroundGradient);

  const toRender = options?.layerIds
    ? layers.filter((l) => options.layerIds!.includes(l.id))
    : layers;

  for (const layer of toRender) {
    if (!layer.visible) continue;
    drawLayer(ctx, layer, canvasWidth, canvasHeight);
  }

  if (options?.cropOverlay) {
    const c = options.cropOverlay;
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    ctx.clearRect(c.x, c.y, c.width, c.height);
    ctx.strokeStyle = "#6b9fff";
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.strokeRect(c.x, c.y, c.width, c.height);
    ctx.restore();
  }

  if (options?.selectedIds?.length) {
    const selected = layers.filter((l) => options.selectedIds!.includes(l.id));
    const bounds = getSelectionBounds(selected);
    if (bounds) drawSelectionHandles(ctx, bounds, options.zoom ?? 1);
  }
}

function applyMask(ctx: CanvasRenderingContext2D, layer: PixLayer) {
  if (!layer.mask) return;
  const m = layer.mask;
  ctx.beginPath();
  if (m.kind === "circle") {
    ctx.ellipse(m.x + m.width / 2, m.y + m.height / 2, m.width / 2, m.height / 2, 0, 0, Math.PI * 2);
  } else {
    ctx.rect(m.x, m.y, m.width, m.height);
  }
  if (m.inverted) ctx.globalCompositeOperation = "destination-out";
  else ctx.clip();
}

function drawLayer(
  ctx: CanvasRenderingContext2D,
  layer: PixLayer,
  canvasW: number,
  canvasH: number
) {
  ctx.save();
  ctx.globalAlpha = layer.opacity / 100;
  const cx = layer.x + layer.width / 2;
  const cy = layer.y + layer.height / 2;
  ctx.translate(cx, cy);
  ctx.rotate((layer.rotation * Math.PI) / 180);
  ctx.scale(layer.flipH ? -1 : 1, layer.flipV ? -1 : 1);
  ctx.translate(-cx, -cy);

  if (layer.mask) applyMask(ctx, layer);

  switch (layer.type) {
    case "background": {
      if (layer.imageSrc) {
        const img = imageCache.get(layer.imageSrc);
        if (img) ctx.drawImage(img, layer.x, layer.y, layer.width, layer.height);
      } else if (layer.gradient) {
        fillBackground(ctx, layer.width, layer.height, layer.fill, layer.gradient);
        ctx.translate(layer.x, layer.y);
      } else {
        ctx.fillStyle = layer.fill;
        ctx.fillRect(layer.x, layer.y, layer.width, layer.height);
      }
      break;
    }
    case "image": {
      const img = imageCache.get(layer.src);
      if (!img) break;
      const frame = layer.frame;
      const pad = frame?.width ?? 0;
      ctx.filter = adjustmentsToCss(layer.adjustments, layer.filterId);
      if (frame?.shadow) {
        ctx.shadowColor = "rgba(0,0,0,0.4)";
        ctx.shadowBlur = 12;
        ctx.shadowOffsetY = 4;
      }
      if (frame?.preset === "polaroid") {
        ctx.fillStyle = "#fff";
        ctx.fillRect(layer.x - 12, layer.y - 12, layer.width + 24, layer.height + 48);
        ctx.shadowBlur = 0;
      }
      if (frame?.radius) {
        roundRect(ctx, layer.x - pad, layer.y - pad, layer.width + pad * 2, layer.height + pad * 2, frame.radius);
        ctx.clip();
      }
      ctx.drawImage(img, layer.x, layer.y, layer.width, layer.height);
      ctx.filter = "none";
      ctx.shadowBlur = 0;
      if (pad > 0 && frame) {
        ctx.strokeStyle = frame.color;
        ctx.lineWidth = pad;
        ctx.strokeRect(layer.x - pad / 2, layer.y - pad / 2, layer.width + pad, layer.height + pad);
      }
      break;
    }
    case "text": {
      const weight = layer.bold ? "bold" : "normal";
      const style = layer.italic ? "italic" : "normal";
      ctx.font = `${style} ${weight} ${layer.fontSize}px ${layer.fontFamily}`;
      ctx.fillStyle = layer.color;
      ctx.textAlign = layer.align;
      ctx.textBaseline = "top";
      if (layer.letterSpacing) (ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = `${layer.letterSpacing}px`;
      if (layer.shadow) {
        ctx.shadowColor = "rgba(0,0,0,0.5)";
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
      }
      const lines = layer.text.split("\n");
      lines.forEach((line, i) => {
        const ly = layer.y + i * layer.fontSize * layer.lineHeight;
        if (layer.outline) {
          ctx.strokeStyle = "#000";
          ctx.lineWidth = 2;
          ctx.strokeText(line, layer.x, ly);
        }
        if (layer.underline) {
          const w = ctx.measureText(line).width;
          ctx.fillRect(layer.x, ly + layer.fontSize + 2, w, 2);
        }
        ctx.fillText(line, layer.x, ly);
      });
      break;
    }
    case "shape":
      drawShape(ctx, layer);
      break;
    case "drawing":
      drawStrokes(ctx, layer);
      break;
    case "sticker": {
      if (layer.isEmoji) {
        ctx.font = `${layer.height}px "Segoe UI Emoji", "Apple Color Emoji", sans-serif`;
        ctx.textBaseline = "top";
        ctx.fillText(layer.content, layer.x, layer.y);
      } else {
        const img = imageCache.get(layer.content);
        if (img) ctx.drawImage(img, layer.x, layer.y, layer.width, layer.height);
      }
      break;
    }
    case "watermark": {
      ctx.globalAlpha = layer.opacity / 100;
      if (layer.imageSrc) {
        const img = imageCache.get(layer.imageSrc);
        if (img) {
          if (layer.repeat) {
            for (let y = 0; y < canvasH; y += layer.tileSpacing) {
              for (let x = 0; x < canvasW; x += layer.tileSpacing) {
                ctx.drawImage(img, x, y, layer.width, layer.height);
              }
            }
          } else {
            ctx.drawImage(img, layer.x, layer.y, layer.width, layer.height);
          }
        }
      } else {
        ctx.font = `bold ${layer.height}px Impact, sans-serif`;
        ctx.fillStyle = "rgba(255,255,255,0.5)";
        ctx.strokeStyle = "rgba(0,0,0,0.3)";
        ctx.lineWidth = 1;
        if (layer.repeat) {
          for (let y = 0; y < canvasH; y += layer.tileSpacing) {
            for (let x = 0; x < canvasW; x += layer.tileSpacing) {
              ctx.strokeText(layer.text, x, y);
              ctx.fillText(layer.text, x, y);
            }
          }
        } else {
          ctx.strokeText(layer.text, layer.x, layer.y);
          ctx.fillText(layer.text, layer.x, layer.y);
        }
      }
      break;
    }
  }
  ctx.restore();
}

function drawStrokes(ctx: CanvasRenderingContext2D, layer: Extract<PixLayer, { type: "drawing" }>) {
  ctx.save();
  for (const stroke of layer.strokes) {
    if (!stroke.points.length) continue;
    const isEraser = stroke.color === "eraser";
    ctx.globalCompositeOperation = isEraser ? "destination-out" : "source-over";
    ctx.strokeStyle = isEraser ? "rgba(0,0,0,1)" : stroke.color;
    ctx.fillStyle = ctx.strokeStyle;
    let size = stroke.size;
    let opacity = stroke.opacity;
    if (stroke.kind === "pencil") { size *= 0.6; opacity *= 0.8; }
    if (stroke.kind === "marker") { size *= 1.4; opacity *= 0.7; }
    if (stroke.kind === "highlighter") { size *= 2; opacity *= 0.35; }
    ctx.lineWidth = size;
    ctx.globalAlpha = (layer.opacity / 100) * (opacity / 100);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    if (stroke.soft || stroke.kind === "highlighter") ctx.shadowBlur = size * 0.35;
    if (stroke.dashed) ctx.setLineDash([size, size * 0.8]);
    if (stroke.points.length === 1) {
      ctx.beginPath();
      ctx.arc(stroke.points[0].x, stroke.points[0].y, size / 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.shadowBlur = 0;
  }
  ctx.globalCompositeOperation = "source-over";
  ctx.restore();
}

function drawShape(ctx: CanvasRenderingContext2D, layer: Extract<PixLayer, { type: "shape" }>) {
  ctx.fillStyle = layer.fill;
  ctx.strokeStyle = layer.stroke;
  ctx.lineWidth = layer.strokeWidth;
  if (layer.dashed) ctx.setLineDash([8, 6]);
  const { x, y, width: w, height: h, shape } = layer;

  switch (shape) {
    case "rect":
      ctx.fillRect(x, y, w, h);
      ctx.strokeRect(x, y, w, h);
      break;
    case "rounded-rect":
      roundRect(ctx, x, y, w, h, layer.cornerRadius);
      ctx.fill();
      ctx.stroke();
      break;
    case "circle":
    case "ellipse":
      ctx.beginPath();
      ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      break;
    case "triangle":
      ctx.beginPath();
      ctx.moveTo(x + w / 2, y);
      ctx.lineTo(x + w, y + h);
      ctx.lineTo(x, y + h);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    case "heart":
      drawHeart(ctx, x + w / 2, y + h / 2, w / 2);
      ctx.fill();
      ctx.stroke();
      break;
    case "speech-bubble":
      roundRect(ctx, x, y, w, h * 0.8, 12);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x + w * 0.2, y + h * 0.8);
      ctx.lineTo(x + w * 0.1, y + h);
      ctx.lineTo(x + w * 0.35, y + h * 0.8);
      ctx.fill();
      break;
    case "line":
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + w, y + h);
      ctx.stroke();
      break;
    case "arrow":
      ctx.beginPath();
      ctx.moveTo(x, y + h / 2);
      ctx.lineTo(x + w * 0.75, y + h / 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x + w * 0.75, y + h / 2);
      ctx.lineTo(x + w * 0.55, y + h * 0.25);
      ctx.lineTo(x + w * 0.55, y + h * 0.75);
      ctx.closePath();
      ctx.fill();
      break;
    case "star":
      drawStar(ctx, x + w / 2, y + h / 2, 5, w / 2, w / 4);
      ctx.fill();
      ctx.stroke();
      break;
  }
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, spikes: number, outer: number, inner: number) {
  let rot = (Math.PI / 2) * 3;
  const step = Math.PI / spikes;
  ctx.beginPath();
  ctx.moveTo(cx, cy - outer);
  for (let i = 0; i < spikes; i++) {
    ctx.lineTo(cx + Math.cos(rot) * outer, cy + Math.sin(rot) * outer);
    rot += step;
    ctx.lineTo(cx + Math.cos(rot) * inner, cy + Math.sin(rot) * inner);
    rot += step;
  }
  ctx.closePath();
}

function drawHeart(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) {
  ctx.beginPath();
  ctx.moveTo(cx, cy + size * 0.3);
  ctx.bezierCurveTo(cx, cy, cx - size, cy, cx - size, cy + size * 0.3);
  ctx.bezierCurveTo(cx - size, cy + size * 0.7, cx, cy + size * 0.9, cx, cy + size);
  ctx.bezierCurveTo(cx, cy + size * 0.9, cx + size, cy + size * 0.7, cx + size, cy + size * 0.3);
  ctx.bezierCurveTo(cx + size, cy, cx, cy, cx, cy + size * 0.3);
  ctx.closePath();
}

export function pickColorFromCanvas(canvas: HTMLCanvasElement, x: number, y: number): string | null {
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const px = Math.floor(x);
  const py = Math.floor(y);
  if (px < 0 || py < 0 || px >= canvas.width || py >= canvas.height) return null;
  const [r, g, b, a] = ctx.getImageData(px, py, 1, 1).data;
  if (a === 0) return null;
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

export function extractPalette(canvas: HTMLCanvasElement, count = 6): string[] {
  const ctx = canvas.getContext("2d");
  if (!ctx) return [];
  const { width, height } = canvas;
  const data = ctx.getImageData(0, 0, width, height).data;
  const buckets = new Map<string, number>();
  for (let i = 0; i < data.length; i += 16) {
    if (data[i + 3] < 128) continue;
    const r = Math.round(data[i] / 32) * 32;
    const g = Math.round(data[i + 1] / 32) * 32;
    const b = Math.round(data[i + 2] / 32) * 32;
    const key = `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
    buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }
  return [...buckets.entries()].sort((a, b) => b[1] - a[1]).slice(0, count).map(([c]) => c);
}
