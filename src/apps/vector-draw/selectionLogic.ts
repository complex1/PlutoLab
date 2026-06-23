import type { Point, VectorLayer } from "./types";
import { getPathBounds } from "./pathTools";

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type ResizeHandle = "nw" | "ne" | "se" | "sw";
export type SelectionHandle = ResizeHandle | "rotate";

const HANDLE_RADIUS = 6;
const ROTATE_OFFSET = 24;

export function getLayerBounds(layer: VectorLayer): Bounds | null {
  if (layer.type === "path") {
    const b = getPathBounds(layer.points);
    if (!b) return null;
    return b;
  }
  if (layer.type === "line") {
    const minX = Math.min(layer.x, layer.x2);
    const minY = Math.min(layer.y, layer.y2);
    return {
      x: minX,
      y: minY,
      width: Math.abs(layer.x2 - layer.x),
      height: Math.abs(layer.y2 - layer.y),
    };
  }
  return { x: layer.x, y: layer.y, width: layer.width, height: layer.height };
}

export function getSelectionBounds(layers: VectorLayer[]): Bounds | null {
  if (!layers.length) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const l of layers) {
    const b = getLayerBounds(l);
    if (!b) continue;
    minX = Math.min(minX, b.x);
    minY = Math.min(minY, b.y);
    maxX = Math.max(maxX, b.x + b.width);
    maxY = Math.max(maxY, b.y + b.height);
  }
  if (!isFinite(minX)) return null;
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

export function hitTestHandle(point: Point, bounds: Bounds, zoom: number): SelectionHandle | null {
  const handles = getHandlePositions(bounds);
  const threshold = (HANDLE_RADIUS + 3) / zoom;
  if (Math.hypot(point.x - handles.rotate.x, point.y - handles.rotate.y) <= threshold) return "rotate";
  for (const id of ["nw", "ne", "se", "sw"] as ResizeHandle[]) {
    const h = handles[id];
    if (Math.hypot(point.x - h.x, point.y - h.y) <= threshold) return id;
  }
  return null;
}

export function hitTestLayer(point: Point, layer: VectorLayer): boolean {
  const b = getLayerBounds(layer);
  if (!b) return false;
  const pad = layer.type === "path" ? layer.style.strokeWidth : 0;
  return (
    point.x >= b.x - pad &&
    point.x <= b.x + b.width + pad &&
    point.y >= b.y - pad &&
    point.y <= b.y + b.height + pad
  );
}

export function snapPoint(point: Point, grid: number, enabled: boolean): Point {
  if (!enabled || grid <= 0) return point;
  return {
    x: Math.round(point.x / grid) * grid,
    y: Math.round(point.y / grid) * grid,
  };
}

export function resizeLayerFromHandle(
  layer: VectorLayer,
  bounds: Bounds,
  handle: ResizeHandle,
  pointer: Point,
  uniform: boolean
): Partial<VectorLayer> {
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
  scaleX = Math.max(0.02, scaleX);
  scaleY = Math.max(0.02, scaleY);

  if (layer.type === "line") {
    return {
      x: anchor.x + (layer.x - anchor.x) * scaleX,
      y: anchor.y + (layer.y - anchor.y) * scaleY,
      x2: anchor.x + (layer.x2 - anchor.x) * scaleX,
      y2: anchor.y + (layer.y2 - anchor.y) * scaleY,
    };
  }
  if (layer.type === "path") {
    const points = layer.points.map((p) => ({
      ...p,
      x: anchor.x + (p.x - anchor.x) * scaleX,
      y: anchor.y + (p.y - anchor.y) * scaleY,
      handleIn: p.handleIn
        ? { x: anchor.x + (p.handleIn.x - anchor.x) * scaleX, y: anchor.y + (p.handleIn.y - anchor.y) * scaleY }
        : undefined,
      handleOut: p.handleOut
        ? { x: anchor.x + (p.handleOut.x - anchor.x) * scaleX, y: anchor.y + (p.handleOut.y - anchor.y) * scaleY }
        : undefined,
    }));
    const b = getPathBounds(points);
    return { points, ...(b ? { x: b.x, y: b.y, width: b.width, height: b.height } : {}) };
  }
  return {
    x: anchor.x + (layer.x - anchor.x) * scaleX,
    y: anchor.y + (layer.y - anchor.y) * scaleY,
    width: layer.width * scaleX,
    height: layer.height * scaleY,
  };
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
