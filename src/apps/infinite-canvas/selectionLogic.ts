import type { Camera, CanvasElement, Point } from "./canvasTypes";

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type ResizeHandle = "nw" | "ne" | "se" | "sw";
export type SelectionHandle = ResizeHandle | "rotate";

const HANDLE_RADIUS = 6;
const ROTATE_OFFSET = 28;

export function getElementRotation(element: CanvasElement): number {
  return element.rotation ?? 0;
}

export function getLocalBounds(element: CanvasElement): Bounds | null {
  switch (element.type) {
    case "path": {
      if (element.points.length === 0) return null;
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      const pad = element.width / 2;
      for (const p of element.points) {
        minX = Math.min(minX, p.x);
        minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x);
        maxY = Math.max(maxY, p.y);
      }
      return {
        x: minX - pad,
        y: minY - pad,
        width: maxX - minX + pad * 2,
        height: maxY - minY + pad * 2,
      };
    }
    case "rect":
    case "ellipse":
    case "image":
      return { x: element.x, y: element.y, width: element.width, height: element.height };
    case "text":
      return {
        x: element.x,
        y: element.y - element.fontSize,
        width: element.text.length * element.fontSize * 0.55,
        height: element.fontSize,
      };
  }
}

export function getBoundsCenter(bounds: Bounds): Point {
  return { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
}

export function rotatePoint(point: Point, center: Point, angle: number): Point {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const dx = point.x - center.x;
  const dy = point.y - center.y;
  return {
    x: center.x + dx * cos - dy * sin,
    y: center.y + dx * sin + dy * cos,
  };
}

export function getElementCenter(element: CanvasElement): Point {
  const bounds = getLocalBounds(element);
  if (!bounds) return { x: 0, y: 0 };
  return getBoundsCenter(bounds);
}

function getLocalCorners(bounds: Bounds): Point[] {
  return [
    { x: bounds.x, y: bounds.y },
    { x: bounds.x + bounds.width, y: bounds.y },
    { x: bounds.x + bounds.width, y: bounds.y + bounds.height },
    { x: bounds.x, y: bounds.y + bounds.height },
  ];
}

export function getElementBounds(element: CanvasElement): Bounds | null {
  const local = getLocalBounds(element);
  if (!local) return null;
  const rotation = getElementRotation(element);
  if (rotation === 0) return local;

  const center = getBoundsCenter(local);
  const corners = getLocalCorners(local).map((p) => rotatePoint(p, center, rotation));
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of corners) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

export function getSelectionBounds(elements: CanvasElement[]): Bounds | null {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const el of elements) {
    const bounds = getElementBounds(el);
    if (!bounds) continue;
    minX = Math.min(minX, bounds.x);
    minY = Math.min(minY, bounds.y);
    maxX = Math.max(maxX, bounds.x + bounds.width);
    maxY = Math.max(maxY, bounds.y + bounds.height);
  }

  if (!Number.isFinite(minX)) return null;
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

export function worldToScreenPoint(
  point: Point,
  camera: Camera,
  width: number,
  height: number
): Point {
  const cx = width / 2;
  const cy = height / 2;
  return {
    x: (point.x - camera.x) * camera.zoom + cx,
    y: (point.y - camera.y) * camera.zoom + cy,
  };
}

export function screenToWorldPoint(
  point: Point,
  camera: Camera,
  width: number,
  height: number
): Point {
  const cx = width / 2;
  const cy = height / 2;
  return {
    x: (point.x - cx) / camera.zoom + camera.x,
    y: (point.y - cy) / camera.zoom + camera.y,
  };
}

export function getHandleWorldPositions(
  bounds: Bounds,
  camera: Camera
): Record<SelectionHandle, Point> {
  const { x, y, width, height } = bounds;
  const cx = x + width / 2;
  return {
    nw: { x, y },
    ne: { x: x + width, y },
    se: { x: x + width, y: y + height },
    sw: { x, y: y + height },
    rotate: { x: cx, y: y - ROTATE_OFFSET / camera.zoom },
  };
}

export function hitTestSelectionHandle(
  worldPoint: Point,
  bounds: Bounds,
  camera: Camera,
  canvasWidth: number,
  canvasHeight: number
): SelectionHandle | null {
  const screen = worldToScreenPoint(worldPoint, camera, canvasWidth, canvasHeight);
  const handles = getHandleWorldPositions(bounds, camera);

  const rotateScreen = worldToScreenPoint(handles.rotate, camera, canvasWidth, canvasHeight);
  if (Math.hypot(screen.x - rotateScreen.x, screen.y - rotateScreen.y) <= HANDLE_RADIUS + 2) {
    return "rotate";
  }

  for (const id of ["nw", "ne", "se", "sw"] as ResizeHandle[]) {
    const handleScreen = worldToScreenPoint(handles[id], camera, canvasWidth, canvasHeight);
    if (Math.hypot(screen.x - handleScreen.x, screen.y - handleScreen.y) <= HANDLE_RADIUS + 2) {
      return id;
    }
  }

  return null;
}

export function pointInRotatedElement(element: CanvasElement, point: Point): boolean {
  const rotation = getElementRotation(element);
  const center = getElementCenter(element);
  const localPoint =
    rotation === 0 ? point : rotatePoint(point, center, -rotation);

  switch (element.type) {
    case "path":
      return element.points.some(
        (p) => Math.hypot(p.x - localPoint.x, p.y - localPoint.y) <= element.width + 4
      );
    case "rect":
    case "image":
      return (
        localPoint.x >= element.x &&
        localPoint.x <= element.x + element.width &&
        localPoint.y >= element.y &&
        localPoint.y <= element.y + element.height
      );
    case "ellipse": {
      if (element.width === 0 || element.height === 0) return false;
      const ecx = element.x + element.width / 2;
      const ecy = element.y + element.height / 2;
      const rx = element.width / 2;
      const ry = element.height / 2;
      const dx = (localPoint.x - ecx) / rx;
      const dy = (localPoint.y - ecy) / ry;
      return dx * dx + dy * dy <= 1;
    }
    case "text": {
      const width = element.text.length * element.fontSize * 0.55;
      return (
        localPoint.x >= element.x &&
        localPoint.x <= element.x + width &&
        localPoint.y >= element.y - element.fontSize &&
        localPoint.y <= element.y
      );
    }
  }
}

export function pointInBounds(point: Point, bounds: Bounds, padding = 0): boolean {
  return (
    point.x >= bounds.x - padding &&
    point.x <= bounds.x + bounds.width + padding &&
    point.y >= bounds.y - padding &&
    point.y <= bounds.y + bounds.height + padding
  );
}

export function rectsIntersect(a: Bounds, b: Bounds): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

export function elementIntersectsRect(element: CanvasElement, rect: Bounds): boolean {
  const bounds = getElementBounds(element);
  if (!bounds) return false;
  return rectsIntersect(bounds, rect);
}

export function cloneElement(el: CanvasElement): CanvasElement {
  if (el.type === "path") {
    return { ...el, points: el.points.map((p) => ({ ...p })) };
  }
  return { ...el };
}

export function moveElement(el: CanvasElement, dx: number, dy: number): CanvasElement {
  if (el.type === "path") {
    return { ...el, points: el.points.map((p) => ({ x: p.x + dx, y: p.y + dy })) };
  }
  return { ...el, x: el.x + dx, y: el.y + dy };
}

export function moveElements(elements: CanvasElement[], dx: number, dy: number): CanvasElement[] {
  return elements.map((el) => moveElement(el, dx, dy));
}

export function rotateElements(
  elements: CanvasElement[],
  center: Point,
  deltaAngle: number
): CanvasElement[] {
  return elements.map((el) => {
    if (el.type === "path") {
      return {
        ...el,
        points: el.points.map((p) => rotatePoint(p, center, deltaAngle)),
      };
    }
    const rotation = getElementRotation(el) + deltaAngle;
    const c = getElementCenter(el);
    const rotated = rotatePoint(c, center, deltaAngle);
    const dx = rotated.x - c.x;
    const dy = rotated.y - c.y;
    return { ...moveElement(el, dx, dy), rotation };
  });
}

function getAnchorForHandle(bounds: Bounds, handle: ResizeHandle): Point {
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

export function resizeElements(
  snapshots: CanvasElement[],
  startBounds: Bounds,
  handle: ResizeHandle,
  pointer: Point,
  uniform: boolean
): CanvasElement[] {
  const anchor = getAnchorForHandle(startBounds, handle);
  let scaleX = 1;
  let scaleY = 1;

  if (handle === "se") {
    scaleX = startBounds.width === 0 ? 1 : (pointer.x - anchor.x) / startBounds.width;
    scaleY = startBounds.height === 0 ? 1 : (pointer.y - anchor.y) / startBounds.height;
  } else if (handle === "nw") {
    scaleX = startBounds.width === 0 ? 1 : (anchor.x - pointer.x) / startBounds.width;
    scaleY = startBounds.height === 0 ? 1 : (anchor.y - pointer.y) / startBounds.height;
  } else if (handle === "ne") {
    scaleX = startBounds.width === 0 ? 1 : (pointer.x - anchor.x) / startBounds.width;
    scaleY = startBounds.height === 0 ? 1 : (anchor.y - pointer.y) / startBounds.height;
  } else if (handle === "sw") {
    scaleX = startBounds.width === 0 ? 1 : (anchor.x - pointer.x) / startBounds.width;
    scaleY = startBounds.height === 0 ? 1 : (pointer.y - anchor.y) / startBounds.height;
  }

  if (uniform) {
    const scale = Math.max(Math.abs(scaleX), Math.abs(scaleY)) * Math.sign(scaleX || 1);
    scaleX = scale;
    scaleY = scale;
  }

  scaleX = Math.max(0.05, scaleX);
  scaleY = Math.max(0.05, scaleY);

  return snapshots.map((el) => scaleElement(el, anchor, scaleX, scaleY));
}

function scaleElement(el: CanvasElement, anchor: Point, scaleX: number, scaleY: number): CanvasElement {
  const scalePointLocal = (p: Point) => ({
    x: anchor.x + (p.x - anchor.x) * scaleX,
    y: anchor.y + (p.y - anchor.y) * scaleY,
  });

  if (el.type === "path") {
    return {
      ...el,
      points: el.points.map(scalePointLocal),
      width: el.width * Math.max(scaleX, scaleY),
    };
  }

  if (el.type === "text") {
    const topLeft = scalePointLocal({ x: el.x, y: el.y - el.fontSize });
    const scale = Math.max(scaleX, scaleY);
    return {
      ...el,
      x: topLeft.x,
      y: topLeft.y + el.fontSize * scale,
      fontSize: el.fontSize * scale,
    };
  }

  const topLeft = scalePointLocal({ x: el.x, y: el.y });
  return {
    ...el,
    x: topLeft.x,
    y: topLeft.y,
    width: el.width * scaleX,
    height: el.height * scaleY,
  };
}

export function drawMarquee(
  ctx: CanvasRenderingContext2D,
  marquee: Bounds,
  camera: Camera,
  width: number,
  height: number
) {
  const cx = width / 2;
  const cy = height / 2;
  const mx = (marquee.x - camera.x) * camera.zoom + cx;
  const my = (marquee.y - camera.y) * camera.zoom + cy;
  const mw = marquee.width * camera.zoom;
  const mh = marquee.height * camera.zoom;

  ctx.save();
  ctx.fillStyle = "rgba(107, 159, 255, 0.12)";
  ctx.fillRect(mx, my, mw, mh);
  ctx.strokeStyle = "#6b9fff";
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.strokeRect(mx, my, mw, mh);
  ctx.restore();
}

export function drawSelectionUI(
  ctx: CanvasRenderingContext2D,
  bounds: Bounds,
  camera: Camera,
  width: number,
  height: number,
  marquee?: Bounds | null
) {
  const cx = width / 2;
  const cy = height / 2;
  const pad = 4 / camera.zoom;
  const x = (bounds.x - camera.x) * camera.zoom + cx - pad;
  const y = (bounds.y - camera.y) * camera.zoom + cy - pad;
  const w = bounds.width * camera.zoom + pad * 2;
  const h = bounds.height * camera.zoom + pad * 2;

  ctx.save();
  ctx.strokeStyle = "#6b9fff";
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 4]);
  ctx.strokeRect(x, y, w, h);
  ctx.setLineDash([]);

  const handles = getHandleWorldPositions(
    {
      x: bounds.x - pad / camera.zoom,
      y: bounds.y - pad / camera.zoom,
      width: bounds.width + (pad * 2) / camera.zoom,
      height: bounds.height + (pad * 2) / camera.zoom,
    },
    camera
  );

  const drawHandle = (point: Point, filled = true) => {
    const sx = (point.x - camera.x) * camera.zoom + cx;
    const sy = (point.y - camera.y) * camera.zoom + cy;
    ctx.beginPath();
    ctx.arc(sx, sy, HANDLE_RADIUS - 1, 0, Math.PI * 2);
    ctx.fillStyle = filled ? "#6b9fff" : "#0f0f0f";
    ctx.fill();
    ctx.strokeStyle = "#6b9fff";
    ctx.lineWidth = 1.5;
    ctx.stroke();
  };

  for (const id of ["nw", "ne", "se", "sw"] as ResizeHandle[]) {
    drawHandle(handles[id]);
  }

  const topCenter = {
    x: bounds.x + bounds.width / 2,
    y: bounds.y - pad / camera.zoom,
  };
  const topScreen = worldToScreenPoint(topCenter, camera, width, height);
  const rotateScreen = worldToScreenPoint(handles.rotate, camera, width, height);
  ctx.beginPath();
  ctx.moveTo(topScreen.x, topScreen.y);
  ctx.lineTo(rotateScreen.x, rotateScreen.y);
  ctx.strokeStyle = "#6b9fff";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  drawHandle(handles.rotate);

  if (marquee) {
    drawMarquee(ctx, marquee, camera, width, height);
  }

  ctx.restore();
}
