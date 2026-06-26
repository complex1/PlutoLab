import { useState } from "react";
import { CANVAS_PRESETS, FPS_PRESETS } from "./constants";
import type { NewProjectConfig } from "./types";

interface NewProjectModalProps {
  onClose: () => void;
  onCreate: (config: NewProjectConfig) => void;
}

export default function NewProjectModal({ onClose, onCreate }: NewProjectModalProps) {
  const [title, setTitle] = useState("Untitled Animation");
  const [presetId, setPresetId] = useState("square");
  const [width, setWidth] = useState(1080);
  const [height, setHeight] = useState(1080);
  const [fps, setFps] = useState(12);
  const [customFps, setCustomFps] = useState("");
  const [background, setBackground] = useState("#ffffff");
  const [transparent, setTransparent] = useState(false);

  const applyPreset = (id: string) => {
    setPresetId(id);
    const preset = CANVAS_PRESETS.find((p) => p.id === id);
    if (preset && id !== "custom") {
      setWidth(preset.width);
      setHeight(preset.height);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalFps = customFps ? Math.min(60, Math.max(1, Number(customFps) || fps)) : fps;
    onCreate({
      title: title.trim() || "Untitled Animation",
      width: Math.min(1920, Math.max(64, width)),
      height: Math.min(1920, Math.max(64, height)),
      fps: finalFps,
      background,
      transparent,
    });
  };

  return (
    <div className="fa-modal-overlay" onClick={onClose}>
      <form className="fa-modal" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <header className="fa-modal-header">
          <h2>New Animation</h2>
          <button type="button" className="fa-icon-btn" onClick={onClose}>
            <i className="fa-solid fa-xmark" />
          </button>
        </header>

        <label className="fa-field">
          <span>Project name</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
        </label>

        <div className="fa-field">
          <span>Canvas size</span>
          <div className="fa-preset-grid">
            {CANVAS_PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                className={`fa-preset-btn ${presetId === p.id ? "active" : ""}`}
                onClick={() => applyPreset(p.id)}
              >
                <strong>{p.label}</strong>
                <small>{p.width} × {p.height}</small>
              </button>
            ))}
          </div>
        </div>

        {presetId === "custom" && (
          <div className="fa-field-row">
            <label className="fa-field">
              <span>Width</span>
              <input type="number" value={width} onChange={(e) => setWidth(+e.target.value)} min={64} max={1920} />
            </label>
            <label className="fa-field">
              <span>Height</span>
              <input type="number" value={height} onChange={(e) => setHeight(+e.target.value)} min={64} max={1920} />
            </label>
          </div>
        )}

        <div className="fa-field">
          <span>FPS</span>
          <div className="fa-fps-row">
            {FPS_PRESETS.map((f) => (
              <button
                key={f}
                type="button"
                className={`fa-fps-btn ${fps === f && !customFps ? "active" : ""}`}
                onClick={() => { setFps(f); setCustomFps(""); }}
              >
                {f}
              </button>
            ))}
            <input
              className="fa-fps-custom"
              placeholder="Custom"
              value={customFps}
              onChange={(e) => setCustomFps(e.target.value)}
            />
          </div>
        </div>

        <div className="fa-field-row">
          <label className="fa-field">
            <span>Background</span>
            <div className="fa-color-row">
              <input type="color" value={background} onChange={(e) => setBackground(e.target.value)} disabled={transparent} />
              <input value={background} onChange={(e) => setBackground(e.target.value)} disabled={transparent} />
            </div>
          </label>
          <label className="fa-check-field">
            <input type="checkbox" checked={transparent} onChange={(e) => setTransparent(e.target.checked)} />
            Transparent background
          </label>
        </div>

        <footer className="fa-modal-footer">
          <button type="button" className="fa-btn" onClick={onClose}>Cancel</button>
          <button type="submit" className="fa-btn fa-btn--primary">Create</button>
        </footer>
      </form>
    </div>
  );
}
