import { normalizeHex } from "./colorLogic";

export type HarmonyScheme =
  | "complementary"
  | "analogous"
  | "triadic"
  | "tetradic"
  | "split-complementary"
  | "monochromatic"
  | "shades";

export type ExportFormat = "css" | "scss" | "tailwind";

export interface PaletteColor {
  id: string;
  hex: string;
  label?: string;
}

export interface SavedPalette {
  id: string;
  name: string;
  colors: PaletteColor[];
  createdAt: string;
  updatedAt: string;
}

export interface SamplePalette {
  id: string;
  name: string;
  colors: string[];
}

export const HARMONY_SCHEMES: { id: HarmonyScheme; label: string; description: string }[] = [
  { id: "complementary", label: "Complementary", description: "Base + opposite hue on the wheel" },
  { id: "analogous", label: "Analogous", description: "Neighboring hues for smooth blends" },
  { id: "triadic", label: "Triadic", description: "Three evenly spaced hues" },
  { id: "tetradic", label: "Tetradic", description: "Four hues in a rectangle" },
  { id: "split-complementary", label: "Split complementary", description: "Base + two adjacent opposites" },
  { id: "monochromatic", label: "Monochromatic", description: "Same hue, varied saturation & lightness" },
  { id: "shades", label: "Shades", description: "Same hue, stepped lightness" },
];

export const SEMANTIC_LABELS = ["primary", "secondary", "accent", "background", "surface", "text", "muted", "border"];

export function createColorId() {
  return `color_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

export function createPaletteColor(hex: string, label?: string): PaletteColor {
  return { id: createColorId(), hex: normalizeHex(hex), label };
}
