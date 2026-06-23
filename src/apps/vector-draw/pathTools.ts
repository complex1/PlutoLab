import type { BezierPoint, PathKind, PathLayer, Point } from "./types";

export function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function mirrorHandle(anchor: Point, handle: Point): Point {
  return {
    x: anchor.x + (anchor.x - handle.x),
    y: anchor.y + (anchor.y - handle.y),
  };
}

export function simplifyPoints(points: Point[], tolerance = 2): Point[] {
  if (points.length <= 2) return points;
  const result: Point[] = [points[0]];
  for (let i = 1; i < points.length - 1; i++) {
    const prev = result[result.length - 1];
    if (distance(prev, points[i]) >= tolerance) result.push(points[i]);
  }
  result.push(points[points.length - 1]);
  return result;
}

function perpendicularDistance(point: Point, lineStart: Point, lineEnd: Point): number {
  const dx = lineEnd.x - lineStart.x;
  const dy = lineEnd.y - lineStart.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return distance(point, lineStart);
  const t = Math.max(0, Math.min(1, ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / lenSq));
  return distance(point, { x: lineStart.x + t * dx, y: lineStart.y + t * dy });
}

function rdpSimplifySegment(points: Point[], tolerance: number): Point[] {
  if (points.length <= 2) return points;

  let maxDist = 0;
  let maxIndex = 0;
  const end = points.length - 1;

  for (let i = 1; i < end; i++) {
    const d = perpendicularDistance(points[i], points[0], points[end]);
    if (d > maxDist) {
      maxDist = d;
      maxIndex = i;
    }
  }

  if (maxDist > tolerance) {
    const left = rdpSimplifySegment(points.slice(0, maxIndex + 1), tolerance);
    const right = rdpSimplifySegment(points.slice(maxIndex), tolerance);
    return [...left.slice(0, -1), ...right];
  }

  return [points[0], points[end]];
}

export function rdpSimplify(points: Point[], tolerance: number): Point[] {
  if (points.length <= 2) return points;
  return rdpSimplifySegment(points, tolerance);
}

function hasSignificantHandles(p: BezierPoint, minDist = 0.5): boolean {
  const inDist = p.handleIn ? distance(p, p.handleIn) : 0;
  const outDist = p.handleOut ? distance(p, p.handleOut) : 0;
  return inDist > minDist || outDist > minDist;
}

export function optimizePenAnchors(points: BezierPoint[], tolerance = 2.5): BezierPoint[] {
  if (points.length <= 2) return points;

  const kept: BezierPoint[] = [points[0]];
  for (let i = 1; i < points.length - 1; i++) {
    const p = points[i];
    if (hasSignificantHandles(p)) {
      kept.push(p);
      continue;
    }
    const prev = kept[kept.length - 1];
    const next = points[i + 1];
    if (perpendicularDistance(p, prev, next) >= tolerance) {
      kept.push(p);
    }
  }
  kept.push(points[points.length - 1]);
  return kept;
}

export function optimizePathPoints(
  points: BezierPoint[],
  pathKind: PathKind,
  options: { brushSmoothing?: number } = {}
): BezierPoint[] {
  if (points.length <= 2) return points;

  if (pathKind === "pen") {
    return optimizePenAnchors(points);
  }

  const tolerance =
    pathKind === "brush"
      ? Math.max(2, (options.brushSmoothing ?? 3) * 1.75)
      : 2.5;

  const flat = points.map((p) => ({ x: p.x, y: p.y }));
  return pointsToBezier(rdpSimplify(flat, tolerance));
}

export function pointsToBezier(points: Point[]): BezierPoint[] {
  return points.map((p) => ({ x: p.x, y: p.y }));
}

export function pathToSvgD(layer: PathLayer): string {
  const pts = layer.points;
  if (!pts.length) return "";
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    const prev = pts[i - 1];
    const curr = pts[i];
    const c1 = prev.handleOut ?? prev;
    const c2 = curr.handleIn ?? curr;
    if (
      (prev.handleOut || curr.handleIn) &&
      (c1.x !== prev.x || c1.y !== prev.y || c2.x !== curr.x || c2.y !== curr.y)
    ) {
      d += ` C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${curr.x} ${curr.y}`;
    } else {
      d += ` L ${curr.x} ${curr.y}`;
    }
  }
  if (layer.closed) d += " Z";
  return d;
}

export function draftToSvgD(points: BezierPoint[], closed: boolean): string {
  if (!points.length) return "";
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const c1 = prev.handleOut ?? prev;
    const c2 = curr.handleIn ?? curr;
    if (prev.handleOut || curr.handleIn) {
      d += ` C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${curr.x} ${curr.y}`;
    } else {
      d += ` L ${curr.x} ${curr.y}`;
    }
  }
  if (closed) d += " Z";
  return d;
}

export function getPathBounds(points: BezierPoint[]): { x: number; y: number; width: number; height: number } | null {
  if (!points.length) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of points) {
    minX = Math.min(minX, p.x, p.handleIn?.x ?? p.x, p.handleOut?.x ?? p.x);
    minY = Math.min(minY, p.y, p.handleIn?.y ?? p.y, p.handleOut?.y ?? p.y);
    maxX = Math.max(maxX, p.x, p.handleIn?.x ?? p.x, p.handleOut?.x ?? p.x);
    maxY = Math.max(maxY, p.y, p.handleIn?.y ?? p.y, p.handleOut?.y ?? p.y);
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

export function hitTestAnchor(point: Point, anchors: BezierPoint[], radius: number): number {
  for (let i = anchors.length - 1; i >= 0; i--) {
    if (distance(point, anchors[i]) <= radius) return i;
  }
  return -1;
}

export function normalizeRect(x: number, y: number, w: number, h: number) {
  return {
    x: w < 0 ? x + w : x,
    y: h < 0 ? y + h : y,
    width: Math.abs(w),
    height: Math.abs(h),
  };
}
