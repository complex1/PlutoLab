import { getSortedPanels, getSortedScenes, labelForOption } from "./projectUtils";
import { SHOT_TYPES } from "./constants";
import type { useStoryboard } from "./useStoryboard";

type State = ReturnType<typeof useStoryboard>;

function formatTime(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function TimelineView({ state }: { state: State }) {
  const {
    project,
    orderedPanels,
    totalDuration,
    selectedPanelId,
    setSelectedPanelId,
    setPreviewOpen,
    setPreviewIndex,
  } = state;

  if (!project) return null;

  const scenes = getSortedScenes(project);
  let cursor = 0;

  return (
    <div className="sb-wf-timeline">
      <div className="sb-wf-timeline-head">
        <h3>Timeline</h3>
        <button
          type="button"
          className="sb-btn sb-btn--sm"
          onClick={() => {
            setPreviewIndex(0);
            setPreviewOpen(true);
          }}
        >
          <i className="fa-solid fa-play" /> Play
        </button>
        <span className="sb-wf-timeline-dur">
          Duration: 00:00 / {formatTime(totalDuration)}
        </span>
      </div>

      <div className="sb-wf-timeline-ruler">
        {Array.from({ length: Math.ceil(totalDuration / 5) + 1 }, (_, i) => (
          <span key={i} className="sb-wf-ruler-mark">{i * 5}s</span>
        ))}
      </div>

      <div className="sb-wf-timeline-strip">
        {orderedPanels.map((panel) => {
          const start = cursor;
          cursor += panel.duration;
          return (
            <button
              key={panel.id}
              type="button"
              className={`sb-wf-timeline-card ${panel.id === selectedPanelId ? "active" : ""}`}
              style={{ flex: `0 0 ${Math.max(panel.duration * 28, 64)}px` }}
              onClick={() => setSelectedPanelId(panel.id)}
              title={`${start}s – ${labelForOption(SHOT_TYPES, panel.shotType)}`}
            >
              {panel.imageData ? (
                <img src={panel.imageData} alt="" />
              ) : (
                <span className="sb-wf-tl-placeholder">{panel.order}</span>
              )}
              <span>{panel.duration}s</span>
            </button>
          );
        })}
      </div>

      <div className="sb-wf-scene-bars">
        {scenes.map((scene) => {
          const panels = getSortedPanels(project, scene.id);
          const sceneDur = panels.reduce((s, p) => s + p.duration, 0);
          return (
            <div
              key={scene.id}
              className="sb-wf-scene-bar"
              style={{ flex: `0 0 ${Math.max(sceneDur * 28, 80)}px` }}
            >
              {scene.title}
            </div>
          );
        })}
      </div>
    </div>
  );
}
