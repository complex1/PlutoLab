export type Tool =
  | "select"
  | "pen"
  | "eraser"
  | "rect"
  | "ellipse"
  | "text"
  | "image";

export interface Point {
  x: number;
  y: number;
}

export interface ElementTransform {
  rotation?: number;
}

export interface Camera {
  x: number;
  y: number;
  zoom: number;
}

export interface PathElement extends ElementTransform {
  id: string;
  type: "path";
  points: Point[];
  color: string;
  width: number;
}

export interface RectElement extends ElementTransform {
  id: string;
  type: "rect";
  x: number;
  y: number;
  width: number;
  height: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
}

export interface EllipseElement extends ElementTransform {
  id: string;
  type: "ellipse";
  x: number;
  y: number;
  width: number;
  height: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
}

export interface TextElement extends ElementTransform {
  id: string;
  type: "text";
  x: number;
  y: number;
  text: string;
  fontSize: number;
  color: string;
}

export interface ImageElement extends ElementTransform {
  id: string;
  type: "image";
  x: number;
  y: number;
  width: number;
  height: number;
  src: string;
}

export type CanvasElement =
  | PathElement
  | RectElement
  | EllipseElement
  | TextElement
  | ImageElement;

export interface DraftShape {
  type: "rect" | "ellipse";
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CanvasDocument {
  elements: CanvasElement[];
  camera: Camera;
}

export const DEFAULT_STROKE = "#e8e8f0";
export const DEFAULT_FILL = "rgba(107, 159, 255, 0.15)";
export const DEFAULT_CAMERA: Camera = { x: 0, y: 0, zoom: 1 };
export const ERASER_RADIUS = 12;

export function createId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
