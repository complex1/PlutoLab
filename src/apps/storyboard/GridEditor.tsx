import PanelCard from "./PanelCard";
import PanelDetails from "./PanelDetails";
import { getSortedPanels, getSortedScenes } from "./projectUtils";
import type { useStoryboard } from "./useStoryboard";

type State = ReturnType<typeof useStoryboard>;

export default function GridEditor({ state }: { state: State }) {
  const {
    project,
    selectedPanelId,
    setSelectedPanelId,
    selectedSceneId,
    setSelectedSceneId,
    filteredPanelsForGrid,
    orderedPanels,
    openPanelEditor,
    addScene,
    updateScene,
    deleteScene,
    updatePanel,
    deletePanel,
    duplicatePanel,
    dragReorder,
  } = state;

  if (!project) return null;

  const scenes = getSortedScenes(project);
  const selectedPanel = project.panels.find((p) => p.id === selectedPanelId) ?? null;
  const panelIndex = orderedPanels.findIndex((p) => p.id === selectedPanelId);

  return (
    <div className="sb-wf-grid-layout">
      <aside className="sb-wf-scenes-col">
        <h3>Scenes</h3>
        <ul className="sb-wf-scene-list">
          <li>
            <button
              type="button"
              className={`sb-wf-scene-item ${!selectedSceneId ? "active" : ""}`}
              onClick={() => setSelectedSceneId(null)}
            >
              All Scenes
              <span>{project.panels.length}</span>
            </button>
          </li>
          {scenes.map((scene) => {
            const count = getSortedPanels(project, scene.id).length;
            const canDeleteScene = scenes.length > 1;
            return (
              <li key={scene.id} className="sb-wf-scene-row">
                <button
                  type="button"
                  className={`sb-wf-scene-item ${selectedSceneId === scene.id ? "active" : ""}`}
                  onClick={() => setSelectedSceneId(scene.id)}
                >
                  <input
                    className="sb-wf-scene-name"
                    value={scene.title}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => updateScene(scene.id, { title: e.target.value })}
                  />
                  <span>{count}</span>
                </button>
                <button
                  type="button"
                  className="sb-wf-scene-delete"
                  disabled={!canDeleteScene}
                  title={canDeleteScene ? "Delete scene" : "Cannot delete the only scene"}
                  aria-label="Delete scene"
                  onClick={() => {
                    if (!canDeleteScene) return;
                    if (window.confirm(`Delete "${scene.title}"? Panels will move to another scene.`)) {
                      deleteScene(scene.id);
                    }
                  }}
                >
                  <i className="fa-solid fa-trash" />
                </button>
              </li>
            );
          })}
        </ul>
        <button type="button" className="sb-btn sb-btn--sm sb-btn--block" onClick={addScene}>
          + Add Scene
        </button>
      </aside>

      <main
        className="sb-wf-panels-col"
        style={{ "--sb-zoom": String(state.gridZoom) } as React.CSSProperties}
      >
        <div className="sb-wf-panel-grid-wrap">
        <div
          className="sb-wf-panel-grid"
          style={{ gridTemplateColumns: `repeat(${project.settings.gridColumns}, 1fr)` }}
        >
          {filteredPanelsForGrid.map((panel) => (
            <PanelCard
              key={panel.id}
              panel={panel}
              selected={panel.id === selectedPanelId}
              onSelect={() => setSelectedPanelId(panel.id)}
              onEdit={() => openPanelEditor(panel.id)}
              onDrop={(fromId) => {
                if (fromId && fromId !== panel.id) dragReorder(fromId, panel.id);
              }}
            />
          ))}
        </div>
        </div>
        {filteredPanelsForGrid.length === 0 && (
          <p className="sb-empty">No panels match. Add a panel or clear search.</p>
        )}
      </main>

      <aside className="sb-wf-details-col">
        {selectedPanel ? (
          <PanelDetails
            panel={selectedPanel}
            onUpdate={(changes) => updatePanel(selectedPanel.id, changes)}
            onPrev={panelIndex > 0 ? () => setSelectedPanelId(orderedPanels[panelIndex - 1].id) : undefined}
            onNext={
              panelIndex < orderedPanels.length - 1
                ? () => setSelectedPanelId(orderedPanels[panelIndex + 1].id)
                : undefined
            }
            onDuplicate={() => duplicatePanel(selectedPanel.id)}
            onDelete={() => deletePanel(selectedPanel.id)}
            onEditPanel={() => openPanelEditor(selectedPanel.id)}
          />
        ) : (
          <p className="sb-empty">Select a panel to view details.</p>
        )}
      </aside>
    </div>
  );
}
