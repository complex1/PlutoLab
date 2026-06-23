import { createProjectStore } from "../../storage/projectStore";
import type { PixProject } from "./types";
import { createId } from "./types";

export interface SavedProjectMeta {
  id: string;
  name: string;
  updatedAt: number;
}

const store = createProjectStore<PixProject, SavedProjectMeta>(
  "pluto-pix",
  (project) => ({ id: project.id, name: project.name, updatedAt: project.updatedAt })
);

export const listProjects = store.listProjects;
export const saveProject = store.saveProject;
export const loadProject = store.loadProject;
export const loadAutosave = store.loadAutosave;
export const deleteProject = store.deleteProject;

export async function duplicateProject(id: string): Promise<PixProject | null> {
  const project = await loadProject(id);
  if (!project) return null;
  const copy: PixProject = {
    ...JSON.parse(JSON.stringify(project)),
    id: createId(),
    name: `${project.name} copy`,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  await saveProject(copy);
  return copy;
}

export function exportProjectJson(project: PixProject) {
  const blob = new Blob([JSON.stringify(project, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${project.name.replace(/\s+/g, "-").toLowerCase()}.plutopix.json`;
  link.click();
  URL.revokeObjectURL(link.href);
}

export async function importProjectJson(file: File): Promise<PixProject> {
  const text = await file.text();
  return JSON.parse(text) as PixProject;
}

export async function renameProject(id: string, name: string): Promise<void> {
  await store.updateMeta((meta) =>
    meta.map((p) => (p.id === id ? { ...p, name, updatedAt: Date.now() } : p))
  );
}
