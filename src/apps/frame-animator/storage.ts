import { createProjectStore } from "../../storage/projectStore";
import { migrateProject, toMeta } from "./projectUtils";
import type { AnimationProject, ProjectMeta } from "./types";

const store = createProjectStore<AnimationProject, ProjectMeta>("frame-animator", toMeta, 50);

export const listProjects = store.listProjects;
export const saveProject = store.saveProject;

export async function loadProject(id: string): Promise<AnimationProject | null> {
  const project = await store.loadProject(id);
  return project ? migrateProject(project) : null;
}

export const deleteProject = store.deleteProject;

export async function duplicateProject(id: string): Promise<AnimationProject | null> {
  const project = await loadProject(id);
  if (!project) return null;
  const now = new Date().toISOString();
  const copy: AnimationProject = {
    ...JSON.parse(JSON.stringify(project)),
    id: `project_${Date.now()}`,
    title: `${project.title} copy`,
    createdAt: now,
    updatedAt: now,
  };
  await saveProject(copy);
  return copy;
}

export async function importProjectJson(file: File): Promise<AnimationProject> {
  const text = await file.text();
  const parsed = migrateProject(JSON.parse(text) as AnimationProject);
  if (!parsed.id) parsed.id = `project_${Date.now()}`;
  parsed.updatedAt = new Date().toISOString();
  await saveProject(parsed);
  return parsed;
}
