import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  beginStroke,
  buildOnionCanvas,
  canvasToDataUrl,
  compositeView,
  continueStroke,
  drawLine,
  endStroke,
  loadImageToCanvas,
  onionCacheKey,
  screenToCanvas,
  snapshotCanvas,
  type Point,
  type ViewOverlays,
} from "./canvasDraw";
import {
  applyTransformDrag,
  extractAndCutLasso,
  hitTestTransform,
  simplifyPath,
  stampTransformedPiece,
  type FloatingSelection,
  type SelectionTransform,
  type TransformHandle,
} from "./lassoTransform";
import {
  renderLayersAboveActive,
  renderLayersBelowActive,
} from "./layerUtils";
import type { OnionLayer } from "./onionSkin";
import type { AnimationFrame, AnimationProject, BrushSettings, DrawTool, GridSettings } from "./types";

interface DrawingCanvasProps {
  frameId: string;
  layerId: string;
  layerImageData: string;
  layerStackKey: string;
  layerLocked: boolean;
  frame: AnimationFrame;
  project: AnimationProject;
  onionLayers: OnionLayer[];
  grid: GridSettings;
  tool: DrawTool;
  brush: BrushSettings;
  zoom: number;
  pan: { x: number; y: number };
  readOnly?: boolean;
  onCommit: (imageData: string) => void;
  onStrokeStart: (snapshot: string) => void;
  onPanChange: (pan: { x: number; y: number }) => void;
  restoredImage?: string | null;
  onRestored?: () => void;
}

function createOffscreenCanvas() {
  return document.createElement("canvas");
}

export default function DrawingCanvas({
  frameId,
  layerId,
  layerImageData,
  layerStackKey,
  layerLocked,
  frame,
  project,
  onionLayers,
  grid,
  tool,
  brush,
  zoom,
  pan,
  readOnly = false,
  onCommit,
  onStrokeStart,
  onPanChange,
  restoredImage,
  onRestored,
}: DrawingCanvasProps) {
  const viewCanvasRef = useRef<HTMLCanvasElement>(null);
  const belowCanvasRef = useRef<HTMLCanvasElement>(createOffscreenCanvas());
  const contentCanvasRef = useRef<HTMLCanvasElement>(createOffscreenCanvas());
  const aboveCanvasRef = useRef<HTMLCanvasElement>(createOffscreenCanvas());
  const onionCanvasRef = useRef<HTMLCanvasElement>(createOffscreenCanvas());
  const onionKeyRef = useRef("");
  const stackKeyRef = useRef("");
  const frameRef = useRef(frame);
  frameRef.current = frame;
  const drawingRef = useRef(false);
  const panningRef = useRef(false);
  const spaceHeldRef = useRef(false);
  const lastPointRef = useRef<Point | null>(null);
  const lineStartRef = useRef<Point | null>(null);
  const panStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const brushRef = useRef(brush);
  const gridRef = useRef(grid);
  const onionLayersRef = useRef(onionLayers);
  const toolRef = useRef(tool);
  const lassoPathRef = useRef<Point[]>([]);
  const lassoDrawingRef = useRef(false);
  const floatingRef = useRef<FloatingSelection | null>(null);
  const preCutSnapshotRef = useRef<string | null>(null);
  const transformDragRef = useRef<{
    handle: TransformHandle;
    startPt: Point;
    startTransform: SelectionTransform;
  } | null>(null);

  brushRef.current = brush;
  gridRef.current = grid;
  onionLayersRef.current = onionLayers;
  toolRef.current = tool;

  const { width, height, background, transparent } = project;

  const onionKey = useMemo(
    () => onionCacheKey(width, height, onionLayers),
    [width, height, onionLayers]
  );

  const getOverlays = useCallback((): ViewOverlays => {
    const overlays: ViewOverlays = {};
    if (lassoDrawingRef.current && lassoPathRef.current.length > 0) {
      overlays.lassoPath = lassoPathRef.current;
    }
    if (floatingRef.current) {
      overlays.floating = floatingRef.current;
    }
    return overlays;
  }, []);

  const paintView = useCallback(
    (linePreview?: { from: Point; to: Point }) => {
      const view = viewCanvasRef.current;
      const below = belowCanvasRef.current;
      const content = contentCanvasRef.current;
      const above = aboveCanvasRef.current;
      const onion = onionCanvasRef.current;
      if (!view || !content || !onion) return;

      compositeView(
        view,
        below,
        content,
        above,
        onion,
        width,
        height,
        gridRef.current,
        background,
        getOverlays(),
        linePreview ? { ...linePreview, brush: brushRef.current } : undefined
      );
    },
    [width, height, background, getOverlays]
  );

  const rebuildStack = useCallback(async () => {
    if (stackKeyRef.current === layerStackKey) {
      paintView();
      return;
    }
    stackKeyRef.current = layerStackKey;
    await renderLayersBelowActive(belowCanvasRef.current, frameRef.current, project);
    await renderLayersAboveActive(aboveCanvasRef.current, frameRef.current, project);
    paintView();
  }, [layerStackKey, paintView, project]);

  const clearLassoState = useCallback(() => {
    lassoPathRef.current = [];
    lassoDrawingRef.current = false;
    floatingRef.current = null;
    preCutSnapshotRef.current = null;
    transformDragRef.current = null;
  }, []);

  const commitFloating = useCallback(() => {
    const floating = floatingRef.current;
    if (!floating) return;
    stampTransformedPiece(contentCanvasRef.current, floating.piece, floating.transform);
    clearLassoState();
    const data = canvasToDataUrl(contentCanvasRef.current);
    onCommit(data);
    paintView();
  }, [clearLassoState, onCommit, paintView]);

  const cancelFloating = useCallback(async () => {
    const snap = preCutSnapshotRef.current;
    clearLassoState();
    if (snap) {
      await loadImageToCanvas(
        contentCanvasRef.current,
        snap,
        width,
        height,
        background,
        transparent
      );
    }
    paintView();
  }, [background, clearLassoState, height, paintView, transparent, width]);

  const rebuildOnion = useCallback(async () => {
    if (onionKeyRef.current === onionKey) {
      paintView();
      return;
    }
    onionKeyRef.current = onionKey;
    await buildOnionCanvas(
      onionCanvasRef.current,
      width,
      height,
      onionLayersRef.current,
      background,
      transparent
    );
    paintView();
  }, [onionKey, width, height, background, transparent, paintView]);

  const loadContent = useCallback(
    async (imageData: string) => {
      await loadImageToCanvas(
        contentCanvasRef.current,
        imageData,
        width,
        height,
        background,
        true
      );
      paintView();
    },
    [width, height, background, paintView]
  );

  useEffect(() => {
    onionKeyRef.current = "";
    stackKeyRef.current = "";
    void loadContent(layerImageData).then(() => rebuildStack().then(() => rebuildOnion()));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frameId, layerId]);

  useEffect(() => {
    void rebuildStack();
  }, [layerStackKey, rebuildStack]);

  useEffect(() => {
    void rebuildOnion();
  }, [onionKey, rebuildOnion]);

  useEffect(() => {
    paintView();
  }, [grid, paintView]);

  useEffect(() => {
    if (!restoredImage) return;
    void loadContent(restoredImage).then(() => onRestored?.());
  }, [restoredImage, loadContent, onRestored]);

  useEffect(() => {
    if (tool !== "lasso" && floatingRef.current) {
      commitFloating();
    }
  }, [tool, commitFloating]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && !e.repeat) {
        e.preventDefault();
        spaceHeldRef.current = true;
      }
      if (toolRef.current !== "lasso") return;
      const typing =
        e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement;
      if (typing) return;
      if (e.key === "Enter") {
        e.preventDefault();
        commitFloating();
      }
      if (e.key === "Escape") {
        e.preventDefault();
        void cancelFloating();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") spaceHeldRef.current = false;
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [cancelFloating, commitFloating]);

  const getPoint = (e: React.PointerEvent<HTMLCanvasElement>): Point => {
    const canvas = viewCanvasRef.current!;
    return screenToCanvas(canvas, e.clientX, e.clientY);
  };

  const isPanMode = (e: React.PointerEvent<HTMLCanvasElement>) =>
    tool === "select" || spaceHeldRef.current || e.button === 1;

  const startLassoPath = (pt: Point) => {
    lassoPathRef.current = [pt];
    lassoDrawingRef.current = true;
    paintView();
  };

  const finishLassoPath = () => {
    if (!lassoDrawingRef.current) return;
    lassoDrawingRef.current = false;
    const path = simplifyPath(lassoPathRef.current, 2);
    lassoPathRef.current = [];

    if (path.length < 3) {
      paintView();
      return;
    }

    const content = contentCanvasRef.current;
    preCutSnapshotRef.current = snapshotCanvas(content);
    onStrokeStart(preCutSnapshotRef.current);

    const floating = extractAndCutLasso(content, path, background, true);
    if (floating) {
      floatingRef.current = floating;
    } else if (preCutSnapshotRef.current) {
      void loadImageToCanvas(
        content,
        preCutSnapshotRef.current,
        width,
        height,
        background,
        true
      );
      preCutSnapshotRef.current = null;
    }
    paintView();
  };

  const isReadOnly = readOnly || layerLocked;

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isReadOnly) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);

    if (isPanMode(e)) {
      panningRef.current = true;
      panStartRef.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
      return;
    }

    const pt = getPoint(e);

    if (tool === "lasso") {
      if (floatingRef.current) {
        const hit = hitTestTransform(pt, floatingRef.current.transform);
        if (hit) {
          transformDragRef.current = {
            handle: hit,
            startPt: pt,
            startTransform: { ...floatingRef.current.transform },
          };
          return;
        }
        commitFloating();
      }
      startLassoPath(pt);
      return;
    }

    const content = contentCanvasRef.current;
    const ctx = content.getContext("2d");
    if (!ctx) return;

    onStrokeStart(snapshotCanvas(content));
    drawingRef.current = true;
    lastPointRef.current = pt;

    if (tool === "line") {
      lineStartRef.current = pt;
      return;
    }

    beginStroke(ctx, tool, brushRef.current, pt);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (panningRef.current) {
      onPanChange({
        x: panStartRef.current.panX + (e.clientX - panStartRef.current.x),
        y: panStartRef.current.panY + (e.clientY - panStartRef.current.y),
      });
      return;
    }

    const pt = getPoint(e);

    if (transformDragRef.current && floatingRef.current) {
      const { handle, startPt, startTransform } = transformDragRef.current;
      floatingRef.current = {
        ...floatingRef.current,
        transform: applyTransformDrag(handle, startPt, pt, startTransform),
      };
      paintView();
      return;
    }

    if (tool === "lasso" && lassoDrawingRef.current) {
      const path = lassoPathRef.current;
      const last = path[path.length - 1];
      if (!last || Math.hypot(pt.x - last.x, pt.y - last.y) >= 2) {
        path.push(pt);
        paintView();
      }
      return;
    }

    if (!drawingRef.current || isReadOnly) return;

    const content = contentCanvasRef.current;
    const ctx = content.getContext("2d");
    if (!ctx) return;

    if (tool === "line" && lineStartRef.current) {
      lastPointRef.current = pt;
      paintView({ from: lineStartRef.current, to: pt });
      return;
    }

    if (lastPointRef.current && (tool === "pencil" || tool === "brush" || tool === "eraser")) {
      continueStroke(ctx, tool, brushRef.current, lastPointRef.current, pt);
      lastPointRef.current = pt;
      paintView();
    }
  };

  const finishDrawing = () => {
    if (panningRef.current) {
      panningRef.current = false;
      return;
    }

    if (transformDragRef.current) {
      transformDragRef.current = null;
      return;
    }

    if (tool === "lasso" && lassoDrawingRef.current) {
      finishLassoPath();
      return;
    }

    if (!drawingRef.current) return;

    const content = contentCanvasRef.current;
    const ctx = content.getContext("2d");
    const lineStart = lineStartRef.current;
    const lineEnd = lastPointRef.current;

    if (tool === "line" && lineStart && lineEnd && ctx) {
      drawLine(ctx, lineStart, lineEnd, "pencil", brushRef.current);
    } else if (ctx && tool !== "line") {
      endStroke(ctx);
    }

    drawingRef.current = false;
    lastPointRef.current = null;
    lineStartRef.current = null;

    const data = canvasToDataUrl(content);
    onCommit(data);
    paintView();
  };

  const onDoubleClick = () => {
    if (tool === "lasso" && floatingRef.current) {
      commitFloating();
    }
  };

  const onPointerUp = () => finishDrawing();
  const onPointerLeave = () => finishDrawing();

  const cursorClass =
    tool === "select" ? "fa-canvas--grab" : tool === "lasso" ? "fa-canvas--crosshair" : "";

  return (
    <div
      className="fa-canvas-wrap"
      style={{
        width,
        height,
        transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
      }}
    >
      <canvas
        ref={viewCanvasRef}
        className={`fa-canvas ${isReadOnly ? "fa-canvas--readonly" : ""} ${cursorClass}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerLeave}
        onDoubleClick={onDoubleClick}
        onContextMenu={(e) => e.preventDefault()}
      />
      <div className="fa-canvas-boundary" />
    </div>
  );
}
