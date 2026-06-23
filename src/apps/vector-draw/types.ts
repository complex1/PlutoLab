export type ToolId =
  | "select"
  | "hand"
  | "path-edit"
  | "pen"
  | "pencil"
  | "brush"
  | "rect"
  | "ellipse"
  | "circle"
  | "line";

export type LayerType = "rect" | "ellipse" | "line" | "path";

export type PathKind = "pen" | "pencil" | "brush";

export interface Point {
  x: number;
  y: number;
}

export interface BezierPoint extends Point {
  handleIn?: Point;
  handleOut?: Point;
}

export interface LayerStyle {
  fill: string;
  fillOpacity: number;
  stroke: string;
  strokeWidth: number;
  strokeOpacity: number;
  strokeDasharray: string;
  cornerRadius: number;
  shadowX: number;
  shadowY: number;
  shadowBlur: number;
  shadowColor: string;
  shadowOpacity: number;
  blur: number;
}

export const DEFAULT_STYLE: LayerStyle = {
  fill: "rgba(107, 159, 255, 0.2)",
  fillOpacity: 100,
  stroke: "#6b9fff",
  strokeWidth: 2,
  strokeOpacity: 100,
  strokeDasharray: "",
  cornerRadius: 0,
  shadowX: 0,
  shadowY: 4,
  shadowBlur: 8,
  shadowColor: "#000000",
  shadowOpacity: 25,
  blur: 0,
};

export interface BaseLayer {
  id: string;
  name: string;
  type: LayerType;
  visible: boolean;
  locked: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  style: LayerStyle;
  groupId?: string | null;
}

export interface RectLayer extends BaseLayer {
  type: "rect";
}

export interface EllipseLayer extends BaseLayer {
  type: "ellipse";
}

export interface LineLayer extends BaseLayer {
  type: "line";
  x2: number;
  y2: number;
}

export interface PathLayer extends BaseLayer {
  type: "path";
  points: BezierPoint[];
  closed: boolean;
  pathKind: PathKind;
  brushTexture?: BrushTextureId;
  textureIntensity?: number;
}

export type VectorLayer = RectLayer | EllipseLayer | LineLayer | PathLayer;

export interface VectorProject {
  id: string;
  name: string;
  canvasWidth: number;
  canvasHeight: number;
  background: string;
  layers: VectorLayer[];
  createdAt: number;
  updatedAt: number;
}

export interface DraftShape {
  type: "rect" | "ellipse" | "circle" | "line";
  x: number;
  y: number;
  width: number;
  height: number;
  x2?: number;
  y2?: number;
}

export interface PenDraft {
  points: BezierPoint[];
  closed: boolean;
  layerId: string | null;
}

export interface ViewportState {
  zoom: number;
  panX: number;
  panY: number;
  showGrid: boolean;
  snapToGrid: boolean;
  gridSize: number;
}

export interface MarqueeState {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type BrushTextureId = "none" | "grain" | "rough" | "chalk" | "spray";

export interface BrushSettings {
  size: number;
  opacity: number;
  smoothing: number;
  texture: BrushTextureId;
  textureIntensity: number;
}

export interface EditorState {
  project: VectorProject | null;
  tool: ToolId;
  selectedLayerIds: string[];
  viewport: ViewportState;
  draftShape: DraftShape | null;
  penDraft: PenDraft | null;
  activePathId: string | null;
  pathEditIndex: number | null;
  pathEditHandle: "anchor" | "in" | "out" | null;
  marquee: MarqueeState | null;
  brush: BrushSettings;
  style: LayerStyle;
}

export function createId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
