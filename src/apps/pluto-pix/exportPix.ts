import type { PixProject } from "./types";
import { preloadLayerImages, renderProjectToCanvas } from "./renderEngine";

export interface ExportOptions {
  format: "png" | "jpeg" | "webp";
  quality: number;
  width?: number;
  height?: number;
  background?: string;
}

export async function exportProject(
  project: PixProject,
  options: ExportOptions
): Promise<Blob> {
  await preloadLayerImages(project.layers);
  const canvas = document.createElement("canvas");
  const exportProject = { ...project };

  if (options.background && options.background !== "transparent") {
    exportProject.background = options.background;
  }

  const targetW = options.width ?? project.canvasWidth;
  const targetH = options.height ?? project.canvasHeight;

  renderProjectToCanvas(canvas, exportProject);

  const out = document.createElement("canvas");
  out.width = targetW;
  out.height = targetH;
  const ctx = out.getContext("2d")!;
  if (options.format === "jpeg") {
    ctx.fillStyle = options.background ?? "#ffffff";
    ctx.fillRect(0, 0, targetW, targetH);
  }
  ctx.drawImage(canvas, 0, 0, targetW, targetH);

  const mime =
    options.format === "png"
      ? "image/png"
      : options.format === "webp"
        ? "image/webp"
        : "image/jpeg";

  return new Promise((resolve, reject) => {
    out.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Export failed"))),
      mime,
      options.quality / 100
    );
  });
}

export async function downloadProject(project: PixProject, options: ExportOptions) {
  const blob = await exportProject(project, options);
  const ext = options.format === "jpeg" ? "jpg" : options.format;
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${project.name.replace(/\s+/g, "-").toLowerCase()}.${ext}`;
  link.click();
  URL.revokeObjectURL(link.href);
}

export async function copyToClipboard(project: PixProject) {
  const blob = await exportProject(project, { format: "png", quality: 100 });
  await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
}

export function estimateBlobSize(blob: Blob): string {
  const kb = blob.size / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(2)} MB`;
}
