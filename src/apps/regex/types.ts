export type RegexFlag = "g" | "i" | "m" | "s" | "u" | "y" | "d";

export type MobileTab = "text" | "matches" | "replace" | "library";

export type BottomPanel = "library" | "cheatsheet" | "explain" | null;

export interface RegexSettings {
  theme: "light" | "dark";
}

export interface RegexMatch {
  index: number;
  length: number;
  value: string;
  groups: string[];
  namedGroups: Record<string, string>;
  indices?: [number, number][];
}

export interface HighlightSegment {
  start: number;
  end: number;
  value: string;
  matchIndex: number;
  isGroup?: boolean;
}

export interface ValidationResult {
  isValid: boolean;
  error: string | null;
}

export interface RegexExample {
  id: string;
  title: string;
  category: string;
  pattern: string;
  flags: string;
  sampleText: string;
  description?: string;
}

export interface SavedRegex {
  id: string;
  title: string;
  pattern: string;
  flags: string;
  sampleText: string;
  description: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  isFavorite: boolean;
}

export interface RegexTestCase {
  id: string;
  input: string;
  shouldMatch: boolean;
}

export interface TokenExplanation {
  token: string;
  meaning: string;
}
