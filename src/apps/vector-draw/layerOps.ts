import type { BezierPoint, LayerStyle, VectorLayer } from "./types";
import { createId } from "./types";
import { getPathBounds } from "./pathTools";

export function layerToPoints(layer: VectorLayer): BezierPoint[] {
  switch (layer.type) {
    case "path":
      return layer.points.map((p) => ({ ...p }));
    case "line":
      return [{ x: layer.x, y: layer.y }, { x: layer.x2, y: layer.y2 }];
    case "rect": {
      const { x, y, width: w, height: h } = layer;
      const r = layer.style.cornerRadius;
      if (r > 0) {
        return [
          { x: x + r, y },
          { x: x + w, y: y + r, handleIn: { x: x + w, y }, handleOut: { x: x + w, y: y + r } },
          { x: x + w - r, y: y + h },
          { x, y: y + h - r },
        ];
      }
      return [
        { x, y },
        { x: x + w, y },
        { x: x + w, y: y + h },
        { x, y: y + h },
      ];
    }
    case "ellipse": {
      const cx = layer.x + layer.width / 2;
      const cy = layer.y + layer.height / 2;
      const rx = layer.width / 2;
      const ry = layer.height / 2;
      const k = 0.5522847498;
      return [
        { x: cx, y: cy - ry, handleOut: { x: cx + rx * k, y: cy - ry } },
        { x: cx + rx, y: cy, handleIn: { x: cx + rx, y: cy - ry * k }, handleOut: { x: cx + rx, y: cy + ry * k } },
        { x: cx, y: cy + ry, handleIn: { x: cx + rx * k, y: cy + ry } },
        { x: cx - rx, y: cy, handleIn: { x: cx - rx, y: cy + ry * k }, handleOut: { x: cx - rx, y: cy - ry * k } },
      ];
    }
  }
}

export function mergeLayers(layers: VectorLayer[], style: LayerStyle): VectorLayer | null {
  if (!layers.length) return null;
  if (layers.length === 1 && layers[0].type === "path") return layers[0];

  const allPoints: BezierPoint[] = [];
  for (const layer of layers) {
    const pts = layerToPoints(layer);
    if (pts.length) allPoints.push(...pts, { x: pts[0].x, y: pts[0].y }); // gap marker - use NaN? Better: keep subpaths
  }

  // Build as single path with multiple M commands - store as one continuous point list with breaks
  // Simpler: flatten all points into one open path
  const points: BezierPoint[] = [];
  for (const layer of layers) {
    points.push(...layerToPoints(layer));
  }
  if (!points.length) return null;

  const bounds = getPathBounds(points);
  const mergedStyle = layers.length === 1 ? layers[0].style : style;
  return {
    id: createId(),
    name: "Merged",
    type: "path",
    visible: true,
    locked: false,
    x: bounds?.x ?? 0,
    y: bounds?.y ?? 0,
    width: bounds?.width ?? 0,
    height: bounds?.height ?? 0,
    rotation: 0,
    opacity: Math.round(layers.reduce((s, l) => s + l.opacity, 0) / layers.length),
    style: { ...mergedStyle, fill: layers.every((l) => l.style.fill === "none") ? "none" : mergedStyle.fill },
    points,
    closed: layers.every((l) => l.type === "path" && l.closed),
    pathKind: "pen",
    groupId: null,
  };
}

export type AlignKind = "left" | "center" | "right" | "top" | "middle" | "bottom";

export function alignLayers(layers: VectorLayer[], kind: AlignKind, canvasW: number, canvasH: number): VectorLayer[] {
  if (!layers.length) return layers;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const boundsMap = new Map<string, ReturnType<typeof getPathBounds>>();
  for (const l of layers) {
    const b = getLayerBounds(l);
    if (!b) continue;
    boundsMap.set(l.id, b);
    minX = Math.min(minX, b.x);
    minY = Math.min(minY, b.y);
    maxX = Math.max(maxX, b.x + b.width);
    maxY = Math.max(maxY, b.y + b.height);
  }
  const selW = maxX - minX;
  const selH = maxY - minY;
  const ids = new Set(layers.map((l) => l.id));

  return layers.map((l) => {
    if (!ids.has(l.id)) return l;
    const b = boundsMap.get(l.id);
    if (!b) return l;
    let dx = 0, dy = 0;
    if (kind === "left") dx = minX - b.x;
    if (kind === "center") dx = minX + selW / 2 - (b.x + b.width / 2);
    if (kind === "right") dx = minX + selW - (b.x + b.width);
    if (kind === "top") dy = minY - b.y;
    if (kind === "middle") dy = minY + selH / 2 - (b.y + b.height / 2);
    if (kind === "bottom") dy = minY + selH - (b.y + b.height);
    if (layers.length === 1) {
      if (kind === "left") dx = 0 - b.x;
      if (kind === "center") dx = canvasW / 2 - (b.x + b.width / 2);
      if (kind === "right") dx = canvasW - (b.x + b.width);
      if (kind === "top") dy = 0 - b.y;
      if (kind === "middle") dy = canvasH / 2 - (b.y + b.height / 2);
      if (kind === "bottom") dy = canvasH - (b.y + b.height);
    }
    return translateLayer(l, dx, dy);
  });
}

function getLayerBounds(layer: VectorLayer) {
  return getPathBounds(layer.type === "path" ? layer.points : layerToPoints(layer)) ?? {
    x: layer.x, y: layer.y, width: layer.width, height: layer.height,
  };
}

export function translateLayer(layer: VectorLayer, dx: number, dy: number): VectorLayer {
  if (layer.type === "line") {
    return { ...layer, x: layer.x + dx, y: layer.y + dy, x2: layer.x2 + dx, y2: layer.y2 + dy };
  }
  if (layer.type === "path") {
    const points = layer.points.map((p) => ({
      ...p,
      x: p.x + dx,
      y: p.y + dy,
      handleIn: p.handleIn ? { x: p.handleIn.x + dx, y: p.handleIn.y + dy } : undefined,
      handleOut: p.handleOut ? { x: p.handleOut.x + dx, y: p.handleOut.y + dy } : undefined,
    }));
    const b = getPathBounds(points);
    return { ...layer, points, x: b?.x ?? layer.x + dx, y: b?.y ?? layer.y + dy };
  }
  return { ...layer, x: layer.x + dx, y: layer.y + dy };
}

export function layersIntersectingRect(
  layers: VectorLayer[],
  x: number,
  y: number,
  w: number,
  h: number
): string[] {
  const rx = w < 0 ? x + w : x;
  const ry = h < 0 ? y + h : y;
  const rw = Math.abs(w);
  const rh = Math.abs(h);
  return layers
    .filter((l) => {
      const b = getLayerBounds(l);
      return b.x + b.width >= rx && b.x <= rx + rw && b.y + b.height >= ry && b.y <= ry + rh;
    })
    .map((l) => l.id);
}
