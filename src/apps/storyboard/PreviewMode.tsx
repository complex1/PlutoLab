import { useEffect, useState } from "react";
import { labelForOption } from "./projectUtils";
import { CAMERA_ANGLES, SHOT_TYPES } from "./constants";
import type { Panel } from "./types";

interface PreviewModeProps {
  panels: Panel[];
  startIndex: number;
  showNotes: boolean;
  onClose: () => void;
}

function formatTime(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function PreviewMode({ panels, startIndex, showNotes, onClose }: PreviewModeProps) {
  const [index, setIndex] = useState(startIndex);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const panel = panels[index];
  const elapsed = panels.slice(0, index).reduce((s, p) => s + p.duration, 0);
  const total = panels.reduce((s, p) => s + p.duration, 0);

  useEffect(() => {
    if (!playing || !panel) return;
    const timer = setTimeout(() => {
      setIndex((i) => (i < panels.length - 1 ? i + 1 : i));
    }, (panel.duration * 1000) / speed);
    return () => clearTimeout(timer);
  }, [playing, panel, panels.length, index, speed]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") setIndex((i) => Math.min(i + 1, panels.length - 1));
      if (e.key === "ArrowLeft") setIndex((i) => Math.max(i - 1, 0));
      if (e.key === " ") {
        e.preventDefault();
        setPlaying((p) => !p);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, panels.length]);

  if (!panel) return null;

  const progress = total > 0 ? (elapsed / total) * 100 : 0;

  return (
    <div className="sb-preview-overlay sb-wf-preview" role="dialog" aria-label="Storyboard preview">
      <button type="button" className="sb-wf-preview-close" onClick={onClose} aria-label="Close">
        <i className="fa-solid fa-xmark" />
      </button>

      <div className="sb-wf-preview-layout">
        <div className="sb-wf-preview-stage">
          <button
            type="button"
            className="sb-preview-nav"
            disabled={index === 0}
            onClick={() => setIndex((i) => i - 1)}
          >
            <i className="fa-solid fa-chevron-left" />
          </button>

          <div className="sb-wf-preview-frame">
            {panel.imageData ? (
              <img src={panel.imageData} alt={`Panel ${panel.order}`} />
            ) : (
              <div className="sb-preview-placeholder">No sketch</div>
            )}
          </div>

          <button
            type="button"
            className="sb-preview-nav"
            disabled={index >= panels.length - 1}
            onClick={() => setIndex((i) => i + 1)}
          >
            <i className="fa-solid fa-chevron-right" />
          </button>
        </div>

        <aside className="sb-wf-preview-sidebar">
          <h3>Panel {String(panel.order).padStart(2, "0")} / {panels.length}</h3>
          <span className="sb-wf-preview-dur">{panel.duration} sec</span>
          {showNotes && (
            <div className="sb-wf-preview-meta">
              {panel.action && <p><strong>Action</strong>{panel.action}</p>}
              {panel.dialogue && <p><strong>Dialogue</strong>{panel.dialogue}</p>}
              <p><strong>Shot Type</strong>{labelForOption(SHOT_TYPES, panel.shotType)}</p>
              <p><strong>Camera Angle</strong>{labelForOption(CAMERA_ANGLES, panel.cameraAngle)}</p>
            </div>
          )}
        </aside>
      </div>

      <footer className="sb-wf-preview-controls">
        <button type="button" className="sb-btn" onClick={() => setPlaying((p) => !p)}>
          <i className={`fa-solid ${playing ? "fa-pause" : "fa-play"}`} />
        </button>
        <input
          type="range"
          className="sb-wf-preview-scrub"
          min={0}
          max={100}
          value={progress}
          onChange={(e) => {
            const pct = Number(e.target.value) / 100;
            let acc = 0;
            for (let i = 0; i < panels.length; i++) {
              acc += panels[i].duration / total;
              if (pct <= acc) {
                setIndex(i);
                break;
              }
            }
          }}
        />
        <span>{formatTime(elapsed)} / {formatTime(total)}</span>
        <select className="sb-select sb-select--sm" value={speed} onChange={(e) => setSpeed(Number(e.target.value))}>
          <option value={0.5}>0.5x</option>
          <option value={1}>1x</option>
          <option value={1.5}>1.5x</option>
          <option value={2}>2x</option>
        </select>
        <button type="button" className="sb-icon-btn" onClick={() => document.documentElement.requestFullscreen?.()} aria-label="Fullscreen">
          <i className="fa-solid fa-expand" />
        </button>
      </footer>
    </div>
  );
}
