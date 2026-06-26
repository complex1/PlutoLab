import type { BrushSettings, BrushTexture } from "./types";

export const CANVAS_PRESETS = [
  { id: "square", label: "Square", width: 1080, height: 1080 },
  { id: "reel", label: "Reel / Shorts", width: 1080, height: 1920 },
  { id: "youtube", label: "YouTube", width: 1920, height: 1080 },
  { id: "gif", label: "GIF", width: 512, height: 512 },
  { id: "custom", label: "Custom", width: 1080, height: 1080 },
] as const;

export const FPS_PRESETS = [6, 8, 12, 24] as const;

export const BRUSH_TEXTURES: { id: BrushTexture; label: string }[] = [
  { id: "solid", label: "Solid" },
  { id: "soft", label: "Soft" },
  { id: "grain", label: "Grain" },
  { id: "spray", label: "Spray" },
  { id: "chalk", label: "Chalk" },
];

export const DEFAULT_BRUSH: BrushSettings = {
  color: "#000000",
  size: 4,
  opacity: 1,
  smoothing: 0.5,
  texture: "solid",
  textureIntensity: 60,
};

export const THUMB_MAX = 96;
export const MAX_UNDO = 40;
export const AUTOSAVE_MS = 1500;

export const TOOLS = [
  { id: "select" as const, icon: "fa-hand", label: "Pan", shortcut: "V" },
  { id: "pencil" as const, icon: "fa-pencil", label: "Pencil", shortcut: "P" },
  { id: "brush" as const, icon: "fa-paintbrush", label: "Brush", shortcut: "B" },
  { id: "eraser" as const, icon: "fa-eraser", label: "Eraser", shortcut: "E" },
  { id: "line" as const, icon: "fa-minus", label: "Line", shortcut: "L" },
  { id: "lasso" as const, icon: "fa-draw-polygon", label: "Lasso", shortcut: "M" },
];
