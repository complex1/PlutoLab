import { idbGetJson, idbGetString, idbSet } from "../../storage/indexedDb";
import type { PlaygroundSettings, Snippet } from "./types";

const SNIPPETS_KEY = "js-playground:snippets";
const SETTINGS_KEY = "js-playground:settings";
const CODE_KEY = "js-playground:code";

const DEFAULT_SETTINGS: PlaygroundSettings = {
  theme: "vs-dark",
  fontSize: 14,
  layout: "vertical",
  autoRun: false,
};

export async function loadSettings(): Promise<PlaygroundSettings> {
  const partial = await idbGetJson<Partial<PlaygroundSettings>>(SETTINGS_KEY, {});
  return { ...DEFAULT_SETTINGS, ...partial };
}

export async function saveSettings(settings: PlaygroundSettings): Promise<void> {
  await idbSet(SETTINGS_KEY, settings);
}

export async function loadDraftCode(): Promise<string> {
  return idbGetString(CODE_KEY, "");
}

export async function saveDraftCode(code: string): Promise<void> {
  await idbSet(CODE_KEY, code);
}

export async function loadSnippets(): Promise<Snippet[]> {
  return idbGetJson<Snippet[]>(SNIPPETS_KEY, []);
}

export async function saveSnippets(snippets: Snippet[]): Promise<void> {
  await idbSet(SNIPPETS_KEY, snippets);
}

export function createSnippet(title: string, code: string, category = "Saved"): Snippet {
  const now = new Date().toISOString();
  return {
    id: `snippet_${Date.now()}`,
    title,
    code,
    category,
    createdAt: now,
    updatedAt: now,
    isFavorite: false,
  };
}

export function exportSnippetsJson(snippets: Snippet[]): string {
  return JSON.stringify(snippets, null, 2);
}

export function importSnippetsJson(raw: string): Snippet[] {
  const parsed = JSON.parse(raw) as Snippet[];
  if (!Array.isArray(parsed)) throw new Error("Invalid snippet file");
  return parsed.map((s) => ({
    ...s,
    id: s.id || `snippet_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    updatedAt: new Date().toISOString(),
  }));
}
