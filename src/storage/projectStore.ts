import { idbDelete, idbGetJson, idbSet } from "./indexedDb";

export function createProjectStore<TProject extends { id: string }, TMeta extends { id: string }>(
  namespace: string,
  toMeta: (project: TProject) => TMeta,
  maxProjects = 30
) {
  const metaKey = `${namespace}:meta`;
  const autosaveKey = `${namespace}:autosave`;
  const projectKey = (id: string) => `${namespace}:project:${id}`;

  async function listProjects(): Promise<TMeta[]> {
    return idbGetJson<TMeta[]>(metaKey, []);
  }

  async function saveProject(project: TProject): Promise<void> {
    const meta = (await listProjects()).filter((p) => p.id !== project.id);
    meta.unshift(toMeta(project));
    await idbSet(metaKey, meta.slice(0, maxProjects));
    await idbSet(projectKey(project.id), project);
    await idbSet(autosaveKey, project);
  }

  async function loadProject(id: string): Promise<TProject | null> {
    return idbGetJson<TProject | null>(projectKey(id), null);
  }

  async function loadAutosave(): Promise<TProject | null> {
    return idbGetJson<TProject | null>(autosaveKey, null);
  }

  async function deleteProject(id: string): Promise<void> {
    const meta = (await listProjects()).filter((p) => p.id !== id);
    await idbSet(metaKey, meta);
    await idbDelete(projectKey(id));
  }

  async function updateMeta(updater: (meta: TMeta[]) => TMeta[]): Promise<void> {
    await idbSet(metaKey, updater(await listProjects()));
  }

  return {
    listProjects,
    saveProject,
    loadProject,
    loadAutosave,
    deleteProject,
    updateMeta,
  };
}
