import type { AspectRatio, Panel, Scene, StoryboardProject, StoryboardSettings } from "./types";

export function createId(prefix = "sb"): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

const DEFAULT_SETTINGS: StoryboardSettings = {
  gridColumns: 3,
  viewMode: "detailed",
  theme: "dark",
  showNotes: true,
};

export function createScene(title: string, order: number): Scene {
  return {
    id: createId("scene"),
    title,
    description: "",
    order,
    collapsed: false,
  };
}

export function createPanel(sceneId: string, order: number, overrides: Partial<Panel> = {}): Panel {
  const now = new Date().toISOString();
  return {
    id: createId("panel"),
    sceneId,
    order,
    title: "",
    imageData: null,
    backgroundImage: null,
    strokes: [],
    action: "",
    dialogue: "",
    shotType: "wide-shot",
    cameraAngle: "eye-level",
    cameraMovement: "static",
    duration: 3,
    backgroundNotes: "",
    characterNotes: "",
    soundNotes: "",
    cameraNotes: "",
    transition: "cut",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

export function createProject(
  title: string,
  description: string,
  aspectRatio: AspectRatio,
  customWidth = 320,
  customHeight = 180
): StoryboardProject {
  const now = new Date().toISOString();
  const scene = createScene("Scene 1", 1);
  const panel = createPanel(scene.id, 1, { title: "Panel 01" });
  return {
    id: createId("project"),
    title,
    description,
    aspectRatio,
    customWidth,
    customHeight,
    createdAt: now,
    updatedAt: now,
    scenes: [scene],
    panels: [panel],
    settings: { ...DEFAULT_SETTINGS },
  };
}

export function getSortedScenes(project: StoryboardProject): Scene[] {
  return [...project.scenes].sort((a, b) => a.order - b.order);
}

export function getSortedPanels(project: StoryboardProject, sceneId?: string): Panel[] {
  const panels = sceneId
    ? project.panels.filter((p) => p.sceneId === sceneId)
    : project.panels;
  return [...panels].sort((a, b) => a.order - b.order);
}

export function getAllPanelsOrdered(project: StoryboardProject): Panel[] {
  const scenes = getSortedScenes(project);
  const result: Panel[] = [];
  for (const scene of scenes) {
    result.push(...getSortedPanels(project, scene.id));
  }
  const orphanPanels = project.panels.filter(
    (p) => !scenes.some((s) => s.id === p.sceneId)
  );
  result.push(...orphanPanels.sort((a, b) => a.order - b.order));
  return result;
}

export function renumberPanels(panels: Panel[]): Panel[] {
  return panels
    .sort((a, b) => a.order - b.order)
    .map((p, i) => ({ ...p, order: i + 1 }));
}

export function movePanel(
  project: StoryboardProject,
  panelId: string,
  direction: "left" | "right" | "up" | "down"
): Panel[] {
  const ordered = getAllPanelsOrdered(project);
  const columns = project.settings.gridColumns;
  const idx = ordered.findIndex((p) => p.id === panelId);
  if (idx < 0) return project.panels;

  let target = idx;
  if (direction === "left") target = idx - 1;
  if (direction === "right") target = idx + 1;
  if (direction === "up") target = idx - columns;
  if (direction === "down") target = idx + columns;
  if (target < 0 || target >= ordered.length) return project.panels;

  const next = [...ordered];
  [next[idx], next[target]] = [next[target], next[idx]];
  return renumberPanels(next);
}

export function reorderPanels(panels: Panel[], fromId: string, toId: string): Panel[] {
  const ordered = [...panels].sort((a, b) => a.order - b.order);
  const fromIdx = ordered.findIndex((p) => p.id === fromId);
  const toIdx = ordered.findIndex((p) => p.id === toId);
  if (fromIdx < 0 || toIdx < 0 || fromIdx === toIdx) return panels;

  const next = [...ordered];
  const [moved] = next.splice(fromIdx, 1);
  next.splice(toIdx, 0, moved);
  return renumberPanels(next);
}

export function duplicatePanel(panel: Panel, order: number): Panel {
  const now = new Date().toISOString();
  return {
    ...JSON.parse(JSON.stringify(panel)),
    id: createId("panel"),
    title: panel.title ? `${panel.title} copy` : "",
    order,
    createdAt: now,
    updatedAt: now,
  };
}

export function getCanvasSize(project: StoryboardProject): { w: number; h: number } {
  if (project.aspectRatio === "custom") {
    return { w: project.customWidth, h: project.customHeight };
  }
  const map: Record<Exclude<AspectRatio, "custom">, { w: number; h: number }> = {
    "16:9": { w: 320, h: 180 },
    "9:16": { w: 180, h: 320 },
    "1:1": { w: 240, h: 240 },
    "4:3": { w: 320, h: 240 },
  };
  return map[project.aspectRatio as Exclude<AspectRatio, "custom">] ?? { w: 320, h: 180 };
}

export function labelForOption(
  options: readonly { id: string; label: string }[],
  id: string
): string {
  return options.find((o) => o.id === id)?.label ?? id;
}

export function touchProject(project: StoryboardProject): StoryboardProject {
  return { ...project, updatedAt: new Date().toISOString() };
}

export function touchPanel(panel: Panel, changes: Partial<Panel>): Panel {
  return { ...panel, ...changes, updatedAt: new Date().toISOString() };
}
