export type DrawTool = "select" | "pencil" | "brush" | "eraser" | "line" | "lasso";
export type SaveStatus = "saved" | "unsaved" | "saving";
export type EditorScreen = "dashboard" | "editor";
export type MobileTab = "draw" | "frames" | "settings";
export type ExportFormat = "gif" | "png-sequence" | "png-frame" | "json";

export type BrushTexture = "solid" | "soft" | "grain" | "spray" | "chalk";

export interface BrushSettings {
  color: string;
  size: number;
  opacity: number;
  smoothing: number;
  texture: BrushTexture;
  textureIntensity: number;
}

export interface OnionSkinSettings {
  enabled: boolean;
  previousCount: number;
  nextCount: number;
  opacity: number;
  previousTint: string;
  nextTint: string;
}

export interface GridSettings {
  enabled: boolean;
  size: number;
  opacity: number;
}

export interface FrameLayer {
  id: string;
  name: string;
  order: number;
  visible: boolean;
  opacity: number;
  locked: boolean;
  imageData: string;
}

export interface AnimationFrame {
  id: string;
  order: number;
  duration: number;
  layers: FrameLayer[];
  activeLayerId: string;
  imageData: string;
  thumbnailData: string;
  createdAt: string;
  updatedAt: string;
}

export interface AnimationProject {
  id: string;
  title: string;
  width: number;
  height: number;
  fps: number;
  background: string;
  transparent: boolean;
  frames: AnimationFrame[];
  settings: {
    onionSkin: OnionSkinSettings;
    grid: GridSettings;
  };
  createdAt: string;
  updatedAt: string;
}

export interface ProjectMeta {
  id: string;
  title: string;
  width: number;
  height: number;
  fps: number;
  frameCount: number;
  durationSec: number;
  thumbnailData: string;
  updatedAt: string;
}

export interface NewProjectConfig {
  title: string;
  width: number;
  height: number;
  fps: number;
  background: string;
  transparent: boolean;
}

export interface ExportConfig {
  format: ExportFormat;
  fps: number;
  transparent: boolean;
  quality: number;
}
