import type { Point } from "./canvasDraw";

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface SelectionTransform {
  cx: number;
  cy: number;
  width: number;
  height: number;
  rotation: number;
}

export interface FloatingSelection {
  piece: HTMLCanvasElement;
  transform: SelectionTransform;
  path: Point[];
}

export type TransformHandle =
  | "move"
  | "rotate"
  | "nw"
  | "ne"
  | "se"
  | "sw";

const HANDLE_RADIUS = 7;
const ROTATE_OFFSET = 28;

export function pathBounds(path: Point[]): Rect | null {
  if (path.length < 2) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of path) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  const w = maxX - minX;
  const h = maxY - minY;
  if (w < 2 || h < 2) return null;
  return { x: minX, y: minY, w, h };
}

function tracePath(ctx: CanvasRenderingContext2D, path: Point[], offsetX = 0, offsetY = 0) {
  if (path.length < 2) return;
  ctx.beginPath();
  ctx.moveTo(path[0].x - offsetX, path[0].y - offsetY);
  for (let i = 1; i < path.length; i++) {
    ctx.lineTo(path[i].x - offsetX, path[i].y - offsetY);
  }
  ctx.closePath();
}

export function extractAndCutLasso(
  source: HTMLCanvasElement,
  path: Point[],
  background: string,
  transparent: boolean
): FloatingSelection | null {
  if (path.length < 3) return null;
  const bounds = pathBounds(path);
  if (!bounds) return null;

  const piece = document.createElement("canvas");
  piece.width = Math.ceil(bounds.w);
  piece.height = Math.ceil(bounds.h);
  const pctx = piece.getContext("2d");
  const sctx = source.getContext("2d");
  if (!pctx || !sctx) return null;

  pctx.save();
  tracePath(pctx, path, bounds.x, bounds.y);
  pctx.clip();
  pctx.drawImage(source, -bounds.x, -bounds.y);
  pctx.restore();

  sctx.save();
  tracePath(sctx, path);
  if (transparent) {
    sctx.globalCompositeOperation = "destination-out";
    sctx.fillStyle = "rgba(0,0,0,1)";
    sctx.fill();
  } else {
    sctx.fillStyle = background;
    sctx.fill();
  }
  sctx.restore();

  return {
    piece,
    path: [...path],
    transform: {
      cx: bounds.x + bounds.w / 2,
      cy: bounds.y + bounds.h / 2,
      width: bounds.w,
      height: bounds.h,
      rotation: 0,
    },
  };
}

function localPoint(pt: Point, t: SelectionTransform): Point {
  const dx = pt.x - t.cx;
  const dy = pt.y - t.cy;
  const cos = Math.cos(-t.rotation);
  const sin = Math.sin(-t.rotation);
  return { x: dx * cos - dy * sin, y: dx * sin + dy * cos };
}

function worldPoint(local: Point, t: SelectionTransform): Point {
  const cos = Math.cos(t.rotation);
  const sin = Math.sin(t.rotation);
  return {
    x: t.cx + local.x * cos - local.y * sin,
    y: t.cy + local.x * sin + local.y * cos,
  };
}

function dist(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function cornerLocal(corner: TransformHandle, t: SelectionTransform): Point | null {
  const hw = t.width / 2;
  const hh = t.height / 2;
  switch (corner) {
    case "nw":
      return { x: -hw, y: -hh };
    case "ne":
      return { x: hw, y: -hh };
    case "se":
      return { x: hw, y: hh };
    case "sw":
      return { x: -hw, y: hh };
    default:
      return null;
  }
}

export function hitTestTransform(pt: Point, t: SelectionTransform): TransformHandle | null {
  const local = localPoint(pt, t);
  const hw = t.width / 2;
  const hh = t.height / 2;

  const rotateHandle = worldPoint({ x: 0, y: -hh - ROTATE_OFFSET }, t);
  if (dist(pt, rotateHandle) <= HANDLE_RADIUS + 2) return "rotate";

  const corners: TransformHandle[] = ["nw", "ne", "se", "sw"];
  for (const c of corners) {
    const corner = cornerLocal(c, t)!;
    const world = worldPoint(corner, t);
    if (dist(pt, world) <= HANDLE_RADIUS + 2) return c;
  }

  if (Math.abs(local.x) <= hw && Math.abs(local.y) <= hh) return "move";
  return null;
}

export function applyTransformDrag(
  handle: TransformHandle,
  startPt: Point,
  currentPt: Point,
  start: SelectionTransform
): SelectionTransform {
  if (handle === "move") {
    return {
      ...start,
      cx: start.cx + (currentPt.x - startPt.x),
      cy: start.cy + (currentPt.y - startPt.y),
    };
  }

  if (handle === "rotate") {
    const a0 = Math.atan2(startPt.y - start.cy, startPt.x - start.cx);
    const a1 = Math.atan2(currentPt.y - start.cy, currentPt.x - start.cx);
    return { ...start, rotation: start.rotation + (a1 - a0) };
  }

  const corner = cornerLocal(handle, start);
  if (!corner) return start;

  const opposite: Record<string, Point> = {
    nw: { x: start.width / 2, y: start.height / 2 },
    ne: { x: -start.width / 2, y: start.height / 2 },
    se: { x: -start.width / 2, y: -start.height / 2 },
    sw: { x: start.width / 2, y: -start.height / 2 },
  };

  const oppLocal = opposite[handle];
  const oppWorld = worldPoint(oppLocal, start);

  const dx = currentPt.x - oppWorld.x;
  const dy = currentPt.y - oppWorld.y;
  const cos = Math.cos(-start.rotation);
  const sin = Math.sin(-start.rotation);
  const localW = Math.abs(dx * cos - dy * sin);
  const localH = Math.abs(dx * sin + dy * cos);

  const width = Math.max(8, localW);
  const height = Math.max(8, localH);

  const newCx = (oppWorld.x + currentPt.x) / 2;
  const newCy = (oppWorld.y + currentPt.y) / 2;

  return {
    cx: newCx,
    cy: newCy,
    width,
    height,
    rotation: start.rotation,
  };
}

export function drawTransformedPiece(
  ctx: CanvasRenderingContext2D,
  piece: HTMLCanvasElement,
  t: SelectionTransform
) {
  ctx.save();
  ctx.translate(t.cx, t.cy);
  ctx.rotate(t.rotation);
  ctx.drawImage(piece, -t.width / 2, -t.height / 2, t.width, t.height);
  ctx.restore();
}

export function stampTransformedPiece(
  target: HTMLCanvasElement,
  piece: HTMLCanvasElement,
  t: SelectionTransform
) {
  const ctx = target.getContext("2d");
  if (!ctx) return;
  drawTransformedPiece(ctx, piece, t);
}

export function drawLassoPath(ctx: CanvasRenderingContext2D, path: Point[]) {
  if (path.length < 2) return;
  ctx.save();
  ctx.strokeStyle = "rgba(38, 128, 235, 0.95)";
  ctx.lineWidth = 1.5;
  ctx.setLineDash([5, 4]);
  ctx.beginPath();
  ctx.moveTo(path[0].x, path[0].y);
  for (let i = 1; i < path.length; i++) {
    ctx.lineTo(path[i].x, path[i].y);
  }
  if (path.length > 2) ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

export function drawTransformHandles(ctx: CanvasRenderingContext2D, t: SelectionTransform) {
  const hw = t.width / 2;
  const hh = t.height / 2;

  ctx.save();
  ctx.translate(t.cx, t.cy);
  ctx.rotate(t.rotation);

  ctx.strokeStyle = "rgba(38, 128, 235, 0.9)";
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 3]);
  ctx.strokeRect(-hw, -hh, t.width, t.height);
  ctx.setLineDash([]);

  ctx.strokeStyle = "rgba(38, 128, 235, 0.7)";
  ctx.beginPath();
  ctx.moveTo(0, -hh);
  ctx.lineTo(0, -hh - ROTATE_OFFSET);
  ctx.stroke();

  const rotateY = -hh - ROTATE_OFFSET;
  ctx.fillStyle = "#fff";
  ctx.strokeStyle = "rgba(38, 128, 235, 1)";
  ctx.lineWidth = 1.5;

  const handles: Point[] = [
    { x: -hw, y: -hh },
    { x: hw, y: -hh },
    { x: hw, y: hh },
    { x: -hw, y: hh },
    { x: 0, y: rotateY },
  ];

  for (const h of handles) {
    ctx.beginPath();
    ctx.arc(h.x, h.y, HANDLE_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  ctx.restore();
}

export function simplifyPath(path: Point[], minDist = 2): Point[] {
  if (path.length <= 2) return path;
  const out: Point[] = [path[0]];
  for (let i = 1; i < path.length; i++) {
    const last = out[out.length - 1];
    if (dist(last, path[i]) >= minDist) out.push(path[i]);
  }
  return out;
}
