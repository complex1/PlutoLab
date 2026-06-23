import type { AlignKind, DistributeKind, PixLayer, Point } from "./types";

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type ResizeHandle = "nw" | "ne" | "se" | "sw";
export type SelectionHandle = ResizeHandle | "rotate";

const HANDLE_RADIUS = 7;
const ROTATE_OFFSET = 28;

export function getLayerBounds(layer: PixLayer): Bounds {
  return { x: layer.x, y: layer.y, width: layer.width, height: layer.height };
}

export function getSelectionBounds(layers: PixLayer[]): Bounds | null {
  if (!layers.length) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const l of layers) {
    minX = Math.min(minX, l.x);
    minY = Math.min(minY, l.y);
    maxX = Math.max(maxX, l.x + l.width);
    maxY = Math.max(maxY, l.y + l.height);
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

export function getHandlePositions(bounds: Bounds): Record<SelectionHandle, Point> {
  const { x, y, width, height } = bounds;
  const cx = x + width / 2;
  return {
    nw: { x, y },
    ne: { x: x + width, y },
    se: { x: x + width, y: y + height },
    sw: { x, y: y + height },
    rotate: { x: cx, y: y - ROTATE_OFFSET },
  };
}

export function hitTestHandle(
  point: Point,
  bounds: Bounds,
  zoom: number
): SelectionHandle | null {
  const handles = getHandlePositions(bounds);
  const threshold = (HANDLE_RADIUS + 2) / zoom;

  const rotate = handles.rotate;
  if (Math.hypot(point.x - rotate.x, point.y - rotate.y) <= threshold) return "rotate";

  for (const id of ["nw", "ne", "se", "sw"] as ResizeHandle[]) {
    const h = handles[id];
    if (Math.hypot(point.x - h.x, point.y - h.y) <= threshold) return id;
  }
  return null;
}

export function snapPoint(point: Point, grid: number, enabled: boolean): Point {
  if (!enabled || grid <= 0) return point;
  return {
    x: Math.round(point.x / grid) * grid,
    y: Math.round(point.y / grid) * grid,
  };
}

export function alignLayers(layers: PixLayer[], kind: AlignKind, canvasW: number, canvasH: number): PixLayer[] {
  const bounds = getSelectionBounds(layers);
  if (!bounds) return layers;
  const ids = new Set(layers.map((l) => l.id));

  return layers.map((l) => {
    if (!ids.has(l.id)) return l;
    let x = l.x;
    let y = l.y;
    if (kind === "left") x = bounds.x;
    if (kind === "center") x = bounds.x + bounds.width / 2 - l.width / 2;
    if (kind === "right") x = bounds.x + bounds.width - l.width;
    if (kind === "top") y = bounds.y;
    if (kind === "middle") y = bounds.y + bounds.height / 2 - l.height / 2;
    if (kind === "bottom") y = bounds.y + bounds.height - l.height;
    if (kind === "left" && layers.length === 1) x = 0;
    if (kind === "center" && layers.length === 1) x = (canvasW - l.width) / 2;
    if (kind === "right" && layers.length === 1) x = canvasW - l.width;
    if (kind === "top" && layers.length === 1) y = 0;
    if (kind === "middle" && layers.length === 1) y = (canvasH - l.height) / 2;
    if (kind === "bottom" && layers.length === 1) y = canvasH - l.height;
    return { ...l, x, y };
  });
}

export function distributeLayers(layers: PixLayer[], kind: DistributeKind): PixLayer[] {
  if (layers.length < 3) return layers;
  const sorted = [...layers].sort((a, b) => (kind === "horizontal" ? a.x - b.x : a.y - b.y));
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const total = kind === "horizontal"
    ? last.x + last.width - first.x
    : last.y + last.height - first.y;
  const sizes = sorted.reduce((s, l) => s + (kind === "horizontal" ? l.width : l.height), 0);
  const gap = (total - sizes) / (sorted.length - 1);
  let pos = kind === "horizontal" ? first.x : first.y;
  const positions = new Map<string, { x: number; y: number }>();

  for (const l of sorted) {
    positions.set(l.id, kind === "horizontal" ? { x: pos, y: l.y } : { x: l.x, y: pos });
    pos += (kind === "horizontal" ? l.width : l.height) + gap;
  }

  return layers.map((l) => {
    const p = positions.get(l.id);
    return p ? { ...l, ...p } : l;
  });
}

export function resizeLayersFromHandle(
  layers: PixLayer[],
  snapshots: PixLayer[],
  bounds: Bounds,
  handle: ResizeHandle,
  pointer: Point,
  uniform: boolean
): PixLayer[] {
  const anchor = getAnchor(bounds, handle);
  let scaleX = 1;
  let scaleY = 1;

  if (handle === "se") {
    scaleX = bounds.width ? (pointer.x - anchor.x) / bounds.width : 1;
    scaleY = bounds.height ? (pointer.y - anchor.y) / bounds.height : 1;
  } else if (handle === "nw") {
    scaleX = bounds.width ? (anchor.x - pointer.x) / bounds.width : 1;
    scaleY = bounds.height ? (anchor.y - pointer.y) / bounds.height : 1;
  } else if (handle === "ne") {
    scaleX = bounds.width ? (pointer.x - anchor.x) / bounds.width : 1;
    scaleY = bounds.height ? (anchor.y - pointer.y) / bounds.height : 1;
  } else {
    scaleX = bounds.width ? (anchor.x - pointer.x) / bounds.width : 1;
    scaleY = bounds.height ? (pointer.y - anchor.y) / bounds.height : 1;
  }

  if (uniform) {
    const s = Math.max(Math.abs(scaleX), Math.abs(scaleY)) * Math.sign(scaleX || 1);
    scaleX = s;
    scaleY = s;
  }
  scaleX = Math.max(0.05, scaleX);
  scaleY = Math.max(0.05, scaleY);

  const snapIds = new Set(snapshots.map((l) => l.id));
  return layers.map((l) => {
    if (!snapIds.has(l.id)) return l;
    const snap = snapshots.find((s) => s.id === l.id)!;
    return {
      ...snap,
      x: anchor.x + (snap.x - anchor.x) * scaleX,
      y: anchor.y + (snap.y - anchor.y) * scaleY,
      width: snap.width * scaleX,
      height: snap.height * scaleY,
      ...(snap.type === "text" ? { fontSize: snap.fontSize * Math.max(scaleX, scaleY) } : {}),
    } as PixLayer;
  });
}

function getAnchor(bounds: Bounds, handle: ResizeHandle): Point {
  switch (handle) {
    case "nw":
      return { x: bounds.x + bounds.width, y: bounds.y + bounds.height };
    case "ne":
      return { x: bounds.x, y: bounds.y + bounds.height };
    case "se":
      return { x: bounds.x, y: bounds.y };
    case "sw":
      return { x: bounds.x + bounds.width, y: bounds.y };
  }
}

export function rotateLayers(
  layers: PixLayer[],
  snapshots: PixLayer[],
  center: Point,
  deltaDeg: number
): PixLayer[] {
  const rad = (deltaDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const snapIds = new Set(snapshots.map((l) => l.id));

  return layers.map((l) => {
    if (!snapIds.has(l.id)) return l;
    const snap = snapshots.find((s) => s.id === l.id)!;
    const cx = snap.x + snap.width / 2;
    const cy = snap.y + snap.height / 2;
    const dx = cx - center.x;
    const dy = cy - center.y;
    const ncx = center.x + dx * cos - dy * sin;
    const ncy = center.y + dx * sin + dy * cos;
    return {
      ...snap,
      x: ncx - snap.width / 2,
      y: ncy - snap.height / 2,
      rotation: snap.rotation + deltaDeg,
    };
  });
}

export function drawSelectionHandles(
  ctx: CanvasRenderingContext2D,
  bounds: Bounds,
  zoom: number
) {
  const pad = 4 / zoom;
  const x = bounds.x - pad;
  const y = bounds.y - pad;
  const w = bounds.width + pad * 2;
  const h = bounds.height + pad * 2;

  ctx.save();
  ctx.strokeStyle = "#6b9fff";
  ctx.lineWidth = 1.5 / zoom;
  ctx.setLineDash([4 / zoom, 4 / zoom]);
  ctx.strokeRect(x, y, w, h);
  ctx.setLineDash([]);

  const handles = getHandlePositions({ x, y, width: w, height: h });
  const drawDot = (p: Point) => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, HANDLE_RADIUS / zoom, 0, Math.PI * 2);
    ctx.fillStyle = "#6b9fff";
    ctx.fill();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 1 / zoom;
    ctx.stroke();
  };

  (["nw", "ne", "se", "sw"] as ResizeHandle[]).forEach((k) => drawDot(handles[k]));
  ctx.beginPath();
  ctx.moveTo(handles.nw.x + w / 2, y);
  ctx.lineTo(handles.rotate.x, handles.rotate.y);
  ctx.strokeStyle = "#6b9fff";
  ctx.stroke();
  drawDot(handles.rotate);
  ctx.restore();
}

export function complementaryColor(hex: string): string {
  const h = hex.replace("#", "");
  const r = 255 - parseInt(h.slice(0, 2), 16);
  const g = 255 - parseInt(h.slice(2, 4), 16);
  const b = 255 - parseInt(h.slice(4, 6), 16);
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}
