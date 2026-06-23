import { useRef } from "react";
import DrawingCanvas from "./DrawingCanvas";
import { BRUSH_COLORS, CAMERA_ANGLES, CAMERA_MOVEMENTS, DRAW_TOOLS, SHOT_TYPES, TRANSITIONS } from "./constants";
import type { DrawStroke } from "./types";
import type { useStoryboard } from "./useStoryboard";

type State = ReturnType<typeof useStoryboard>;

export default function PanelEditor({ state }: { state: State }) {
  const uploadRef = useRef<HTMLInputElement>(null);
  const {
    project,
    selectedPanel,
    setEditorView,
    drawTool,
    setDrawTool,
    brush,
    setBrush,
    canvasSize,
    panelEditorTab,
    setPanelEditorTab,
    commitDrawing,
    undoDraw,
    redoDraw,
    clearPanel,
    uploadPanelImage,
    removePanelImage,
    updatePanel,
    duplicatePanel,
    deletePanel,
  } = state;

  if (!project || !selectedPanel) {
    return (
      <div className="sb-wf-panel-editor">
        <p className="sb-empty">No panel selected.</p>
        <button type="button" className="sb-btn" onClick={() => setEditorView("grid")}>Back to Grid</button>
      </div>
    );
  }

  const handleStrokeChange = (strokes: DrawStroke[], imageData: string) => {
    commitDrawing(selectedPanel.id, strokes, imageData);
  };

  return (
    <div className={`sb-wf-panel-editor sb-wf-editor--${project.settings.theme}`}>
      <header className="sb-wf-panel-editor-head">
        <button type="button" className="sb-btn sb-btn--sm" onClick={() => setEditorView("grid")}>
          <i className="fa-solid fa-arrow-left" /> Back to Grid
        </button>
        <h2>Panel {String(selectedPanel.order).padStart(2, "0")}</h2>
        <div className="sb-wf-panel-editor-actions">
          <button type="button" className="sb-btn sb-btn--sm" onClick={() => duplicatePanel(selectedPanel.id)}>
            Duplicate
          </button>
          <button type="button" className="sb-btn sb-btn--sm sb-btn--danger" onClick={() => deletePanel(selectedPanel.id)}>
            Delete
          </button>
          <button type="button" className="sb-icon-btn" onClick={() => setEditorView("grid")} aria-label="Close">
            <i className="fa-solid fa-xmark" />
          </button>
        </div>
      </header>

      <div className="sb-wf-panel-editor-body">
        <aside className="sb-wf-tools-col" aria-label="Drawing tools">
          {DRAW_TOOLS.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`sb-tool-btn ${drawTool === t.id ? "active" : ""}`}
              title={t.label}
              onClick={() => setDrawTool(t.id)}
            >
              <i className={`fa-solid ${t.icon}`} />
            </button>
          ))}
          <hr />
          <button type="button" className="sb-tool-btn" onClick={undoDraw} title="Undo"><i className="fa-solid fa-rotate-left" /></button>
          <button type="button" className="sb-tool-btn" onClick={redoDraw} title="Redo"><i className="fa-solid fa-rotate-right" /></button>
          <button type="button" className="sb-tool-btn" onClick={() => clearPanel(selectedPanel.id)} title="Clear">
            <i className="fa-solid fa-trash" />
          </button>
          <button type="button" className="sb-tool-btn" onClick={() => uploadRef.current?.click()} title="Upload">
            <i className="fa-solid fa-image" />
          </button>
          <input
            ref={uploadRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = () => uploadPanelImage(selectedPanel.id, String(reader.result), true);
              reader.readAsDataURL(file);
              e.target.value = "";
            }}
          />
        </aside>

        <div className="sb-wf-canvas-col">
          <div className="sb-wf-canvas-stage">
            <DrawingCanvas
              width={canvasSize.w}
              height={canvasSize.h}
              strokes={selectedPanel.strokes}
              backgroundImage={selectedPanel.backgroundImage}
              tool={drawTool}
              brush={brush}
              onStrokeStart={() => {}}
              onStrokesChange={handleStrokeChange}
            />
          </div>
          <div className="sb-wf-brush-bar">
            <label>
              Color
              <div className="sb-color-row">
                {BRUSH_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`sb-color-swatch ${brush.color === c ? "active" : ""}`}
                    style={{ background: c }}
                    onClick={() => setBrush({ ...brush, color: c })}
                  />
                ))}
              </div>
            </label>
            <label>
              Size
              <input type="range" min={1} max={20} value={brush.size} onChange={(e) => setBrush({ ...brush, size: Number(e.target.value) })} />
              <span>{brush.size}px</span>
            </label>
            <label>
              Opacity
              <input type="range" min={0.1} max={1} step={0.1} value={brush.opacity} onChange={(e) => setBrush({ ...brush, opacity: Number(e.target.value) })} />
              <span>{Math.round(brush.opacity * 100)}%</span>
            </label>
            <button type="button" className="sb-btn sb-btn--sm" onClick={() => removePanelImage(selectedPanel.id)}>
              Remove Image
            </button>
          </div>
        </div>

        <aside className="sb-wf-notes-col">
          <div className="sb-wf-tab-bar">
            <button type="button" className={panelEditorTab === "notes" ? "active" : ""} onClick={() => setPanelEditorTab("notes")}>
              Notes
            </button>
            <button type="button" className={panelEditorTab === "details" ? "active" : ""} onClick={() => setPanelEditorTab("details")}>
              Details
            </button>
          </div>

          {panelEditorTab === "notes" ? (
            <div className="sb-wf-tab-content">
              {[
                { key: "action" as const, label: "Action" },
                { key: "dialogue" as const, label: "Dialogue" },
                { key: "cameraNotes" as const, label: "Camera Notes" },
                { key: "backgroundNotes" as const, label: "Background Notes" },
                { key: "characterNotes" as const, label: "Character Notes" },
                { key: "soundNotes" as const, label: "Sound Notes" },
              ].map(({ key, label }) => (
                <label key={key} className="sb-field">
                  {label}
                  <textarea
                    className="sb-textarea"
                    rows={3}
                    value={selectedPanel[key]}
                    onChange={(e) => updatePanel(selectedPanel.id, { [key]: e.target.value })}
                  />
                </label>
              ))}
            </div>
          ) : (
            <div className="sb-wf-tab-content">
              <label className="sb-field">
                Shot Type
                <select className="sb-select" value={selectedPanel.shotType} onChange={(e) => updatePanel(selectedPanel.id, { shotType: e.target.value })}>
                  {SHOT_TYPES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
              </label>
              <label className="sb-field">
                Camera Angle
                <select className="sb-select" value={selectedPanel.cameraAngle} onChange={(e) => updatePanel(selectedPanel.id, { cameraAngle: e.target.value })}>
                  {CAMERA_ANGLES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
              </label>
              <label className="sb-field">
                Camera Movement
                <select className="sb-select" value={selectedPanel.cameraMovement} onChange={(e) => updatePanel(selectedPanel.id, { cameraMovement: e.target.value })}>
                  {CAMERA_MOVEMENTS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
              </label>
              <label className="sb-field">
                Transition
                <select className="sb-select" value={selectedPanel.transition} onChange={(e) => updatePanel(selectedPanel.id, { transition: e.target.value })}>
                  {TRANSITIONS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
              </label>
              <label className="sb-field">
                Duration (sec)
                <input type="number" className="sb-input" min={1} value={selectedPanel.duration} onChange={(e) => updatePanel(selectedPanel.id, { duration: Number(e.target.value) || 1 })} />
              </label>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
