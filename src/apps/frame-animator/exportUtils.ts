import { GIFEncoder, quantize, applyPalette } from "gifenc";
import JSZip from "jszip";
import { getSortedFrames } from "./projectUtils";
import type { AnimationProject, ExportConfig } from "./types";
import { loadImage } from "./canvasDraw";

async function frameToImageData(
  project: AnimationProject,
  frameImageData: string,
  transparent = false
): Promise<ImageData> {
  const canvas = document.createElement("canvas");
  canvas.width = project.width;
  canvas.height = project.height;
  const ctx = canvas.getContext("2d")!;
  if (!transparent && !project.transparent) {
    ctx.fillStyle = project.background;
    ctx.fillRect(0, 0, project.width, project.height);
  }
  if (frameImageData) {
    const img = await loadImage(frameImageData);
    ctx.drawImage(img, 0, 0, project.width, project.height);
  }
  return ctx.getImageData(0, 0, project.width, project.height);
}

export async function exportGif(project: AnimationProject, config: ExportConfig): Promise<Blob> {
  const frames = getSortedFrames(project);
  const gif = GIFEncoder();
  const delay = Math.round(1000 / config.fps);

  for (const frame of frames) {
    const imageData = await frameToImageData(project, frame.imageData, config.transparent);
    const palette = quantize(imageData.data, 256);
    const index = applyPalette(imageData.data, palette);
    gif.writeFrame(index, project.width, project.height, {
      palette,
      delay: delay * frame.duration,
    });
  }

  gif.finish();
  return new Blob([gif.bytes()], { type: "image/gif" });
}

export async function exportPngSequence(project: AnimationProject): Promise<Blob> {
  const zip = new JSZip();
  const frames = getSortedFrames(project);

  for (const frame of frames) {
    const canvas = document.createElement("canvas");
    canvas.width = project.width;
    canvas.height = project.height;
    const ctx = canvas.getContext("2d")!;
    if (!project.transparent) {
      ctx.fillStyle = project.background;
      ctx.fillRect(0, 0, project.width, project.height);
    }
    if (frame.imageData) {
      const img = await loadImage(frame.imageData);
      ctx.drawImage(img, 0, 0);
    }
    const dataUrl = canvas.toDataURL("image/png");
    const base64 = dataUrl.split(",")[1];
    const num = String(frame.order).padStart(3, "0");
    zip.file(`frame_${num}.png`, base64, { base64: true });
  }

  return zip.generateAsync({ type: "blob" });
}

export async function exportCurrentFramePng(
  project: AnimationProject,
  imageData: string
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = project.width;
  canvas.height = project.height;
  const ctx = canvas.getContext("2d")!;
  if (!project.transparent) {
    ctx.fillStyle = project.background;
    ctx.fillRect(0, 0, project.width, project.height);
  }
  if (imageData) {
    const img = await loadImage(imageData);
    ctx.drawImage(img, 0, 0);
  }
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Export failed"))), "image/png");
  });
}

export function exportProjectJson(project: AnimationProject): string {
  return JSON.stringify(project, null, 2);
}

export function downloadBlob(blob: Blob, filename: string) {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

export function downloadJson(project: AnimationProject) {
  const blob = new Blob([exportProjectJson(project)], { type: "application/json" });
  downloadBlob(blob, `${slugify(project.title)}.frameanim.json`);
}

function slugify(name: string) {
  return name.replace(/\s+/g, "-").toLowerCase() || "animation";
}

export async function runExport(
  project: AnimationProject,
  config: ExportConfig,
  currentFrameImage?: string
) {
  const slug = slugify(project.title);
  switch (config.format) {
    case "gif": {
      const blob = await exportGif(project, config);
      downloadBlob(blob, `${slug}.gif`);
      break;
    }
    case "png-sequence": {
      const blob = await exportPngSequence(project);
      downloadBlob(blob, `${slug}-frames.zip`);
      break;
    }
    case "png-frame": {
      if (!currentFrameImage) throw new Error("No frame selected");
      const blob = await exportCurrentFramePng(project, currentFrameImage);
      downloadBlob(blob, `${slug}-frame.png`);
      break;
    }
    case "json":
      downloadJson(project);
      break;
  }
}
