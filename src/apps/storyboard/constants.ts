import type { AspectRatio, DrawTool } from "./types";

export const SHOT_TYPES = [
  { id: "extreme-wide", label: "Extreme wide shot" },
  { id: "wide-shot", label: "Wide shot" },
  { id: "full-shot", label: "Full shot" },
  { id: "medium-shot", label: "Medium shot" },
  { id: "close-up", label: "Close-up" },
  { id: "extreme-close-up", label: "Extreme close-up" },
  { id: "over-shoulder", label: "Over-the-shoulder shot" },
  { id: "pov", label: "Point-of-view shot" },
  { id: "two-shot", label: "Two-shot" },
  { id: "insert", label: "Insert shot" },
  { id: "cutaway", label: "Cutaway shot" },
] as const;

export const CAMERA_ANGLES = [
  { id: "eye-level", label: "Eye level" },
  { id: "high-angle", label: "High angle" },
  { id: "low-angle", label: "Low angle" },
  { id: "top-view", label: "Top view" },
  { id: "side-view", label: "Side view" },
  { id: "front-view", label: "Front view" },
  { id: "back-view", label: "Back view" },
  { id: "dutch-angle", label: "Dutch angle" },
  { id: "birds-eye", label: "Bird's-eye view" },
  { id: "worms-eye", label: "Worm's-eye view" },
] as const;

export const CAMERA_MOVEMENTS = [
  { id: "static", label: "Static" },
  { id: "pan-left", label: "Pan left" },
  { id: "pan-right", label: "Pan right" },
  { id: "tilt-up", label: "Tilt up" },
  { id: "tilt-down", label: "Tilt down" },
  { id: "zoom-in", label: "Zoom in" },
  { id: "zoom-out", label: "Zoom out" },
  { id: "dolly-in", label: "Dolly in" },
  { id: "dolly-out", label: "Dolly out" },
  { id: "follow", label: "Follow shot" },
  { id: "handheld", label: "Handheld" },
] as const;

export const TRANSITIONS = [
  { id: "cut", label: "Cut" },
  { id: "fade", label: "Fade" },
  { id: "dissolve", label: "Dissolve" },
  { id: "wipe", label: "Wipe" },
  { id: "match-cut", label: "Match cut" },
] as const;

export const ASPECT_RATIOS: { id: AspectRatio; label: string; w: number; h: number }[] = [
  { id: "16:9", label: "16:9 — YouTube / short film", w: 320, h: 180 },
  { id: "9:16", label: "9:16 — Reel / Shorts", w: 180, h: 320 },
  { id: "1:1", label: "1:1 — Square post", w: 240, h: 240 },
  { id: "4:3", label: "4:3 — Classic storyboard", w: 320, h: 240 },
  { id: "custom", label: "Custom size", w: 320, h: 180 },
];

export const DRAW_TOOLS: { id: DrawTool; label: string; icon: string }[] = [
  { id: "select", label: "Select", icon: "fa-arrow-pointer" },
  { id: "pencil", label: "Pencil", icon: "fa-pencil" },
  { id: "brush", label: "Brush", icon: "fa-paintbrush" },
  { id: "eraser", label: "Eraser", icon: "fa-eraser" },
  { id: "line", label: "Line", icon: "fa-minus" },
  { id: "rect", label: "Rectangle", icon: "fa-square" },
  { id: "circle", label: "Circle", icon: "fa-circle" },
  { id: "arrow", label: "Arrow", icon: "fa-arrow-right" },
  { id: "text", label: "Text", icon: "fa-font" },
];

export const PANEL_TEMPLATES = [
  { id: "blank", label: "Blank panel", shotType: "wide-shot", cameraAngle: "eye-level" },
  { id: "dialogue", label: "Dialogue panel", shotType: "medium-shot", cameraAngle: "eye-level" },
  { id: "action", label: "Action panel", shotType: "full-shot", cameraAngle: "eye-level" },
  { id: "close-up", label: "Close-up panel", shotType: "close-up", cameraAngle: "eye-level" },
  { id: "wide", label: "Wide shot panel", shotType: "wide-shot", cameraAngle: "eye-level" },
  { id: "ots", label: "Over-the-shoulder", shotType: "over-shoulder", cameraAngle: "eye-level" },
  { id: "reaction", label: "Reaction shot", shotType: "close-up", cameraAngle: "eye-level" },
  { id: "transition", label: "Transition panel", shotType: "insert", cameraAngle: "eye-level" },
] as const;

export const BRUSH_COLORS = ["#1a1d26", "#ffffff", "#e07a8a", "#6b9fff", "#6bb87a", "#f5c542", "#9b8fd4"];

export const TEMPLATE_PRESETS: { aspectRatio: AspectRatio; label: string; sub: string; icon: string }[] = [
  { aspectRatio: "16:9", label: "16:9", sub: "YouTube / Film", icon: "fa-film" },
  { aspectRatio: "9:16", label: "9:16", sub: "Reels / Shorts", icon: "fa-mobile-screen" },
  { aspectRatio: "1:1", label: "1:1", sub: "Instagram Post", icon: "fa-square" },
  { aspectRatio: "4:3", label: "4:3", sub: "Classic", icon: "fa-table-cells" },
];
