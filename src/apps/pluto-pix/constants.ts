export interface CanvasPreset {
  id: string;
  name: string;
  width: number;
  height: number;
  category: "social" | "custom";
}

export const CANVAS_PRESETS: CanvasPreset[] = [
  { id: "ig-post", name: "Instagram Post", width: 1080, height: 1080, category: "social" },
  { id: "ig-story", name: "Instagram Story", width: 1080, height: 1920, category: "social" },
  { id: "yt-thumb", name: "YouTube Thumbnail", width: 1280, height: 720, category: "social" },
  { id: "linkedin", name: "LinkedIn Post", width: 1200, height: 627, category: "social" },
  { id: "twitter", name: "Twitter/X Post", width: 1600, height: 900, category: "social" },
  { id: "facebook", name: "Facebook Post", width: 1200, height: 630, category: "social" },
  { id: "pinterest", name: "Pinterest Pin", width: 1000, height: 1500, category: "social" },
  { id: "profile", name: "Profile Picture", width: 800, height: 800, category: "social" },
  { id: "wallpaper", name: "Wallpaper 9:16", width: 1080, height: 1920, category: "social" },
];

export interface CropRatio {
  id: string;
  label: string;
  ratio: number | null;
}

export const CROP_RATIOS: CropRatio[] = [
  { id: "free", label: "Free", ratio: null },
  { id: "square", label: "Square 1:1", ratio: 1 },
  { id: "ig-post", label: "Instagram Post", ratio: 1 },
  { id: "story", label: "Story 9:16", ratio: 9 / 16 },
  { id: "yt", label: "YouTube 16:9", ratio: 16 / 9 },
  { id: "4:3", label: "4:3", ratio: 4 / 3 },
  { id: "3:2", label: "3:2", ratio: 3 / 2 },
];

export interface FilterPreset {
  id: string;
  name: string;
  css: string;
}

export const FILTER_PRESETS: FilterPreset[] = [
  { id: "none", name: "Original", css: "none" },
  { id: "bw", name: "Black & White", css: "grayscale(1) contrast(1.1)" },
  { id: "sepia", name: "Sepia", css: "sepia(0.85) contrast(1.05)" },
  { id: "vintage", name: "Vintage", css: "sepia(0.35) contrast(1.15) brightness(0.95) saturate(0.8)" },
  { id: "warm", name: "Warm", css: "sepia(0.2) saturate(1.2) brightness(1.05) hue-rotate(-8deg)" },
  { id: "cool", name: "Cool", css: "saturate(0.9) brightness(1.02) hue-rotate(12deg)" },
  { id: "cinematic", name: "Cinematic", css: "contrast(1.2) saturate(0.85) brightness(0.92)" },
  { id: "pastel", name: "Pastel", css: "saturate(0.65) brightness(1.12) contrast(0.92)" },
  { id: "moody", name: "Moody", css: "brightness(0.82) contrast(1.25) saturate(0.75)" },
  { id: "high-contrast", name: "High Contrast", css: "contrast(1.45) saturate(1.1)" },
  { id: "soft", name: "Soft Light", css: "brightness(1.08) contrast(0.9) saturate(0.95)" },
  { id: "dreamy", name: "Dreamy", css: "brightness(1.1) contrast(0.85) saturate(1.1) blur(0.3px)" },
  { id: "matte", name: "Matte", css: "contrast(0.9) brightness(1.05) saturate(0.8)" },
  { id: "fade", name: "Fade", css: "contrast(0.88) brightness(1.08) saturate(0.7)" },
  { id: "retro", name: "Retro", css: "sepia(0.45) contrast(1.1) hue-rotate(-15deg)" },
  { id: "orange-teal", name: "Orange Teal", css: "contrast(1.15) saturate(1.2) hue-rotate(165deg)" },
  { id: "night", name: "Night Mode", css: "brightness(0.7) contrast(1.2) saturate(0.6) hue-rotate(200deg)" },
  { id: "sketch", name: "Sketch", css: "grayscale(1) contrast(1.5) brightness(1.1)" },
  { id: "posterize", name: "Posterize", css: "contrast(1.6) saturate(1.4) brightness(1.05)" },
  { id: "invert", name: "Invert", css: "invert(1)" },
];

export const SAMPLE_IMAGES = [
  {
    id: "gradient-sunset",
    name: "Sunset Gradient",
    src: "data:image/svg+xml," + encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#ff6b6b"/><stop offset="50%" stop-color="#feca57"/><stop offset="100%" stop-color="#48dbfb"/></linearGradient></defs><rect width="800" height="600" fill="url(#g)"/></svg>`
    ),
  },
  {
    id: "gradient-ocean",
    name: "Ocean Gradient",
    src: "data:image/svg+xml," + encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#0f0c29"/><stop offset="50%" stop-color="#302b63"/><stop offset="100%" stop-color="#24243e"/></linearGradient></defs><rect width="800" height="600" fill="url(#g)"/><circle cx="600" cy="120" r="60" fill="#ffd93d" opacity="0.9"/></svg>`
    ),
  },
  {
    id: "shapes",
    name: "Color Blocks",
    src: "data:image/svg+xml," + encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><rect width="400" height="600" fill="#6b9fff"/><rect x="400" width="400" height="300" fill="#e07a8a"/><rect x="400" y="300" width="200" height="300" fill="#6bb87a"/><rect x="600" y="300" width="200" height="300" fill="#9b8fd4"/></svg>`
    ),
  },
];

export const FONT_OPTIONS = [
  "Inter",
  "Plus Jakarta Sans",
  "Georgia",
  "Impact",
  "Courier New",
  "Comic Sans MS",
];

export const EMOJI_STICKERS = ["😀", "😂", "🔥", "❤️", "⭐", "👍", "🎉", "💯", "✨", "🚀"];

export const MEME_PRESETS = [
  { id: "top-bottom", top: "TOP TEXT", bottom: "BOTTOM TEXT" },
  { id: "drake", top: "NO", bottom: "YES" },
  { id: "distracted", top: "ME", bottom: "NEW THING" },
  { id: "change", top: "BEFORE", bottom: "AFTER" },
];

export const FRAME_PRESETS = [
  { id: "none", name: "None", width: 0, color: "#fff", radius: 0, shadow: false },
  { id: "white", name: "White Border", width: 8, color: "#ffffff", radius: 0, shadow: false },
  { id: "black", name: "Black Border", width: 8, color: "#000000", radius: 0, shadow: false },
  { id: "polaroid", name: "Polaroid", width: 12, color: "#ffffff", radius: 0, shadow: true },
  { id: "instagram", name: "Rounded", width: 4, color: "#ffffff", radius: 24, shadow: true },
];

export const GRADIENT_PRESETS = [
  { id: "sunset", colors: ["#ff6b6b", "#feca57", "#48dbfb"] },
  { id: "ocean", colors: ["#0f0c29", "#302b63", "#24243e"] },
  { id: "forest", colors: ["#134e5e", "#71b280"] },
  { id: "candy", colors: ["#ff9a9e", "#fecfef", "#fecfef"] },
];

export const MAX_HISTORY = 40;
