import { loadImage } from "./canvasDraw";
import type { AnimationFrame, AnimationProject, FrameLayer } from "./types";

export function getSortedLayers(frame: AnimationFrame): FrameLayer[] {
  return [...(frame.layers ?? [])].sort((a, b) => a.order - b.order);
}

export function getActiveLayer(frame: AnimationFrame): FrameLayer | null {
  const layers = getSortedLayers(frame);
  if (!layers.length) return null;
  return layers.find((l) => l.id === frame.activeLayerId) ?? layers[layers.length - 1];
}

export async function drawLayersOnCanvas(
  canvas: HTMLCanvasElement,
  layers: FrameLayer[],
  project: AnimationProject,
  options?: { fillBackground?: boolean }
) {
  const { width, height, background, transparent } = project;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.clearRect(0, 0, width, height);
  const fillBg = options?.fillBackground ?? !transparent;
  if (fillBg) {
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, width, height);
  }

  for (const layer of layers) {
    if (!layer.visible || !layer.imageData) continue;
    try {
      const img = await loadImage(layer.imageData);
      ctx.save();
      ctx.globalAlpha = layer.opacity;
      ctx.drawImage(img, 0, 0, width, height);
      ctx.restore();
    } catch {
      /* skip broken layer */
    }
  }
}

export async function flattenFrame(
  frame: AnimationFrame,
  project: AnimationProject
): Promise<string> {
  const canvas = document.createElement("canvas");
  await drawLayersOnCanvas(canvas, getSortedLayers(frame), project);
  return canvas.toDataURL("image/png");
}

export async function renderLayersBelowActive(
  canvas: HTMLCanvasElement,
  frame: AnimationFrame,
  project: AnimationProject
) {
  const active = getActiveLayer(frame);
  if (!active) {
    canvas.width = project.width;
    canvas.height = project.height;
    canvas.getContext("2d")?.clearRect(0, 0, project.width, project.height);
    return;
  }
  const below = getSortedLayers(frame).filter((l) => l.order < active.order);
  await drawLayersOnCanvas(canvas, below, project, { fillBackground: !project.transparent });
}

export async function renderLayersAboveActive(
  canvas: HTMLCanvasElement,
  frame: AnimationFrame,
  project: AnimationProject
) {
  const active = getActiveLayer(frame);
  const above = active
    ? getSortedLayers(frame).filter((l) => l.order > active.order)
    : [];
  canvas.width = project.width;
  canvas.height = project.height;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, project.width, project.height);
  if (!above.length) return;
  await drawLayersOnCanvas(canvas, above, project, { fillBackground: false });
}

export function reindexLayers(layers: FrameLayer[]): FrameLayer[] {
  return [...layers]
    .sort((a, b) => a.order - b.order)
    .map((l, i) => ({ ...l, order: i + 1 }));
}

export function duplicateLayerData(layer: FrameLayer, order: number, newId: string): FrameLayer {
  return {
    ...layer,
    id: newId,
    name: `${layer.name} copy`,
    order,
    locked: false,
  };
}

export function layerStackKey(frame: AnimationFrame): string {
  const active = getActiveLayer(frame);
  return `${active?.id ?? ""}:${getSortedLayers(frame)
    .map((l) => `${l.id}:${l.order}:${l.visible}:${l.opacity}:${l.locked}:${l.imageData.length}:${l.imageData.slice(-32)}`)
    .join("|")}`;
}
