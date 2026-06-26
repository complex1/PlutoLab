import { useState } from "react";
import type { AnimationFrame } from "./types";

interface TimelineProps {
  frames: AnimationFrame[];
  currentFrameId: string | null;
  isPlaying: boolean;
  fps: number;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onReorder: (fromId: string, toId: string) => void;
}

export default function Timeline({
  frames,
  currentFrameId,
  isPlaying,
  fps,
  onSelect,
  onAdd,
  onDuplicate,
  onDelete,
  onReorder,
}: TimelineProps) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const handleDrop = (targetId: string) => {
    if (dragId && dragId !== targetId) onReorder(dragId, targetId);
    setDragId(null);
    setOverId(null);
  };

  return (
    <footer className="fa-timeline">
      <div className="fa-timeline-controls">
        <span className="fa-timeline-fps">{fps} FPS</span>
        <button type="button" className="fa-tl-btn" onClick={onDuplicate} title="Duplicate frame (Ctrl+D)">
          <i className="fa-solid fa-copy" />
        </button>
        <button type="button" className="fa-tl-btn" onClick={onDelete} title="Delete frame" disabled={frames.length <= 1}>
          <i className="fa-solid fa-trash" />
        </button>
      </div>
      <div className="fa-timeline-track">
        {frames.map((frame) => (
          <button
            key={frame.id}
            type="button"
            draggable={!isPlaying}
            className={`fa-frame-thumb ${frame.id === currentFrameId ? "fa-frame-thumb--active" : ""} ${isPlaying && frame.id === currentFrameId ? "fa-frame-thumb--playing" : ""} ${dragId === frame.id ? "fa-frame-thumb--dragging" : ""} ${overId === frame.id && dragId !== frame.id ? "fa-frame-thumb--drop-target" : ""}`}
            onClick={() => onSelect(frame.id)}
            onDragStart={(e) => {
              setDragId(frame.id);
              e.dataTransfer.effectAllowed = "move";
            }}
            onDragEnd={() => {
              setDragId(null);
              setOverId(null);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
              setOverId(frame.id);
            }}
            onDragLeave={() => setOverId((id) => (id === frame.id ? null : id))}
            onDrop={(e) => {
              e.preventDefault();
              handleDrop(frame.id);
            }}
            title={`Frame ${frame.order} — drag to reorder`}
          >
            {frame.thumbnailData ? (
              <img src={frame.thumbnailData} alt="" draggable={false} />
            ) : (
              <span className="fa-frame-placeholder" />
            )}
            <span className="fa-frame-num">{String(frame.order).padStart(2, "0")}</span>
          </button>
        ))}
        <button type="button" className="fa-frame-add" onClick={onAdd} title="Add frame">
          <i className="fa-solid fa-plus" />
        </button>
      </div>
    </footer>
  );
}
