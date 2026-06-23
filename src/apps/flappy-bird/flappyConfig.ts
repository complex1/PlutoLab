export interface FlappyConfig {
  gravity: number;
  flapStrength: number;
  maxFallSpeed: number;
  pipeSpeed: number;
  pipeGap: number;
  pipeInterval: number;
}

export const DEFAULT_CONFIG: FlappyConfig = {
  gravity: 0.17,
  flapStrength: 4.2,
  maxFallSpeed: 3.8,
  pipeSpeed: 1.55,
  pipeGap: 138,
  pipeInterval: 125,
};

export interface ConfigField {
  key: keyof FlappyConfig;
  label: string;
  min: number;
  max: number;
  step: number;
  unit?: string;
}

export const CONFIG_FIELDS: ConfigField[] = [
  { key: "gravity", label: "Gravity", min: 0.08, max: 0.4, step: 0.01 },
  { key: "flapStrength", label: "Flap strength", min: 2, max: 7, step: 0.1 },
  { key: "maxFallSpeed", label: "Max fall speed", min: 2, max: 8, step: 0.1 },
  { key: "pipeSpeed", label: "Pipe speed", min: 0.8, max: 3, step: 0.05 },
  { key: "pipeGap", label: "Pipe gap", min: 100, max: 180, step: 2, unit: "px" },
  { key: "pipeInterval", label: "Pipe spacing", min: 80, max: 180, step: 5, unit: "frames" },
];

import { idbGetJson, idbSet, idbGetNumber } from "../../storage/indexedDb";

const STORAGE_KEY = "flappy:config";

export async function loadConfig(): Promise<FlappyConfig> {
  const parsed = await idbGetJson<Partial<FlappyConfig>>(STORAGE_KEY, {});
  return clampConfig({ ...DEFAULT_CONFIG, ...parsed });
}

export async function saveConfig(config: FlappyConfig): Promise<void> {
  await idbSet(STORAGE_KEY, config);
}

const BEST_SCORE_KEY = "flappy:best";

export async function loadBestScore(): Promise<number> {
  return idbGetNumber(BEST_SCORE_KEY, 0);
}

export async function saveBestScore(score: number): Promise<void> {
  await idbSet(BEST_SCORE_KEY, score);
}

export function clampConfig(config: FlappyConfig): FlappyConfig {
  const clamped = { ...config };
  for (const field of CONFIG_FIELDS) {
    clamped[field.key] = Math.min(field.max, Math.max(field.min, clamped[field.key]));
  }
  return clamped;
}
