import { idbGetJson, idbSet } from "../../storage/indexedDb";
import type { SavedPalette } from "./types";

const SAVED_KEY = "color-palette:saved";

export async function loadSavedPalettes(): Promise<SavedPalette[]> {
  return idbGetJson<SavedPalette[]>(SAVED_KEY, []);
}

export async function saveSavedPalettes(palettes: SavedPalette[]): Promise<void> {
  await idbSet(SAVED_KEY, palettes.slice(0, 30));
}

export async function upsertSavedPalette(palette: SavedPalette): Promise<SavedPalette[]> {
  const existing = await loadSavedPalettes();
  const next = [palette, ...existing.filter((p) => p.id !== palette.id)].slice(0, 30);
  await saveSavedPalettes(next);
  return next;
}

export async function deleteSavedPalette(id: string): Promise<SavedPalette[]> {
  const next = (await loadSavedPalettes()).filter((p) => p.id !== id);
  await saveSavedPalettes(next);
  return next;
}
