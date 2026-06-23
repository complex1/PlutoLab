import { labelForOption } from "./projectUtils";
import { SHOT_TYPES } from "./constants";
import type { Panel } from "./types";

interface PanelCardProps {
  panel: Panel;
  selected: boolean;
  onSelect: () => void;
  onEdit?: () => void;
  onDrop: (fromId: string) => void;
}

export default function PanelCard({ panel, selected, onSelect, onEdit, onDrop }: PanelCardProps) {
  return (
    <article
      className={`sb-wf-panel-card ${selected ? "selected" : ""}`}
      draggable
      onDragStart={(e) => e.dataTransfer.setData("text/plain", panel.id)}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        onDrop(e.dataTransfer.getData("text/plain"));
      }}
      onDoubleClick={onEdit}
    >
      <div className="sb-wf-panel-card-top">
        <span className="sb-wf-panel-num">{String(panel.order).padStart(2, "0")}</span>
        <span className="sb-wf-panel-dur">{panel.duration}s</span>
      </div>
      <button type="button" className="sb-wf-panel-thumb-btn" onClick={onSelect}>
        <div className="sb-wf-panel-thumb">
          {panel.imageData ? (
            <img src={panel.imageData} alt="" />
          ) : (
            <span className="sb-wf-panel-sketch">Sketch</span>
          )}
        </div>
      </button>
      <p className="sb-wf-panel-desc">{panel.action || panel.title || "No description"}</p>
      <span className="sb-wf-panel-meta">{labelForOption(SHOT_TYPES, panel.shotType)}</span>
    </article>
  );
}
