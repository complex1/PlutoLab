export interface CanvasPreset {
  id: string;
  name: string;
  width: number;
  height: number;
}

export const CANVAS_PRESETS: CanvasPreset[] = [
  { id: "hd", name: "HD 1280×720", width: 1280, height: 720 },
  { id: "square", name: "Square 1080", width: 1080, height: 1080 },
  { id: "a4", name: "A4 Portrait", width: 794, height: 1123 },
  { id: "letter", name: "Letter", width: 816, height: 1056 },
  { id: "social", name: "Instagram Post", width: 1080, height: 1080 },
  { id: "wide", name: "Wide 1920×1080", width: 1920, height: 1080 },
  { id: "mobile", name: "Mobile 390×844", width: 390, height: 844 },
  { id: "icon", name: "Icon 512", width: 512, height: 512 },
];

export const MAX_HISTORY = 50;

export const CLOSE_PATH_THRESHOLD = 12;

export const ANCHOR_HIT_RADIUS = 8;
