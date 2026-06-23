import EditorShell from "./EditorShell";
import ExportModal from "./ExportModal";
import GridEditor from "./GridEditor";
import PanelEditor from "./PanelEditor";
import PreviewMode from "./PreviewMode";
import TimelineView from "./TimelineView";
import type { useStoryboard } from "./useStoryboard";

type State = ReturnType<typeof useStoryboard>;

export default function Editor({ state }: { state: State }) {
  const { editorView, project, previewOpen, setPreviewOpen, previewIndex, orderedPanels, exportOpen, setExportOpen, exportConfig, setExportConfig, runExport } = state;

  if (!project) return null;

  return (
    <>
      {editorView === "panel" ? (
        <PanelEditor state={state} />
      ) : (
        <EditorShell state={state}>
          {editorView === "grid" ? <GridEditor state={state} /> : <TimelineView state={state} />}
        </EditorShell>
      )}

      {previewOpen && (
        <PreviewMode
          panels={orderedPanels}
          startIndex={previewIndex}
          showNotes={project.settings.showNotes}
          onClose={() => setPreviewOpen(false)}
        />
      )}

      {exportOpen && (
        <ExportModal
          config={exportConfig}
          onChange={setExportConfig}
          onExport={runExport}
          onClose={() => setExportOpen(false)}
        />
      )}
    </>
  );
}
