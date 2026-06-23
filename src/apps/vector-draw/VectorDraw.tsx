import { useEffect, useRef, useState, type ReactNode } from "react";
import "@fortawesome/fontawesome-free/css/all.min.css";
import { BRUSH_TEXTURES, BrushTextureDefs, brushTextureFilterUrl } from "./brushTextures";
import { CANVAS_PRESETS } from "./constants";
import { draftToSvgD, pathToSvgD } from "./pathTools";
import {
  exportProjectJson,
  importProjectJson,
  listProjects,
  loadProject,
  type SavedProjectMeta,
} from "./projectStorage";
import { getSelectionBounds } from "./selectionLogic";
import { downloadSvg } from "./svgExport";
import type { BrushTextureId, LayerStyle, PathLayer, ToolId, VectorLayer } from "./types";
import { formatShortcut, useVectorEditor } from "./useVectorEditor";
import "./VectorDraw.css";

const TOOLS: { id: ToolId; icon: string; label: string; key: string }[] = [
  { id: "select", icon: "fa-arrow-pointer", label: "Move Tool", key: "V" },
  { id: "hand", icon: "fa-hand", label: "Hand Tool", key: "H" },
  { id: "path-edit", icon: "fa-anchor", label: "Direct Selection", key: "A" },
  { id: "pen", icon: "fa-pen-nib", label: "Pen Tool", key: "P" },
  { id: "pencil", icon: "fa-pencil", label: "Pencil Tool", key: "N" },
  { id: "brush", icon: "fa-paintbrush", label: "Brush Tool", key: "B" },
  { id: "rect", icon: "fa-square", label: "Rectangle Tool", key: "R" },
  { id: "ellipse", icon: "fa-circle", label: "Ellipse Tool", key: "O" },
  { id: "circle", icon: "fa-circle-dot", label: "Circle Tool", key: "C" },
  { id: "line", icon: "fa-minus", label: "Line Tool", key: "L" },
];

function toHexColor(value: string, fallback = "#6b9fff"): string {
  if (!value || value === "none") return fallback;
  if (value.startsWith("#")) return value.length >= 7 ? value.slice(0, 7) : fallback;
  const m = value.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (m) {
    return `#${[+m[1], +m[2], +m[3]].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
  }
  return fallback;
}

function TooltipBtn({
  tooltip,
  className,
  onClick,
  disabled,
  children,
}: {
  tooltip?: string;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className={className}
      title={tooltip}
      data-tooltip={tooltip}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

function PanelHeader({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="vd-panel-header">
      <span>{title}</span>
      {children}
    </div>
  );
}

function layerFilter(style: LayerStyle) {
  const parts: string[] = [];
  if (style.shadowBlur > 0 || style.shadowX !== 0 || style.shadowY !== 0) {
    parts.push(`drop-shadow(${style.shadowX}px ${style.shadowY}px ${style.shadowBlur}px rgba(0,0,0,${style.shadowOpacity / 100}))`);
  }
  if (style.blur > 0) parts.push(`blur(${style.blur}px)`);
  return parts.length ? parts.join(" ") : undefined;
}

function renderLayer(layer: VectorLayer) {
  const s = layer.style;
  const textureFilter = layer.type === "path" ? brushTextureFilterUrl(layer) : undefined;
  // CSS filter overrides the SVG filter attribute on the same element.
  const cssFilter = textureFilter ? undefined : layerFilter(s);
  const common = {
    fill: s.fill === "none" ? "none" : s.fill,
    fillOpacity: (s.fillOpacity / 100) * (layer.opacity / 100),
    stroke: s.stroke,
    strokeWidth: s.strokeWidth,
    strokeOpacity: s.strokeOpacity / 100,
    strokeDasharray: s.strokeDasharray || undefined,
    style: cssFilter ? { filter: cssFilter } : undefined,
    opacity: layer.opacity / 100,
    transform:
      layer.rotation !== 0
        ? `rotate(${layer.rotation} ${layer.x + layer.width / 2} ${layer.y + layer.height / 2})`
        : undefined,
  };

  if (!layer.visible) return null;

  switch (layer.type) {
    case "rect":
      return (
        <rect key={layer.id} x={layer.x} y={layer.y} width={layer.width} height={layer.height} rx={s.cornerRadius} {...common} />
      );
    case "ellipse":
      return (
        <ellipse
          key={layer.id}
          cx={layer.x + layer.width / 2}
          cy={layer.y + layer.height / 2}
          rx={layer.width / 2}
          ry={layer.height / 2}
          {...common}
        />
      );
    case "line":
      return <line key={layer.id} x1={layer.x} y1={layer.y} x2={layer.x2} y2={layer.y2} {...common} fill="none" />;
    case "path": {
      const d = pathToSvgD(layer);
      if (!d) return null;
      return (
        <path
          key={layer.id}
          d={d}
          {...common}
          filter={textureFilter}
          fill={layer.closed ? common.fill : "none"}
          strokeLinecap={layer.pathKind === "brush" ? "round" : layer.pathKind === "pencil" ? "square" : "round"}
          strokeLinejoin="round"
        />
      );
    }
  }
}

function WelcomeScreen({
  onNew,
  onOpen,
}: {
  onNew: (name: string, w: number, h: number) => void;
  onOpen: (id: string) => void;
}) {
  const [name, setName] = useState("Untitled-1");
  const [width, setWidth] = useState(1080);
  const [height, setHeight] = useState(1080);
  const [projects, setProjects] = useState<SavedProjectMeta[]>([]);

  useEffect(() => {
    void listProjects().then(setProjects);
  }, []);

  return (
    <div className="vd-welcome-overlay">
      <div className="vd-new-doc-dialog">
        <h2>New Document</h2>
        <div className="vd-dialog-body">
          <div className="vd-dialog-preview">
            <div className="vd-preview-box" style={{ aspectRatio: `${width} / ${height}` }} />
            <span>{width} × {height} px</span>
          </div>
          <div className="vd-dialog-form">
            <label>
              <span>Name</span>
              <input value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label>
              <span>Width (px)</span>
              <input type="number" value={width} onChange={(e) => setWidth(+e.target.value)} />
            </label>
            <label>
              <span>Height (px)</span>
              <input type="number" value={height} onChange={(e) => setHeight(+e.target.value)} />
            </label>
            <div className="vd-preset-list">
              <span className="vd-preset-label">Presets</span>
              {CANVAS_PRESETS.map((p) => (
                <button key={p.id} type="button" className="vd-preset-row" onClick={() => { setWidth(p.width); setHeight(p.height); setName(p.name); }}>
                  {p.name}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="vd-dialog-actions">
          <button type="button" className="vd-dialog-btn primary" onClick={() => onNew(name, width, height)}>Create</button>
        </div>
        {projects.length > 0 && (
          <div className="vd-recent-section">
            <h3>Open Recent</h3>
            <div className="vd-recent-list">
              {projects.map((p) => (
                <button key={p.id} type="button" className="vd-recent-row" onClick={() => onOpen(p.id)}>
                  <span>{p.name}</span>
                  <span>{new Date(p.updatedAt).toLocaleDateString()}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function VectorDraw() {
  const editor = useVectorEditor();
  const { state, act, commit, undo, redo, canUndo, canRedo } = editor;
  const projectRef = useRef<HTMLInputElement>(null);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const project = state.project;
  const selected = project?.layers.filter((l) => state.selectedLayerIds.includes(l.id)) ?? [];
  const selectedLayer = selected.length === 1 ? selected[0] : null;
  const selectionBounds = getSelectionBounds(selected);
  const activeStyle = selectedLayer?.style ?? state.style;
  const activeTool = TOOLS.find((t) => t.id === state.tool);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (!project) return;
      if ((e.metaKey || e.ctrlKey) && e.key === "z" && !e.shiftKey) { e.preventDefault(); undo(); }
      if ((e.metaKey || e.ctrlKey) && (e.key === "y" || (e.shiftKey && e.key === "z"))) { e.preventDefault(); redo(); }
      if ((e.metaKey || e.ctrlKey) && e.key === "s") { e.preventDefault(); commit(); }
      if (e.key === "Delete" && state.selectedLayerIds.length) {
        act({ type: "DELETE_LAYERS", ids: state.selectedLayerIds }, true);
      }
      if (e.key === "Enter" && state.tool === "pen") editor.finishPenPath(false);
      if (e.key === "Escape" && state.penDraft) act({ type: "SET_PEN_DRAFT", draft: null });
      const tool = TOOLS.find((t) => t.key.toLowerCase() === e.key.toLowerCase());
      if (tool && !e.metaKey && !e.ctrlKey) editor.setTool(tool.id);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [act, commit, editor, project, redo, state.penDraft, state.selectedLayerIds, state.tool, undo]);

  useEffect(() => {
    const close = () => setOpenMenu(null);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, []);

  const updateStyle = (patch: Partial<LayerStyle>, shouldCommit = false) => {
    if (selected.length) {
      for (const layer of selected) {
        act({ type: "UPDATE_LAYER", id: layer.id, patch: { style: { ...layer.style, ...patch } } });
      }
      if (shouldCommit) commit();
    } else {
      act({ type: "SET_STYLE", patch });
    }
  };

  const updateLayer = (patch: Partial<VectorLayer>) => {
    if (!selectedLayer) return;
    act({ type: "UPDATE_LAYER", id: selectedLayer.id, patch });
  };

  if (!project) {
    return (
      <div className="vector-draw vector-draw--welcome">
        <WelcomeScreen
          onNew={(name, w, h) => editor.newProject(name, w, h)}
          onOpen={(id) => {
            void loadProject(id).then((p) => {
              if (p) editor.openProject(p);
            });
          }}
        />
      </div>
    );
  }

  return (
    <div className="vector-draw vector-draw--editor">
      {/* Menu bar */}
      <nav className="vd-menubar">
        {[
          {
            id: "file",
            label: "File",
            items: [
              { label: "New…", action: () => act({ type: "CLOSE_PROJECT" }) },
              { label: "Save", action: commit, shortcut: "Mod+S" },
              { label: "Export SVG…", action: () => downloadSvg(project) },
              { label: "Export JSON…", action: () => exportProjectJson(project) },
              { label: "Import JSON…", action: () => projectRef.current?.click() },
              { label: "Close", action: () => act({ type: "CLOSE_PROJECT" }) },
            ],
          },
          {
            id: "edit",
            label: "Edit",
            items: [
              { label: "Undo", action: undo, shortcut: "Mod+Z", disabled: !canUndo },
              { label: "Redo", action: redo, shortcut: "Mod+Shift+Z", disabled: !canRedo },
              { label: "Duplicate", action: () => act({ type: "DUPLICATE_LAYERS", ids: state.selectedLayerIds }, true), disabled: !state.selectedLayerIds.length },
              { label: "Group", action: () => act({ type: "GROUP_LAYERS", ids: state.selectedLayerIds }, true), disabled: state.selectedLayerIds.length < 2 },
              { label: "Merge Shapes", action: () => act({ type: "MERGE_LAYERS", ids: state.selectedLayerIds }, true), disabled: state.selectedLayerIds.length < 2 },
              { label: "Delete", action: () => act({ type: "DELETE_LAYERS", ids: state.selectedLayerIds }, true), disabled: !state.selectedLayerIds.length },
            ],
          },
          {
            id: "view",
            label: "View",
            items: [
              { label: "Fit on Screen", action: editor.fitToScreen },
              { label: state.viewport.showGrid ? "Hide Grid" : "Show Grid", action: () => act({ type: "SET_VIEWPORT", patch: { showGrid: !state.viewport.showGrid } }) },
              { label: state.viewport.snapToGrid ? "Disable Snap" : "Enable Snap", action: () => act({ type: "SET_VIEWPORT", patch: { snapToGrid: !state.viewport.snapToGrid } }) },
            ],
          },
        ].map((menu) => (
          <div key={menu.id} className="vd-menu-wrap">
            <button
              type="button"
              className={`vd-menu-trigger ${openMenu === menu.id ? "open" : ""}`}
              onClick={(e) => { e.stopPropagation(); setOpenMenu(openMenu === menu.id ? null : menu.id); }}
            >
              {menu.label}
            </button>
            {openMenu === menu.id && (
              <div className="vd-menu-dropdown" onClick={(e) => e.stopPropagation()}>
                {menu.items.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    className="vd-menu-item"
                    disabled={"disabled" in item ? item.disabled : false}
                    onClick={() => { item.action(); setOpenMenu(null); }}
                  >
                    <span>{item.label}</span>
                    {item.shortcut && <span className="vd-menu-shortcut">{formatShortcut(item.shortcut)}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
        <span className="vd-doc-title">{project.name} @ {Math.round(state.viewport.zoom * 100)}%</span>
      </nav>

      {/* Options bar */}
      <div className="vd-optionsbar">
        <span className="vd-options-tool">
          <i className={`fa-solid ${activeTool?.icon ?? "fa-arrow-pointer"}`} />
          {activeTool?.label}
        </span>
        <span className="vd-options-divider" />

        {(state.tool === "brush" || state.tool === "pencil") ? (
          <>
            <label className="vd-opt"><span>Size</span><input type="range" min={1} max={80} value={state.brush.size} onChange={(e) => act({ type: "SET_BRUSH", patch: { size: +e.target.value } })} /></label>
            <label className="vd-opt"><span>Opacity</span><input type="range" min={10} max={100} value={state.brush.opacity} onChange={(e) => act({ type: "SET_BRUSH", patch: { opacity: +e.target.value } })} /></label>
            <label className="vd-opt"><span>Smooth</span><input type="range" min={1} max={12} value={state.brush.smoothing} onChange={(e) => act({ type: "SET_BRUSH", patch: { smoothing: +e.target.value } })} /></label>
            <label className="vd-opt"><span>Color</span><input type="color" value={state.style.stroke} onChange={(e) => act({ type: "SET_STYLE", patch: { stroke: e.target.value } })} /></label>
            {state.tool === "brush" && (
              <>
                <label className="vd-opt">
                  <span>Texture</span>
                  <select
                    value={state.brush.texture}
                    onChange={(e) => act({ type: "SET_BRUSH", patch: { texture: e.target.value as BrushTextureId } })}
                  >
                    {BRUSH_TEXTURES.map((t) => (
                      <option key={t.id} value={t.id}>{t.label}</option>
                    ))}
                  </select>
                </label>
                {state.brush.texture !== "none" && (
                  <label className="vd-opt"><span>Intensity</span><input type="range" min={5} max={100} value={state.brush.textureIntensity} onChange={(e) => act({ type: "SET_BRUSH", patch: { textureIntensity: +e.target.value } })} /></label>
                )}
              </>
            )}
          </>
        ) : (
          <>
            <label className="vd-opt"><span>Fill</span><input type="color" value={toHexColor(activeStyle.fill)} disabled={activeStyle.fill === "none"} onChange={(e) => updateStyle({ fill: e.target.value })} onBlur={commit} /></label>
            <label className="vd-opt"><span>Stroke</span><input type="color" value={toHexColor(activeStyle.stroke, "#6b9fff")} onChange={(e) => updateStyle({ stroke: e.target.value })} onBlur={commit} /></label>
            <label className="vd-opt"><span>W</span><input type="number" min={0} max={80} value={activeStyle.strokeWidth} onChange={(e) => updateStyle({ strokeWidth: +e.target.value })} onBlur={commit} /></label>
            <label className="vd-opt"><span>Radius</span><input type="number" min={0} max={80} value={activeStyle.cornerRadius} onChange={(e) => updateStyle({ cornerRadius: +e.target.value })} onBlur={commit} /></label>
            <label className="vd-opt"><span>Opacity</span><input type="number" min={0} max={100} value={selectedLayer?.opacity ?? 100} onChange={(e) => updateLayer({ opacity: +e.target.value })} onBlur={commit} disabled={!selectedLayer} /></label>
          </>
        )}

        <span className="vd-options-divider" />
        <div className="vd-zoom-bar">
          <button type="button" title="Zoom out" onClick={() => editor.zoomBy(1 / 1.2)}><i className="fa-solid fa-magnifying-glass-minus" /></button>
          <span>{Math.round(state.viewport.zoom * 100)}%</span>
          <button type="button" title="Zoom in" onClick={() => editor.zoomBy(1.2)}><i className="fa-solid fa-magnifying-glass-plus" /></button>
          <button type="button" title="Fit" onClick={editor.fitToScreen}>Fit</button>
        </div>
      </div>

      {/* Main workspace */}
      <div className="vd-workspace">
        {/* Left tools */}
        <aside className="vd-tools">
            {TOOLS.map((t) => (
              <TooltipBtn
                key={t.id}
                className={`vd-tool ${state.tool === t.id ? "active" : ""}`}
                tooltip={`${t.label} (${t.key})`}
                onClick={() => editor.setTool(t.id)}
              >
                <i className={`fa-solid ${t.icon}`} />
              </TooltipBtn>
            ))}
          </aside>

          {/* Document area */}
          <div ref={editor.viewportRef} className={`vd-doc-area ${state.tool === "hand" ? "vd-panning" : ""}`}>
          <div
            className="vd-canvas-stage"
            style={{
              transform: `translate(${state.viewport.panX}px, ${state.viewport.panY}px) scale(${state.viewport.zoom})`,
            }}
          >
            <svg
              ref={editor.svgRef}
              className="vd-svg"
              width={project.canvasWidth}
              height={project.canvasHeight}
              viewBox={`0 0 ${project.canvasWidth} ${project.canvasHeight}`}
              onPointerDown={editor.handlePointerDown}
              onPointerMove={editor.handlePointerMove}
              onPointerUp={editor.handlePointerUp}
              onPointerLeave={editor.handlePointerUp}
              onDoubleClick={editor.handleDoubleClick}
            >
              <rect width="100%" height="100%" fill={project.background} />
              {state.viewport.showGrid && (
                <defs>
                  <pattern id="vd-grid" width={state.viewport.gridSize} height={state.viewport.gridSize} patternUnits="userSpaceOnUse">
                    <path d={`M ${state.viewport.gridSize} 0 L 0 0 0 ${state.viewport.gridSize}`} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
                  </pattern>
                </defs>
              )}
              <BrushTextureDefs layers={project.layers.filter((l): l is PathLayer => l.type === "path")} />
              {state.viewport.showGrid && <rect width="100%" height="100%" fill="url(#vd-grid)" />}
              {project.layers.map(renderLayer)}

              {state.draftShape && state.draftShape.type === "line" && state.draftShape.x2 !== undefined ? (
                <line x1={state.draftShape.x} y1={state.draftShape.y} x2={state.draftShape.x2} y2={state.draftShape.y2} stroke={state.style.stroke} strokeWidth={state.style.strokeWidth} />
              ) : state.draftShape ? (
                <rect
                  x={state.draftShape.width < 0 ? state.draftShape.x + state.draftShape.width : state.draftShape.x}
                  y={state.draftShape.height < 0 ? state.draftShape.y + state.draftShape.height : state.draftShape.y}
                  width={Math.abs(state.draftShape.width)}
                  height={Math.abs(state.draftShape.height)}
                  fill={state.style.fill}
                  stroke={state.style.stroke}
                  strokeWidth={state.style.strokeWidth}
                  rx={state.draftShape.type === "rect" ? state.style.cornerRadius : 0}
                />
              ) : null}

              {state.penDraft && state.penDraft.points.length > 0 && (
                <>
                  <path d={draftToSvgD(state.penDraft.points, false)} fill="none" stroke={state.style.stroke} strokeWidth={state.style.strokeWidth} strokeDasharray="4 4" />
                  {state.penDraft.points.map((p, i) => (
                    <g key={i}>
                      <circle cx={p.x} cy={p.y} r={4} fill="#6b9fff" stroke="#fff" strokeWidth={1} />
                      {p.handleOut && (
                        <>
                          <line x1={p.x} y1={p.y} x2={p.handleOut.x} y2={p.handleOut.y} stroke="#6b9fff" strokeWidth={1} />
                          <circle cx={p.handleOut.x} cy={p.handleOut.y} r={3} fill="#e07a8a" />
                        </>
                      )}
                      {p.handleIn && (
                        <>
                          <line x1={p.x} y1={p.y} x2={p.handleIn.x} y2={p.handleIn.y} stroke="#6b9fff" strokeWidth={1} />
                          <circle cx={p.handleIn.x} cy={p.handleIn.y} r={3} fill="#6bb87a" />
                        </>
                      )}
                    </g>
                  ))}
                </>
              )}

              {selectionBounds && (state.tool === "select" || state.tool === "path-edit") && (
                <g className="vd-selection">
                  <rect x={selectionBounds.x - 4} y={selectionBounds.y - 4} width={selectionBounds.width + 8} height={selectionBounds.height + 8} fill="none" stroke="#6b9fff" strokeWidth={1.5} strokeDasharray="4 4" />
                  {state.tool === "select" && (["nw", "ne", "se", "sw"] as const).map((h) => {
                    const x = h.includes("e") ? selectionBounds.x + selectionBounds.width : selectionBounds.x;
                    const y = h.includes("s") ? selectionBounds.y + selectionBounds.height : selectionBounds.y;
                    return <circle key={h} cx={x} cy={y} r={5} fill="#6b9fff" stroke="#fff" strokeWidth={1} />;
                  })}
                </g>
              )}

              {state.tool === "path-edit" && selectedLayer?.type === "path" && selectedLayer.points.map((p, i) => (
                <g key={i} className="vd-path-edit">
                  <circle cx={p.x} cy={p.y} r={5} fill={state.pathEditIndex === i ? "#1473e6" : "#6b9fff"} stroke="#fff" strokeWidth={1} />
                  {p.handleOut && (
                    <>
                      <line x1={p.x} y1={p.y} x2={p.handleOut.x} y2={p.handleOut.y} stroke="#e07a8a" strokeWidth={1} />
                      <circle cx={p.handleOut.x} cy={p.handleOut.y} r={4} fill="#e07a8a" stroke="#fff" strokeWidth={1} />
                    </>
                  )}
                  {p.handleIn && (
                    <>
                      <line x1={p.x} y1={p.y} x2={p.handleIn.x} y2={p.handleIn.y} stroke="#6bb87a" strokeWidth={1} />
                      <circle cx={p.handleIn.x} cy={p.handleIn.y} r={4} fill="#6bb87a" stroke="#fff" strokeWidth={1} />
                    </>
                  )}
                </g>
              ))}

              {state.marquee && (
                <rect
                  x={state.marquee.width < 0 ? state.marquee.x + state.marquee.width : state.marquee.x}
                  y={state.marquee.height < 0 ? state.marquee.y + state.marquee.height : state.marquee.y}
                  width={Math.abs(state.marquee.width)}
                  height={Math.abs(state.marquee.height)}
                  fill="rgba(20,115,230,0.1)"
                  stroke="#1473e6"
                  strokeWidth={1}
                  strokeDasharray="4 2"
                />
              )}
            </svg>
          </div>
        </div>

        {/* Right panels — Properties then Layers */}
        <aside className="vd-panels">
          <section className="vd-panel vd-panel--properties">
            <PanelHeader title="Properties" />
            <div className="vd-panel-body">
              {!selectedLayer && <p className="vd-muted">No selection — drag a box to multi-select</p>}
              {selected.length > 1 && <p className="vd-muted">{selected.length} objects selected</p>}
              {selectedLayer && (
                <label className="vd-prop-row">
                  <span>Name</span>
                  <input value={selectedLayer.name} onChange={(e) => act({ type: "RENAME_LAYER", id: selectedLayer.id, name: e.target.value })} onBlur={commit} />
                </label>
              )}

              {selected.length >= 1 && (
                <div className="vd-prop-group">
                  <div className="vd-prop-title">Align</div>
                  <div className="vd-align-grid">
                    {(["left", "center", "right", "top", "middle", "bottom"] as const).map((a) => (
                      <button key={a} type="button" className="vd-align-btn" onClick={() => editor.alignSelected(a)}>{a}</button>
                    ))}
                  </div>
                </div>
              )}

              {selectedLayer && (
                <div className="vd-prop-group">
                  <div className="vd-prop-title">Quick actions</div>
                  <div className="vd-action-row">
                    <button type="button" className="vd-action-btn" onClick={() => updateLayer({ rotation: selectedLayer.rotation - 90 })}>↺ 90°</button>
                    <button type="button" className="vd-action-btn" onClick={() => updateLayer({ rotation: selectedLayer.rotation + 90 })}>↻ 90°</button>
                    <button type="button" className="vd-action-btn" onClick={() => act({ type: "DUPLICATE_LAYERS", ids: [selectedLayer.id] }, true)}>Duplicate</button>
                  </div>
                </div>
              )}

              <div className="vd-prop-group">
                <div className="vd-prop-title">Transform</div>
                <div className="vd-prop-grid">
                  <label><span>X</span><input type="number" value={Math.round(selectedLayer?.x ?? 0)} onChange={(e) => updateLayer({ x: +e.target.value })} onBlur={commit} disabled={!selectedLayer} /></label>
                  <label><span>Y</span><input type="number" value={Math.round(selectedLayer?.y ?? 0)} onChange={(e) => updateLayer({ y: +e.target.value })} onBlur={commit} disabled={!selectedLayer} /></label>
                  {selectedLayer && selectedLayer.type !== "line" && selectedLayer.type !== "path" && (
                    <>
                      <label><span>W</span><input type="number" value={Math.round(selectedLayer.width)} onChange={(e) => updateLayer({ width: +e.target.value })} onBlur={commit} /></label>
                      <label><span>H</span><input type="number" value={Math.round(selectedLayer.height)} onChange={(e) => updateLayer({ height: +e.target.value })} onBlur={commit} /></label>
                    </>
                  )}
                  <label><span>°</span><input type="number" value={selectedLayer?.rotation ?? 0} onChange={(e) => updateLayer({ rotation: +e.target.value })} onBlur={commit} disabled={!selectedLayer} /></label>
                </div>
              </div>

              <div className="vd-prop-group">
                <div className="vd-prop-title">Fill</div>
                <label className="vd-prop-color">
                  <span>Color</span>
                  <input
                    type="color"
                    value={toHexColor(activeStyle.fill)}
                    disabled={activeStyle.fill === "none"}
                    onChange={(e) => updateStyle({ fill: e.target.value })}
                    onBlur={commit}
                  />
                  <span className="vd-color-hex">{activeStyle.fill === "none" ? "none" : toHexColor(activeStyle.fill)}</span>
                </label>
                <label className="vd-prop-row"><span>Opacity</span><input type="range" min={0} max={100} value={activeStyle.fillOpacity} onChange={(e) => updateStyle({ fillOpacity: +e.target.value })} onMouseUp={commit} /></label>
                <div className="vd-action-row">
                  <button type="button" className={`vd-action-btn ${activeStyle.fill === "none" ? "active" : ""}`} onClick={() => { updateStyle({ fill: "none" }); commit(); }}>No fill</button>
                  <button type="button" className="vd-action-btn" onClick={() => { updateStyle({ fill: toHexColor(activeStyle.fill) }); commit(); }}>Enable fill</button>
                </div>
              </div>

              <div className="vd-prop-group">
                <div className="vd-prop-title">Stroke</div>
                <label className="vd-prop-color">
                  <span>Color</span>
                  <input
                    type="color"
                    value={toHexColor(activeStyle.stroke, "#6b9fff")}
                    onChange={(e) => updateStyle({ stroke: e.target.value })}
                    onBlur={commit}
                  />
                  <span className="vd-color-hex">{toHexColor(activeStyle.stroke, "#6b9fff")}</span>
                </label>
                <label className="vd-prop-row"><span>Width</span><input type="range" min={0} max={40} value={activeStyle.strokeWidth} onChange={(e) => updateStyle({ strokeWidth: +e.target.value })} onMouseUp={commit} /></label>
                <label className="vd-prop-row"><span>Opacity</span><input type="range" min={0} max={100} value={activeStyle.strokeOpacity} onChange={(e) => updateStyle({ strokeOpacity: +e.target.value })} onMouseUp={commit} /></label>
                <label className="vd-prop-row"><span>Dash</span><input value={activeStyle.strokeDasharray} placeholder="8 4" onChange={(e) => updateStyle({ strokeDasharray: e.target.value })} onBlur={commit} /></label>
                <label className="vd-prop-row"><span>Layer opacity</span><input type="range" min={0} max={100} value={selectedLayer?.opacity ?? 100} onChange={(e) => updateLayer({ opacity: +e.target.value })} onMouseUp={commit} disabled={!selectedLayer} /></label>
              </div>

              <div className="vd-prop-group">
                <div className="vd-prop-title">Corner</div>
                <label className="vd-prop-row"><span>Radius</span><input type="range" min={0} max={80} value={activeStyle.cornerRadius} onChange={(e) => updateStyle({ cornerRadius: +e.target.value })} onMouseUp={commit} /></label>
              </div>

              <div className="vd-prop-group">
                <div className="vd-prop-title">Effects</div>
                <label className="vd-prop-row"><span>Shadow X</span><input type="range" min={-30} max={30} value={activeStyle.shadowX} onChange={(e) => updateStyle({ shadowX: +e.target.value })} onMouseUp={commit} /></label>
                <label className="vd-prop-row"><span>Shadow Y</span><input type="range" min={-30} max={30} value={activeStyle.shadowY} onChange={(e) => updateStyle({ shadowY: +e.target.value })} onMouseUp={commit} /></label>
                <label className="vd-prop-row"><span>Shadow blur</span><input type="range" min={0} max={40} value={activeStyle.shadowBlur} onChange={(e) => updateStyle({ shadowBlur: +e.target.value })} onMouseUp={commit} /></label>
                <label className="vd-prop-row"><span>Blur</span><input type="range" min={0} max={20} value={activeStyle.blur} onChange={(e) => updateStyle({ blur: +e.target.value })} onMouseUp={commit} /></label>
              </div>

              <div className="vd-prop-group">
                <div className="vd-prop-title">Document</div>
                <label className="vd-prop-row"><span>Background</span><input type="color" value={project.background.startsWith("#") ? project.background : "#1a1a1a"} onChange={(e) => act({ type: "SET_BACKGROUND", color: e.target.value }, true)} /></label>
              </div>
            </div>
          </section>

          <section className="vd-panel vd-panel--layers">
            <PanelHeader title="Layers">
              <div className="vd-panel-actions">
                <button type="button" title="Group" disabled={state.selectedLayerIds.length < 2} onClick={() => act({ type: "GROUP_LAYERS", ids: state.selectedLayerIds }, true)}><i className="fa-solid fa-object-group" /></button>
                <button type="button" title="Merge" disabled={state.selectedLayerIds.length < 2} onClick={() => act({ type: "MERGE_LAYERS", ids: state.selectedLayerIds }, true)}><i className="fa-solid fa-code-merge" /></button>
                <button type="button" title="Duplicate" disabled={!state.selectedLayerIds.length} onClick={() => act({ type: "DUPLICATE_LAYERS", ids: state.selectedLayerIds }, true)}><i className="fa-solid fa-copy" /></button>
                <button type="button" title="Delete" disabled={!state.selectedLayerIds.length} onClick={() => act({ type: "DELETE_LAYERS", ids: state.selectedLayerIds }, true)}><i className="fa-solid fa-trash" /></button>
                <button type="button" title="Bring Forward" onClick={() => state.selectedLayerIds[0] && act({ type: "REORDER_LAYER", id: state.selectedLayerIds[0], direction: "up" }, true)}><i className="fa-solid fa-arrow-up" /></button>
                <button type="button" title="Send Backward" onClick={() => state.selectedLayerIds[0] && act({ type: "REORDER_LAYER", id: state.selectedLayerIds[0], direction: "down" }, true)}><i className="fa-solid fa-arrow-down" /></button>
              </div>
            </PanelHeader>
            <div className="vd-panel-body">
              <div className="vd-layer-list">
                {[...project.layers].reverse().map((layer) => (
                  <div
                    key={layer.id}
                    className={`vd-layer ${state.selectedLayerIds.includes(layer.id) ? "selected" : ""} ${layer.groupId ? "grouped" : ""}`}
                    onClick={(e) => act({ type: "TOGGLE_LAYER_SELECT", id: layer.id, multi: e.shiftKey || e.metaKey || e.ctrlKey })}
                  >
                    <button type="button" className="vd-layer-btn" onClick={(e) => { e.stopPropagation(); act({ type: "UPDATE_LAYER", id: layer.id, patch: { visible: !layer.visible } }); }}>
                      <i className={`fa-solid ${layer.visible ? "fa-eye" : "fa-eye-slash"}`} />
                    </button>
                    <span className="vd-layer-thumb" style={{ background: layer.style.fill.startsWith("#") ? layer.style.fill : layer.style.stroke }} />
                    {renamingId === layer.id ? (
                      <input
                        className="vd-rename-input"
                        value={renameValue}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onBlur={() => { act({ type: "RENAME_LAYER", id: layer.id, name: renameValue }, true); setRenamingId(null); }}
                        onKeyDown={(e) => { if (e.key === "Enter") { act({ type: "RENAME_LAYER", id: layer.id, name: renameValue }, true); setRenamingId(null); } }}
                        autoFocus
                      />
                    ) : (
                      <span className="vd-layer-name" onDoubleClick={(e) => { e.stopPropagation(); setRenamingId(layer.id); setRenameValue(layer.name); }}>
                        {layer.groupId && <i className="fa-solid fa-folder vd-group-icon" />}
                        {layer.name}
                      </span>
                    )}
                    <button type="button" className="vd-layer-btn" onClick={(e) => { e.stopPropagation(); act({ type: "UPDATE_LAYER", id: layer.id, patch: { locked: !layer.locked } }); }}>
                      <i className={`fa-solid ${layer.locked ? "fa-lock" : "fa-lock-open"}`} />
                    </button>
                  </div>
                ))}
              </div>
              {state.selectedLayerIds.length > 1 && (
                <p className="vd-muted">{state.selectedLayerIds.length} layers selected</p>
              )}
            </div>
          </section>
        </aside>
      </div>

      {/* Status bar */}
      <footer className="vd-statusbar">
        <span>{state.selectedLayerIds.length ? `${state.selectedLayerIds.length} selected` : activeTool?.label}</span>
        <span className="vd-statusbar-spacer" />
        <span>{project.canvasWidth} × {project.canvasHeight} px</span>
        <span className="vd-statusbar-divider">|</span>
        <button type="button" onClick={() => editor.zoomBy(1 / 1.2)}>−</button>
        <span className="vd-zoom-label">{Math.round(state.viewport.zoom * 100)}%</span>
        <button type="button" onClick={() => editor.zoomBy(1.2)}>+</button>
        <button type="button" onClick={editor.fitToScreen}>Fit</button>
        <span className="vd-statusbar-divider">|</span>
        <span className="vd-hint-inline">Shift+click multi-select · drag empty to marquee · Space pan</span>
      </footer>

      <input ref={projectRef} type="file" accept=".json,.vectordraw.json" hidden onChange={async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const p = await importProjectJson(file);
        editor.openProject(p);
      }} />
    </div>
  );
}
