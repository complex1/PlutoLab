import { useCallback, useEffect, useRef, useState } from "react";
import type { AlignKind, BrushStroke, DistributeKind, LayerMask, PixLayer, Point, TextLayer, ToolId } from "./types";
import { createId } from "./types";
import {
  createDrawingLayer,
  createEmptyImageLayer,
  createImageLayer,
  createStore,
  dispatch,
  type PixAction,
  type PixStore,
} from "./pixReducer";
import { fileToDataUrl, getImageDimensions, readClipboardImage } from "./imageImport";
import { extractPalette, pickColorFromCanvas, preloadLayerImages, renderProjectToCanvas } from "./renderEngine";
import { applyChromaKey } from "./imageProcessing";
import { saveProject, loadAutosave } from "./projectStorage";
import {
  alignLayers,
  distributeLayers,
  getSelectionBounds,
  hitTestHandle,
  resizeLayersFromHandle,
  rotateLayers,
  snapPoint,
  type ResizeHandle,
  type SelectionHandle,
} from "./selectionLogic";

function formatShortcut(shortcut: string) {
  const mod = /Mac|iPhone|iPad/.test(navigator.userAgent) ? "⌘" : "Ctrl";
  return shortcut.replace("Mod", mod);
}

export { formatShortcut };

export function usePixEditor() {
  const [store, setStore] = useState<PixStore>(() => createStore());
  const state = store.present;

  useEffect(() => {
    void loadAutosave().then((autosave) => {
      if (autosave) setStore(createStore(autosave ?? undefined));
    });
  }, []);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    mode: "pan" | "move" | "crop" | "draw" | "resize" | "rotate" | null;
    start: Point;
    layerStarts: Map<string, { x: number; y: number }>;
    stroke?: BrushStroke;
    drawingLayerId?: string;
    handle?: SelectionHandle;
    snapshots?: PixLayer[];
    rotateCenter?: Point;
    startAngle?: number;
  }>({ mode: null, start: { x: 0, y: 0 }, layerStarts: new Map() });
  const originalSnapshotRef = useRef<string | null>(null);
  const clipboardRef = useRef<PixLayer[]>([]);
  const spaceHeldRef = useRef(false);

  const act = useCallback((action: PixAction, commit = false) => {
    setStore((s) => {
      let next = dispatch(s, action);
      if (commit) next = dispatch(next, { type: "COMMIT_HISTORY" });
      return next;
    });
  }, []);

  const commit = useCallback(() => act({ type: "COMMIT_HISTORY" }), [act]);

  const render = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    await preloadLayerImages(state.project.layers);
    renderProjectToCanvas(canvas, state.project, {
      selectedIds: state.selectedLayerIds,
      cropOverlay: state.crop?.active ? state.crop : null,
      zoom: state.viewport.zoom,
    });
  }, [state.project, state.selectedLayerIds, state.crop, state.viewport.zoom]);

  useEffect(() => {
    render();
  }, [render]);

  useEffect(() => {
    const t = setTimeout(() => saveProject(state.project), 800);
    return () => clearTimeout(t);
  }, [state.project]);

  const screenToCanvas = useCallback((clientX: number, clientY: number): Point => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  }, []);

  const importFiles = useCallback(
    async (files: FileList | File[]) => {
      const list = Array.from(files).filter((f) => f.type.startsWith("image/") || f.name.endsWith(".svg"));
      for (const file of list) {
        const src = await fileToDataUrl(file);
        const { width, height } = await getImageDimensions(src);
        const layer = createImageLayer(src, width, height, file.name);
        act({ type: "ADD_LAYER", layer }, true);
      }
    },
    [act]
  );

  const importSample = useCallback(
    async (src: string, name: string) => {
      const { width, height } = await getImageDimensions(src);
      act({ type: "ADD_LAYER", layer: createImageLayer(src, width, height, name) }, true);
    },
    [act]
  );

  const pasteImage = useCallback(async () => {
    const src = await readClipboardImage();
    if (!src) return;
    const { width, height } = await getImageDimensions(src);
    act({ type: "ADD_LAYER", layer: createImageLayer(src, width, height, "Pasted image") }, true);
  }, [act]);

  const copyLayers = useCallback(() => {
    const layers = state.project.layers.filter((l) => state.selectedLayerIds.includes(l.id));
    clipboardRef.current = JSON.parse(JSON.stringify(layers));
  }, [state.project.layers, state.selectedLayerIds]);

  const pasteLayers = useCallback(() => {
    if (!clipboardRef.current.length) return;
    const copies = clipboardRef.current.map((l) => ({
      ...JSON.parse(JSON.stringify(l)),
      id: createId(),
      name: `${l.name} copy`,
      x: l.x + 20,
      y: l.y + 20,
    }));
    act({
      type: "SET_LAYERS",
      layers: [...state.project.layers, ...copies],
    });
    act({ type: "SELECT_LAYERS", ids: copies.map((c) => c.id) }, true);
  }, [act, state.project.layers]);

  const alignSelected = useCallback(
    (kind: AlignKind) => {
      const selected = state.project.layers.filter((l) => state.selectedLayerIds.includes(l.id));
      const aligned = alignLayers(selected, kind, state.project.canvasWidth, state.project.canvasHeight);
      const map = new Map(aligned.map((l) => [l.id, l]));
      act({
        type: "SET_LAYERS",
        layers: state.project.layers.map((l) => map.get(l.id) ?? l),
      }, true);
    },
    [act, state.project.canvasWidth, state.project.canvasHeight, state.project.layers, state.selectedLayerIds]
  );

  const distributeSelected = useCallback(
    (kind: DistributeKind) => {
      const selected = state.project.layers.filter((l) => state.selectedLayerIds.includes(l.id));
      const distributed = distributeLayers(selected, kind);
      const map = new Map(distributed.map((l) => [l.id, l]));
      act({
        type: "SET_LAYERS",
        layers: state.project.layers.map((l) => map.get(l.id) ?? l),
      }, true);
    },
    [act, state.project.layers, state.selectedLayerIds]
  );

  const addTextLayer = useCallback((text = "Edit me", opts?: Partial<TextLayer>) => {
    const layer: TextLayer = {
      id: createId(),
      name: "Text",
      type: "text",
      visible: true,
      locked: false,
      opacity: 100,
      x: state.project.canvasWidth / 2 - 100,
      y: state.project.canvasHeight / 2,
      width: 200,
      height: 40,
      rotation: 0,
      flipH: false,
      flipV: false,
      text,
      fontFamily: "Impact",
      fontSize: 48,
      color: "#ffffff",
      bold: false,
      italic: false,
      underline: false,
      align: "center",
      letterSpacing: 0,
      lineHeight: 1.2,
      shadow: true,
      outline: true,
      ...opts,
    };
    act({ type: "ADD_LAYER", layer }, true);
    act({ type: "SET_TOOL", tool: "select" });
    act({ type: "SET_PANEL", panel: "text" });
  }, [act, state.project.canvasWidth, state.project.canvasHeight]);

  const addShapeLayer = useCallback(() => {
    const layer: PixLayer = {
      id: createId(),
      name: "Shape",
      type: "shape",
      visible: true,
      locked: false,
      opacity: 100,
      x: state.project.canvasWidth / 2 - 80,
      y: state.project.canvasHeight / 2 - 80,
      width: 160,
      height: 160,
      rotation: 0,
      flipH: false,
      flipV: false,
      shape: state.shapeKind,
      fill: state.shapeFill,
      stroke: state.shapeStroke,
      strokeWidth: state.shapeStrokeWidth,
      cornerRadius: 16,
      dashed: false,
    };
    act({ type: "ADD_LAYER", layer }, true);
    act({ type: "SET_TOOL", tool: "select" });
  }, [act, state]);

  const addEmptyImageLayer = useCallback(() => {
    const layer = createEmptyImageLayer(state.project);
    act({ type: "ADD_LAYER", layer }, true);
    act({ type: "SET_TOOL", tool: "select" });
  }, [act, state.project]);

  const addDrawingLayer = useCallback(() => {
    const layer = createDrawingLayer(state.project);
    act({ type: "ADD_LAYER", layer }, true);
    act({ type: "SET_TOOL", tool: "brush" });
  }, [act, state.project]);

  const addSticker = useCallback(
    (emoji: string) => {
      const layer: PixLayer = {
        id: createId(),
        name: "Sticker",
        type: "sticker",
        visible: true,
        locked: false,
        opacity: 100,
        x: 100,
        y: 100,
        width: 64,
        height: 64,
        rotation: 0,
        flipH: false,
        flipV: false,
        content: emoji,
        isEmoji: true,
      };
      act({ type: "ADD_LAYER", layer }, true);
    },
    [act]
  );

  const addWatermarkLayer = useCallback(() => {
    const wm = state.watermark;
    const layer: PixLayer = {
      id: createId(),
      name: "Watermark",
      type: "watermark",
      visible: true,
      locked: false,
      opacity: wm.opacity,
      x: 20,
      y: state.project.canvasHeight - 60,
      width: 200,
      height: wm.size,
      rotation: 0,
      flipH: false,
      flipV: false,
      text: wm.text,
      repeat: wm.repeat,
      tileSpacing: 120,
    };
    act({ type: "ADD_LAYER", layer }, true);
  }, [act, state.project.canvasHeight, state.watermark]);

  const applyMaskToSelected = useCallback(
    (mask: Partial<LayerMask>) => {
      for (const id of state.selectedLayerIds) {
        const layer = state.project.layers.find((l) => l.id === id);
        if (!layer) continue;
        const existing = layer.mask ?? {
          kind: "rect" as const,
          inverted: false,
          x: layer.x,
          y: layer.y,
          width: layer.width,
          height: layer.height,
        };
        act({ type: "UPDATE_LAYER", id, patch: { mask: { ...existing, ...mask } } });
      }
      commit();
    },
    [act, commit, state.project.layers, state.selectedLayerIds]
  );

  const extractPaletteFromCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return [];
    const colors = extractPalette(canvas, 8);
    for (const c of colors) act({ type: "ADD_PALETTE_COLOR", color: c });
    return colors;
  }, [act]);

  const applyChromaToSelected = useCallback(() => {
    const layer = state.project.layers.find(
      (l) => state.selectedLayerIds.includes(l.id) && l.type === "image"
    );
    if (!layer || layer.type !== "image") return;
    const canvas = document.createElement("canvas");
    canvas.width = layer.width;
    canvas.height = layer.height;
    const ctx = canvas.getContext("2d")!;
    const img = new Image();
    img.src = layer.src;
    img.onload = () => {
      ctx.drawImage(img, 0, 0, layer.width, layer.height);
      const data = ctx.getImageData(0, 0, layer.width, layer.height);
      applyChromaKey(data, state.chroma);
      ctx.putImageData(data, 0, 0);
      const src = canvas.toDataURL("image/png");
      act({ type: "UPDATE_LAYER", id: layer.id, patch: { src } }, true);
    };
  }, [act, state.chroma, state.project.layers, state.selectedLayerIds]);

  const fitToScreen = useCallback(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    const pad = 40;
    const zw = (vp.clientWidth - pad) / state.project.canvasWidth;
    const zh = (vp.clientHeight - pad) / state.project.canvasHeight;
    const zoom = Math.min(zw, zh, 1);
    act({
      type: "SET_VIEWPORT",
      patch: {
        zoom,
        panX: (vp.clientWidth - state.project.canvasWidth * zoom) / 2,
        panY: (vp.clientHeight - state.project.canvasHeight * zoom) / 2,
      },
    });
  }, [act, state.project.canvasWidth, state.project.canvasHeight]);

  useEffect(() => {
    fitToScreen();
  }, [state.project.canvasWidth, state.project.canvasHeight]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space") spaceHeldRef.current = true;
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

  const getSelectedLayers = () =>
    state.project.layers.filter((l) => state.selectedLayerIds.includes(l.id));

  const handlePointerDown = (e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);
    let pt = screenToCanvas(e.clientX, e.clientY);
    if (state.viewport.snapToGrid) {
      pt = snapPoint(pt, state.viewport.gridSize, true);
    }

    if (e.button === 1 || (e.button === 0 && e.altKey) || spaceHeldRef.current) {
      dragRef.current = { mode: "pan", start: { x: e.clientX, y: e.clientY }, layerStarts: new Map() };
      return;
    }

    if (state.tool === "crop" && !state.crop) {
      act({
        type: "SET_CROP",
        crop: { active: true, x: pt.x, y: pt.y, width: 0, height: 0, ratio: null },
      });
      dragRef.current = { mode: "crop", start: pt, layerStarts: new Map() };
      return;
    }

    if (state.tool === "brush" || state.tool === "eraser") {
      const stroke: BrushStroke = {
        points: [pt],
        color: state.tool === "eraser" ? "eraser" : state.brush.color,
        size: state.brush.size,
        opacity: state.brush.opacity,
        soft: state.brush.soft,
        dashed: state.brush.dashed,
        kind: state.brush.kind,
      };

      setStore((s) => {
        let drawing = s.present.project.layers.find((l) => l.type === "drawing" && !l.locked);
        let layers = s.present.project.layers;

        if (!drawing) {
          drawing = createDrawingLayer(s.present.project);
          layers = [...layers, { ...drawing, strokes: [stroke] } as PixLayer];
        } else {
          layers = layers.map((l) =>
            l.id === drawing!.id && l.type === "drawing"
              ? { ...l, strokes: [...l.strokes, stroke] }
              : l
          );
        }

        dragRef.current = {
          mode: "draw",
          start: pt,
          layerStarts: new Map(),
          stroke,
          drawingLayerId: drawing.id,
        };

        return {
          ...s,
          present: {
            ...s.present,
            project: { ...s.present.project, layers, updatedAt: Date.now() },
          },
        };
      });
      return;
    }

    if (state.tool === "eyedropper") {
      const color = pickColorFromCanvas(canvas, pt.x, pt.y);
      if (color) {
        act({ type: "ADD_RECENT_COLOR", color });
        act({ type: "SET_BRUSH", patch: { color } });
      }
      return;
    }

    if (state.tool === "mask" && state.selectedLayerIds.length) {
      const layer = state.project.layers.find((l) => l.id === state.selectedLayerIds[0]);
      if (layer) {
        act({
          type: "UPDATE_LAYER",
          id: layer.id,
          patch: {
            mask: {
              kind: "rect",
              inverted: false,
              x: pt.x,
              y: pt.y,
              width: 0,
              height: 0,
            },
          },
        });
        dragRef.current = { mode: "crop", start: pt, layerStarts: new Map() };
      }
      return;
    }

    const selected = getSelectedLayers();
    const bounds = getSelectionBounds(selected);
    if (bounds && (state.tool === "select" || state.tool === "move")) {
      const handle = hitTestHandle(pt, bounds, state.viewport.zoom);
      if (handle) {
        const snapshots = JSON.parse(JSON.stringify(selected)) as PixLayer[];
        if (handle === "rotate") {
          const cx = bounds.x + bounds.width / 2;
          const cy = bounds.y + bounds.height / 2;
          dragRef.current = {
            mode: "rotate",
            start: pt,
            layerStarts: new Map(),
            handle,
            snapshots,
            rotateCenter: { x: cx, y: cy },
            startAngle: Math.atan2(pt.y - cy, pt.x - cx),
          };
        } else {
          dragRef.current = {
            mode: "resize",
            start: pt,
            layerStarts: new Map(),
            handle,
            snapshots,
          };
        }
        return;
      }
    }

    const hit = [...state.project.layers].reverse().find((l) => {
      if (!l.visible || l.locked) return false;
      return pt.x >= l.x && pt.x <= l.x + l.width && pt.y >= l.y && pt.y <= l.y + l.height;
    });

    if (hit && (state.tool === "select" || state.tool === "move")) {
      act({ type: "TOGGLE_LAYER_SELECT", id: hit.id, multi: e.shiftKey });
      const ids = state.selectedLayerIds.includes(hit.id) ? state.selectedLayerIds : [hit.id];
      const starts = new Map<string, { x: number; y: number }>();
      for (const id of ids) {
        const l = state.project.layers.find((x) => x.id === id);
        if (l) starts.set(id, { x: l.x, y: l.y });
      }
      dragRef.current = { mode: "move", start: pt, layerStarts: starts };
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag.mode) return;
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

    if (drag.mode === "crop" && state.crop) {
      const w = pt.x - drag.start.x;
      const h = pt.y - drag.start.y;
      let width = Math.abs(w);
      let height = Math.abs(h);
      if (state.crop.ratio) {
        if (width / height > state.crop.ratio) width = height * state.crop.ratio;
        else height = width / state.crop.ratio;
      }
      act({
        type: "SET_CROP",
        crop: {
          ...state.crop,
          x: w < 0 ? drag.start.x - width : drag.start.x,
          y: h < 0 ? drag.start.y - height : drag.start.y,
          width,
          height,
        },
      });
      return;
    }

    if (drag.mode === "crop" && state.tool === "mask" && state.selectedLayerIds[0]) {
      const w = pt.x - drag.start.x;
      const h = pt.y - drag.start.y;
      act({
        type: "UPDATE_LAYER",
        id: state.selectedLayerIds[0],
        patch: {
          mask: {
            kind: "rect",
            inverted: false,
            x: w < 0 ? drag.start.x - Math.abs(w) : drag.start.x,
            y: h < 0 ? drag.start.y - Math.abs(h) : drag.start.y,
            width: Math.abs(w),
            height: Math.abs(h),
          },
        },
      });
      return;
    }

    if (drag.mode === "draw" && drag.drawingLayerId) {
      setStore((s) => {
        const layers = s.present.project.layers.map((l) => {
          if (l.id !== drag.drawingLayerId || l.type !== "drawing") return l;
          const strokes = l.strokes.slice();
          const last = strokes[strokes.length - 1];
          if (!last) return l;
          const nextStroke = { ...last, points: [...last.points, pt] };
          strokes[strokes.length - 1] = nextStroke;
          dragRef.current.stroke = nextStroke;
          return { ...l, strokes };
        });
        return {
          ...s,
          present: {
            ...s.present,
            project: { ...s.present.project, layers, updatedAt: Date.now() },
          },
        };
      });
      return;
    }

    if (drag.mode === "resize" && drag.snapshots && drag.handle && drag.handle !== "rotate") {
      const bounds = getSelectionBounds(drag.snapshots);
      if (!bounds) return;
      const resized = resizeLayersFromHandle(
        state.project.layers,
        drag.snapshots,
        bounds,
        drag.handle as ResizeHandle,
        pt,
        e.shiftKey
      );
      act({ type: "SET_LAYERS", layers: resized });
      return;
    }

    if (drag.mode === "rotate" && drag.snapshots && drag.rotateCenter && drag.startAngle !== undefined) {
      const angle = Math.atan2(pt.y - drag.rotateCenter.y, pt.x - drag.rotateCenter.x);
      const deltaDeg = ((angle - drag.startAngle) * 180) / Math.PI;
      const rotated = rotateLayers(state.project.layers, drag.snapshots, drag.rotateCenter, deltaDeg);
      act({ type: "SET_LAYERS", layers: rotated });
      return;
    }

    if (drag.mode === "move") {
      const dx = pt.x - drag.start.x;
      const dy = pt.y - drag.start.y;
      for (const [id, origin] of drag.layerStarts) {
        act({ type: "UPDATE_LAYER", id, patch: { x: origin.x + dx, y: origin.y + dy } });
      }
    }
  };

  const handlePointerUp = () => {
    if (dragRef.current.mode === "draw" || dragRef.current.mode === "move" ||
        dragRef.current.mode === "resize" || dragRef.current.mode === "rotate") {
      commit();
    }
    if (dragRef.current.mode === "crop" && state.tool === "mask") {
      commit();
    }
    dragRef.current = { mode: null, start: { x: 0, y: 0 }, layerStarts: new Map() };
  };

  const setTool = (tool: ToolId) => act({ type: "SET_TOOL", tool });

  const captureOriginal = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    originalSnapshotRef.current = canvas.toDataURL("image/png");
  }, []);

  const toggleFullscreen = useCallback(() => {
    const el = viewportRef.current?.closest(".pluto-pix");
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen?.();
      act({ type: "SET_FULLSCREEN", fullscreen: true });
    } else {
      document.exitFullscreen?.();
      act({ type: "SET_FULLSCREEN", fullscreen: false });
    }
  }, [act]);

  return {
    state,
    store,
    canvasRef,
    viewportRef,
    act,
    commit,
    undo: () => act({ type: "UNDO" }),
    redo: () => act({ type: "REDO" }),
    canUndo: store.past.length > 0,
    canRedo: store.future.length > 0,
    importFiles,
    importSample,
    pasteImage,
    copyLayers,
    pasteLayers,
    alignSelected,
    distributeSelected,
    addTextLayer,
    addShapeLayer,
    addEmptyImageLayer,
    addDrawingLayer,
    addSticker,
    addWatermarkLayer,
    applyMaskToSelected,
    extractPaletteFromCanvas,
    applyChromaToSelected,
    fitToScreen,
    setTool,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    captureOriginal,
    originalSnapshot: originalSnapshotRef.current,
    screenToCanvas,
    toggleFullscreen,
  };
}
