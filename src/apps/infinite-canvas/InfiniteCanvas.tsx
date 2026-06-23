import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import "@fortawesome/fontawesome-free/css/all.min.css";
import {
  DEFAULT_CAMERA,
  DEFAULT_FILL,
  DEFAULT_STROKE,
  createId,
  type Camera,
  type CanvasElement,
  type DraftShape,
  type Point,
  type Tool,
} from "./canvasTypes";
import {
  drawDraftShape,
  drawElement,
  drawGrid,
  downloadContentSnapshot,
  eraseAtPoint,
  hitTestElement,
  loadDocument,
  loadImage,
  normalizeRect,
  saveDocument,
  screenToWorld,
} from "./canvasLogic";
import {
  cloneElement,
  drawSelectionUI,
  drawMarquee,
  elementIntersectsRect,
  getBoundsCenter,
  getSelectionBounds,
  hitTestSelectionHandle,
  moveElements,
  pointInBounds,
  resizeElements,
  rotateElements,
  type Bounds,
  type ResizeHandle,
} from "./selectionLogic";
import { createHistoryController } from "./historyLogic";
import "./InfiniteCanvas.css";

const TOOLS: { id: Tool; label: string; icon: string; shortcut: string }[] = [
  { id: "select", label: "Select", icon: "fa-arrow-pointer", shortcut: "V" },
  { id: "pen", label: "Pen", icon: "fa-pen", shortcut: "P" },
  { id: "eraser", label: "Eraser", icon: "fa-eraser", shortcut: "E" },
  { id: "rect", label: "Rectangle", icon: "fa-square", shortcut: "R" },
  { id: "ellipse", label: "Ellipse", icon: "fa-circle", shortcut: "O" },
  { id: "text", label: "Text", icon: "fa-font", shortcut: "T" },
  { id: "image", label: "Image", icon: "fa-image", shortcut: "I" },
];

const TOOL_BY_SHORTCUT = Object.fromEntries(
  TOOLS.map((t) => [t.shortcut.toLowerCase(), t.id])
) as Record<string, Tool>;

function formatShortcut(shortcut: string) {
  const mod = /Mac|iPhone|iPad/.test(navigator.userAgent) ? "⌘" : "Ctrl";
  return shortcut.replace("Mod", mod);
}

function isTypingTarget(target: EventTarget | null) {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    (target instanceof HTMLElement && target.isContentEditable)
  );
}

function TooltipButton({
  tooltip,
  className,
  onClick,
  disabled,
  children,
}: {
  tooltip: string;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className={className}
      data-tooltip={tooltip}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

type TransformMode = "move" | "resize" | "rotate" | null;

export default function InfiniteCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textInputRef = useRef<HTMLInputElement>(null);
  const imageCacheRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const imageDropWorldRef = useRef<Point | null>(null);

  const elementsRef = useRef<CanvasElement[]>([]);
  const cameraRef = useRef<Camera>({ ...DEFAULT_CAMERA });
  const draftRef = useRef<DraftShape | null>(null);
  const currentPathRef = useRef<CanvasElement | null>(null);

  const [tool, setTool] = useState<Tool>("pen");
  const [stroke, setStroke] = useState(DEFAULT_STROKE);
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [fontSize, setFontSize] = useState(20);
  const [fill, setFill] = useState(DEFAULT_FILL);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [zoomLabel, setZoomLabel] = useState("100%");
  const [textEdit, setTextEdit] = useState<{ x: number; y: number; id?: string } | null>(null);
  const [textValue, setTextValue] = useState("");

  const isPanningRef = useRef(false);
  const isDrawingRef = useRef(false);
  const isDraggingRef = useRef(false);
  const isMarqueeRef = useRef(false);
  const transformModeRef = useRef<TransformMode>(null);
  const activeHandleRef = useRef<ResizeHandle | "rotate" | null>(null);
  const panStartRef = useRef({ x: 0, y: 0, camX: 0, camY: 0 });
  const shapeStartRef = useRef<Point>({ x: 0, y: 0 });
  const dragOriginRef = useRef<Point>({ x: 0, y: 0 });
  const transformSnapshotsRef = useRef<CanvasElement[]>([]);
  const transformBoundsRef = useRef<Bounds | null>(null);
  const rotateStartAngleRef = useRef(0);
  const marqueeStartRef = useRef<Point>({ x: 0, y: 0 });
  const marqueeRef = useRef<Bounds | null>(null);
  const shiftHeldOnPointerRef = useRef(false);
  const spaceHeldRef = useRef(false);
  const rafRef = useRef(0);
  const historyRef = useRef(createHistoryController(elementsRef.current));

  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [, setElementsVersion] = useState(0);

  const bumpElements = useCallback(() => setElementsVersion((v) => v + 1), []);

  const syncHistoryState = useCallback(() => {
    setCanUndo(historyRef.current.canUndo());
    setCanRedo(historyRef.current.canRedo());
  }, []);

  const preloadImages = useCallback(async (elements: CanvasElement[]) => {
    const cache = imageCacheRef.current;
    for (const el of elements) {
      if (el.type !== "image" || cache.has(el.src)) continue;
      try {
        const img = await loadImage(el.src);
        cache.set(el.src, img);
      } catch {
        /* ignore broken images */
      }
    }
  }, []);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    const camera = cameraRef.current;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#0f0f0f";
    ctx.fillRect(0, 0, w, h);

    drawGrid(ctx, camera, w, h);

    for (const el of elementsRef.current) {
      drawElement(ctx, el, camera, w, h, imageCacheRef.current);
    }

    if (draftRef.current) {
      drawDraftShape(ctx, draftRef.current, camera, w, h, stroke, fill);
    }

    if (selectedIds.length > 0) {
      const selected = elementsRef.current.filter((e) => selectedIds.includes(e.id));
      const bounds = getSelectionBounds(selected);
      if (bounds) {
        drawSelectionUI(ctx, bounds, camera, w, h, marqueeRef.current);
      }
    } else if (marqueeRef.current) {
      drawMarquee(ctx, marqueeRef.current, camera, w, h);
    }
  }, [stroke, fill, selectedIds]);

  const scheduleRender = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(render);
  }, [render]);

  const commitChange = useCallback(() => {
    historyRef.current.commit(elementsRef.current);
    void saveDocument(elementsRef.current);
    syncHistoryState();
    bumpElements();
  }, [syncHistoryState, bumpElements]);

  const restoreElements = useCallback(
    (elements: CanvasElement[]) => {
      elementsRef.current = elements;
      setSelectedIds((ids) => ids.filter((id) => elements.some((el) => el.id === id)));
      void saveDocument(elements);
      preloadImages(elements).then(scheduleRender);
      syncHistoryState();
      bumpElements();
    },
    [bumpElements, preloadImages, scheduleRender, syncHistoryState]
  );

  const undo = useCallback(() => {
    const prev = historyRef.current.undo(elementsRef.current);
    if (!prev) return;
    restoreElements(prev);
  }, [restoreElements]);

  const redo = useCallback(() => {
    const next = historyRef.current.redo(elementsRef.current);
    if (!next) return;
    restoreElements(next);
  }, [restoreElements]);

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const dpr = window.devicePixelRatio || 1;
    const w = container.clientWidth;
    const h = container.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    scheduleRender();
  }, [scheduleRender]);

  const getWorldPoint = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current!;
    return screenToWorld(clientX, clientY, cameraRef.current, canvas.getBoundingClientRect());
  };

  const getSelectedElements = () =>
    elementsRef.current.filter((el) => selectedIds.includes(el.id));

  const applySelectionTransform = (nextSnapshots: CanvasElement[]) => {
    const byId = new Map(nextSnapshots.map((el) => [el.id, el]));
    elementsRef.current = elementsRef.current.map((el) => byId.get(el.id) ?? el);
  };

  const updateSelection = (ids: string[]) => {
    setSelectedIds(ids);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (tool !== "text" && tool !== "image") {
      canvas.setPointerCapture(e.pointerId);
    }

    if (e.button === 1 || spaceHeldRef.current || (e.button === 0 && e.altKey)) {
      isPanningRef.current = true;
      panStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        camX: cameraRef.current.x,
        camY: cameraRef.current.y,
      };
      return;
    }

    if (e.button !== 0) return;

    const world = getWorldPoint(e.clientX, e.clientY);
    const canvasW = canvas.clientWidth;
    const canvasH = canvas.clientHeight;

    if (tool === "select") {
      shiftHeldOnPointerRef.current = e.shiftKey;
      const selected = getSelectedElements();
      const selectionBounds = getSelectionBounds(selected);

      if (selected.length > 0 && selectionBounds) {
        const handle = hitTestSelectionHandle(
          world,
          selectionBounds,
          cameraRef.current,
          canvasW,
          canvasH
        );
        if (handle) {
          transformSnapshotsRef.current = selected.map(cloneElement);
          transformBoundsRef.current = selectionBounds;
          dragOriginRef.current = world;
          if (handle === "rotate") {
            transformModeRef.current = "rotate";
            const center = getBoundsCenter(selectionBounds);
            rotateStartAngleRef.current = Math.atan2(
              world.y - center.y,
              world.x - center.x
            );
          } else {
            transformModeRef.current = "resize";
            activeHandleRef.current = handle;
          }
          scheduleRender();
          return;
        }
      }

      if (selected.length > 0 && selectionBounds && pointInBounds(world, selectionBounds)) {
        isDraggingRef.current = true;
        transformModeRef.current = "move";
        dragOriginRef.current = world;
        transformSnapshotsRef.current = selected.map(cloneElement);
        scheduleRender();
        return;
      }

      const hit = [...elementsRef.current]
        .reverse()
        .find((el) => hitTestElement(el, world));

      if (hit) {
        const toggle = e.metaKey || e.ctrlKey;
        const add = e.shiftKey;
        let nextIds = selectedIds;

        if (toggle) {
          nextIds = selectedIds.includes(hit.id)
            ? selectedIds.filter((id) => id !== hit.id)
            : [...selectedIds, hit.id];
        } else if (add) {
          nextIds = selectedIds.includes(hit.id) ? selectedIds : [...selectedIds, hit.id];
        } else if (!selectedIds.includes(hit.id)) {
          nextIds = [hit.id];
        }

        updateSelection(nextIds);

        if (nextIds.includes(hit.id)) {
          isDraggingRef.current = true;
          transformModeRef.current = "move";
          dragOriginRef.current = world;
          transformSnapshotsRef.current = elementsRef.current
            .filter((el) => nextIds.includes(el.id))
            .map(cloneElement);
        }
        scheduleRender();
        return;
      }

      if (!e.shiftKey && !e.metaKey && !e.ctrlKey) {
        updateSelection([]);
      }

      isMarqueeRef.current = true;
      marqueeStartRef.current = world;
      marqueeRef.current = { x: world.x, y: world.y, width: 0, height: 0 };
      scheduleRender();
      return;
    }

    if (tool === "pen") {
      isDrawingRef.current = true;
      currentPathRef.current = {
        id: createId(),
        type: "path",
        points: [world],
        color: stroke,
        width: strokeWidth,
      };
      return;
    }

    if (tool === "eraser") {
      isDrawingRef.current = true;
      elementsRef.current = eraseAtPoint(elementsRef.current, world);
      if (selectedIds.some((id) => !elementsRef.current.find((el) => el.id === id))) {
        updateSelection(selectedIds.filter((id) => elementsRef.current.some((el) => el.id === id)));
      }
      scheduleRender();
      return;
    }

    if (tool === "rect" || tool === "ellipse") {
      isDrawingRef.current = true;
      shapeStartRef.current = world;
      draftRef.current = { type: tool, x: world.x, y: world.y, width: 0, height: 0 };
      return;
    }

    if (tool === "text") {
      e.preventDefault();
      setTextEdit({ x: world.x, y: world.y });
      setTextValue("");
      return;
    }

    if (tool === "image") {
      imageDropWorldRef.current = world;
      fileInputRef.current?.click();
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isPanningRef.current) {
      const dx = (e.clientX - panStartRef.current.x) / cameraRef.current.zoom;
      const dy = (e.clientY - panStartRef.current.y) / cameraRef.current.zoom;
      cameraRef.current = {
        ...cameraRef.current,
        x: panStartRef.current.camX - dx,
        y: panStartRef.current.camY - dy,
      };
      scheduleRender();
      return;
    }

    const world = getWorldPoint(e.clientX, e.clientY);

    if (transformModeRef.current === "rotate" && transformBoundsRef.current) {
      const center = getBoundsCenter(transformBoundsRef.current);
      const angle = Math.atan2(world.y - center.y, world.x - center.x);
      const delta = angle - rotateStartAngleRef.current;
      const rotated = rotateElements(transformSnapshotsRef.current, center, delta);
      applySelectionTransform(rotated);
      scheduleRender();
      return;
    }

    if (
      transformModeRef.current === "resize" &&
      transformBoundsRef.current &&
      activeHandleRef.current &&
      activeHandleRef.current !== "rotate"
    ) {
      const resized = resizeElements(
        transformSnapshotsRef.current,
        transformBoundsRef.current,
        activeHandleRef.current,
        world,
        e.shiftKey
      );
      applySelectionTransform(resized);
      scheduleRender();
      return;
    }

    if (isDraggingRef.current && transformModeRef.current === "move") {
      const dx = world.x - dragOriginRef.current.x;
      const dy = world.y - dragOriginRef.current.y;
      const moved = moveElements(transformSnapshotsRef.current, dx, dy);
      applySelectionTransform(moved);
      scheduleRender();
      return;
    }

    if (isMarqueeRef.current) {
      marqueeRef.current = normalizeRect(
        marqueeStartRef.current.x,
        marqueeStartRef.current.y,
        world.x,
        world.y
      );
      scheduleRender();
      return;
    }

    if (!isDrawingRef.current) return;

    if (tool === "pen" && currentPathRef.current?.type === "path") {
      const last = currentPathRef.current.points.at(-1)!;
      if (Math.hypot(last.x - world.x, last.y - world.y) > 1) {
        currentPathRef.current = {
          ...currentPathRef.current,
          points: [...currentPathRef.current.points, world],
        };
        elementsRef.current = [
          ...elementsRef.current.filter((el) => el.id !== currentPathRef.current!.id),
          currentPathRef.current,
        ];
        scheduleRender();
      }
      return;
    }

    if (tool === "eraser") {
      elementsRef.current = eraseAtPoint(elementsRef.current, world);
      scheduleRender();
      return;
    }

    if ((tool === "rect" || tool === "ellipse") && draftRef.current) {
      const norm = normalizeRect(
        shapeStartRef.current.x,
        shapeStartRef.current.y,
        world.x,
        world.y
      );
      draftRef.current = { type: tool, ...norm };
      scheduleRender();
    }
  };

  const handlePointerUp = (e?: React.PointerEvent) => {
    if (isPanningRef.current) {
      isPanningRef.current = false;
      return;
    }

    if (isMarqueeRef.current && marqueeRef.current) {
      const marquee = marqueeRef.current;
      if (marquee.width > 4 || marquee.height > 4) {
        const hits = elementsRef.current
          .filter((el) => elementIntersectsRect(el, marquee))
          .map((el) => el.id);
        if (shiftHeldOnPointerRef.current || e?.shiftKey) {
          updateSelection([...new Set([...selectedIds, ...hits])]);
        } else {
          updateSelection(hits);
        }
      }
      isMarqueeRef.current = false;
      marqueeRef.current = null;
      scheduleRender();
      return;
    }

    if (isDraggingRef.current || transformModeRef.current) {
      isDraggingRef.current = false;
      transformModeRef.current = null;
      activeHandleRef.current = null;
      transformSnapshotsRef.current = [];
      transformBoundsRef.current = null;
      commitChange();
      scheduleRender();
      return;
    }

    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;

    if (tool === "eraser") {
      commitChange();
      scheduleRender();
      return;
    }

    if (tool === "pen" && currentPathRef.current?.type === "path") {
      if (currentPathRef.current.points.length >= 2) {
        commitChange();
      } else {
        elementsRef.current = elementsRef.current.filter(
          (el) => el.id !== currentPathRef.current!.id
        );
      }
      currentPathRef.current = null;
      scheduleRender();
      return;
    }

    if ((tool === "rect" || tool === "ellipse") && draftRef.current) {
      const d = draftRef.current;
      if (d.width > 4 && d.height > 4) {
        const el: CanvasElement =
          d.type === "rect"
            ? {
                id: createId(),
                type: "rect",
                x: d.x,
                y: d.y,
                width: d.width,
                height: d.height,
                fill,
                stroke,
                strokeWidth,
              }
            : {
                id: createId(),
                type: "ellipse",
                x: d.x,
                y: d.y,
                width: d.width,
                height: d.height,
                fill,
                stroke,
                strokeWidth,
              };
        elementsRef.current = [...elementsRef.current, el];
        commitChange();
      }
      draftRef.current = null;
      scheduleRender();
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const worldBefore = screenToWorld(e.clientX, e.clientY, cameraRef.current, rect);

    const factor = e.deltaY > 0 ? 0.92 : 1.08;
    const newZoom = Math.min(4, Math.max(0.1, cameraRef.current.zoom * factor));

    const cx = rect.width / 2;
    const cy = rect.height / 2;
    cameraRef.current = {
      zoom: newZoom,
      x: worldBefore.x - (e.clientX - rect.left - cx) / newZoom,
      y: worldBefore.y - (e.clientY - rect.top - cy) / newZoom,
    };

    setZoomLabel(`${Math.round(newZoom * 100)}%`);
    scheduleRender();
  };

  const commitText = () => {
    if (!textEdit || !textValue.trim()) {
      setTextEdit(null);
      return;
    }

    if (textEdit.id) {
      elementsRef.current = elementsRef.current.map((el) =>
        el.id === textEdit.id && el.type === "text" ? { ...el, text: textValue } : el
      );
    } else {
      elementsRef.current = [
        ...elementsRef.current,
        {
          id: createId(),
          type: "text",
          x: textEdit.x,
          y: textEdit.y,
          text: textValue,
          fontSize,
          color: stroke,
        },
      ];
    }
    commitChange();
    setTextEdit(null);
    setTextValue("");
    scheduleRender();
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const dropAt = imageDropWorldRef.current ?? { x: cameraRef.current.x, y: cameraRef.current.y };

    const reader = new FileReader();
    reader.onload = () => {
      const src = reader.result as string;
      loadImage(src)
        .then((img) => {
          imageCacheRef.current.set(src, img);
          const maxW = 240;
          const scale = Math.min(1, maxW / img.width);
          elementsRef.current = [
            ...elementsRef.current,
            {
              id: createId(),
              type: "image",
              x: dropAt.x,
              y: dropAt.y,
              width: img.width * scale,
              height: img.height * scale,
              src,
            },
          ];
          commitChange();
          scheduleRender();
        })
        .catch(() => undefined);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
    imageDropWorldRef.current = null;
  };

  const deleteSelected = useCallback(() => {
    if (selectedIds.length === 0) return;
    elementsRef.current = elementsRef.current.filter((el) => !selectedIds.includes(el.id));
    setSelectedIds([]);
    commitChange();
    scheduleRender();
  }, [commitChange, scheduleRender, selectedIds]);

  const clearCanvas = () => {
    elementsRef.current = [];
    updateSelection([]);
    commitChange();
    scheduleRender();
  };

  const exportSnapshot = useCallback(() => {
    downloadContentSnapshot(elementsRef.current, imageCacheRef.current);
  }, []);

  const setZoom = useCallback(
    (zoom: number) => {
      cameraRef.current = {
        ...cameraRef.current,
        zoom: Math.min(4, Math.max(0.1, zoom)),
      };
      setZoomLabel(`${Math.round(cameraRef.current.zoom * 100)}%`);
      scheduleRender();
    },
    [scheduleRender]
  );

  const resetZoom = useCallback(() => {
    setZoom(1);
  }, [setZoom]);

  const toggleFullscreen = useCallback(() => {
    const root = containerRef.current?.closest(".infinite-canvas--editor");
    if (!root) return;
    if (!document.fullscreenElement) {
      root.requestFullscreen?.();
      setFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setFullscreen(false);
    }
  }, []);

  const editSelectedText = () => {
    if (selectedIds.length !== 1) return;
    const el = elementsRef.current.find((e) => e.id === selectedIds[0]);
    if (!el || el.type !== "text") return;
    setTextEdit({ x: el.x, y: el.y, id: el.id });
    setTextValue(el.text);
  };

  useEffect(() => {
    if (!textEdit) return;
    const id = window.requestAnimationFrame(() => textInputRef.current?.focus());
    return () => window.cancelAnimationFrame(id);
  }, [textEdit]);

  useEffect(() => {
    const close = () => setOpenMenu(null);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, []);

  useEffect(() => {
    const onFullscreenChange = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void loadDocument().then((elements) => {
      if (cancelled) return;
      elementsRef.current = elements;
      historyRef.current = createHistoryController(elements);
      syncHistoryState();
      bumpElements();
      preloadImages(elements).then(() => {
        if (!cancelled) scheduleRender();
      });
    });
    return () => {
      cancelled = true;
    };
  }, [bumpElements, preloadImages, scheduleRender, syncHistoryState]);

  useEffect(() => {
    resizeCanvas();

    const onResize = () => resizeCanvas();
    window.addEventListener("resize", onResize);

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && !isTypingTarget(e.target)) {
        spaceHeldRef.current = true;
        e.preventDefault();
      }

      if (isTypingTarget(e.target)) return;

      if (e.key === "Escape") {
        updateSelection([]);
        setTextEdit(null);
        scheduleRender();
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "e") {
        e.preventDefault();
        exportSnapshot();
        return;
      }

      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key.toLowerCase() === "z") {
        e.preventDefault();
        undo();
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "z") {
        e.preventDefault();
        redo();
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
        return;
      }

      const toolKey = e.key.toLowerCase();
      if (!e.metaKey && !e.ctrlKey && !e.altKey && TOOL_BY_SHORTCUT[toolKey]) {
        e.preventDefault();
        setTool(TOOL_BY_SHORTCUT[toolKey]);
        return;
      }

      if ((e.code === "Delete" || e.code === "Backspace") && selectedIds.length > 0 && !textEdit) {
        e.preventDefault();
        deleteSelected();
      }
      if (e.code === "Enter" && selectedIds.length === 1 && !textEdit) {
        const el = elementsRef.current.find((x) => x.id === selectedIds[0]);
        if (el?.type === "text") editSelectedText();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") spaceHeldRef.current = false;
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      cancelAnimationFrame(rafRef.current);
    };
  }, [deleteSelected, exportSnapshot, preloadImages, redo, resizeCanvas, scheduleRender, selectedIds, textEdit, undo]);

  const textScreenPos =
    textEdit && canvasRef.current
      ? (() => {
          const canvas = canvasRef.current!;
          const w = canvas.clientWidth;
          const h = canvas.clientHeight;
          const cx = w / 2;
          const cy = h / 2;
          const cam = cameraRef.current;
          return {
            left: (textEdit.x - cam.x) * cam.zoom + cx,
            top: (textEdit.y - cam.y) * cam.zoom + cy,
          };
        })()
      : null;

  const elements = elementsRef.current;
  const activeTool = TOOLS.find((t) => t.id === tool);
  const fillHex = fill.startsWith("#") ? fill.slice(0, 7) : "#6b9fff";

  const menus = [
    {
      id: "file",
      label: "File",
      items: [
        { label: "Import image…", action: () => fileInputRef.current?.click() },
        { label: "Export snapshot…", action: exportSnapshot, shortcut: "Mod+Shift+E" },
        { label: "Clear canvas", action: clearCanvas },
      ],
    },
    {
      id: "edit",
      label: "Edit",
      items: [
        { label: "Undo", action: undo, shortcut: "Mod+Z", disabled: !canUndo },
        { label: "Redo", action: redo, shortcut: "Mod+Shift+Z", disabled: !canRedo },
        { label: "Delete", action: deleteSelected, disabled: !selectedIds.length },
      ],
    },
    {
      id: "view",
      label: "View",
      items: [
        { label: "Zoom in", action: () => setZoom(cameraRef.current.zoom * 1.15) },
        { label: "Zoom out", action: () => setZoom(cameraRef.current.zoom / 1.15) },
        { label: "Actual size (100%)", action: resetZoom },
        { label: "Fullscreen", action: toggleFullscreen },
      ],
    },
  ];

  return (
    <div className={`infinite-canvas infinite-canvas--editor ${fullscreen ? "ic-fullscreen" : ""}`}>
      <nav className="ic-menubar">
        {menus.map((menu) => (
          <div key={menu.id} className="ic-menu-wrap">
            <button
              type="button"
              className={`ic-menu-trigger ${openMenu === menu.id ? "open" : ""}`}
              onClick={(e) => {
                e.stopPropagation();
                setOpenMenu(openMenu === menu.id ? null : menu.id);
              }}
            >
              {menu.label}
            </button>
            {openMenu === menu.id && (
              <div className="ic-menu-dropdown" onClick={(e) => e.stopPropagation()}>
                {menu.items.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    className="ic-menu-item"
                    disabled={"disabled" in item ? item.disabled : false}
                    onClick={() => {
                      item.action();
                      setOpenMenu(null);
                    }}
                  >
                    <span>{item.label}</span>
                    {item.shortcut && <span className="ic-menu-shortcut">{formatShortcut(item.shortcut)}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
        <span className="ic-doc-title">Infinite Canvas</span>
      </nav>

      <div className="ic-optionsbar">
        <span className="ic-options-tool">
          <i className={`fa-solid ${activeTool?.icon ?? "fa-arrow-pointer"}`} />
          {activeTool?.label ?? "Select"}
        </span>
        <span className="ic-options-divider" />

        {(tool === "pen" || tool === "rect" || tool === "ellipse" || tool === "text") && (
          <>
            <label className="ic-opt">
              <span>Color</span>
              <input type="color" value={stroke} onChange={(e) => setStroke(e.target.value)} />
            </label>
            <label className="ic-opt">
              <span>{tool === "text" ? "Size" : "Width"}</span>
              <input
                type="range"
                min={tool === "text" ? 8 : 1}
                max={tool === "text" ? 120 : 24}
                value={tool === "text" ? fontSize : strokeWidth}
                onChange={(e) => {
                  const value = +e.target.value;
                  if (tool === "text") setFontSize(value);
                  else setStrokeWidth(value);
                }}
              />
              <span>{tool === "text" ? fontSize : strokeWidth}px</span>
            </label>
            {(tool === "rect" || tool === "ellipse") && (
              <label className="ic-opt">
                <span>Fill</span>
                <input
                  type="color"
                  value={fillHex}
                  onChange={(e) => setFill(e.target.value + "40")}
                />
              </label>
            )}
            <span className="ic-options-divider" />
          </>
        )}

        <div className="ic-zoom-bar">
          <button type="button" title="Zoom out" onClick={() => setZoom(cameraRef.current.zoom / 1.15)}>
            <i className="fa-solid fa-magnifying-glass-minus" />
          </button>
          <span>{zoomLabel}</span>
          <button type="button" title="Zoom in" onClick={() => setZoom(cameraRef.current.zoom * 1.15)}>
            <i className="fa-solid fa-magnifying-glass-plus" />
          </button>
          <button type="button" title="100%" onClick={resetZoom}>100%</button>
        </div>
      </div>

      <div className="ic-workspace">
        <aside className="ic-toolbar">
          {TOOLS.map((t) => (
            <TooltipButton
              key={t.id}
              className={`ic-tool ${tool === t.id ? "active" : ""}`}
              tooltip={`${t.label} (${t.shortcut})`}
              onClick={() => setTool(t.id)}
            >
              <i className={`fa-solid ${t.icon}`} aria-hidden="true" />
            </TooltipButton>
          ))}
        </aside>

        <div ref={containerRef} className="ic-canvas-wrap">
          <canvas
            ref={canvasRef}
            className={`ic-canvas ${tool === "select" ? "ic-canvas--select" : ""}`}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            onWheel={handleWheel}
            aria-label="Infinite drawing canvas"
          />

          {textEdit && textScreenPos && (
            <input
              ref={textInputRef}
              className="ic-text-input"
              style={{ left: textScreenPos.left, top: textScreenPos.top, fontSize: `${fontSize * cameraRef.current.zoom}px` }}
              value={textValue}
              onChange={(e) => setTextValue(e.target.value)}
              onPointerDown={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              onBlur={() => window.setTimeout(() => commitText(), 0)}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === "Enter") commitText();
                if (e.key === "Escape") setTextEdit(null);
              }}
              placeholder="Type here..."
            />
          )}
        </div>
      </div>

      <footer className="ic-statusbar">
        <span>{elements.length} object{elements.length === 1 ? "" : "s"}</span>
        <span className="ic-statusbar-divider">|</span>
        <span>{selectedIds.length} selected</span>
        <span className="ic-statusbar-spacer" />
        <span>Space pan · Scroll zoom · Click to place text</span>
        <span className="ic-statusbar-divider">|</span>
        <span>{formatShortcut("Mod+Z")} undo</span>
      </footer>

      <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleImageUpload} />
    </div>
  );
}
