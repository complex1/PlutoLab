import type { ExportConfig, ExportFormat, ExportRange } from "./types";

interface ExportModalProps {
  config: ExportConfig;
  onChange: (config: ExportConfig) => void;
  onExport: () => void;
  onClose: () => void;
}

const FORMATS: { id: ExportFormat; label: string; icon: string }[] = [
  { id: "png", label: "PNG Image", icon: "fa-image" },
  { id: "pdf", label: "PDF Document", icon: "fa-file-pdf" },
  { id: "json", label: "JSON Project", icon: "fa-file-code" },
  { id: "zip", label: "ZIP (Images)", icon: "fa-file-zipper" },
];

export default function ExportModal({ config, onChange, onExport, onClose }: ExportModalProps) {
  const set = <K extends keyof ExportConfig>(key: K, value: ExportConfig[K]) => {
    onChange({ ...config, [key]: value });
  };

  return (
    <div className="sb-modal-overlay" role="dialog" aria-label="Export options">
      <div className="sb-modal sb-export-modal">
        <header className="sb-modal-head">
          <h2>Export Options</h2>
          <button type="button" className="sb-icon-btn" onClick={onClose} aria-label="Close">
            <i className="fa-solid fa-xmark" />
          </button>
        </header>

        <section className="sb-export-section">
          <h3>Select Range</h3>
          <div className="sb-segmented">
            {(["all", "scene", "selected"] as ExportRange[]).map((r) => (
              <button
                key={r}
                type="button"
                className={config.range === r ? "active" : ""}
                onClick={() => set("range", r)}
              >
                {r === "all" ? "All Panels" : r === "scene" ? "Current Scene" : "Selected Panels"}
              </button>
            ))}
          </div>
        </section>

        <section className="sb-export-section">
          <h3>Export Format</h3>
          <div className="sb-export-formats">
            {FORMATS.map((f) => (
              <button
                key={f.id}
                type="button"
                className={`sb-export-format ${config.format === f.id ? "active" : ""}`}
                onClick={() => set("format", f.id)}
              >
                <i className={`fa-solid ${f.icon}`} />
                <span>{f.label}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="sb-export-section">
          <h3>Options</h3>
          <label className="sb-check">
            <input type="checkbox" checked={config.includeNotes} onChange={(e) => set("includeNotes", e.target.checked)} />
            Include Notes
          </label>
          <label className="sb-check">
            <input type="checkbox" checked={config.includeSceneTitles} onChange={(e) => set("includeSceneTitles", e.target.checked)} />
            Include Scene Titles
          </label>
          <label className="sb-check">
            <input type="checkbox" checked={config.includeDurations} onChange={(e) => set("includeDurations", e.target.checked)} />
            Include Durations
          </label>
          {config.format === "pdf" && (
            <label className="sb-field">
              PDF Layout
              <select
                className="sb-select"
                value={config.pdfPanelsPerPage}
                onChange={(e) => set("pdfPanelsPerPage", Number(e.target.value) as 2 | 4 | 6)}
              >
                <option value={2}>2 panels per page</option>
                <option value={4}>4 panels per page</option>
                <option value={6}>6 panels per page</option>
              </select>
            </label>
          )}
          <label className="sb-field">
            Quality
            <select className="sb-select" value={config.quality} onChange={(e) => set("quality", e.target.value as "high" | "medium")}>
              <option value="high">High Quality</option>
              <option value="medium">Medium Quality</option>
            </select>
          </label>
        </section>

        <footer className="sb-modal-foot">
          <button type="button" className="sb-btn sb-btn--primary sb-btn--lg" onClick={onExport}>
            <i className="fa-solid fa-download" /> Export
          </button>
        </footer>
      </div>
    </div>
  );
}
