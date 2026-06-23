import { createProjectStore } from "../../storage/projectStore";
import type { ProjectMeta, StoryboardProject } from "./types";

const store = createProjectStore<StoryboardProject, ProjectMeta>(
  "storyboard",
  (project) => ({
    id: project.id,
    title: project.title,
    description: project.description,
    aspectRatio: project.aspectRatio,
    updatedAt: project.updatedAt,
    panelCount: project.panels.length,
  }),
  50
);

export const listProjects = store.listProjects;
export const saveProject = store.saveProject;
export const loadProject = store.loadProject;
export const loadAutosave = store.loadAutosave;
export const deleteProject = store.deleteProject;

export async function duplicateProject(id: string): Promise<StoryboardProject | null> {
  const project = await loadProject(id);
  if (!project) return null;
  const now = new Date().toISOString();
  const copy: StoryboardProject = {
    ...JSON.parse(JSON.stringify(project)),
    id: `project_${Date.now()}`,
    title: `${project.title} copy`,
    createdAt: now,
    updatedAt: now,
  };
  await saveProject(copy);
  return copy;
}

export async function importProjectJson(file: File): Promise<StoryboardProject> {
  const text = await file.text();
  const parsed = JSON.parse(text) as StoryboardProject;
  if (!parsed.id) parsed.id = `project_${Date.now()}`;
  parsed.updatedAt = new Date().toISOString();
  await saveProject(parsed);
  return parsed;
}
