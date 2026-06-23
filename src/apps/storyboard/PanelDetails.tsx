import { CAMERA_ANGLES, CAMERA_MOVEMENTS, SHOT_TYPES, TRANSITIONS } from "./constants";
import type { Panel } from "./types";

interface PanelDetailsProps {
  panel: Panel;
  onUpdate: (changes: Partial<Panel>) => void;
  onPrev?: () => void;
  onNext?: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onEditPanel?: () => void;
  compact?: boolean;
}

export default function PanelDetails({
  panel,
  onUpdate,
  onPrev,
  onNext,
  onDuplicate,
  onDelete,
  onEditPanel,
  compact,
}: PanelDetailsProps) {
  return (
    <div className="sb-wf-details">
      <div className="sb-wf-details-nav">
        <button type="button" className="sb-icon-btn" onClick={onPrev} disabled={!onPrev} aria-label="Previous panel">
          <i className="fa-solid fa-chevron-left" />
        </button>
        <span>Panel {String(panel.order).padStart(2, "0")}</span>
        <button type="button" className="sb-icon-btn" onClick={onNext} disabled={!onNext} aria-label="Next panel">
          <i className="fa-solid fa-chevron-right" />
        </button>
      </div>

      {onEditPanel && (
        <button type="button" className="sb-btn sb-btn--sm sb-btn--block" onClick={onEditPanel}>
          <i className="fa-solid fa-pen" /> Open Panel Editor
        </button>
      )}

      <label className="sb-field">
        Shot Title
        <input
          className="sb-input"
          value={panel.title}
          onChange={(e) => onUpdate({ title: e.target.value })}
        />
      </label>

      <label className="sb-field">
        Shot Type
        <select className="sb-select" value={panel.shotType} onChange={(e) => onUpdate({ shotType: e.target.value })}>
          {SHOT_TYPES.map((s) => (
            <option key={s.id} value={s.id}>{s.label}</option>
          ))}
        </select>
      </label>

      <label className="sb-field">
        Camera Angle
        <select className="sb-select" value={panel.cameraAngle} onChange={(e) => onUpdate({ cameraAngle: e.target.value })}>
          {CAMERA_ANGLES.map((s) => (
            <option key={s.id} value={s.id}>{s.label}</option>
          ))}
        </select>
      </label>

      {!compact && (
        <>
          <label className="sb-field">
            Camera Movement
            <select className="sb-select" value={panel.cameraMovement} onChange={(e) => onUpdate({ cameraMovement: e.target.value })}>
              {CAMERA_MOVEMENTS.map((s) => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
          </label>
          <label className="sb-field">
            Transition
            <select className="sb-select" value={panel.transition} onChange={(e) => onUpdate({ transition: e.target.value })}>
              {TRANSITIONS.map((s) => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
          </label>
        </>
      )}

      <label className="sb-field">
        Duration (sec)
        <input
          type="number"
          className="sb-input"
          min={1}
          max={120}
          value={panel.duration}
          onChange={(e) => onUpdate({ duration: Number(e.target.value) || 1 })}
        />
      </label>

      <label className="sb-field">
        Action
        <textarea className="sb-textarea" rows={3} value={panel.action} onChange={(e) => onUpdate({ action: e.target.value })} />
      </label>

      <label className="sb-field">
        Dialogue
        <textarea className="sb-textarea" rows={3} value={panel.dialogue} onChange={(e) => onUpdate({ dialogue: e.target.value })} />
      </label>

      <div className="sb-wf-details-actions">
        <button type="button" className="sb-btn sb-btn--sm" onClick={onDuplicate}>Duplicate</button>
        <button type="button" className="sb-btn sb-btn--sm sb-btn--danger" onClick={onDelete}>Delete</button>
      </div>
    </div>
  );
}
