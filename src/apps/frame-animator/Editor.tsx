import { useCallback, useEffect, useRef, useState } from "react";
import { TOOLS, BRUSH_TEXTURES } from "./constants";
import DrawingCanvas from "./DrawingCanvas";
import ExportModal from "./ExportModal";
import LayersPanel from "./LayersPanel";
import OnionSkinPanel from "./OnionSkinPanel";
import Timeline from "./Timeline";
import { runExport } from "./exportUtils";
import type { useFrameAnimator } from "./useFrameAnimator";

type AnimatorState = ReturnType<typeof useFrameAnimator>;

interface EditorProps {
  state: AnimatorState;
}

type InspectorTab = "layers" | "brush" | "view";

export default function Editor({ state }: EditorProps) {
  const project = state.project!;
  const [exportBusy, setExportBusy] = useState(false);
  const [inspectorTab, setInspectorTab] = useState<InspectorTab>("layers");
  const liveLayerRef = useRef(state.currentLayer?.imageData ?? "");
  const stageRef = useRef<HTMLDivElement>(null);
  const zoomRef = useRef(state.zoom);
  const panRef = useRef(state.pan);
  zoomRef.current = state.zoom;
  panRef.current = state.pan;

  useEffect(() => {
    if (state.currentLayer) {
      liveLayerRef.current = state.currentLayer.imageData;
    }
  }, [state.currentLayer?.id]);

  const handleCommit = useCallback(
    (imageData: string) => {
      liveLayerRef.current = imageData;
      state.commitLayerImage(imageData, false);
    },
    [state]
  );

  const handleStrokeStart = useCallback(
    (snapshot: string) => {
      state.pushHistorySnapshot(snapshot);
    },
    [state]
  );

  const handleSelectFrame = (id: string) => {
    void state.selectFrame(id, liveLayerRef.current);
    const frame = state.sortedFrames.find((f) => f.id === id);
    const layer = frame?.layers.find((l) => l.id === frame.activeLayerId) ?? frame?.layers[0];
    liveLayerRef.current = layer?.imageData ?? "";
  };

  const handleSelectLayer = (layerId: string) => {
    state.selectLayer(layerId, liveLayerRef.current);
    liveLayerRef.current = state.sortedLayers.find((l) => l.id === layerId)?.imageData ?? "";
  };

  const handleExport = async () => {
    setExportBusy(true);
    try {
      const exportProject = {
        ...project,
        fps: state.exportConfig.fps,
        transparent: state.exportConfig.transparent,
      };
      await runExport(exportProject, state.exportConfig, state.currentFrame?.imageData);
      state.setExportOpen(false);
    } finally {
      setExportBusy(false);
    }
  };

  const handleCopyLayer = useCallback(() => {
    state.copyLayer(undefined, liveLayerRef.current);
  }, [state]);

  const handlePasteLayer = useCallback(() => {
    state.pasteLayer(liveLayerRef.current);
  }, [state]);

  const zoomIn = () => state.setZoom((z) => Math.min(3, +(z + 0.25).toFixed(2)));
  const zoomOut = () => state.setZoom((z) => Math.max(0.25, +(z - 0.25).toFixed(2)));
  const fitZoom = () => {
    state.setZoom(1);
    state.setPan({ x: 0, y: 0 });
  };

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const oldZoom = zoomRef.current;
      const factor = Math.exp(-e.deltaY * 0.0012);
      const newZoom = Math.min(3, Math.max(0.25, +(oldZoom * factor).toFixed(3)));
      if (Math.abs(newZoom - oldZoom) < 0.001) return;

      const rect = stage.getBoundingClientRect();
      const px = e.clientX - rect.left - rect.width / 2;
      const py = e.clientY - rect.top - rect.height / 2;
      const ratio = newZoom / oldZoom;
      const pan = panRef.current;

      state.setPan({
        x: px - (px - pan.x) * ratio,
        y: py - (py - pan.y) * ratio,
      });
      state.setZoom(newZoom);
    };

    stage.addEventListener("wheel", onWheel, { passive: false });
    return () => stage.removeEventListener("wheel", onWheel);
  }, [state]);

  return (
    <div className="fa-editor">
      <header className="fa-topbar">
        <button type="button" className="fa-topbar-back" onClick={state.closeEditor}>
          <i className="fa-solid fa-arrow-left" /> Back
        </button>
        <input
          className="fa-project-name"
          value={project.title}
          onChange={(e) => state.renameProject(e.target.value)}
        />
        <span className={`fa-save-status fa-save-status--${state.saveStatus}`}>
          {state.saveStatus === "saving" ? "Saving…" : state.saveStatus === "unsaved" ? "Unsaved" : "Saved"}
        </span>
        <div className="fa-topbar-actions">
          <button type="button" className="fa-btn" onClick={() => state.setLoop(!state.loop)} title="Loop">
            <i className={`fa-solid ${state.loop ? "fa-repeat" : "fa-arrow-right"}`} />
          </button>
          <button type="button" className="fa-btn fa-btn--play" onClick={state.togglePlayback}>
            <i className={`fa-solid ${state.isPlaying ? "fa-pause" : "fa-play"}`} />
            {state.isPlaying ? "Pause" : "Play"}
          </button>
          <button type="button" className="fa-btn fa-btn--primary" onClick={() => state.setExportOpen(true)}>
            <i className="fa-solid fa-download" /> Export
          </button>
        </div>
      </header>

      <div className="fa-editor-body">
        <aside className="fa-toolbar">
          {TOOLS.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`fa-tool-btn ${state.tool === t.id ? "active" : ""}`}
              onClick={() => state.setTool(t.id)}
              title={`${t.label} (${t.shortcut})`}
            >
              <i className={`fa-solid ${t.icon}`} />
            </button>
          ))}
          <div className="fa-toolbar-divider" />
          <input
            type="color"
            className="fa-color-input"
            value={state.brush.color}
            onChange={(e) => state.setBrush({ ...state.brush, color: e.target.value })}
            title="Color"
          />
          <button
            type="button"
            className="fa-tool-btn"
            onClick={() => state.undo()}
            disabled={!state.canUndo}
            title="Undo"
          >
            <i className="fa-solid fa-rotate-left" />
          </button>
          <button
            type="button"
            className="fa-tool-btn"
            onClick={() => state.redo()}
            disabled={!state.canRedo}
            title="Redo"
          >
            <i className="fa-solid fa-rotate-right" />
          </button>
        </aside>

        <main className="fa-canvas-area">
          <div className="fa-canvas-toolbar">
            <button type="button" className="fa-mini-btn" onClick={zoomOut}><i className="fa-solid fa-minus" /></button>
            <span>{Math.round(state.zoom * 100)}%</span>
            <button type="button" className="fa-mini-btn" onClick={zoomIn}><i className="fa-solid fa-plus" /></button>
            <button type="button" className="fa-mini-btn" onClick={fitZoom}>Fit</button>
            <span className="fa-zoom-hint">Scroll to zoom</span>
            {state.tool === "lasso" && (
              <span className="fa-lasso-hint">Drag to select · Move/resize/rotate · Enter apply · Esc cancel</span>
            )}
            <button type="button" className="fa-mini-btn" onClick={() => state.goToFrame(-1)} disabled={state.currentIndex <= 0}>
              <i className="fa-solid fa-chevron-left" />
            </button>
            <span className="fa-frame-indicator">
              {state.currentIndex + 1} / {state.sortedFrames.length}
            </span>
            <button
              type="button"
              className="fa-mini-btn"
              onClick={() => state.goToFrame(1)}
              disabled={state.currentIndex >= state.sortedFrames.length - 1}
            >
              <i className="fa-solid fa-chevron-right" />
            </button>
          </div>
          <div className="fa-canvas-stage" ref={stageRef}>
            {state.currentFrame && state.currentLayer && (
              <DrawingCanvas
                frameId={state.currentFrame.id}
                layerId={state.currentLayer.id}
                layerImageData={state.currentLayer.imageData}
                layerStackKey={state.currentLayerStackKey}
                layerLocked={state.currentLayer.locked}
                frame={state.currentFrame}
                project={project}
                onionLayers={state.onionLayers}
                grid={project.settings.grid}
                tool={state.tool}
                brush={state.brush}
                zoom={state.zoom}
                pan={state.pan}
                onPanChange={state.setPan}
                readOnly={state.isPlaying}
                onCommit={handleCommit}
                onStrokeStart={handleStrokeStart}
                restoredImage={state.restoredImage}
                onRestored={() => state.clearRestoredImage()}
              />
            )}
          </div>
        </main>

        <aside className="fa-inspector">
          <div className="fa-inspector-tabs">
            <button
              type="button"
              className={`fa-inspector-tab ${inspectorTab === "layers" ? "active" : ""}`}
              onClick={() => setInspectorTab("layers")}
            >
              Layers
            </button>
            <button
              type="button"
              className={`fa-inspector-tab ${inspectorTab === "brush" ? "active" : ""}`}
              onClick={() => setInspectorTab("brush")}
            >
              Brush
            </button>
            <button
              type="button"
              className={`fa-inspector-tab ${inspectorTab === "view" ? "active" : ""}`}
              onClick={() => setInspectorTab("view")}
            >
              View
            </button>
          </div>

          <div className="fa-inspector-body">
            {inspectorTab === "layers" && (
              <LayersPanel
                layers={state.sortedLayers}
                activeLayerId={state.currentFrame?.activeLayerId ?? ""}
                hasClipboard={state.hasClipboardLayer}
                clipboardName={state.clipboardLayerName}
                onSelect={handleSelectLayer}
                onAdd={state.addLayer}
                onCopy={handleCopyLayer}
                onPaste={handlePasteLayer}
                onDuplicate={state.duplicateLayer}
                onDelete={state.deleteLayer}
                onToggleVisible={state.toggleLayerVisible}
                onToggleLocked={state.toggleLayerLocked}
                onRename={state.renameLayer}
                onOpacity={state.setLayerOpacity}
                onMove={state.moveLayer}
              />
            )}

            {inspectorTab === "brush" && (
              <section className="fa-panel fa-panel--flush">
                <label className="fa-slider-field">
                  <span>Size {state.brush.size}px</span>
                  <input
                    type="range"
                    min={1}
                    max={48}
                    value={state.brush.size}
                    onChange={(e) => state.setBrush({ ...state.brush, size: +e.target.value })}
                  />
                </label>
                <label className="fa-slider-field">
                  <span>Opacity {Math.round(state.brush.opacity * 100)}%</span>
                  <input
                    type="range"
                    min={0.1}
                    max={1}
                    step={0.05}
                    value={state.brush.opacity}
                    onChange={(e) => state.setBrush({ ...state.brush, opacity: +e.target.value })}
                  />
                </label>
                <label className="fa-slider-field">
                  <span>Smoothing</span>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={state.brush.smoothing}
                    onChange={(e) => state.setBrush({ ...state.brush, smoothing: +e.target.value })}
                  />
                </label>
                <label className="fa-field fa-field--compact">
                  <span>Texture</span>
                  <select
                    value={state.brush.texture}
                    onChange={(e) =>
                      state.setBrush({
                        ...state.brush,
                        texture: e.target.value as typeof state.brush.texture,
                      })
                    }
                  >
                    {BRUSH_TEXTURES.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </label>
                {state.brush.texture !== "solid" && (
                  <label className="fa-slider-field">
                    <span>Intensity {state.brush.textureIntensity}%</span>
                    <input
                      type="range"
                      min={10}
                      max={100}
                      value={state.brush.textureIntensity}
                      onChange={(e) =>
                        state.setBrush({ ...state.brush, textureIntensity: +e.target.value })
                      }
                    />
                  </label>
                )}
                <button type="button" className="fa-btn fa-btn--wide" onClick={state.clearCurrentLayer}>
                  Clear layer
                </button>
              </section>
            )}

            {inspectorTab === "view" && (
              <>
                <OnionSkinPanel
                  settings={project.settings.onionSkin}
                  onChange={state.setOnionSkin}
                />
                <section className="fa-panel">
                  <h3>Grid</h3>
                  <label className="fa-check-field">
                    <input
                      type="checkbox"
                      checked={project.settings.grid.enabled}
                      onChange={(e) => state.setGrid({ enabled: e.target.checked })}
                    />
                    Show grid
                  </label>
                  <label className="fa-slider-field">
                    <span>Size {project.settings.grid.size}px</span>
                    <input
                      type="range"
                      min={16}
                      max={120}
                      step={4}
                      value={project.settings.grid.size}
                      onChange={(e) => state.setGrid({ size: +e.target.value })}
                      disabled={!project.settings.grid.enabled}
                    />
                  </label>
                  <label className="fa-slider-field">
                    <span>Opacity {Math.round(project.settings.grid.opacity * 100)}%</span>
                    <input
                      type="range"
                      min={0.1}
                      max={0.5}
                      step={0.05}
                      value={project.settings.grid.opacity}
                      onChange={(e) => state.setGrid({ opacity: +e.target.value })}
                      disabled={!project.settings.grid.enabled}
                    />
                  </label>
                </section>
                <section className="fa-panel">
                  <h3>Timeline</h3>
                  <label className="fa-field fa-field--compact">
                    <span>FPS</span>
                    <input
                      type="number"
                      min={1}
                      max={60}
                      value={project.fps}
                      onChange={(e) => state.setFps(+e.target.value)}
                    />
                  </label>
                  <p className="fa-panel-hint">
                    Duration: {(project.frames.length / project.fps).toFixed(2)}s
                  </p>
                </section>
              </>
            )}
          </div>
        </aside>
      </div>

      <Timeline
        frames={state.sortedFrames}
        currentFrameId={state.currentFrame?.id ?? null}
        isPlaying={state.isPlaying}
        fps={project.fps}
        onSelect={handleSelectFrame}
        onAdd={state.addFrame}
        onDuplicate={state.duplicateFrame}
        onDelete={state.deleteFrame}
        onReorder={state.reorderFrame}
      />

      {state.exportOpen && (
        <ExportModal
          project={project}
          config={state.exportConfig}
          onConfig={(patch) => state.setExportConfig({ ...state.exportConfig, ...patch })}
          onExport={handleExport}
          onClose={() => state.setExportOpen(false)}
          busy={exportBusy}
        />
      )}
    </div>
  );
}
