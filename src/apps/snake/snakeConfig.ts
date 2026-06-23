export interface SnakeConfig {
  gridSize: number;
  baseSpeed: number;
  minSpeed: number;
  speedRamp: number;
  initialLength: number;
}

export const DEFAULT_CONFIG: SnakeConfig = {
  gridSize: 20,
  baseSpeed: 160,
  minSpeed: 70,
  speedRamp: 3,
  initialLength: 3,
};

export interface ConfigField {
  key: keyof SnakeConfig;
  label: string;
  min: number;
  max: number;
  step: number;
  unit?: string;
}

export const CONFIG_FIELDS: ConfigField[] = [
  { key: "gridSize", label: "Grid size", min: 12, max: 28, step: 1, unit: "cells" },
  { key: "baseSpeed", label: "Base speed", min: 80, max: 250, step: 5, unit: "ms" },
  { key: "minSpeed", label: "Max speed", min: 40, max: 120, step: 5, unit: "ms" },
  { key: "speedRamp", label: "Speed ramp", min: 0, max: 8, step: 1, unit: "ms/food" },
  { key: "initialLength", label: "Start length", min: 2, max: 8, step: 1, unit: "segments" },
];

import { idbGetJson, idbSet } from "../../storage/indexedDb";

const STORAGE_KEY = "snake:config";

export async function loadConfig(): Promise<SnakeConfig> {
  const parsed = await idbGetJson<Partial<SnakeConfig>>(STORAGE_KEY, {});
  return clampConfig({ ...DEFAULT_CONFIG, ...parsed });
}

export async function saveConfig(config: SnakeConfig): Promise<void> {
  await idbSet(STORAGE_KEY, config);
}

export function clampConfig(config: SnakeConfig): SnakeConfig {
  const clamped = { ...config };
  for (const field of CONFIG_FIELDS) {
    clamped[field.key] = Math.min(field.max, Math.max(field.min, clamped[field.key]));
  }
  if (clamped.minSpeed > clamped.baseSpeed) {
    clamped.minSpeed = clamped.baseSpeed;
  }
  return clamped;
}

export function getCellSize(gridSize: number): number {
  return Math.max(14, Math.floor(360 / gridSize));
}
