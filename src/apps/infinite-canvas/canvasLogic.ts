import type {
  Camera,
  CanvasElement,
  DraftShape,
  Point,
} from "./canvasTypes";
import { ERASER_RADIUS } from "./canvasTypes";
import {
  getElementBounds,
  getElementCenter,
  getElementRotation,
  pointInRotatedElement,
} from "./selectionLogic";

export { getElementBounds } from "./selectionLogic";

export function screenToWorld(
  screenX: number,
  screenY: number,
  camera: Camera,
  canvasRect: DOMRect
): Point {
  const cx = canvasRect.width / 2;
  const cy = canvasRect.height / 2;
  return {
    x: (screenX - canvasRect.left - cx) / camera.zoom + camera.x,
    y: (screenY - canvasRect.top - cy) / camera.zoom + camera.y,
  };
}

export function worldToScreen(
  worldX: number,
  worldY: number,
  camera: Camera,
  canvasRect: DOMRect
): Point {
  const cx = canvasRect.width / 2;
  const cy = canvasRect.height / 2;
  return {
    x: (worldX - camera.x) * camera.zoom + cx + canvasRect.left,
    y: (worldY - camera.y) * camera.zoom + cy + canvasRect.top,
  };
}

export function normalizeRect(x1: number, y1: number, x2: number, y2: number) {
  return {
    x: Math.min(x1, x2),
    y: Math.min(y1, y2),
    width: Math.abs(x2 - x1),
    height: Math.abs(y2 - y1),
  };
}

export function hitTestElement(element: CanvasElement, point: Point): boolean {
  return pointInRotatedElement(element, point);
}

export function eraseAtPoint(
  elements: CanvasElement[],
  point: Point,
  radius = ERASER_RADIUS
): CanvasElement[] {
  return elements.filter((el) => !elementIntersectsCircle(el, point, radius));
}

function elementIntersectsCircle(
  element: CanvasElement,
  center: Point,
  radius: number
): boolean {
  const bounds = getElementBounds(element);
  if (!bounds) return false;
  const closestX = Math.max(bounds.x, Math.min(center.x, bounds.x + bounds.width));
  const closestY = Math.max(bounds.y, Math.min(center.y, bounds.y + bounds.height));
  return distance({ x: closestX, y: closestY }, center) <= radius;
}

function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function drawGrid(
  ctx: CanvasRenderingContext2D,
  camera: Camera,
  width: number,
  height: number
) {
  const step = camera.zoom >= 0.5 ? 50 : camera.zoom >= 0.25 ? 100 : 200;
  const cx = width / 2;
  const cy = height / 2;

  const left = camera.x - cx / camera.zoom;
  const top = camera.y - cy / camera.zoom;
  const right = camera.x + cx / camera.zoom;
  const bottom = camera.y + cy / camera.zoom;

  const startX = Math.floor(left / step) * step;
  const startY = Math.floor(top / step) * step;

  ctx.strokeStyle = "rgba(255,255,255,0.04)";
  ctx.lineWidth = 1;

  for (let x = startX; x <= right; x += step) {
    const sx = (x - camera.x) * camera.zoom + cx;
    ctx.beginPath();
    ctx.moveTo(sx, 0);
    ctx.lineTo(sx, height);
    ctx.stroke();
  }

  for (let y = startY; y <= bottom; y += step) {
    const sy = (y - camera.y) * camera.zoom + cy;
    ctx.beginPath();
    ctx.moveTo(0, sy);
    ctx.lineTo(width, sy);
    ctx.stroke();
  }

  const ox = (0 - camera.x) * camera.zoom + cx;
  const oy = (0 - camera.y) * camera.zoom + cy;
  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.beginPath();
  ctx.moveTo(ox, 0);
  ctx.lineTo(ox, height);
  ctx.moveTo(0, oy);
  ctx.lineTo(width, oy);
  ctx.stroke();
}

export function drawElement(
  ctx: CanvasRenderingContext2D,
  element: CanvasElement,
  camera: Camera,
  width: number,
  height: number,
  imageCache: Map<string, HTMLImageElement>
) {
  const cx = width / 2;
  const cy = height / 2;

  const toScreen = (wx: number, wy: number) => ({
    x: (wx - camera.x) * camera.zoom + cx,
    y: (wy - camera.y) * camera.zoom + cy,
  });

  const rotation = getElementRotation(element);
  const center = getElementCenter(element);
  const screenCenter = toScreen(center.x, center.y);

  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  if (rotation !== 0 && element.type !== "path") {
    ctx.translate(screenCenter.x, screenCenter.y);
    ctx.rotate(rotation);
    ctx.translate(-screenCenter.x, -screenCenter.y);
  }

  switch (element.type) {
    case "path": {
      if (element.points.length < 2) break;
      ctx.strokeStyle = element.color;
      ctx.lineWidth = element.width * camera.zoom;
      ctx.beginPath();
      const first = toScreen(element.points[0].x, element.points[0].y);
      ctx.moveTo(first.x, first.y);
      for (let i = 1; i < element.points.length; i++) {
        const p = toScreen(element.points[i].x, element.points[i].y);
        ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
      break;
    }
    case "rect": {
      const tl = toScreen(element.x, element.y);
      ctx.fillStyle = element.fill;
      ctx.strokeStyle = element.stroke;
      ctx.lineWidth = element.strokeWidth * camera.zoom;
      ctx.fillRect(tl.x, tl.y, element.width * camera.zoom, element.height * camera.zoom);
      ctx.strokeRect(tl.x, tl.y, element.width * camera.zoom, element.height * camera.zoom);
      break;
    }
    case "ellipse": {
      const tl = toScreen(element.x, element.y);
      const w = element.width * camera.zoom;
      const h = element.height * camera.zoom;
      ctx.fillStyle = element.fill;
      ctx.strokeStyle = element.stroke;
      ctx.lineWidth = element.strokeWidth * camera.zoom;
      ctx.beginPath();
      ctx.ellipse(tl.x + w / 2, tl.y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      break;
    }
    case "text": {
      const p = toScreen(element.x, element.y);
      ctx.fillStyle = element.color;
      ctx.font = `${element.fontSize * camera.zoom}px Inter, system-ui, sans-serif`;
      ctx.fillText(element.text, p.x, p.y);
      break;
    }
    case "image": {
      const img = imageCache.get(element.src);
      if (!img?.complete) break;
      const tl = toScreen(element.x, element.y);
      ctx.drawImage(
        img,
        tl.x,
        tl.y,
        element.width * camera.zoom,
        element.height * camera.zoom
      );
      break;
    }
  }

  ctx.restore();
}

export function drawDraftShape(
  ctx: CanvasRenderingContext2D,
  draft: DraftShape,
  camera: Camera,
  width: number,
  height: number,
  stroke: string,
  fill: string
) {
  const cx = width / 2;
  const cy = height / 2;
  const tl = {
    x: (draft.x - camera.x) * camera.zoom + cx,
    y: (draft.y - camera.y) * camera.zoom + cy,
  };
  const w = draft.width * camera.zoom;
  const h = draft.height * camera.zoom;

  ctx.save();
  ctx.strokeStyle = stroke;
  ctx.fillStyle = fill;
  ctx.lineWidth = 2 * camera.zoom;
  ctx.setLineDash([6, 4]);

  if (draft.type === "rect") {
    ctx.fillRect(tl.x, tl.y, w, h);
    ctx.strokeRect(tl.x, tl.y, w, h);
  } else {
    ctx.beginPath();
    ctx.ellipse(tl.x + w / 2, tl.y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  ctx.restore();
}

import { idbGetJson, idbSet } from "../../storage/indexedDb";

const STORAGE_KEY = "infinite-canvas:document";

export async function loadDocument(): Promise<CanvasElement[]> {
  const parsed = await idbGetJson<CanvasElement[]>(STORAGE_KEY, []);
  return Array.isArray(parsed) ? parsed : [];
}

export async function saveDocument(elements: CanvasElement[]): Promise<void> {
  await idbSet(STORAGE_KEY, elements);
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export interface ContentBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

export function getContentBounds(
  elements: CanvasElement[],
  padding = 24
): ContentBounds | null {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const el of elements) {
    const bounds = getElementBounds(el);
    if (!bounds) continue;
    const pad = el.type === "path" ? el.width / 2 : 0;
    minX = Math.min(minX, bounds.x - pad);
    minY = Math.min(minY, bounds.y - pad);
    maxX = Math.max(maxX, bounds.x + bounds.width + pad);
    maxY = Math.max(maxY, bounds.y + bounds.height + pad);
  }

  if (!Number.isFinite(minX)) return null;

  return {
    minX: minX - padding,
    minY: minY - padding,
    maxX: maxX + padding,
    maxY: maxY + padding,
    width: maxX - minX + padding * 2,
    height: maxY - minY + padding * 2,
  };
}

export function renderContentSnapshot(
  elements: CanvasElement[],
  imageCache: Map<string, HTMLImageElement>,
  padding = 24
): HTMLCanvasElement | null {
  const bounds = getContentBounds(elements, padding);
  if (!bounds || bounds.width <= 0 || bounds.height <= 0) return null;

  const scale = 2;
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(bounds.width * scale);
  canvas.height = Math.ceil(bounds.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.scale(scale, scale);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, bounds.width, bounds.height);

  const camera: Camera = {
    x: (bounds.minX + bounds.maxX) / 2,
    y: (bounds.minY + bounds.maxY) / 2,
    zoom: 1,
  };

  for (const el of elements) {
    drawElement(ctx, el, camera, bounds.width, bounds.height, imageCache);
  }

  return canvas;
}

export function downloadContentSnapshot(
  elements: CanvasElement[],
  imageCache: Map<string, HTMLImageElement>,
  filename = "canvas-export.png"
): boolean {
  const canvas = renderContentSnapshot(elements, imageCache);
  if (!canvas) return false;

  const link = document.createElement("a");
  link.href = canvas.toDataURL("image/png");
  link.download = filename;
  link.click();
  return true;
}
