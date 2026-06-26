import type { AnimationFrame, GridSettings, OnionSkinSettings } from "./types";

export interface OnionLayer {
  imageData: string;
  opacity: number;
  tint: string;
  label: string;
}

export const DEFAULT_ONION_SKIN: OnionSkinSettings = {
  enabled: true,
  previousCount: 1,
  nextCount: 1,
  opacity: 0.4,
  previousTint: "#ff6b8a",
  nextTint: "#6b9fff",
};

export const DEFAULT_GRID: GridSettings = {
  enabled: false,
  size: 50,
  opacity: 0.2,
};

export function normalizeOnionSkin(raw?: Partial<OnionSkinSettings> | null): OnionSkinSettings {
  if (!raw) return { ...DEFAULT_ONION_SKIN };
  return {
    enabled: raw.enabled ?? DEFAULT_ONION_SKIN.enabled,
    previousCount: clampCount(raw.previousCount ?? (raw.enabled === false ? 0 : 1)),
    nextCount: clampCount(raw.nextCount ?? 0),
    opacity: clampOpacity(raw.opacity ?? DEFAULT_ONION_SKIN.opacity),
    previousTint: raw.previousTint ?? DEFAULT_ONION_SKIN.previousTint,
    nextTint: raw.nextTint ?? DEFAULT_ONION_SKIN.nextTint,
  };
}

export function normalizeGrid(raw?: Partial<GridSettings> | null): GridSettings {
  if (!raw) return { ...DEFAULT_GRID };
  return {
    enabled: raw.enabled ?? false,
    size: Math.min(200, Math.max(8, raw.size ?? DEFAULT_GRID.size)),
    opacity: clampOpacity(raw.opacity ?? DEFAULT_GRID.opacity),
  };
}

function clampCount(n: number) {
  return Math.min(5, Math.max(0, Math.round(n)));
}

function clampOpacity(n: number) {
  return Math.min(0.8, Math.max(0.1, n));
}

/** Fade older onion frames slightly for depth. */
function layerOpacity(base: number, distance: number) {
  const fade = 1 - (distance - 1) * 0.12;
  return base * Math.max(0.35, fade);
}

export function buildOnionLayers(
  frames: AnimationFrame[],
  currentIndex: number,
  settings: OnionSkinSettings
): OnionLayer[] {
  if (!settings.enabled || currentIndex < 0) return [];

  const layers: OnionLayer[] = [];

  if (settings.previousCount > 0) {
    for (let dist = settings.previousCount; dist >= 1; dist--) {
      const idx = currentIndex - dist;
      if (idx < 0) continue;
      const frame = frames[idx];
      layers.push({
        imageData: frame.imageData,
        opacity: layerOpacity(settings.opacity, dist),
        tint: settings.previousTint,
        label: `prev-${dist}`,
      });
    }
  }

  if (settings.nextCount > 0) {
    for (let dist = 1; dist <= settings.nextCount; dist++) {
      const idx = currentIndex + dist;
      if (idx >= frames.length) continue;
      const frame = frames[idx];
      layers.push({
        imageData: frame.imageData,
        opacity: layerOpacity(settings.opacity, dist),
        tint: settings.nextTint,
        label: `next-${dist}`,
      });
    }
  }

  return layers;
}
