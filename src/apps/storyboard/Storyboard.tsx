import { useEffect } from "react";
import "@fortawesome/fontawesome-free/css/all.min.css";
import Dashboard from "./Dashboard";
import Editor from "./Editor";
import { useStoryboard } from "./useStoryboard";
import "./Storyboard.css";

export default function Storyboard() {
  const state = useStoryboard();
  const { screen, saveNow, duplicatePanel, deletePanel, selectedPanelId } = state;

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (screen !== "editor") return;
      const typing =
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement;
      if (typing) return;

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        saveNow();
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "d" && selectedPanelId) {
        e.preventDefault();
        duplicatePanel(selectedPanelId);
      }
      if (e.key === "Delete" && selectedPanelId) {
        e.preventDefault();
        deletePanel(selectedPanelId);
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        state.undoDraw();
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        state.redoDraw();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [deletePanel, duplicatePanel, saveNow, screen, selectedPanelId, state]);

  if (screen === "dashboard") {
    return (
      <Dashboard
        projects={state.recentProjects}
        projectSearch={state.projectSearch}
        onProjectSearch={state.setProjectSearch}
        section={state.dashboardSection}
        onSection={state.setDashboardSection}
        onNew={state.newProject}
        onOpen={state.openProject}
        onDelete={state.removeProject}
        onDuplicate={state.duplicateProject}
        onImport={state.importProject}
      />
    );
  }

  return <Editor state={state} />;
}
