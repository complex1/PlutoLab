import type { useStoryboard } from "./useStoryboard";

type State = ReturnType<typeof useStoryboard>;

interface EditorShellProps {
  state: State;
  children: React.ReactNode;
}

export default function EditorShell({ state, children }: EditorShellProps) {
  const {
    project,
    saveStatus,
    editorView,
    setEditorView,
    updateProjectTitle,
    closeEditor,
    toggleTheme,
    setPreviewOpen,
    setPreviewIndex,
    selectedPanelId,
    orderedPanels,
    setExportOpen,
    addScene,
    addPanel,
    panelSearch,
    setPanelSearch,
    gridZoom,
    setGridZoom,
    project: p,
  } = state;

  if (!project) return null;

  return (
    <div className={`sb-wf-editor sb-wf-editor--${project.settings.theme}`}>
      <header className="sb-wf-topbar">
        <div className="sb-wf-topbar-left">
          <button type="button" className="sb-icon-btn" onClick={closeEditor} aria-label="Back to projects">
            <i className="fa-solid fa-bars" />
          </button>
          <input
            className="sb-wf-project-title"
            value={project.title}
            onChange={(e) => updateProjectTitle(e.target.value)}
          />
          <span className={`sb-save-badge sb-save-badge--${saveStatus}`}>
            {saveStatus === "saved" ? "Saved" : saveStatus === "saving" ? "Saving…" : "Unsaved"}
          </span>
        </div>
        <div className="sb-wf-topbar-right">
          <button
            type="button"
            className="sb-btn"
            onClick={() => {
              const idx = orderedPanels.findIndex((panel) => panel.id === selectedPanelId);
              setPreviewIndex(idx >= 0 ? idx : 0);
              setPreviewOpen(true);
            }}
          >
            <i className="fa-solid fa-play" /> Preview
          </button>
          <button type="button" className="sb-btn sb-btn--primary" onClick={() => setExportOpen(true)}>
            <i className="fa-solid fa-download" /> Export
          </button>
          <button type="button" className="sb-icon-btn" onClick={toggleTheme} aria-label="Toggle theme">
            <i className={`fa-solid ${project.settings.theme === "dark" ? "fa-sun" : "fa-moon"}`} />
          </button>
          <span className="sb-wf-avatar" aria-hidden="true">
            <i className="fa-solid fa-user" />
          </span>
        </div>
      </header>

      <div className="sb-wf-subbar">
        <div className="sb-wf-view-tabs">
          <button
            type="button"
            className={editorView === "grid" ? "active" : ""}
            onClick={() => setEditorView("grid")}
          >
            Grid
          </button>
          <button
            type="button"
            className={editorView === "timeline" ? "active" : ""}
            onClick={() => setEditorView("timeline")}
          >
            Timeline
          </button>
        </div>
        <button type="button" className="sb-btn sb-btn--sm" onClick={addScene}>
          <i className="fa-solid fa-layer-group" /> Add Scene
        </button>
        <button type="button" className="sb-btn sb-btn--sm" onClick={() => addPanel()}>
          <i className="fa-solid fa-plus" /> Add Panel
        </button>
        <label className="sb-wf-grid-cols">
          Grid:
          <select
            className="sb-select sb-select--sm"
            value={p?.settings.gridColumns ?? 3}
            onChange={(e) => state.setGridColumns(Number(e.target.value) as 2 | 3 | 4)}
          >
            <option value={2}>2 Columns</option>
            <option value={3}>3 Columns</option>
            <option value={4}>4 Columns</option>
          </select>
        </label>
        <div className="sb-wf-search-wrap">
          <i className="fa-solid fa-magnifying-glass" />
          <input
            type="search"
            placeholder="Search panels…"
            value={panelSearch}
            onChange={(e) => setPanelSearch(e.target.value)}
          />
        </div>
        <label className="sb-wf-zoom">
          <i className="fa-solid fa-magnifying-glass-plus" />
          <input
            type="range"
            min={70}
            max={130}
            value={gridZoom}
            onChange={(e) => setGridZoom(Number(e.target.value))}
          />
          <span>{gridZoom}%</span>
        </label>
      </div>

      {children}
    </div>
  );
}
