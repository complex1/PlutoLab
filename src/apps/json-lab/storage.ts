import { idbGetJson, idbGetString, idbSet } from "../../storage/indexedDb";
import type { JsonLabSettings } from "./types";

const DRAFT_KEY = "json-lab:draft";
const RECENT_SEARCH_KEY = "json-lab:recent-searches";
const SETTINGS_KEY = "json-lab:settings";

const DEFAULT_SETTINGS: JsonLabSettings = {
  theme: "vs-dark",
  fontSize: 14,
};

export async function loadSettings(): Promise<JsonLabSettings> {
  const partial = await idbGetJson<Partial<JsonLabSettings>>(SETTINGS_KEY, {});
  return { ...DEFAULT_SETTINGS, ...partial };
}

export async function saveSettings(settings: JsonLabSettings): Promise<void> {
  await idbSet(SETTINGS_KEY, settings);
}

export async function loadDraft(): Promise<string> {
  return idbGetString(DRAFT_KEY, "");
}

export async function saveDraft(text: string): Promise<void> {
  await idbSet(DRAFT_KEY, text);
}

export async function loadRecentSearches(): Promise<string[]> {
  return idbGetJson<string[]>(RECENT_SEARCH_KEY, []);
}

export async function pushRecentSearch(query: string): Promise<string[]> {
  const trimmed = query.trim();
  if (!trimmed) return loadRecentSearches();
  const next = [trimmed, ...(await loadRecentSearches()).filter((q) => q !== trimmed)].slice(0, 10);
  await idbSet(RECENT_SEARCH_KEY, next);
  return next;
}
