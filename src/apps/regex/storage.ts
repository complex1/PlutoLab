import { idbGetJson, idbSet } from "../../storage/indexedDb";
import type { RegexSettings, SavedRegex } from "./types";

const SAVED_KEY = "regex:patterns";
const DRAFT_KEY = "regex:draft";
const SETTINGS_KEY = "regex:settings";

const DEFAULT_SETTINGS: RegexSettings = { theme: "dark" };

export interface RegexDraft {
  pattern: string;
  flags: string;
  sampleText: string;
  replacement: string;
}

const DEFAULT_DRAFT: RegexDraft = {
  pattern: "\\d+",
  flags: "g",
  sampleText: "Order ID: 12345\nPrice: 999",
  replacement: "",
};

export async function loadSettings(): Promise<RegexSettings> {
  const partial = await idbGetJson<Partial<RegexSettings>>(SETTINGS_KEY, {});
  return { ...DEFAULT_SETTINGS, ...partial };
}

export async function saveSettings(settings: RegexSettings): Promise<void> {
  await idbSet(SETTINGS_KEY, settings);
}

export async function loadDraft(): Promise<RegexDraft> {
  const partial = await idbGetJson<Partial<RegexDraft>>(DRAFT_KEY, {});
  return { ...DEFAULT_DRAFT, ...partial };
}

export async function saveDraft(draft: RegexDraft): Promise<void> {
  await idbSet(DRAFT_KEY, draft);
}

export async function loadSavedPatterns(): Promise<SavedRegex[]> {
  return idbGetJson<SavedRegex[]>(SAVED_KEY, []);
}

export async function saveSavedPatterns(patterns: SavedRegex[]): Promise<void> {
  await idbSet(SAVED_KEY, patterns);
}

export function createSavedRegex(
  title: string,
  pattern: string,
  flags: string,
  sampleText: string,
  description = "",
  tags: string[] = []
): SavedRegex {
  const now = new Date().toISOString();
  return {
    id: `regex_${Date.now()}`,
    title,
    pattern,
    flags,
    sampleText,
    description,
    tags,
    createdAt: now,
    updatedAt: now,
    isFavorite: false,
  };
}

export function exportPatternsJson(patterns: SavedRegex[]): string {
  return JSON.stringify(patterns, null, 2);
}

export function importPatternsJson(raw: string): SavedRegex[] {
  const parsed = JSON.parse(raw) as SavedRegex[];
  if (!Array.isArray(parsed)) throw new Error("Invalid regex library file");
  return parsed.map((p) => ({
    ...p,
    id: p.id || `regex_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    tags: p.tags ?? [],
    isFavorite: p.isFavorite ?? false,
    createdAt: p.createdAt ?? new Date().toISOString(),
    updatedAt: p.updatedAt ?? new Date().toISOString(),
  }));
}
