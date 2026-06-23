import JSZip from "jszip";
import { fileToDataUrl } from "./imageImport";
import { exportProject } from "./exportPix";
import type { PixProject } from "./types";
import { createImageLayer } from "./pixReducer";
import { getImageDimensions } from "./imageImport";

export interface BatchOptions {
  format: "png" | "jpeg" | "webp";
  quality: number;
  maxWidth?: number;
  maxHeight?: number;
  watermarkText?: string;
}

export async function batchProcessFiles(files: File[], options: BatchOptions): Promise<Blob[]> {
  const results: Blob[] = [];
  for (const file of files) {
    const src = await fileToDataUrl(file);
    const { width, height } = await getImageDimensions(src);
    let w = width;
    let h = height;
    if (options.maxWidth && w > options.maxWidth) {
      h = (h * options.maxWidth) / w;
      w = options.maxWidth;
    }
    if (options.maxHeight && h > options.maxHeight) {
      w = (w * options.maxHeight) / h;
      h = options.maxHeight;
    }
    const layer = createImageLayer(src, width, height, file.name);
    const project: PixProject = {
      id: file.name,
      name: file.name,
      canvasWidth: Math.round(w),
      canvasHeight: Math.round(h),
      background: options.format === "jpeg" ? "#ffffff" : "transparent",
      layers: [{ ...layer, width: Math.round(w), height: Math.round(h) }],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    if (options.watermarkText) {
      project.layers.push({
        id: `wm-${file.name}`,
        name: "Watermark",
        type: "watermark",
        visible: true,
        locked: false,
        opacity: 40,
        x: 20,
        y: project.canvasHeight - 60,
        width: 200,
        height: 40,
        rotation: 0,
        flipH: false,
        flipV: false,
        text: options.watermarkText,
        repeat: false,
        tileSpacing: 120,
      });
    }
    const blob = await exportProject(project, {
      format: options.format,
      quality: options.quality,
      width: Math.round(w),
      height: Math.round(h),
    });
    results.push(blob);
  }
  return results;
}

export async function downloadBatchZip(blobs: Blob[], names: string[], format: string) {
  const zip = new JSZip();
  blobs.forEach((blob, i) => {
    const ext = format === "jpeg" ? "jpg" : format;
    const base = names[i]?.replace(/\.[^.]+$/, "") ?? `image-${i + 1}`;
    zip.file(`${base}.${ext}`, blob);
  });
  const content = await zip.generateAsync({ type: "blob" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(content);
  link.download = "plutopix-batch.zip";
  link.click();
  URL.revokeObjectURL(link.href);
}

export function convertFormatHint(from: string, to: string): string {
  return `Convert ${from.toUpperCase()} → ${to.toUpperCase()}`;
}
