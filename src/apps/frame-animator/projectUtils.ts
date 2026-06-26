import { normalizeGrid, normalizeOnionSkin, DEFAULT_GRID, DEFAULT_ONION_SKIN } from "./onionSkin";
import { flattenFrame, getActiveLayer, getSortedLayers, reindexLayers } from "./layerUtils";
import { THUMB_MAX } from "./constants";
import type { AnimationFrame, AnimationProject, FrameLayer, NewProjectConfig, ProjectMeta } from "./types";

export function createId(prefix = "id") {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

export function createBlankImageData(
  width: number,
  height: number,
  background: string,
  transparent: boolean
): string {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  if (!transparent) {
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, width, height);
  }
  return canvas.toDataURL("image/png");
}

export function createThumbnail(imageData: string, max = THUMB_MAX): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/png", 0.75));
    };
    img.onerror = () => resolve(imageData);
    img.src = imageData;
  });
}

export function createLayer(
  order: number,
  width: number,
  height: number,
  background: string,
  transparent: boolean,
  name: string,
  withBackground = false
): FrameLayer {
  const imageData = withBackground
    ? createBlankImageData(width, height, background, transparent)
    : createBlankImageData(width, height, background, true);
  return {
    id: createId("layer"),
    name,
    order,
    visible: true,
    opacity: 1,
    locked: false,
    imageData,
  };
}

export function normalizeFrameLayers(
  frame: AnimationFrame,
  project: AnimationProject
): AnimationFrame {
  if (frame.layers?.length) {
    const layers = getSortedLayers(frame);
    const activeLayerId =
      layers.find((l) => l.id === frame.activeLayerId)?.id ?? layers[layers.length - 1].id;
    return { ...frame, layers, activeLayerId };
  }

  const layer = createLayer(
    1,
    project.width,
    project.height,
    project.background,
    project.transparent,
    "Layer 1",
    true
  );
  layer.imageData = frame.imageData || layer.imageData;
  return {
    ...frame,
    layers: [layer],
    activeLayerId: layer.id,
  };
}

export function createFrame(
  order: number,
  width: number,
  height: number,
  background: string,
  transparent: boolean
): AnimationFrame {
  const now = new Date().toISOString();
  const layer = createLayer(1, width, height, background, transparent, "Layer 1", true);
  const imageData = layer.imageData;
  return {
    id: createId("frame"),
    order,
    duration: 1,
    layers: [layer],
    activeLayerId: layer.id,
    imageData,
    thumbnailData: imageData,
    createdAt: now,
    updatedAt: now,
  };
}

export async function touchFrame(frame: AnimationFrame, project: AnimationProject): Promise<AnimationFrame> {
  const imageData = await flattenFrame(frame, project);
  const thumbnailData = await createThumbnail(imageData);
  return {
    ...frame,
    imageData,
    thumbnailData,
    updatedAt: new Date().toISOString(),
  };
}

export function createProject(config: NewProjectConfig): AnimationProject {
  const now = new Date().toISOString();
  const firstFrame = createFrame(1, config.width, config.height, config.background, config.transparent);
  return {
    id: createId("project"),
    title: config.title,
    width: config.width,
    height: config.height,
    fps: config.fps,
    background: config.background,
    transparent: config.transparent,
    frames: [firstFrame],
    settings: { onionSkin: { ...DEFAULT_ONION_SKIN }, grid: { ...DEFAULT_GRID } },
    createdAt: now,
    updatedAt: now,
  };
}

export function migrateProject(project: AnimationProject): AnimationProject {
  const frames = project.frames.map((f) => normalizeFrameLayers(f, project));
  return {
    ...project,
    frames,
    settings: {
      onionSkin: normalizeOnionSkin(project.settings?.onionSkin),
      grid: normalizeGrid(project.settings?.grid),
    },
  };
}

export function touchProject(project: AnimationProject): AnimationProject {
  return { ...project, updatedAt: new Date().toISOString() };
}

export function toMeta(project: AnimationProject): ProjectMeta {
  const sorted = [...project.frames].sort((a, b) => a.order - b.order);
  const thumb = sorted[0]?.thumbnailData ?? "";
  return {
    id: project.id,
    title: project.title,
    width: project.width,
    height: project.height,
    fps: project.fps,
    frameCount: project.frames.length,
    durationSec: project.frames.length / project.fps,
    thumbnailData: thumb,
    updatedAt: project.updatedAt,
  };
}

export function getSortedFrames(project: AnimationProject): AnimationFrame[] {
  return [...project.frames].sort((a, b) => a.order - b.order);
}

export function reindexFrames(frames: AnimationFrame[]): AnimationFrame[] {
  return frames
    .sort((a, b) => a.order - b.order)
    .map((f, i) => ({ ...f, order: i + 1 }));
}

export function duplicateFrameData(frame: AnimationFrame, order: number): AnimationFrame {
  const now = new Date().toISOString();
  const activeIdx = frame.layers.findIndex((l) => l.id === frame.activeLayerId);
  const layers = frame.layers.map((l) => ({
    ...l,
    id: createId("layer"),
  }));
  const activeLayerId = layers[activeIdx >= 0 ? activeIdx : layers.length - 1]?.id ?? "";
  return {
    ...frame,
    id: createId("frame"),
    order,
    layers,
    activeLayerId,
    createdAt: now,
    updatedAt: now,
  };
}

export function updateFrameLayer(
  frame: AnimationFrame,
  layerId: string,
  patch: Partial<FrameLayer>
): AnimationFrame {
  return {
    ...frame,
    layers: frame.layers.map((l) => (l.id === layerId ? { ...l, ...patch } : l)),
    updatedAt: new Date().toISOString(),
  };
}

export function setFrameActiveLayer(frame: AnimationFrame, layerId: string): AnimationFrame {
  if (!frame.layers.some((l) => l.id === layerId)) return frame;
  return { ...frame, activeLayerId: layerId };
}

export { getActiveLayer, getSortedLayers, reindexLayers };
