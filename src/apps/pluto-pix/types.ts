export type ToolId =
  | "select"
  | "move"
  | "crop"
  | "brush"
  | "eraser"
  | "text"
  | "shape"
  | "eyedropper"
  | "chroma"
  | "mask";

export type BrushKind = "brush" | "pencil" | "marker" | "highlighter";

export type ShapeKind =
  | "rect"
  | "rounded-rect"
  | "circle"
  | "ellipse"
  | "triangle"
  | "line"
  | "arrow"
  | "star"
  | "heart"
  | "speech-bubble";

export type LayerType =
  | "image"
  | "text"
  | "shape"
  | "drawing"
  | "sticker"
  | "background"
  | "watermark";

export type PanelId =
  | "layers"
  | "adjust"
  | "filter"
  | "transform"
  | "background"
  | "text"
  | "export"
  | "batch"
  | "watermark"
  | "meme"
  | "mask"
  | "color"
  | "projects";

export type AlignKind = "left" | "center" | "right" | "top" | "middle" | "bottom";
export type DistributeKind = "horizontal" | "vertical";

export interface Point {
  x: number;
  y: number;
}

export interface Adjustments {
  brightness: number;
  contrast: number;
  saturation: number;
  hue: number;
  exposure: number;
  gamma: number;
  temperature: number;
  tint: number;
  vibrance: number;
  blur: number;
  sharpen: number;
  noise: number;
  pixelate: number;
  opacity: number;
}

export const DEFAULT_ADJUSTMENTS: Adjustments = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
  hue: 0,
  exposure: 100,
  gamma: 100,
  temperature: 0,
  tint: 0,
  vibrance: 100,
  blur: 0,
  sharpen: 0,
  noise: 0,
  pixelate: 0,
  opacity: 100,
};

export interface BrushStroke {
  points: Point[];
  color: string;
  size: number;
  opacity: number;
  soft: boolean;
  dashed?: boolean;
  kind?: BrushKind;
}

export interface FrameStyle {
  width: number;
  color: string;
  radius: number;
  shadow: boolean;
  preset: "none" | "white" | "black" | "polaroid" | "instagram";
}

export interface LayerMask {
  kind: "rect" | "circle" | "gradient";
  inverted: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface BaseLayer {
  id: string;
  name: string;
  type: LayerType;
  visible: boolean;
  locked: boolean;
  opacity: number;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  flipH: boolean;
  flipV: boolean;
  groupId?: string | null;
  mask?: LayerMask | null;
}

export interface ImageLayer extends BaseLayer {
  type: "image";
  src: string;
  adjustments: Adjustments;
  filterId: string | null;
  frame?: FrameStyle;
}

export interface TextLayer extends BaseLayer {
  type: "text";
  text: string;
  fontFamily: string;
  fontSize: number;
  color: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  align: "left" | "center" | "right";
  letterSpacing: number;
  lineHeight: number;
  shadow: boolean;
  outline: boolean;
  vertical?: boolean;
}

export interface ShapeLayer extends BaseLayer {
  type: "shape";
  shape: ShapeKind;
  fill: string;
  stroke: string;
  strokeWidth: number;
  cornerRadius: number;
  dashed: boolean;
}

export interface DrawingLayer extends BaseLayer {
  type: "drawing";
  strokes: BrushStroke[];
}

export interface StickerLayer extends BaseLayer {
  type: "sticker";
  content: string;
  isEmoji: boolean;
}

export interface BackgroundLayer extends BaseLayer {
  type: "background";
  fill: string;
  gradient: GradientFill | null;
  imageSrc?: string | null;
}

export interface WatermarkLayer extends BaseLayer {
  type: "watermark";
  text: string;
  imageSrc?: string | null;
  repeat: boolean;
  tileSpacing: number;
}

export interface GradientFill {
  kind: "linear" | "radial";
  colors: string[];
  angle: number;
}

export type PixLayer =
  | ImageLayer
  | TextLayer
  | ShapeLayer
  | DrawingLayer
  | StickerLayer
  | BackgroundLayer
  | WatermarkLayer;

export interface CropState {
  active: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  ratio: number | null;
}

export interface ChromaSettings {
  color: string;
  tolerance: number;
  feather: number;
}

export interface WatermarkSettings {
  text: string;
  opacity: number;
  size: number;
  repeat: boolean;
}

export interface PixProject {
  id: string;
  name: string;
  canvasWidth: number;
  canvasHeight: number;
  background: string;
  backgroundGradient?: GradientFill | null;
  layers: PixLayer[];
  createdAt: number;
  updatedAt: number;
}

export interface ViewportState {
  zoom: number;
  panX: number;
  panY: number;
  showGrid: boolean;
  showRulers: boolean;
  showCheckerboard: boolean;
  showBoundary: boolean;
  snapToGrid: boolean;
  gridSize: number;
}

export interface BrushSettings {
  kind: BrushKind;
  color: string;
  size: number;
  opacity: number;
  soft: boolean;
  dashed: boolean;
}

export interface EditorState {
  project: PixProject;
  tool: ToolId;
  selectedLayerIds: string[];
  viewport: ViewportState;
  crop: CropState | null;
  brush: BrushSettings;
  chroma: ChromaSettings;
  watermark: WatermarkSettings;
  shapeKind: ShapeKind;
  shapeFill: string;
  shapeStroke: string;
  shapeStrokeWidth: number;
  activePanel: PanelId;
  compareOriginal: boolean;
  compareSlider: number;
  recentColors: string[];
  customPalette: string[];
  theme: "dark" | "light";
  fullscreen: boolean;
  exportWidth: number;
  exportHeight: number;
}

export function createId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export const DEFAULT_FRAME: FrameStyle = {
  width: 0,
  color: "#ffffff",
  radius: 0,
  shadow: false,
  preset: "none",
};
