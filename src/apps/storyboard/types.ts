export type EditorView = "grid" | "panel" | "timeline";
export type AspectRatio = "16:9" | "9:16" | "1:1" | "4:3" | "custom";
export type ExportRange = "all" | "scene" | "selected";
export type ExportFormat = "png" | "pdf" | "json" | "zip";
export type PanelEditorTab = "notes" | "details";
export type DashboardSection = "projects" | "templates" | "recent";
export type ViewMode = "compact" | "detailed";
export type GridColumns = 2 | 3 | 4;
export type SaveStatus = "saved" | "unsaved" | "saving";
export type EditorTab = "panels" | "draw" | "notes" | "timeline";
export type DrawTool =
  | "select"
  | "pencil"
  | "brush"
  | "eraser"
  | "line"
  | "rect"
  | "circle"
  | "arrow"
  | "text";

export interface StoryboardSettings {
  gridColumns: GridColumns;
  viewMode: ViewMode;
  theme: "dark" | "light";
  showNotes: boolean;
}

export interface Scene {
  id: string;
  title: string;
  description: string;
  order: number;
  collapsed: boolean;
}

export interface DrawPoint {
  x: number;
  y: number;
}

export interface DrawStroke {
  id: string;
  tool: DrawTool;
  color: string;
  size: number;
  opacity: number;
  soft: boolean;
  points: DrawPoint[];
  endPoint?: DrawPoint;
  text?: string;
}

export interface Panel {
  id: string;
  sceneId: string;
  order: number;
  title: string;
  imageData: string | null;
  backgroundImage: string | null;
  strokes: DrawStroke[];
  action: string;
  dialogue: string;
  shotType: string;
  cameraAngle: string;
  cameraMovement: string;
  duration: number;
  backgroundNotes: string;
  characterNotes: string;
  soundNotes: string;
  cameraNotes: string;
  transition: string;
  createdAt: string;
  updatedAt: string;
}

export interface StoryboardProject {
  id: string;
  title: string;
  description: string;
  aspectRatio: AspectRatio;
  customWidth: number;
  customHeight: number;
  createdAt: string;
  updatedAt: string;
  scenes: Scene[];
  panels: Panel[];
  settings: StoryboardSettings;
}

export interface ProjectMeta {
  id: string;
  title: string;
  description: string;
  aspectRatio: AspectRatio;
  updatedAt: string;
  panelCount: number;
}

export interface BrushSettings {
  color: string;
  size: number;
  opacity: number;
  soft: boolean;
}

export interface ExportConfig {
  range: ExportRange;
  format: ExportFormat;
  includeNotes: boolean;
  includeSceneTitles: boolean;
  includeDurations: boolean;
  pdfPanelsPerPage: 2 | 4 | 6;
  quality: "high" | "medium";
}
