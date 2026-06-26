import { useCallback, useState, type DragEvent } from "react";
import "@fortawesome/fontawesome-free/css/all.min.css";
import { hexToHslString, hexToRgbString } from "./colorLogic";
import { useColorPalette } from "./useColorPalette";
import "./ColorPalette.css";

const EXPORT_FORMATS = [
  { id: "css" as const, label: "CSS" },
  { id: "scss" as const, label: "SCSS" },
  { id: "tailwind" as const, label: "Tailwind" },
];

export default function ColorPalette() {
  const cp = useColorPalette();
  const [dragOver, setDragOver] = useState(false);
  const [expandedColorId, setExpandedColorId] = useState<string | null>(null);

  const onDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file?.type.startsWith("image/")) cp.loadFile(file);
    },
    [cp]
  );

  return (
    <div className="cp">
      <header className="cp-header">
        <div className="cp-header-icon" aria-hidden="true">
          <i className="fa-solid fa-palette" />
        </div>
        <div>
          <h1 className="cp-title">Color Palette Generator</h1>
          <p className="cp-tagline">
            Pick colors from images, generate harmonies, and export CSS variables.
          </p>
        </div>
        {cp.status && <span className="cp-status">{cp.status}</span>}
      </header>

      <div className="cp-layout">
        <section className="cp-panel cp-panel--source">
          <div className="cp-panel-head">
            <h2>Image source</h2>
            <div className="cp-panel-actions">
              <button type="button" className="cp-btn" onClick={cp.openFilePicker}>
                <i className="fa-solid fa-upload" /> Upload
              </button>
              <button
                type="button"
                className="cp-btn cp-btn--primary"
                onClick={cp.extractFromImage}
                disabled={!cp.imageUrl}
              >
                <i className="fa-solid fa-wand-magic-sparkles" /> Extract
              </button>
            </div>
          </div>

          <input
            ref={cp.fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) cp.loadFile(file);
              e.target.value = "";
            }}
          />

          <div
            className={`cp-dropzone ${dragOver ? "cp-dropzone--active" : ""} ${cp.imageUrl ? "cp-dropzone--has-image" : ""}`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
          >
            <canvas
              ref={cp.canvasRef}
              className="cp-canvas"
              onClick={(e) => cp.pickAt(e.clientX, e.clientY)}
            />
            {!cp.imageUrl && (
              <div className="cp-dropzone-hint">
                <i className="fa-solid fa-image" />
                <p>Drop an image or click Upload</p>
                <span>Eyedropper: click anywhere on the image</span>
              </div>
            )}
          </div>

          {cp.pickedHex && (
            <div className="cp-picked-bar">
              <span className="cp-picked-chip" style={{ background: cp.pickedHex }} />
              <code>{cp.pickedHex}</code>
              <button type="button" className="cp-btn cp-btn--primary" onClick={cp.addPickedColor}>
                Add to palette
              </button>
            </div>
          )}

          <div className="cp-samples">
            <span className="cp-samples-label">Sample images</span>
            <div className="cp-sample-row">
              {cp.sampleImages.map((img) => (
                <button
                  key={img.id}
                  type="button"
                  className="cp-sample-chip"
                  onClick={() => cp.loadSampleImage(img.id)}
                >
                  {img.name}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="cp-panel cp-panel--palette">
          <div className="cp-panel-head">
            <h2>Palette</h2>
            <div className="cp-panel-actions">
              <button type="button" className="cp-btn" onClick={cp.clearPalette}>
                Clear
              </button>
            </div>
          </div>

          <div className="cp-add-row">
            <input
              type="color"
              value={cp.manualHex}
              onChange={(e) => cp.setManualHex(e.target.value)}
              aria-label="Pick color"
            />
            <input
              className="cp-hex-input"
              value={cp.manualHex}
              onChange={(e) => cp.setManualHex(e.target.value)}
              spellCheck={false}
            />
            <button type="button" className="cp-btn cp-btn--primary" onClick={cp.addManualColor}>
              Add
            </button>
          </div>

          <div className="cp-swatches">
            {cp.colors.length === 0 && (
              <p className="cp-empty">No colors yet — extract from an image or add manually.</p>
            )}
            {cp.colors.map((color) => (
              <div key={color.id} className="cp-swatch-wrap">
                <button
                  type="button"
                  className={`cp-swatch-btn ${cp.baseColorId === color.id ? "cp-swatch-btn--base" : ""}`}
                  style={{ background: color.hex }}
                  onClick={() => {
                    cp.setBaseColorId(color.id);
                    setExpandedColorId(expandedColorId === color.id ? null : color.id);
                  }}
                  title={color.hex}
                >
                  <span style={{ color: cp.getReadableTextColor(color.hex) }}>{color.hex}</span>
                </button>
                <input
                  className="cp-label-input"
                  value={color.label ?? ""}
                  placeholder="label"
                  onChange={(e) => cp.updateColorLabel(color.id, e.target.value)}
                />
                {expandedColorId === color.id && (
                  <div className="cp-swatch-detail">
                    <div className="cp-format-row">
                      <code>{color.hex}</code>
                      <code>{hexToRgbString(color.hex)}</code>
                      <code>{hexToHslString(color.hex)}</code>
                    </div>
                    <div className="cp-contrast-row">
                      <span>W: {cp.contrastWithWhite(color.hex).toFixed(1)}:1</span>
                      <span>B: {cp.contrastWithBlack(color.hex).toFixed(1)}:1</span>
                    </div>
                    <div className="cp-swatch-detail-actions">
                      <button type="button" onClick={() => cp.copyColor(color.hex, "hex")}>
                        Copy HEX
                      </button>
                      <button type="button" onClick={() => cp.copyColor(color.hex, "rgb")}>
                        Copy RGB
                      </button>
                      <button type="button" onClick={() => cp.copyColor(color.hex, "hsl")}>
                        Copy HSL
                      </button>
                      <button type="button" className="cp-danger" onClick={() => cp.removeColor(color.id)}>
                        Remove
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="cp-samples">
            <span className="cp-samples-label">Starter palettes</span>
            <div className="cp-sample-row">
              {cp.samplePalettes.map((sample) => (
                <button
                  key={sample.id}
                  type="button"
                  className="cp-sample-palette"
                  onClick={() => cp.applySamplePalette(sample.id)}
                  title={sample.name}
                >
                  {sample.colors.map((hex) => (
                    <span key={hex} style={{ background: hex }} />
                  ))}
                  <span className="cp-sample-palette-name">{sample.name}</span>
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="cp-panel cp-panel--tools">
          <nav className="cp-tabs">
            {(["generate", "export", "saved"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                className={`cp-tab ${cp.activePanel === tab ? "cp-tab--active" : ""}`}
                onClick={() => cp.setActivePanel(tab)}
              >
                {tab === "generate" ? "Harmonies" : tab === "export" ? "Export" : "Saved"}
              </button>
            ))}
          </nav>

          {cp.activePanel === "generate" && (
            <div className="cp-tab-panel">
              <p className="cp-base-label">
                Base color: <code>{cp.baseColor}</code>
              </p>
              <div className="cp-scheme-grid">
                {cp.harmonySchemes.map((scheme) => (
                  <button
                    key={scheme.id}
                    type="button"
                    className={`cp-scheme-card ${cp.harmonyScheme === scheme.id ? "cp-scheme-card--active" : ""}`}
                    onClick={() => cp.setHarmonyScheme(scheme.id)}
                  >
                    <strong>{scheme.label}</strong>
                    <span>{scheme.description}</span>
                  </button>
                ))}
              </div>
              <div className="cp-harmony-preview">
                {cp.harmonyColors.map((hex) => (
                  <div key={hex} className="cp-harmony-swatch" style={{ background: hex }} title={hex}>
                    <span style={{ color: cp.getReadableTextColor(hex) }}>{hex}</span>
                  </div>
                ))}
              </div>
              <button type="button" className="cp-btn cp-btn--primary cp-btn--wide" onClick={cp.applyHarmony}>
                Apply harmony to palette
              </button>
            </div>
          )}

          {cp.activePanel === "export" && (
            <div className="cp-tab-panel">
              <div className="cp-export-controls">
                <label>
                  <span>Prefix</span>
                  <input
                    value={cp.exportPrefix}
                    onChange={(e) => cp.setExportPrefix(e.target.value)}
                    placeholder="color"
                  />
                </label>
                <div className="cp-format-tabs">
                  {EXPORT_FORMATS.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      className={`cp-format-tab ${cp.exportFormat === f.id ? "cp-format-tab--active" : ""}`}
                      onClick={() => cp.setExportFormat(f.id)}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
              <pre className="cp-export-preview">{cp.exportText || "Add colors to export."}</pre>
              <button
                type="button"
                className="cp-btn cp-btn--primary cp-btn--wide"
                onClick={cp.copyExport}
                disabled={!cp.exportText}
              >
                <i className="fa-solid fa-copy" /> Copy {cp.exportFormat.toUpperCase()}
              </button>
            </div>
          )}

          {cp.activePanel === "saved" && (
            <div className="cp-tab-panel">
              <div className="cp-save-row">
                <input
                  value={cp.saveName}
                  onChange={(e) => cp.setSaveName(e.target.value)}
                  placeholder="Palette name"
                />
                <button type="button" className="cp-btn cp-btn--primary" onClick={cp.savePalette}>
                  Save
                </button>
              </div>
              <ul className="cp-saved-list">
                {cp.savedPalettes.length === 0 && (
                  <li className="cp-empty">No saved palettes yet.</li>
                )}
                {cp.savedPalettes.map((palette) => (
                  <li key={palette.id} className="cp-saved-item">
                    <button type="button" className="cp-saved-load" onClick={() => cp.loadSaved(palette)}>
                      <div className="cp-saved-swatches">
                        {palette.colors.slice(0, 6).map((c) => (
                          <span key={c.id} style={{ background: c.hex }} />
                        ))}
                      </div>
                      <span>{palette.name}</span>
                    </button>
                    <button
                      type="button"
                      className="cp-saved-delete"
                      onClick={() => cp.removeSaved(palette.id)}
                      title="Delete"
                    >
                      <i className="fa-solid fa-trash" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
