import { useEffect, useState } from "react";
import "@fortawesome/fontawesome-free/css/all.min.css";
import Dashboard from "./Dashboard";
import Editor from "./Editor";
import NewProjectModal from "./NewProjectModal";
import { useFrameAnimator } from "./useFrameAnimator";
import "./FrameAnimator.css";

export default function FrameAnimator() {
  const state = useFrameAnimator();
  const [showNew, setShowNew] = useState(false);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (state.screen !== "editor") return;
      const typing =
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement;
      if (typing) return;

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void state.saveNow();
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        state.undo();
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        state.redo();
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "c") {
        e.preventDefault();
        state.copyLayer();
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "v") {
        e.preventDefault();
        state.pasteLayer();
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "d") {
        e.preventDefault();
        state.duplicateFrame();
      }
      if (e.key === "Delete") {
        e.preventDefault();
        state.deleteFrame();
      }
      if (e.code === "Space") {
        e.preventDefault();
        state.togglePlayback();
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        state.goToFrame(-1);
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        state.goToFrame(1);
      }
      if (e.key.toLowerCase() === "b") state.setTool("brush");
      if (e.key.toLowerCase() === "e") state.setTool("eraser");
      if (e.key.toLowerCase() === "p") state.setTool("pencil");
      if (e.key.toLowerCase() === "m") state.setTool("lasso");
      if (e.key.toLowerCase() === "v") state.setTool("select");
      if (e.key.toLowerCase() === "o") {
        if (state.project) {
          state.setOnionSkin({ enabled: !state.project.settings.onionSkin.enabled });
        }
      }
      if (e.key.toLowerCase() === "g") {
        if (state.project) {
          state.setGrid({ enabled: !state.project.settings.grid.enabled });
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [state]);

  if (state.screen === "editor" && state.project) {
    return <Editor state={state} />;
  }

  return (
    <>
      <Dashboard
        projects={state.projects}
        projectSearch={state.projectSearch}
        onProjectSearch={state.setProjectSearch}
        onNew={() => setShowNew(true)}
        onOpen={state.openProject}
        onDelete={state.removeProject}
        onDuplicate={state.duplicateProjectById}
        onImport={state.importProject}
      />
      {showNew && (
        <NewProjectModal
          onClose={() => setShowNew(false)}
          onCreate={(config) => {
            state.newProject(config);
            setShowNew(false);
          }}
        />
      )}
    </>
  );
}
