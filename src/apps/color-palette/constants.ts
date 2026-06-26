import type { SamplePalette } from "./types";

export const SAMPLE_PALETTES: SamplePalette[] = [
  {
    id: "sunset",
    name: "Sunset",
    colors: ["#FF6B6B", "#FFE66D", "#4ECDC4", "#1A535C", "#F7FFF7"],
  },
  {
    id: "ocean",
    name: "Ocean",
    colors: ["#0077B6", "#00B4D8", "#90E0EF", "#CAF0F8", "#03045E"],
  },
  {
    id: "forest",
    name: "Forest",
    colors: ["#2D6A4F", "#40916C", "#52B788", "#95D5B2", "#D8F3DC"],
  },
  {
    id: "berry",
    name: "Berry",
    colors: ["#5A189A", "#9D4EDD", "#C77DFF", "#E0AAFF", "#10002B"],
  },
  {
    id: "earth",
    name: "Earth",
    colors: ["#BC6C25", "#DDA15E", "#FEFAE0", "#606C38", "#283618"],
  },
];

export const SAMPLE_IMAGES: { id: string; name: string; url: string }[] = [
  {
    id: "gradient-warm",
    name: "Warm gradient",
    url: "https://images.unsplash.com/photo-1557683316-973673baf926?w=640&h=480&fit=crop",
  },
  {
    id: "gradient-cool",
    name: "Cool gradient",
    url: "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=640&h=480&fit=crop",
  },
  {
    id: "landscape",
    name: "Landscape",
    url: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=640&h=480&fit=crop",
  },
  {
    id: "architecture",
    name: "Architecture",
    url: "https://images.unsplash.com/photo-1487958449943-2429e8be8622?w=640&h=480&fit=crop",
  },
];
