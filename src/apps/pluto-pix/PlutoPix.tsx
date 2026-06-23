import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import "@fortawesome/fontawesome-free/css/all.min.css";
import {
  CANVAS_PRESETS,
  CROP_RATIOS,
  EMOJI_STICKERS,
  FILTER_PRESETS,
  FONT_OPTIONS,
  FRAME_PRESETS,
  GRADIENT_PRESETS,
  MEME_PRESETS,
  SAMPLE_IMAGES,
} from "./constants";
import { batchProcessFiles, downloadBatchZip } from "./batchTools";
import { copyToClipboard, downloadProject, estimateBlobSize, exportProject } from "./exportPix";
import {
  deleteProject,
  duplicateProject,
  exportProjectJson,
  importProjectJson,
  listProjects,
  loadProject,
  type SavedProjectMeta,
} from "./projectStorage";
import { complementaryColor } from "./selectionLogic";
import { formatShortcut, usePixEditor } from "./usePixEditor";
import type { Adjustments, ImageLayer, PanelId, PixLayer, ShapeKind, TextLayer, ToolId } from "./types";
import { DEFAULT_FRAME } from "./types";
import "./PlutoPix.css";

const TOOLS: { id: ToolId; icon: string; label: string }[] = [
  { id: "select", icon: "fa-arrow-pointer", label: "Select" },
  { id: "move", icon: "fa-up-down-left-right", label: "Move" },
  { id: "crop", icon: "fa-crop", label: "Crop" },
  { id: "brush", icon: "fa-paintbrush", label: "Brush" },
  { id: "eraser", icon: "fa-eraser", label: "Eraser" },
  { id: "text", icon: "fa-font", label: "Text" },
  { id: "shape", icon: "fa-shapes", label: "Shape" },
  { id: "eyedropper", icon: "fa-eye-dropper", label: "Eyedropper" },
  { id: "chroma", icon: "fa-wand-magic-sparkles", label: "Chroma Key" },
  { id: "mask", icon: "fa-mask", label: "Mask" },
];

type SidebarGroup = "edit" | "assets" | "style" | "text" | "more";

const SIDEBAR_NAV: { id: SidebarGroup; icon: string; label: string }[] = [
  { id: "edit", icon: "fa-sliders", label: "Edit" },
  { id: "assets", icon: "fa-images", label: "Assets" },
  { id: "style", icon: "fa-fill-drip", label: "Style" },
  { id: "text", icon: "fa-font", label: "Text" },
  { id: "more", icon: "fa-ellipsis", label: "More" },
];

const PANEL_TO_GROUP: Partial<Record<PanelId, SidebarGroup>> = {
  adjust: "edit",
  filter: "edit",
  transform: "edit",
  background: "style",
  color: "style",
  text: "text",
  batch: "more",
  watermark: "more",
  meme: "assets",
  mask: "more",
  projects: "more",
  export: "more",
};

const SHAPES: ShapeKind[] = [
  "rect", "rounded-rect", "circle", "triangle", "star", "heart", "speech-bubble", "arrow", "line",
];

function PanelHeader({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="pp-panel-header">
      <span>{title}</span>
      {children}
    </div>
  );
}

function layerTypeIcon(type: string): string {
  switch (type) {
    case "image": return "fa-image";
    case "text": return "fa-font";
    case "shape": return "fa-shapes";
    case "drawing": return "fa-paintbrush";
    case "sticker": return "fa-face-smile";
    case "watermark": return "fa-droplet";
    default: return "fa-layer-group";
  }
}

function reorderLayersByDisplayIndex(layers: PixLayer[], dragId: string, targetDisplayIndex: number): PixLayer[] {
  const display = [...layers].reverse();
  const fromIdx = display.findIndex((l) => l.id === dragId);
  if (fromIdx < 0) return layers;
  let toIdx = Math.max(0, Math.min(display.length, targetDisplayIndex));
  const [item] = display.splice(fromIdx, 1);
  if (fromIdx < toIdx) toIdx -= 1;
  display.splice(toIdx, 0, item);
  return display.reverse();
}

function TooltipBtn({
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
    <button type="button" className={className} data-tooltip={tooltip} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}

export default function PlutoPix() {
  const editor = usePixEditor();
  const { state, act, commit, undo, redo, canUndo, canRedo } = editor;
  const fileRef = useRef<HTMLInputElement>(null);
  const projectRef = useRef<HTMLInputElement>(null);
  const batchRef = useRef<HTMLInputElement>(null);
  const stickerRef = useRef<HTMLInputElement>(null);
  const [exportFormat, setExportFormat] = useState<"png" | "jpeg" | "webp">("png");
  const [exportQuality, setExportQuality] = useState(92);
  const [exportSizePreview, setExportSizePreview] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [batchBusy, setBatchBusy] = useState(false);
  const [projects, setProjects] = useState<SavedProjectMeta[]>([]);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [sidebarGroup, setSidebarGroup] = useState<SidebarGroup>("edit");
  const [editTab, setEditTab] = useState<"adjust" | "filter" | "transform">("adjust");
  const [moreTab, setMoreTab] = useState<"export" | "batch" | "watermark" | "mask" | "projects">("export");
  const [layerMenuOpen, setLayerMenuOpen] = useState(false);
  const layerMenuRef = useRef<HTMLDivElement>(null);
  const [layerDrag, setLayerDrag] = useState<{ id: string; overId: string | null; position: "before" | "after" } | null>(null);
  const layerListRef = useRef<HTMLDivElement>(null);

  const activeTool = TOOLS.find((t) => t.id === state.tool);

  const selectedImage = state.project.layers.find(
    (l): l is ImageLayer => state.selectedLayerIds.includes(l.id) && l.type === "image"
  );
  const selectedText = state.project.layers.find(
    (l): l is TextLayer => state.selectedLayerIds.includes(l.id) && l.type === "text"
  );

  const refreshProjects = () => {
    void listProjects().then(setProjects);
  };

  useEffect(() => {
    refreshProjects();
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (e.dataTransfer.files.length) editor.importFiles(e.dataTransfer.files);
    },
    [editor]
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if ((e.metaKey || e.ctrlKey) && e.key === "z" && !e.shiftKey) { e.preventDefault(); undo(); }
      if ((e.metaKey || e.ctrlKey) && (e.key === "y" || (e.shiftKey && e.key === "z"))) { e.preventDefault(); redo(); }
      if ((e.metaKey || e.ctrlKey) && e.key === "s") { e.preventDefault(); commit(); }
      if ((e.metaKey || e.ctrlKey) && e.key === "e") { e.preventDefault(); downloadProject(state.project, { format: exportFormat, quality: exportQuality, width: state.exportWidth, height: state.exportHeight }); }
      if ((e.metaKey || e.ctrlKey) && e.key === "c" && state.selectedLayerIds.length) { e.preventDefault(); editor.copyLayers(); }
      if ((e.metaKey || e.ctrlKey) && e.key === "v") { e.preventDefault(); editor.pasteLayers(); }
      if ((e.metaKey || e.ctrlKey) && e.key === "d" && state.selectedLayerIds.length) {
        e.preventDefault();
        act({ type: "DUPLICATE_LAYERS", ids: state.selectedLayerIds }, true);
      }
      if (e.key === "Delete" && state.selectedLayerIds.length) {
        act({ type: "DELETE_LAYERS", ids: state.selectedLayerIds }, true);
      }
      if (e.key === "+" || e.key === "=") act({ type: "SET_VIEWPORT", patch: { zoom: Math.min(4, state.viewport.zoom * 1.1) } });
      if (e.key === "-") act({ type: "SET_VIEWPORT", patch: { zoom: Math.max(0.1, state.viewport.zoom / 1.1) } });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [act, commit, editor, exportFormat, exportQuality, redo, state.exportHeight, state.exportWidth, state.project, state.selectedLayerIds, state.viewport.zoom, undo]);

  useEffect(() => {
    exportProject(state.project, {
      format: exportFormat,
      quality: exportQuality,
      width: state.exportWidth,
      height: state.exportHeight,
    }).then((blob) => setExportSizePreview(estimateBlobSize(blob))).catch(() => setExportSizePreview(""));
  }, [exportFormat, exportQuality, state.exportWidth, state.exportHeight, state.project]);

  useEffect(() => {
    const close = () => setOpenMenu(null);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, []);

  useEffect(() => {
    const group = PANEL_TO_GROUP[state.activePanel];
    if (group) setSidebarGroup(group);
    if (state.activePanel === "adjust" || state.activePanel === "filter" || state.activePanel === "transform") {
      setEditTab(state.activePanel);
    }
    if (["export", "batch", "watermark", "mask", "projects"].includes(state.activePanel)) {
      setMoreTab(state.activePanel as typeof moreTab);
    }
  }, [state.activePanel]);

  useEffect(() => {
    if (!layerMenuOpen) return;
    const close = (e: MouseEvent) => {
      if (layerMenuRef.current && !layerMenuRef.current.contains(e.target as Node)) {
        setLayerMenuOpen(false);
      }
    };
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [layerMenuOpen]);

  const finishLayerDrag = useCallback(() => {
    setLayerDrag((drag) => {
      if (drag?.overId && drag.overId !== drag.id) {
        const display = [...state.project.layers].reverse();
        const overIdx = display.findIndex((l) => l.id === drag.overId);
        if (overIdx >= 0) {
          const targetDisplayIndex = drag.position === "after" ? overIdx + 1 : overIdx;
          const layers = reorderLayersByDisplayIndex(state.project.layers, drag.id, targetDisplayIndex);
          act({ type: "SET_LAYERS", layers }, true);
        }
      }
      return null;
    });
  }, [act, state.project.layers]);

  const updateLayerDragTarget = useCallback((layerId: string, clientY: number) => {
    setLayerDrag((drag) => {
      if (!drag) return drag;
      const row = layerListRef.current?.querySelector(`[data-layer-id="${layerId}"]`) as HTMLElement | null;
      if (!row) return { ...drag, overId: layerId, position: "before" };
      const rect = row.getBoundingClientRect();
      const position = clientY < rect.top + rect.height / 2 ? "before" : "after";
      return { ...drag, overId: layerId, position };
    });
  }, []);

  useEffect(() => {
    if (!layerDrag) return;
    const onMove = (e: PointerEvent) => {
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const row = el?.closest("[data-layer-id]") as HTMLElement | null;
      if (row?.dataset.layerId) updateLayerDragTarget(row.dataset.layerId, e.clientY);
    };
    const onUp = () => finishLayerDrag();
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [layerDrag, finishLayerDrag, updateLayerDragTarget]);

  const selectedLayerIndex = state.selectedLayerIds[0]
    ? state.project.layers.findIndex((l) => l.id === state.selectedLayerIds[0])
    : -1;
  const canMoveLayerUp = selectedLayerIndex >= 0 && selectedLayerIndex < state.project.layers.length - 1;
  const canMoveLayerDown = selectedLayerIndex > 0;

  const updateAdjustment = (key: keyof Adjustments, value: number) => {
    if (!selectedImage) return;
    act({
      type: "UPDATE_LAYER",
      id: selectedImage.id,
      patch: { adjustments: { ...selectedImage.adjustments, [key]: value } },
    });
  };

  const commitAdjustments = () => {
    if (selectedImage) commit();
  };

  const applyMemePreset = (top: string, bottom: string) => {
    editor.addTextLayer(top, {
      y: 30,
      fontSize: 56,
      align: "center",
      x: 0,
      width: state.project.canvasWidth,
    });
    editor.addTextLayer(bottom, {
      y: state.project.canvasHeight - 90,
      fontSize: 56,
      align: "center",
      x: 0,
      width: state.project.canvasWidth,
    });
    act({ type: "SET_PANEL", panel: "text" });
  };

  const runBatch = async (files: FileList) => {
    setBatchBusy(true);
    try {
      const blobs = await batchProcessFiles(Array.from(files), {
        format: exportFormat,
        quality: exportQuality,
        maxWidth: 1920,
        watermarkText: state.watermark.text || undefined,
      });
      await downloadBatchZip(blobs, Array.from(files).map((f) => f.name), exportFormat);
    } finally {
      setBatchBusy(false);
    }
  };

  return (
    <div className={`pluto-pix pluto-pix--editor ${state.fullscreen ? "pp-fullscreen" : ""}`}>
      {/* Menu bar */}
      <nav className="pp-menubar">
        {[
          {
            id: "file",
            label: "File",
            items: [
              { label: "Import image…", action: () => fileRef.current?.click() },
              { label: "Paste image", action: () => editor.pasteImage() },
              { label: "Save project", action: commit, shortcut: "Mod+S" },
              { label: "Export JSON…", action: () => exportProjectJson(state.project) },
              { label: "Import JSON…", action: () => projectRef.current?.click() },
              { label: "Export image…", action: () => downloadProject(state.project, { format: exportFormat, quality: exportQuality, width: state.exportWidth, height: state.exportHeight }), shortcut: "Mod+E" },
            ],
          },
          {
            id: "edit",
            label: "Edit",
            items: [
              { label: "Undo", action: undo, shortcut: "Mod+Z", disabled: !canUndo },
              { label: "Redo", action: redo, shortcut: "Mod+Shift+Z", disabled: !canRedo },
              { label: "Copy layers", action: () => editor.copyLayers(), shortcut: "Mod+C", disabled: !state.selectedLayerIds.length },
              { label: "Paste layers", action: () => editor.pasteLayers(), shortcut: "Mod+V" },
              { label: "Duplicate", action: () => act({ type: "DUPLICATE_LAYERS", ids: state.selectedLayerIds }, true), shortcut: "Mod+D", disabled: !state.selectedLayerIds.length },
              { label: "Delete", action: () => act({ type: "DELETE_LAYERS", ids: state.selectedLayerIds }, true), disabled: !state.selectedLayerIds.length },
            ],
          },
          {
            id: "view",
            label: "View",
            items: [
              { label: "Fit on screen", action: editor.fitToScreen },
              { label: "Actual size (100%)", action: () => act({ type: "SET_VIEWPORT", patch: { zoom: 1, panX: 20, panY: 20 } }) },
              { label: state.compareOriginal ? "Hide compare" : "Compare before/after", action: () => { if (!state.compareOriginal) editor.captureOriginal(); act({ type: "SET_COMPARE", compare: !state.compareOriginal }); } },
              { label: state.viewport.showGrid ? "Hide grid" : "Show grid", action: () => act({ type: "SET_VIEWPORT", patch: { showGrid: !state.viewport.showGrid } }) },
              { label: state.viewport.showCheckerboard ? "Hide checkerboard" : "Show checkerboard", action: () => act({ type: "SET_VIEWPORT", patch: { showCheckerboard: !state.viewport.showCheckerboard } }) },
              { label: state.viewport.showRulers ? "Hide rulers" : "Show rulers", action: () => act({ type: "SET_VIEWPORT", patch: { showRulers: !state.viewport.showRulers } }) },
              { label: "Fullscreen", action: editor.toggleFullscreen },
            ],
          },
          {
            id: "image",
            label: "Image",
            items: CANVAS_PRESETS.map((p) => ({
              label: p.name,
              action: () => act({ type: "SET_CANVAS_SIZE", width: p.width, height: p.height }, true),
            })),
          },
        ].map((menu) => (
          <div key={menu.id} className="pp-menu-wrap">
            <button
              type="button"
              className={`pp-menu-trigger ${openMenu === menu.id ? "open" : ""}`}
              onClick={(e) => { e.stopPropagation(); setOpenMenu(openMenu === menu.id ? null : menu.id); }}
            >
              {menu.label}
            </button>
            {openMenu === menu.id && (
              <div className="pp-menu-dropdown" onClick={(e) => e.stopPropagation()}>
                {menu.items.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    className="pp-menu-item"
                    disabled={"disabled" in item ? item.disabled : false}
                    onClick={() => { item.action(); setOpenMenu(null); }}
                  >
                    <span>{item.label}</span>
                    {"shortcut" in item && item.shortcut && <span className="pp-menu-shortcut">{formatShortcut(item.shortcut)}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
        <span className="pp-doc-title">{state.project.name} @ {Math.round(state.viewport.zoom * 100)}%</span>
      </nav>

      {/* Options bar */}
      <div className="pp-optionsbar">
        <span className="pp-options-tool">
          <i className={`fa-solid ${activeTool?.icon ?? "fa-arrow-pointer"}`} />
          {activeTool?.label ?? "Select"}
        </span>
        <span className="pp-options-divider" />

        {(state.tool === "brush" || state.tool === "eraser") && (
          <>
            <label className="pp-opt"><span>Size</span><input type="range" min={1} max={80} value={state.brush.size} onChange={(e) => act({ type: "SET_BRUSH", patch: { size: +e.target.value } })} /></label>
            <label className="pp-opt"><span>Color</span><input type="color" value={state.brush.color} onChange={(e) => act({ type: "SET_BRUSH", patch: { color: e.target.value } })} /></label>
            {state.tool === "brush" && (
              <label className="pp-opt">
                <span>Kind</span>
                <select value={state.brush.kind} onChange={(e) => act({ type: "SET_BRUSH", patch: { kind: e.target.value as typeof state.brush.kind } })}>
                  {(["brush", "pencil", "marker", "highlighter"] as const).map((k) => (
                    <option key={k} value={k}>{k}</option>
                  ))}
                </select>
              </label>
            )}
            <span className="pp-options-divider" />
          </>
        )}

        <select
          className="pp-select"
          value=""
          onChange={(e) => {
            const preset = CANVAS_PRESETS.find((p) => p.id === e.target.value);
            if (preset) act({ type: "SET_CANVAS_SIZE", width: preset.width, height: preset.height }, true);
          }}
        >
          <option value="">Canvas preset…</option>
          {CANVAS_PRESETS.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>

        <div className="pp-zoom-bar">
          <button type="button" title="Zoom out" onClick={() => act({ type: "SET_VIEWPORT", patch: { zoom: Math.max(0.1, state.viewport.zoom / 1.15) } })}><i className="fa-solid fa-magnifying-glass-minus" /></button>
          <span>{Math.round(state.viewport.zoom * 100)}%</span>
          <button type="button" title="Zoom in" onClick={() => act({ type: "SET_VIEWPORT", patch: { zoom: Math.min(4, state.viewport.zoom * 1.15) } })}><i className="fa-solid fa-magnifying-glass-plus" /></button>
          <button type="button" title="Fit" onClick={editor.fitToScreen}>Fit</button>
        </div>
      </div>

      <div className="pp-workspace">
        <aside className="pp-toolbar">
          {TOOLS.map((t) => (
            <TooltipBtn
              key={t.id}
              className={`pp-tool ${state.tool === t.id ? "active" : ""}`}
              tooltip={t.label}
              onClick={() => {
                editor.setTool(t.id);
                if (t.id === "text") editor.addTextLayer();
                if (t.id === "shape") editor.addShapeLayer();
                if (t.id === "chroma") {
                  act({ type: "SET_PANEL", panel: "background" });
                  editor.applyChromaToSelected();
                }
                if (t.id === "mask") act({ type: "SET_PANEL", panel: "mask" });
              }}
            >
              <i className={`fa-solid ${t.icon}`} />
            </TooltipBtn>
          ))}
        </aside>

        <div
          ref={editor.viewportRef}
          className={`pp-canvas-wrap ${dragOver ? "drag-over" : ""}`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
        >
          {state.viewport.showRulers && (
            <>
              <div className="pp-ruler pp-ruler-h" />
              <div className="pp-ruler pp-ruler-v" />
            </>
          )}
          <div
            className="pp-canvas-stage"
            style={{
              transform: `translate(${state.viewport.panX}px, ${state.viewport.panY}px) scale(${state.viewport.zoom})`,
            }}
          >
            <div
              className={`pp-canvas-bg ${state.viewport.showCheckerboard ? "checker" : ""}`}
              style={{
                width: state.project.canvasWidth,
                height: state.project.canvasHeight,
                background: state.viewport.showCheckerboard ? undefined : state.project.background,
              }}
            >
              <canvas
                ref={editor.canvasRef}
                className="pp-canvas"
                width={state.project.canvasWidth}
                height={state.project.canvasHeight}
                onPointerDown={editor.handlePointerDown}
                onPointerMove={editor.handlePointerMove}
                onPointerUp={editor.handlePointerUp}
                onPointerLeave={editor.handlePointerUp}
              />
              {state.viewport.showBoundary && <div className="pp-boundary" />}
            </div>
          </div>

          {state.compareOriginal && editor.originalSnapshot && (
            <>
              <div className="pp-compare" style={{ width: `${state.compareSlider}%` }}>
                <img src={editor.originalSnapshot} alt="Original" />
              </div>
              <input
                className="pp-compare-slider"
                type="range"
                min={5}
                max={95}
                value={state.compareSlider}
                onChange={(e) => act({ type: "SET_COMPARE", compare: true, slider: +e.target.value })}
              />
            </>
          )}

          {state.viewport.showGrid && (
            <div
              className="pp-grid-overlay"
              style={{ backgroundSize: `${state.viewport.gridSize}px ${state.viewport.gridSize}px` }}
            />
          )}
        </div>

        <aside className="pp-sidebar">
          <div className="pp-sidebar-main">
            <nav className="pp-sidebar-nav" aria-label="Panel navigation">
              {SIDEBAR_NAV.map((item) => (
                <TooltipBtn
                  key={item.id}
                  className={`pp-sidebar-nav-btn ${sidebarGroup === item.id ? "active" : ""}`}
                  tooltip={item.label}
                  onClick={() => setSidebarGroup(item.id)}
                >
                  <i className={`fa-solid ${item.icon}`} />
                </TooltipBtn>
              ))}
            </nav>

            <div className="pp-sidebar-content">
              {sidebarGroup === "edit" && (
                <>
                  <nav className="pp-subtabs">
                    {(["adjust", "filter", "transform"] as const).map((tab) => (
                      <button key={tab} type="button" className={editTab === tab ? "active" : ""} onClick={() => setEditTab(tab)}>
                        {tab}
                      </button>
                    ))}
                  </nav>
                  <div className="pp-sidebar-scroll">
                    {editTab === "adjust" && selectedImage && (
                      <div className="pp-section">
                        <h3>Adjustments</h3>
                        {(["brightness", "contrast", "saturation", "hue", "blur", "noise", "pixelate", "opacity"] as const).map((key) => (
                          <label key={key} className="pp-slider">
                            <span>{key}</span>
                            <input
                              type="range"
                              min={key === "hue" ? -180 : 0}
                              max={key === "hue" ? 180 : key === "blur" ? 20 : key === "noise" ? 50 : key === "pixelate" ? 20 : 200}
                              value={selectedImage.adjustments[key]}
                              onChange={(e) => updateAdjustment(key, +e.target.value)}
                              onMouseUp={commitAdjustments}
                            />
                            <span>{selectedImage.adjustments[key]}</span>
                          </label>
                        ))}
                        <h3>Frame</h3>
                        <div className="pp-filter-grid">
                          {FRAME_PRESETS.map((f) => (
                            <button
                              key={f.id}
                              type="button"
                              className={selectedImage.frame?.preset === f.id ? "active" : ""}
                              onClick={() => act({
                                type: "UPDATE_LAYER",
                                id: selectedImage.id,
                                patch: {
                                  frame: {
                                    ...DEFAULT_FRAME,
                                    preset: f.id as typeof DEFAULT_FRAME.preset,
                                    width: f.width,
                                    color: f.color,
                                    radius: f.radius,
                                    shadow: f.shadow,
                                  },
                                },
                              }, true)}
                            >
                              {f.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    {editTab === "adjust" && !selectedImage && (
                      <p className="pp-empty">Select an image layer to adjust brightness, contrast, and more.</p>
                    )}

                    {editTab === "filter" && (
                      <div className="pp-section">
                        <h3>Filters</h3>
                        <div className="pp-filter-grid">
                          {FILTER_PRESETS.map((f) => (
                            <button
                              key={f.id}
                              type="button"
                              className={selectedImage?.filterId === f.id ? "active" : ""}
                              onClick={() => {
                                if (!selectedImage) return;
                                act({ type: "UPDATE_LAYER", id: selectedImage.id, patch: { filterId: f.id === "none" ? null : f.id } }, true);
                              }}
                            >
                              {f.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    {editTab === "filter" && !selectedImage && (
                      <p className="pp-empty">Select an image layer to apply filters.</p>
                    )}

                    {editTab === "transform" && (
                      <div className="pp-section">
                        <h3>Transform</h3>
                        <div className="pp-row">
                          <button type="button" className="pp-small-btn" onClick={() => act({ type: "ROTATE_SELECTED", degrees: -90 }, true)}>↺ 90°</button>
                          <button type="button" className="pp-small-btn" onClick={() => act({ type: "ROTATE_SELECTED", degrees: 90 }, true)}>↻ 90°</button>
                          <button type="button" className="pp-small-btn" onClick={() => act({ type: "FLIP_SELECTED", axis: "h" }, true)}>Flip H</button>
                          <button type="button" className="pp-small-btn" onClick={() => act({ type: "FLIP_SELECTED", axis: "v" }, true)}>Flip V</button>
                        </div>
                        <button type="button" className="pp-small-btn" onClick={() => act({ type: "RESET_TRANSFORM" }, true)}>Reset transform</button>
                        <h3>Shapes</h3>
                        <div className="pp-row wrap">
                          {SHAPES.map((s) => (
                            <button
                              key={s}
                              type="button"
                              className={`pp-small-btn ${state.shapeKind === s ? "active" : ""}`}
                              onClick={() => {
                                act({ type: "SET_TOOL", tool: "shape" });
                                editor.addShapeLayer();
                              }}
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                        <h3>Crop</h3>
                        <div className="pp-row wrap">
                          {CROP_RATIOS.map((r) => (
                            <button
                              key={r.id}
                              type="button"
                              className="pp-small-btn"
                              onClick={() => {
                                editor.setTool("crop");
                                act({ type: "SET_CROP", crop: { active: false, x: 0, y: 0, width: state.project.canvasWidth, height: state.project.canvasHeight, ratio: r.ratio } });
                              }}
                            >
                              {r.label}
                            </button>
                          ))}
                        </div>
                        {state.crop && (
                          <button type="button" className="pp-primary-btn" onClick={() => act({ type: "APPLY_CROP" }, true)}>Apply crop</button>
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}

              {sidebarGroup === "assets" && (
                <div className="pp-sidebar-scroll">
                  <div className="pp-section">
                    <h3>Sample Images</h3>
                    <div className="pp-samples">
                      {SAMPLE_IMAGES.map((s) => (
                        <button key={s.id} type="button" className="pp-sample" onClick={() => editor.importSample(s.src, s.name)}>
                          <img src={s.src} alt={s.name} />
                          <span>{s.name}</span>
                        </button>
                      ))}
                    </div>
                    <h3>Stickers</h3>
                    <div className="pp-emoji-grid">
                      {EMOJI_STICKERS.map((e) => (
                        <button key={e} type="button" onClick={() => editor.addSticker(e)}>{e}</button>
                      ))}
                    </div>
                    <button type="button" className="pp-small-btn pp-upload-btn" onClick={() => stickerRef.current?.click()}>Upload sticker</button>
                    <h3>Meme Templates</h3>
                    <div className="pp-filter-grid">
                      {MEME_PRESETS.map((m) => (
                        <button key={m.id} type="button" className="pp-small-btn" onClick={() => applyMemePreset(m.top, m.bottom)}>
                          {m.id}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {sidebarGroup === "style" && (
                <div className="pp-sidebar-scroll">
                  <div className="pp-section">
                    <h3>Background</h3>
                    <label className="pp-slider">
                      <span>Color</span>
                      <input type="color" value={state.project.background.startsWith("#") ? state.project.background : "#1a1a1a"} onChange={(e) => act({ type: "SET_BACKGROUND", color: e.target.value }, true)} />
                    </label>
                <button type="button" className="pp-small-btn" onClick={() => act({ type: "SET_BACKGROUND", color: "transparent" }, true)}>Transparent</button>
                <h3>Gradients</h3>
                <div className="pp-samples">
                  {GRADIENT_PRESETS.map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      className="pp-sample"
                      onClick={() => act({
                        type: "SET_BACKGROUND_GRADIENT",
                        gradient: { kind: "linear", colors: g.colors, angle: 45 },
                      }, true)}
                    >
                      <div className="pp-gradient-swatch" style={{ background: `linear-gradient(135deg, ${g.colors.join(", ")})` }} />
                      <span>{g.id}</span>
                    </button>
                  ))}
                </div>
                <h3>Chroma Key</h3>
                <label className="pp-slider"><span>Color</span><input type="color" value={state.chroma.color} onChange={(e) => act({ type: "SET_CHROMA", patch: { color: e.target.value } })} /></label>
                <label className="pp-slider"><span>Tolerance</span><input type="range" min={0} max={150} value={state.chroma.tolerance} onChange={(e) => act({ type: "SET_CHROMA", patch: { tolerance: +e.target.value } })} /></label>
                <label className="pp-slider"><span>Feather</span><input type="range" min={0} max={40} value={state.chroma.feather} onChange={(e) => act({ type: "SET_CHROMA", patch: { feather: +e.target.value } })} /></label>
                <button type="button" className="pp-primary-btn" onClick={editor.applyChromaToSelected}>Remove color</button>
                <h3>Brush</h3>
                <div className="pp-row wrap">
                  {(["brush", "pencil", "marker", "highlighter"] as const).map((k) => (
                    <button
                      key={k}
                      type="button"
                      className={`pp-small-btn ${state.brush.kind === k ? "active" : ""}`}
                      onClick={() => act({ type: "SET_BRUSH", patch: { kind: k } })}
                    >
                      {k}
                    </button>
                  ))}
                </div>
                <label className="pp-slider"><span>Size</span><input type="range" min={1} max={80} value={state.brush.size} onChange={(e) => act({ type: "SET_BRUSH", patch: { size: +e.target.value } })} /></label>
                <label className="pp-slider"><span>Color</span><input type="color" value={state.brush.color} onChange={(e) => act({ type: "SET_BRUSH", patch: { color: e.target.value } })} /></label>
                <div className="pp-color-row">
                  {state.recentColors.map((c) => (
                    <button key={c} type="button" className="pp-swatch" style={{ background: c }} onClick={() => act({ type: "SET_BRUSH", patch: { color: c } })} />
                  ))}
                </div>
                    <h3>Color Palette</h3>
                    <button type="button" className="pp-small-btn" onClick={() => editor.extractPaletteFromCanvas()}>Extract from canvas</button>
                    <div className="pp-color-row">
                      {state.customPalette.map((c) => (
                        <button key={c} type="button" className="pp-swatch" style={{ background: c }} title={c} onClick={() => act({ type: "SET_BRUSH", patch: { color: c } })} />
                      ))}
                    </div>
                    {state.customPalette[0] && (
                      <button type="button" className="pp-small-btn" onClick={() => act({ type: "SET_BRUSH", patch: { color: complementaryColor(state.customPalette[0]) } })}>
                        Complementary color
                      </button>
                    )}
                  </div>
                </div>
              )}

              {sidebarGroup === "text" && (
                <div className="pp-sidebar-scroll">
                  {selectedText ? (
                    <div className="pp-section">
                      <h3>Text</h3>
                      <textarea value={selectedText.text} onChange={(e) => act({ type: "UPDATE_LAYER", id: selectedText.id, patch: { text: e.target.value } })} onBlur={commit} rows={3} />
                      <label className="pp-slider"><span>Size</span><input type="range" min={12} max={120} value={selectedText.fontSize} onChange={(e) => act({ type: "UPDATE_LAYER", id: selectedText.id, patch: { fontSize: +e.target.value } })} onMouseUp={commit} /></label>
                      <label className="pp-slider"><span>Spacing</span><input type="range" min={-5} max={20} value={selectedText.letterSpacing} onChange={(e) => act({ type: "UPDATE_LAYER", id: selectedText.id, patch: { letterSpacing: +e.target.value } })} onMouseUp={commit} /></label>
                      <select value={selectedText.fontFamily} onChange={(e) => act({ type: "UPDATE_LAYER", id: selectedText.id, patch: { fontFamily: e.target.value } }, true)}>
                        {FONT_OPTIONS.map((f) => <option key={f} value={f}>{f}</option>)}
                      </select>
                      <label className="pp-slider"><span>Color</span><input type="color" value={selectedText.color} onChange={(e) => act({ type: "UPDATE_LAYER", id: selectedText.id, patch: { color: e.target.value } })} onMouseUp={commit} /></label>
                      <div className="pp-row">
                        <button type="button" className={`pp-small-btn ${selectedText.bold ? "active" : ""}`} onClick={() => act({ type: "UPDATE_LAYER", id: selectedText.id, patch: { bold: !selectedText.bold } }, true)}>B</button>
                        <button type="button" className={`pp-small-btn ${selectedText.italic ? "active" : ""}`} onClick={() => act({ type: "UPDATE_LAYER", id: selectedText.id, patch: { italic: !selectedText.italic } }, true)}>I</button>
                        <button type="button" className={`pp-small-btn ${selectedText.underline ? "active" : ""}`} onClick={() => act({ type: "UPDATE_LAYER", id: selectedText.id, patch: { underline: !selectedText.underline } }, true)}>U</button>
                        <button type="button" className={`pp-small-btn ${selectedText.outline ? "active" : ""}`} onClick={() => act({ type: "UPDATE_LAYER", id: selectedText.id, patch: { outline: !selectedText.outline } }, true)}>Outline</button>
                      </div>
                    </div>
                  ) : (
                    <p className="pp-empty">Select a text layer or use the Text tool to add one.</p>
                  )}
                </div>
              )}

              {sidebarGroup === "more" && (
                <>
                  <nav className="pp-subtabs">
                    {(["export", "batch", "watermark", "mask", "projects"] as const).map((tab) => (
                      <button key={tab} type="button" className={moreTab === tab ? "active" : ""} onClick={() => setMoreTab(tab)}>
                        {tab}
                      </button>
                    ))}
                  </nav>
                  <div className="pp-sidebar-scroll">
                    {moreTab === "batch" && (
                      <div className="pp-section">
                        <h3>Batch Export</h3>
                        <p className="pp-muted">Resize, convert, and watermark multiple images at once.</p>
                        <button type="button" className="pp-primary-btn" disabled={batchBusy} onClick={() => batchRef.current?.click()}>
                          {batchBusy ? "Processing…" : "Select images"}
                        </button>
                      </div>
                    )}

                    {moreTab === "watermark" && (
                      <div className="pp-section">
                        <h3>Watermark</h3>
                        <label className="pp-slider"><span>Text</span><input value={state.watermark.text} onChange={(e) => act({ type: "SET_WATERMARK_SETTINGS", patch: { text: e.target.value } })} /></label>
                        <label className="pp-slider"><span>Opacity</span><input type="range" min={10} max={100} value={state.watermark.opacity} onChange={(e) => act({ type: "SET_WATERMARK_SETTINGS", patch: { opacity: +e.target.value } })} /></label>
                        <label className="pp-slider"><span>Size</span><input type="range" min={12} max={72} value={state.watermark.size} onChange={(e) => act({ type: "SET_WATERMARK_SETTINGS", patch: { size: +e.target.value } })} /></label>
                        <label><input type="checkbox" checked={state.watermark.repeat} onChange={(e) => act({ type: "SET_WATERMARK_SETTINGS", patch: { repeat: e.target.checked } })} /> Tile repeat</label>
                        <button type="button" className="pp-primary-btn" onClick={editor.addWatermarkLayer}>Add watermark layer</button>
                      </div>
                    )}

                    {moreTab === "mask" && (
                      <div className="pp-section">
                        <h3>Layer Mask</h3>
                        <p className="pp-muted">Select a layer, then use the Mask tool on canvas.</p>
                        <div className="pp-row">
                          <button type="button" className="pp-small-btn" onClick={() => editor.applyMaskToSelected({ kind: "circle" })}>Circle</button>
                          <button type="button" className="pp-small-btn" onClick={() => editor.applyMaskToSelected({ inverted: true })}>Invert</button>
                          <button type="button" className="pp-small-btn" onClick={() => {
                            for (const id of state.selectedLayerIds) act({ type: "UPDATE_LAYER", id, patch: { mask: null } }, true);
                          }}>Clear</button>
                        </div>
                      </div>
                    )}

                    {moreTab === "projects" && (
                      <div className="pp-section">
                        <h3>Recent Projects</h3>
                        <label className="pp-slider">
                          <span>Name</span>
                          <input value={state.project.name} onChange={(e) => act({ type: "SET_PROJECT_NAME", name: e.target.value })} onBlur={commit} />
                        </label>
                        {projects.map((p) => (
                          <div key={p.id} className="pp-project-row">
                            <button type="button" className="pp-small-btn" onClick={async () => {
                              const proj = await loadProject(p.id);
                              if (proj) act({ type: "SET_PROJECT", project: proj }, true);
                            }}>{p.name}</button>
                            <button type="button" className="pp-small-btn" onClick={async () => {
                              const copy = await duplicateProject(p.id);
                              if (copy) { act({ type: "SET_PROJECT", project: copy }, true); refreshProjects(); }
                            }}>Dup</button>
                            <button type="button" className="pp-small-btn" onClick={async () => {
                              await deleteProject(p.id);
                              refreshProjects();
                            }}>Del</button>
                          </div>
                        ))}
                      </div>
                    )}

                    {moreTab === "export" && (
                      <div className="pp-section">
                        <h3>Export</h3>
                        <label className="pp-slider">
                          <span>Format</span>
                          <select value={exportFormat} onChange={(e) => setExportFormat(e.target.value as typeof exportFormat)}>
                            <option value="png">PNG</option>
                            <option value="jpeg">JPG</option>
                            <option value="webp">WebP</option>
                          </select>
                        </label>
                        <label className="pp-slider">
                          <span>Quality</span>
                          <input type="range" min={10} max={100} value={exportQuality} onChange={(e) => setExportQuality(+e.target.value)} />
                          <span>{exportQuality}%</span>
                        </label>
                        <label className="pp-slider">
                          <span>Width</span>
                          <input type="number" value={state.exportWidth} onChange={(e) => act({ type: "SET_EXPORT_SIZE", width: +e.target.value, height: state.exportHeight })} />
                        </label>
                        <label className="pp-slider">
                          <span>Height</span>
                          <input type="number" value={state.exportHeight} onChange={(e) => act({ type: "SET_EXPORT_SIZE", width: state.exportWidth, height: +e.target.value })} />
                        </label>
                        {exportSizePreview && <p className="pp-muted">Est. size: {exportSizePreview}</p>}
                        <button type="button" className="pp-primary-btn" onClick={() => downloadProject(state.project, { format: exportFormat, quality: exportQuality, width: state.exportWidth, height: state.exportHeight })}>
                          Download ({formatShortcut("Mod+E")})
                        </button>
                        <button type="button" className="pp-small-btn" onClick={() => copyToClipboard(state.project)}>Copy to clipboard</button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          <section className="pp-sidebar-layers">
            <PanelHeader title="Layers">
              <div className="pp-panel-actions">
                <div className="pp-layer-menu-wrap" ref={layerMenuRef}>
                  <button
                    type="button"
                    className={`pp-new-layer-btn ${layerMenuOpen ? "open" : ""}`}
                    title="New layer"
                    onClick={(e) => { e.stopPropagation(); setLayerMenuOpen((v) => !v); }}
                  >
                    <i className="fa-solid fa-plus" />
                  </button>
                  {layerMenuOpen && (
                    <div className="pp-layer-menu" onClick={(e) => e.stopPropagation()}>
                      <button type="button" onClick={() => { editor.addEmptyImageLayer(); setLayerMenuOpen(false); }}>
                        <i className="fa-solid fa-square" /> Empty layer
                      </button>
                      <button type="button" onClick={() => { fileRef.current?.click(); setLayerMenuOpen(false); }}>
                        <i className="fa-solid fa-image" /> Image…
                      </button>
                      <button type="button" onClick={() => { editor.addDrawingLayer(); setLayerMenuOpen(false); }}>
                        <i className="fa-solid fa-paintbrush" /> Drawing layer
                      </button>
                      <button type="button" onClick={() => { editor.addTextLayer(); setSidebarGroup("text"); setLayerMenuOpen(false); }}>
                        <i className="fa-solid fa-font" /> Text
                      </button>
                      <button type="button" onClick={() => { editor.addShapeLayer(); setLayerMenuOpen(false); }}>
                        <i className="fa-solid fa-shapes" /> Shape
                      </button>
                    </div>
                  )}
                </div>
                <button type="button" title="Move layer up" disabled={!canMoveLayerUp} onClick={() => act({ type: "REORDER_LAYER", id: state.selectedLayerIds[0], direction: "up" }, true)}><i className="fa-solid fa-arrow-up" /></button>
                <button type="button" title="Move layer down" disabled={!canMoveLayerDown} onClick={() => act({ type: "REORDER_LAYER", id: state.selectedLayerIds[0], direction: "down" }, true)}><i className="fa-solid fa-arrow-down" /></button>
                <button type="button" title="Duplicate" disabled={!state.selectedLayerIds.length} onClick={() => act({ type: "DUPLICATE_LAYERS", ids: state.selectedLayerIds }, true)}><i className="fa-solid fa-copy" /></button>
                <button type="button" title="Delete" disabled={!state.selectedLayerIds.length} onClick={() => act({ type: "DELETE_LAYERS", ids: state.selectedLayerIds }, true)}><i className="fa-solid fa-trash" /></button>
              </div>
            </PanelHeader>
            <div className="pp-layer-scroll">
              {state.project.layers.length === 0 ? (
                <p className="pp-empty">No layers yet. Click <strong>+</strong> to add a layer or drop an image on the canvas.</p>
              ) : (
                <div className="pp-layer-list" ref={layerListRef}>
                  {[...state.project.layers].reverse().map((layer) => (
                    <div
                      key={layer.id}
                      data-layer-id={layer.id}
                      className={[
                        "pp-layer",
                        state.selectedLayerIds.includes(layer.id) ? "selected" : "",
                        layerDrag?.id === layer.id ? "dragging" : "",
                        layerDrag?.overId === layer.id && layerDrag.position === "before" ? "drop-before" : "",
                        layerDrag?.overId === layer.id && layerDrag.position === "after" ? "drop-after" : "",
                      ].filter(Boolean).join(" ")}
                      onClick={(e) => act({ type: "TOGGLE_LAYER_SELECT", id: layer.id, multi: e.shiftKey || e.metaKey || e.ctrlKey })}
                    >
                      <button
                        type="button"
                        className="pp-layer-grip"
                        title="Drag to reorder"
                        onPointerDown={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          setLayerDrag({ id: layer.id, overId: layer.id, position: "before" });
                        }}
                      >
                        <i className="fa-solid fa-grip-vertical" />
                      </button>
                      <button type="button" className="pp-layer-btn" onClick={(e) => { e.stopPropagation(); act({ type: "UPDATE_LAYER", id: layer.id, patch: { visible: !layer.visible } }); }}>
                        <i className={`fa-solid ${layer.visible ? "fa-eye" : "fa-eye-slash"}`} />
                      </button>
                      <span className="pp-layer-thumb"><i className={`fa-solid ${layerTypeIcon(layer.type)}`} /></span>
                      {renamingId === layer.id ? (
                        <input
                          className="pp-rename-input"
                          value={renameValue}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onBlur={() => { act({ type: "RENAME_LAYER", id: layer.id, name: renameValue }, true); setRenamingId(null); }}
                          onKeyDown={(e) => { if (e.key === "Enter") { act({ type: "RENAME_LAYER", id: layer.id, name: renameValue }, true); setRenamingId(null); } }}
                          autoFocus
                        />
                      ) : (
                        <span className="pp-layer-name" onDoubleClick={(e) => { e.stopPropagation(); setRenamingId(layer.id); setRenameValue(layer.name); }}>
                          {layer.name}
                        </span>
                      )}
                      <button type="button" className="pp-layer-btn" onClick={(e) => { e.stopPropagation(); act({ type: "UPDATE_LAYER", id: layer.id, patch: { locked: !layer.locked } }); }}>
                        <i className={`fa-solid ${layer.locked ? "fa-lock" : "fa-lock-open"}`} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {state.selectedLayerIds.length >= 2 && (
                <div className="pp-align-bar">
                  {(["left", "center", "right", "top", "middle", "bottom"] as const).map((a) => (
                    <button key={a} type="button" className="pp-align-btn" onClick={() => editor.alignSelected(a)}>{a}</button>
                  ))}
                </div>
              )}
            </div>
          </section>
        </aside>
      </div>

      <footer className="pp-statusbar">
        <span>{state.selectedLayerIds.length ? `${state.selectedLayerIds.length} selected` : activeTool?.label}</span>
        <span className="pp-statusbar-spacer" />
        <span>{state.project.canvasWidth} × {state.project.canvasHeight} px</span>
        <span className="pp-statusbar-divider">|</span>
        <button type="button" onClick={() => act({ type: "SET_VIEWPORT", patch: { zoom: Math.max(0.1, state.viewport.zoom / 1.15) } })}>−</button>
        <span>{Math.round(state.viewport.zoom * 100)}%</span>
        <button type="button" onClick={() => act({ type: "SET_VIEWPORT", patch: { zoom: Math.min(4, state.viewport.zoom * 1.15) } })}>+</button>
        <span className="pp-statusbar-divider">|</span>
        <span className="pp-hint-inline">Drop images · {formatShortcut("Mod+Z")} undo · {formatShortcut("Mod+E")} export · Space+Alt pan</span>
      </footer>

      <input ref={fileRef} type="file" accept="image/*,.svg" multiple hidden onChange={(e) => e.target.files && editor.importFiles(e.target.files)} />
      <input ref={projectRef} type="file" accept=".json,.plutopix.json" hidden onChange={async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const project = await importProjectJson(file);
        act({ type: "SET_PROJECT", project }, true);
        refreshProjects();
      }} />
      <input ref={batchRef} type="file" accept="image/*" multiple hidden onChange={(e) => e.target.files && runBatch(e.target.files)} />
      <input ref={stickerRef} type="file" accept="image/*" hidden onChange={(e) => {
        if (e.target.files) editor.importFiles(e.target.files);
      }} />
    </div>
  );
}
