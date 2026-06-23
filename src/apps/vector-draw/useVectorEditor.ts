import { useCallback, useEffect, useRef, useState } from "react";
import { ANCHOR_HIT_RADIUS, CLOSE_PATH_THRESHOLD } from "./constants";
import { alignLayers, layersIntersectingRect, type AlignKind } from "./layerOps";
import {
  distance,
  getPathBounds,
  hitTestAnchor,
  mirrorHandle,
  normalizeRect,
  optimizePathPoints,
  pointsToBezier,
  simplifyPoints,
} from "./pathTools";
import { saveProject, loadAutosave } from "./projectStorage";
import {
  getSelectionBounds,
  hitTestHandle,
  hitTestLayer,
  resizeLayerFromHandle,
  snapPoint,
  type ResizeHandle,
  type SelectionHandle,
} from "./selectionLogic";
import type { BezierPoint, Point, ToolId, VectorLayer } from "./types";
import {
  createPathLayer,
  createProject,
  createShapeLayer,
  createStore,
  dispatch,
  type VectorAction,
  type VectorStore,
} from "./vectorReducer";

function formatShortcut(shortcut: string) {
  const mod = /Mac|iPhone|iPad/.test(navigator.userAgent) ? "⌘" : "Ctrl";
  return shortcut.replace("Mod", mod);
}

export { formatShortcut };

function hitTestPathHandle(
  pt: Point,
  layer: VectorLayer,
  zoom: number,
  threshold = ANCHOR_HIT_RADIUS
): { index: number; handle: "anchor" | "in" | "out" } | null {
  if (layer.type !== "path") return null;
  const t = threshold / zoom;
  for (let i = layer.points.length - 1; i >= 0; i--) {
    const p = layer.points[i];
    if (p.handleIn && Math.hypot(pt.x - p.handleIn.x, pt.y - p.handleIn.y) <= t) {
      return { index: i, handle: "in" };
    }
    if (p.handleOut && Math.hypot(pt.x - p.handleOut.x, pt.y - p.handleOut.y) <= t) {
      return { index: i, handle: "out" };
    }
    if (Math.hypot(pt.x - p.x, pt.y - p.y) <= t) {
      return { index: i, handle: "anchor" };
    }
  }
  return null;
}

export function useVectorEditor() {
  const [store, setStore] = useState<VectorStore>(() => createStore());
  const state = store.present;

  useEffect(() => {
    void loadAutosave().then((autosave) => {
      if (autosave) setStore(createStore(autosave));
    });
  }, []);

  const svgRef = useRef<SVGSVGElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    mode: "pan" | "move" | "shape" | "draw" | "resize" | "pen-handle" | "pen-place" | "marquee" | "path-edit" | null;
    start: Point;
    screenStart?: Point;
    layerStarts: Map<string, Partial<VectorLayer>>;
    handle?: SelectionHandle;
    bounds?: ReturnType<typeof getSelectionBounds>;
    penIndex?: number;
    pathEditLayerId?: string;
    pathEditHandle?: "anchor" | "in" | "out";
    pathSnapshot?: BezierPoint[];
    drawLayerId?: string;
  }>({ mode: null, start: { x: 0, y: 0 }, layerStarts: new Map() });
  const spaceHeldRef = useRef(false);

  const act = useCallback((action: VectorAction, commit = false) => {
    setStore((s) => {
      let next = dispatch(s, action);
      if (commit) next = dispatch(next, { type: "COMMIT_HISTORY" });
      return next;
    });
  }, []);

  const commit = useCallback(() => act({ type: "COMMIT_HISTORY" }), [act]);

  useEffect(() => {
    if (!state.project) return;
    const t = setTimeout(() => saveProject(state.project!), 600);
    return () => clearTimeout(t);
  }, [state.project]);

  const screenToCanvas = useCallback((clientX: number, clientY: number): Point => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    const project = state.project!;
    return {
      x: (clientX - rect.left) * (project.canvasWidth / rect.width),
      y: (clientY - rect.top) * (project.canvasHeight / rect.height),
    };
  }, [state.project]);

  const newProject = useCallback(
    (name: string, width: number, height: number) => {
      act({ type: "NEW_PROJECT", project: createProject(name, width, height) }, true);
    },
    [act]
  );

  const openProject = useCallback(
    (project: import("./types").VectorProject) => {
      act({ type: "OPEN_PROJECT", project }, true);
    },
    [act]
  );

  const fitToScreen = useCallback(() => {
    const vp = viewportRef.current;
    const project = state.project;
    if (!vp || !project) return;
    const pad = 48;
    const zoom = Math.min((vp.clientWidth - pad) / project.canvasWidth, (vp.clientHeight - pad) / project.canvasHeight, 1);
    act({
      type: "SET_VIEWPORT",
      patch: { zoom, panX: (vp.clientWidth - project.canvasWidth * zoom) / 2, panY: (vp.clientHeight - project.canvasHeight * zoom) / 2 },
    });
  }, [act, state.project]);

  const zoomBy = useCallback(
    (factor: number) => {
      const vp = viewportRef.current;
      if (!vp || !state.project) return;
      const newZoom = Math.min(8, Math.max(0.05, state.viewport.zoom * factor));
      const cx = vp.clientWidth / 2;
      const cy = vp.clientHeight / 2;
      act({
        type: "SET_VIEWPORT",
        patch: {
          zoom: newZoom,
          panX: cx - (cx - state.viewport.panX) * (newZoom / state.viewport.zoom),
          panY: cy - (cy - state.viewport.panY) * (newZoom / state.viewport.zoom),
        },
      });
    },
    [act, state.project, state.viewport.panX, state.viewport.panY, state.viewport.zoom]
  );

  useEffect(() => {
    if (state.project) fitToScreen();
  }, [state.project?.canvasWidth, state.project?.canvasHeight]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && !(e.target instanceof HTMLInputElement)) {
        e.preventDefault();
        spaceHeldRef.current = true;
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
  }, []);

  const finishPenPath = useCallback(
    (closed: boolean) => {
      const draft = state.penDraft;
      if (!draft || draft.points.length < 2) {
        act({ type: "SET_PEN_DRAFT", draft: null });
        return;
      }
      const optimized = optimizePathPoints(draft.points, "pen");
      const bounds = getPathBounds(optimized);
      const layer = createPathLayer(optimized, closed, "pen", state.style);
      act({
        type: "ADD_LAYER",
        layer: bounds
          ? { ...layer, x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height }
          : layer,
      }, true);
      act({ type: "SET_PEN_DRAFT", draft: null });
      act({ type: "SET_TOOL", tool: "select" });
    },
    [act, state.penDraft, state.style]
  );

  const getSelectedLayers = () =>
    state.project?.layers.filter((l) => state.selectedLayerIds.includes(l.id)) ?? [];

  const alignSelected = useCallback(
    (kind: AlignKind) => {
      if (!state.project) return;
      const selected = state.project.layers.filter((l) => state.selectedLayerIds.includes(l.id));
      const aligned = alignLayers(selected, kind, state.project.canvasWidth, state.project.canvasHeight);
      const map = new Map(aligned.map((l) => [l.id, l]));
      act({ type: "SET_LAYERS", layers: state.project.layers.map((l) => map.get(l.id) ?? l) }, true);
    },
    [act, state.project, state.selectedLayerIds]
  );

  const isMulti = (e: React.PointerEvent | React.MouseEvent) => e.shiftKey || e.metaKey || e.ctrlKey;

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!state.project) return;
    const svg = svgRef.current;
    if (!svg) return;
    svg.setPointerCapture(e.pointerId);
    let pt = screenToCanvas(e.clientX, e.clientY);
    if (state.viewport.snapToGrid) pt = snapPoint(pt, state.viewport.gridSize, true);

    const panTool = state.tool === "hand" || e.button === 1 || (e.button === 0 && e.altKey) || spaceHeldRef.current;
    if (panTool) {
      dragRef.current = { mode: "pan", start: { x: e.clientX, y: e.clientY }, layerStarts: new Map() };
      return;
    }

    const shapeTools: ToolId[] = ["rect", "ellipse", "circle", "line"];
    if (shapeTools.includes(state.tool)) {
      const shapeType = state.tool as "rect" | "ellipse" | "circle" | "line";
      act({ type: "SET_DRAFT_SHAPE", draft: { type: shapeType === "circle" ? "circle" : shapeType, x: pt.x, y: pt.y, width: 0, height: 0 } });
      dragRef.current = { mode: "shape", start: pt, layerStarts: new Map() };
      return;
    }

    if (state.tool === "pen") {
      const draft = state.penDraft ?? { points: [], closed: false, layerId: null };
      if (draft.points.length >= 3 && distance(pt, draft.points[0]) <= CLOSE_PATH_THRESHOLD) {
        finishPenPath(true);
        return;
      }
      if (hitTestAnchor(pt, draft.points, ANCHOR_HIT_RADIUS / state.viewport.zoom) >= 0) {
        dragRef.current = { mode: "pen-handle", start: pt, layerStarts: new Map(), penIndex: hitTestAnchor(pt, draft.points, ANCHOR_HIT_RADIUS / state.viewport.zoom) };
        return;
      }
      act({ type: "SET_PEN_DRAFT", draft: { ...draft, points: [...draft.points, { x: pt.x, y: pt.y }] } });
      dragRef.current = { mode: "pen-place", start: pt, layerStarts: new Map() };
      return;
    }

    if (state.tool === "pencil" || state.tool === "brush") {
      const strokeStyle = {
        ...state.style,
        fill: "none",
        strokeWidth: state.brush.size,
        strokeOpacity: state.brush.opacity,
      };
      const layer = createPathLayer(
        [{ x: pt.x, y: pt.y }],
        false,
        state.tool,
        strokeStyle,
        state.tool === "brush"
          ? { texture: state.brush.texture, textureIntensity: state.brush.textureIntensity }
          : undefined
      );
      act({ type: "ADD_LAYER", layer });
      dragRef.current = { mode: "draw", start: pt, layerStarts: new Map(), drawLayerId: layer.id };
      return;
    }

    if (state.tool === "path-edit") {
      const pathLayer = [...state.project.layers].reverse().find((l) => l.type === "path" && hitTestLayer(pt, l));
      if (pathLayer && pathLayer.type === "path") {
        act({ type: "SELECT_LAYERS", ids: [pathLayer.id] });
        const hit = hitTestPathHandle(pt, pathLayer, state.viewport.zoom);
        if (hit) {
          dragRef.current = {
            mode: "path-edit",
            start: pt,
            layerStarts: new Map(),
            pathEditLayerId: pathLayer.id,
            pathEditHandle: hit.handle,
            penIndex: hit.index,
            pathSnapshot: JSON.parse(JSON.stringify(pathLayer.points)),
          };
          act({ type: "SET_PATH_EDIT", index: hit.index, handle: hit.handle });
        }
      }
      return;
    }

    const selected = getSelectedLayers();
    const bounds = getSelectionBounds(selected);
    if (bounds && state.tool === "select") {
      const handle = hitTestHandle(pt, bounds, state.viewport.zoom);
      if (handle && handle !== "rotate") {
        const starts = new Map<string, Partial<VectorLayer>>();
        for (const l of selected) starts.set(l.id, JSON.parse(JSON.stringify(l)));
        dragRef.current = { mode: "resize", start: pt, layerStarts: starts, handle, bounds };
        return;
      }
    }

    const hit = [...state.project.layers].reverse().find((l) => !l.locked && hitTestLayer(pt, l));
    if (hit && state.tool === "select") {
      const multi = isMulti(e);
      if (!state.selectedLayerIds.includes(hit.id)) {
        act({ type: "TOGGLE_LAYER_SELECT", id: hit.id, multi });
      } else if (multi) {
        act({ type: "TOGGLE_LAYER_SELECT", id: hit.id, multi: true });
        return;
      }
      const ids = multi
        ? state.selectedLayerIds.includes(hit.id)
          ? state.selectedLayerIds.filter((id) => id !== hit.id)
          : [...state.selectedLayerIds, hit.id]
        : state.selectedLayerIds.includes(hit.id)
          ? state.selectedLayerIds
          : [hit.id];
      const starts = new Map<string, Partial<VectorLayer>>();
      for (const id of ids) {
        const l = state.project.layers.find((x) => x.id === id);
        if (l) starts.set(id, JSON.parse(JSON.stringify(l)));
      }
      dragRef.current = { mode: "move", start: pt, layerStarts: starts };
    } else if (state.tool === "select") {
      act({ type: "SELECT_LAYERS", ids: [] });
      act({ type: "SET_MARQUEE", marquee: { x: pt.x, y: pt.y, width: 0, height: 0 } });
      dragRef.current = { mode: "marquee", start: pt, layerStarts: new Map() };
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag.mode || !state.project) return;
    let pt = screenToCanvas(e.clientX, e.clientY);
    if (state.viewport.snapToGrid && drag.mode === "move") {
      pt = snapPoint(pt, state.viewport.gridSize, true);
    }

    if (drag.mode === "pan") {
      act({
        type: "SET_VIEWPORT",
        patch: {
          panX: state.viewport.panX + (e.clientX - drag.start.x),
          panY: state.viewport.panY + (e.clientY - drag.start.y),
        },
      });
      dragRef.current.start = { x: e.clientX, y: e.clientY };
      return;
    }

    if (drag.mode === "marquee") {
      act({ type: "SET_MARQUEE", marquee: { x: drag.start.x, y: drag.start.y, width: pt.x - drag.start.x, height: pt.y - drag.start.y } });
      return;
    }

    if (drag.mode === "shape" && state.draftShape) {
      let w = pt.x - drag.start.x;
      let h = pt.y - drag.start.y;
      if (state.draftShape.type === "circle" || (state.draftShape.type === "ellipse" && e.shiftKey)) {
        const size = Math.max(Math.abs(w), Math.abs(h));
        w = Math.sign(w || 1) * size;
        h = Math.sign(h || 1) * size;
      }
      if (state.draftShape.type === "line") {
        act({ type: "SET_DRAFT_SHAPE", draft: { ...state.draftShape, x2: pt.x, y2: pt.y, width: w, height: h } });
      } else {
        act({ type: "SET_DRAFT_SHAPE", draft: { ...state.draftShape, width: w, height: h } });
      }
      return;
    }

    if (drag.mode === "pen-place" && state.penDraft) {
      if (distance(pt, drag.start) <= 4) return;
      const points = [...state.penDraft.points];
      const idx = points.length - 1;
      const anchor = points[idx];
      points[idx] = { ...anchor, handleOut: { x: pt.x, y: pt.y }, handleIn: e.altKey ? anchor.handleIn : mirrorHandle(anchor, pt) };
      act({ type: "SET_PEN_DRAFT", draft: { ...state.penDraft, points } });
      dragRef.current.mode = "pen-handle";
      dragRef.current.penIndex = idx;
      return;
    }

    if (drag.mode === "pen-handle" && state.penDraft && drag.penIndex !== undefined) {
      const points = [...state.penDraft.points];
      const anchor = points[drag.penIndex];
      points[drag.penIndex] = { ...anchor, handleOut: { x: pt.x, y: pt.y }, handleIn: e.altKey ? anchor.handleIn : mirrorHandle(anchor, pt) };
      act({ type: "SET_PEN_DRAFT", draft: { ...state.penDraft, points } });
      return;
    }

    if (drag.mode === "path-edit" && drag.pathEditLayerId && drag.pathSnapshot && drag.penIndex !== undefined) {
      const points = JSON.parse(JSON.stringify(drag.pathSnapshot)) as BezierPoint[];
      const p = points[drag.penIndex];
      if (drag.pathEditHandle === "anchor") {
        const dx = pt.x - drag.start.x;
        const dy = pt.y - drag.start.y;
        const orig = drag.pathSnapshot[drag.penIndex];
        points[drag.penIndex] = {
          ...p,
          x: orig.x + dx,
          y: orig.y + dy,
          handleIn: orig.handleIn ? { x: orig.handleIn.x + dx, y: orig.handleIn.y + dy } : undefined,
          handleOut: orig.handleOut ? { x: orig.handleOut.x + dx, y: orig.handleOut.y + dy } : undefined,
        };
      } else if (drag.pathEditHandle === "out") {
        points[drag.penIndex] = { ...p, handleOut: { x: pt.x, y: pt.y }, handleIn: e.altKey ? p.handleIn : mirrorHandle(p, pt) };
      } else {
        points[drag.penIndex] = { ...p, handleIn: { x: pt.x, y: pt.y }, handleOut: e.altKey ? p.handleOut : mirrorHandle(p, pt) };
      }
      act({ type: "UPDATE_LAYER", id: drag.pathEditLayerId, patch: { points } });
      return;
    }

    if (drag.mode === "draw" && state.selectedLayerIds.length) {
      const id = drag.drawLayerId ?? state.selectedLayerIds[state.selectedLayerIds.length - 1];
      const layer = state.project.layers.find((l) => l.id === id);
      if (layer?.type === "path") {
        const raw = [...layer.points.map((p) => ({ x: p.x, y: p.y })), pt];
        const tol = state.tool === "brush" ? state.brush.smoothing : 1.5;
        act({ type: "UPDATE_LAYER", id, patch: { points: pointsToBezier(simplifyPoints(raw, tol)) } });
      }
      return;
    }

    if (drag.mode === "resize" && drag.handle && drag.handle !== "rotate" && drag.bounds) {
      for (const [id, snap] of drag.layerStarts) {
        act({ type: "UPDATE_LAYER", id, patch: resizeLayerFromHandle(snap as VectorLayer, drag.bounds!, drag.handle as ResizeHandle, pt, e.shiftKey) });
      }
      return;
    }

    if (drag.mode === "move") {
      const dx = pt.x - drag.start.x;
      const dy = pt.y - drag.start.y;
      for (const [id, snap] of drag.layerStarts) {
        const layer = snap as VectorLayer;
        if (layer.type === "line") {
          act({ type: "UPDATE_LAYER", id, patch: { x: layer.x + dx, y: layer.y + dy, x2: layer.x2 + dx, y2: layer.y2 + dy } });
        } else if (layer.type === "path") {
          const points = layer.points.map((p) => ({
            ...p,
            x: p.x + dx,
            y: p.y + dy,
            handleIn: p.handleIn ? { x: p.handleIn.x + dx, y: p.handleIn.y + dy } : undefined,
            handleOut: p.handleOut ? { x: p.handleOut.x + dx, y: p.handleOut.y + dy } : undefined,
          }));
          act({ type: "UPDATE_LAYER", id, patch: { points } });
        } else {
          act({ type: "UPDATE_LAYER", id, patch: { x: layer.x + dx, y: layer.y + dy } });
        }
      }
    }
  };

  const handlePointerUp = () => {
    if (!state.project) return;
    const drag = dragRef.current;

    if (drag.mode === "marquee" && state.marquee) {
      const ids = layersIntersectingRect(state.project.layers, state.marquee.x, state.marquee.y, state.marquee.width, state.marquee.height);
      act({ type: "SELECT_LAYERS", ids });
      act({ type: "SET_MARQUEE", marquee: null });
    }

    if (drag.mode === "shape" && state.draftShape) {
      const d = state.draftShape;
      if (d.type === "line" && d.x2 !== undefined) {
        act({ type: "ADD_LAYER", layer: createShapeLayer("line", d.x, d.y, 0, 0, state.style, d.x2, d.y2) }, true);
      } else {
        const norm = normalizeRect(d.x, d.y, d.width, d.height);
        if (norm.width > 2 || norm.height > 2) {
          const shapeType = d.type === "circle" || d.type === "ellipse" ? "ellipse" : "rect";
          act({ type: "ADD_LAYER", layer: createShapeLayer(shapeType, norm.x, norm.y, norm.width, norm.height, state.style) }, true);
        }
      }
      act({ type: "SET_DRAFT_SHAPE", draft: null });
    }

    if ((drag.mode === "pen-handle" || drag.mode === "pen-place") && state.penDraft && state.penDraft.points.length > 2) {
      const optimized = optimizePathPoints(state.penDraft.points, "pen");
      if (optimized.length < state.penDraft.points.length) {
        act({ type: "SET_PEN_DRAFT", draft: { ...state.penDraft, points: optimized } });
      }
    }

    if (drag.mode === "draw") {
      const id = drag.drawLayerId ?? state.selectedLayerIds[state.selectedLayerIds.length - 1];
      const layer = id ? state.project.layers.find((l) => l.id === id) : undefined;
      if (layer?.type === "path" && (layer.pathKind === "brush" || layer.pathKind === "pencil")) {
        const optimized = optimizePathPoints(layer.points, layer.pathKind, {
          brushSmoothing: state.brush.smoothing,
        });
        if (optimized.length < 2) {
          act({ type: "DELETE_LAYERS", ids: [layer.id] });
          act({ type: "SELECT_LAYERS", ids: [] });
        } else {
          const bounds = getPathBounds(optimized);
          act({
            type: "UPDATE_LAYER",
            id: layer.id,
            patch: {
              points: optimized,
              ...(bounds ? { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height } : {}),
            },
          });
        }
      }
    }

    if (drag.mode === "draw" || drag.mode === "move" || drag.mode === "resize" || drag.mode === "path-edit") {
      commit();
    }

    dragRef.current = { mode: null, start: { x: 0, y: 0 }, layerStarts: new Map() };
    act({ type: "SET_PATH_EDIT", index: null, handle: null });
  };

  const handleDoubleClick = () => {
    if (state.tool === "pen" && state.penDraft && state.penDraft.points.length >= 2) {
      finishPenPath(false);
    }
  };

  const setTool = (tool: ToolId) => {
    if (state.tool === "pen" && state.penDraft) finishPenPath(false);
    act({ type: "SET_TOOL", tool });
    act({ type: "SET_MARQUEE", marquee: null });
  };

  return {
    state,
    store,
    svgRef,
    viewportRef,
    act,
    commit,
    undo: () => act({ type: "UNDO" }),
    redo: () => act({ type: "REDO" }),
    canUndo: store.past.length > 0,
    canRedo: store.future.length > 0,
    newProject,
    openProject,
    fitToScreen,
    zoomBy,
    setTool,
    finishPenPath,
    alignSelected,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleDoubleClick,
    getSelectionBounds,
  };
}
