import type { AnimationProject, ExportConfig } from "./types";

interface ExportModalProps {
  project: AnimationProject;
  config: ExportConfig;
  onConfig: (patch: Partial<ExportConfig>) => void;
  onExport: () => void;
  onClose: () => void;
  busy: boolean;
}

const FORMATS = [
  { id: "gif" as const, label: "GIF", icon: "fa-file-image" },
  { id: "png-sequence" as const, label: "PNG Sequence (ZIP)", icon: "fa-images" },
  { id: "png-frame" as const, label: "Current Frame PNG", icon: "fa-image" },
  { id: "json" as const, label: "Project JSON", icon: "fa-file-code" },
];

export default function ExportModal({
  project,
  config,
  onConfig,
  onExport,
  onClose,
  busy,
}: ExportModalProps) {
  return (
    <div className="fa-modal-overlay" onClick={onClose}>
      <div className="fa-modal fa-export-modal" onClick={(e) => e.stopPropagation()}>
        <header className="fa-modal-header">
          <h2>Export Animation</h2>
          <button type="button" className="fa-icon-btn" onClick={onClose}>
            <i className="fa-solid fa-xmark" />
          </button>
        </header>

        <div className="fa-export-formats">
          {FORMATS.map((f) => (
            <button
              key={f.id}
              type="button"
              className={`fa-export-format ${config.format === f.id ? "active" : ""}`}
              onClick={() => onConfig({ format: f.id })}
            >
              <i className={`fa-solid ${f.icon}`} />
              {f.label}
            </button>
          ))}
        </div>

        {(config.format === "gif" || config.format === "png-sequence") && (
          <div className="fa-field-row">
            <label className="fa-field">
              <span>Export FPS</span>
              <input
                type="number"
                min={1}
                max={60}
                value={config.fps}
                onChange={(e) => onConfig({ fps: +e.target.value })}
              />
            </label>
            <label className="fa-check-field">
              <input
                type="checkbox"
                checked={config.transparent}
                onChange={(e) => onConfig({ transparent: e.target.checked })}
              />
              Transparent background
            </label>
          </div>
        )}

        <p className="fa-export-hint">
          {config.format === "gif" && `Exports all ${project.frames.length} frames as animated GIF.`}
          {config.format === "png-sequence" && `Exports ${project.frames.length} PNG files in a ZIP.`}
          {config.format === "png-frame" && "Exports the currently selected frame only."}
          {config.format === "json" && "Exports full project data for backup or import."}
        </p>

        <footer className="fa-modal-footer">
          <button type="button" className="fa-btn" onClick={onClose}>Cancel</button>
          <button type="button" className="fa-btn fa-btn--primary" onClick={onExport} disabled={busy}>
            {busy ? "Exporting…" : "Export"}
          </button>
        </footer>
      </div>
    </div>
  );
}
