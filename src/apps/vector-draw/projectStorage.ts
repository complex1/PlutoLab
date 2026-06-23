import { createProjectStore } from "../../storage/projectStore";
import type { VectorProject } from "./types";

export interface SavedProjectMeta {
  id: string;
  name: string;
  updatedAt: number;
}

const store = createProjectStore<VectorProject, SavedProjectMeta>(
  "vector-draw",
  (project) => ({ id: project.id, name: project.name, updatedAt: project.updatedAt })
);

export const listProjects = store.listProjects;
export const saveProject = store.saveProject;
export const loadProject = store.loadProject;
export const loadAutosave = store.loadAutosave;
export const deleteProject = store.deleteProject;

export function exportProjectJson(project: VectorProject) {
  const blob = new Blob([JSON.stringify(project, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${project.name.replace(/\s+/g, "-").toLowerCase()}.vectordraw.json`;
  link.click();
  URL.revokeObjectURL(link.href);
}

export async function importProjectJson(file: File): Promise<VectorProject> {
  const text = await file.text();
  return JSON.parse(text) as VectorProject;
}
