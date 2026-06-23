import { jsPDF } from "jspdf";
import JSZip from "jszip";
import { labelForOption, getAllPanelsOrdered } from "./projectUtils";
import { SHOT_TYPES } from "./constants";
import type { Panel, StoryboardProject } from "./types";

function downloadBlob(blob: Blob, filename: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

export function exportProjectJson(project: StoryboardProject) {
  const blob = new Blob([JSON.stringify(project, null, 2)], { type: "application/json" });
  downloadBlob(blob, `${sanitize(project.title)}.storyboard.json`);
}

export async function exportPanelPng(imageData: string | null, title: string) {
  if (!imageData) return;
  const res = await fetch(imageData);
  const blob = await res.blob();
  downloadBlob(blob, `${sanitize(title || "panel")}.png`);
}

export async function exportFullGridPng(
  project: StoryboardProject,
  panels: Panel[],
  cellW: number,
  cellH: number
) {
  const cols = project.settings.gridColumns;
  const rows = Math.ceil(panels.length / cols);
  const pad = 16;
  const labelH = 60;
  const canvas = document.createElement("canvas");
  canvas.width = cols * (cellW + pad) + pad;
  canvas.height = rows * (cellH + labelH + pad) + pad;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.fillStyle = "#f4f5f8";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#1a1d26";
  ctx.font = "bold 18px sans-serif";
  ctx.fillText(project.title, pad, 28);

  for (let i = 0; i < panels.length; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = pad + col * (cellW + pad);
    const y = 40 + pad + row * (cellH + labelH + pad);

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(x, y, cellW, cellH);
    ctx.strokeStyle = "#ccc";
    ctx.strokeRect(x, y, cellW, cellH);

    if (panels[i].imageData) {
      const img = await loadImage(panels[i].imageData!);
      ctx.drawImage(img, x, y, cellW, cellH);
    }

    ctx.fillStyle = "#333";
    ctx.font = "12px sans-serif";
    const label = `Panel ${panels[i].order}: ${panels[i].action.slice(0, 40) || panels[i].title || "—"}`;
    ctx.fillText(label, x, y + cellH + 16);
    ctx.fillText(`${panels[i].duration}s · ${labelForOption(SHOT_TYPES, panels[i].shotType)}`, x, y + cellH + 32);
  }

  canvas.toBlob((blob) => {
    if (blob) downloadBlob(blob, `${sanitize(project.title)}-storyboard.png`);
  });
}

export async function exportPdf(
  project: StoryboardProject,
  panelsPerPage: 2 | 4 | 6 = 4
) {
  const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const panels = getAllPanelsOrdered(project);
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 36;
  const cols = panelsPerPage === 2 ? 1 : panelsPerPage === 4 ? 2 : 3;
  const rows = panelsPerPage === 2 ? 2 : panelsPerPage === 4 ? 2 : 2;
  const cellW = (pageW - margin * 2 - (cols - 1) * 12) / cols;
  const cellH = (pageH - margin * 2 - 40 - (rows - 1) * 12) / rows;

  let idx = 0;
  while (idx < panels.length) {
    if (idx > 0) pdf.addPage();
    pdf.setFontSize(14);
    pdf.text(project.title, margin, margin);
    pdf.setFontSize(9);
    pdf.text(project.description || "", margin, margin + 14);

    for (let slot = 0; slot < panelsPerPage && idx < panels.length; slot++, idx++) {
      const panel = panels[idx];
      const col = slot % cols;
      const row = Math.floor(slot / cols);
      const x = margin + col * (cellW + 12);
      const y = margin + 28 + row * (cellH + 12);

      pdf.setDrawColor(200);
      pdf.rect(x, y, cellW, cellH * 0.55);
      if (panel.imageData) {
        try {
          pdf.addImage(panel.imageData, "PNG", x + 2, y + 2, cellW - 4, cellH * 0.55 - 4);
        } catch {
          /* skip invalid image */
        }
      }

      const textY = y + cellH * 0.55 + 12;
      pdf.setFontSize(8);
      pdf.text(`Panel ${panel.order}${panel.title ? `: ${panel.title}` : ""}`, x, textY);
      pdf.text(`Shot: ${labelForOption(SHOT_TYPES, panel.shotType)} · ${panel.duration}s`, x, textY + 10);
      if (panel.action) pdf.text(`Action: ${truncate(panel.action, 80)}`, x, textY + 20);
      if (panel.dialogue) pdf.text(`Dialogue: ${truncate(panel.dialogue, 80)}`, x, textY + 30);
      if (panel.cameraNotes) pdf.text(`Camera: ${truncate(panel.cameraNotes, 80)}`, x, textY + 40);
    }
  }

  pdf.save(`${sanitize(project.title)}.pdf`);
}

export async function exportZip(project: StoryboardProject) {
  const zip = new JSZip();
  zip.file("project.json", JSON.stringify(project, null, 2));
  const panels = getAllPanelsOrdered(project);
  const imgFolder = zip.folder("panels");
  for (const panel of panels) {
    if (panel.imageData) {
      const base64 = panel.imageData.split(",")[1];
      if (base64) {
        imgFolder?.file(`panel-${String(panel.order).padStart(2, "0")}.png`, base64, { base64: true });
      }
    }
  }
  const blob = await zip.generateAsync({ type: "blob" });
  downloadBlob(blob, `${sanitize(project.title)}.zip`);
}

function sanitize(name: string) {
  return name.replace(/[^\w\-]+/g, "-").toLowerCase() || "storyboard";
}

function truncate(s: string, n: number) {
  return s.length > n ? `${s.slice(0, n)}…` : s;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
