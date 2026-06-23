import type { JsonError, JsonStats, JsonValueType, SearchIndexItem, SearchMode } from "./types";

const SAMPLE_JSON = `{
  "user": {
    "id": 101,
    "name": "Shubham",
    "email": "hello@example.com",
    "isActive": true,
    "address": {
      "city": "Bangalore",
      "pincode": 560001
    },
    "tags": ["developer", "ui"]
  },
  "meta": {
    "version": 1,
    "updatedAt": null
  }
}`;

export function getSampleJson() {
  return SAMPLE_JSON;
}

export function getValueType(value: unknown): JsonValueType {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value as JsonValueType;
}

export function formatJson(text: string): string {
  const data = JSON.parse(text);
  return JSON.stringify(data, null, 2);
}

export function minifyJson(text: string): string {
  const data = JSON.parse(text);
  return JSON.stringify(data);
}

function getErrorHint(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("unexpected token") && message.includes("'")) {
    return "JSON requires double quotes for strings, not single quotes.";
  }
  if (lower.includes("unexpected end")) {
    return "Check for unclosed brackets, braces, or strings.";
  }
  if (lower.includes("unexpected token")) {
    return "Check for missing commas or extra commas between properties.";
  }
  if (lower.includes("expected")) {
    return "Verify object/array syntax and property names are quoted.";
  }
  return "Validate brackets, commas, and double-quoted strings.";
}

export function parseJsonError(text: string, err: unknown): JsonError {
  const message = err instanceof Error ? err.message : String(err);
  const posMatch = message.match(/position (\d+)/i);
  let line = 1;
  let column = 1;

  if (posMatch) {
    const pos = Number(posMatch[1]);
    const before = text.slice(0, pos);
    const lines = before.split("\n");
    line = lines.length;
    column = (lines.at(-1)?.length ?? 0) + 1;
  }

  return {
    message,
    line,
    column,
    hint: getErrorHint(message),
  };
}

export function buildSearchIndex(data: unknown, path = "", depth = 0, index: SearchIndexItem[] = []): SearchIndexItem[] {
  const type = getValueType(data);

  if (path) {
    const key = path.includes(".") ? path.split(".").pop()!.replace(/\[\d+\]$/, "") : path.replace(/\[\d+\]$/, "");
    index.push({
      path,
      key: key || path,
      value: data,
      type,
      depth,
    });
  }

  if (Array.isArray(data)) {
    data.forEach((item, i) => {
      const nextPath = path ? `${path}[${i}]` : `[${i}]`;
      buildSearchIndex(item, nextPath, depth + 1, index);
    });
    return index;
  }

  if (data !== null && typeof data === "object") {
    Object.entries(data).forEach(([key, value]) => {
      const nextPath = path ? `${path}.${key}` : key;
      buildSearchIndex(value, nextPath, depth + 1, index);
    });
  }

  return index;
}

export function computeStats(data: unknown, text: string): JsonStats {
  const index = buildSearchIndex(data);
  const stats: JsonStats = {
    size: new Blob([text]).size,
    totalKeys: 0,
    totalValues: index.length,
    totalObjects: 0,
    totalArrays: 0,
    totalStrings: 0,
    totalNumbers: 0,
    totalBooleans: 0,
    totalNulls: 0,
    maxDepth: 0,
    rootType: getValueType(data),
  };

  for (const item of index) {
    stats.maxDepth = Math.max(stats.maxDepth, item.depth);
    if (item.type === "object") stats.totalObjects += 1;
    if (item.type === "array") stats.totalArrays += 1;
    if (item.type === "string") stats.totalStrings += 1;
    if (item.type === "number") stats.totalNumbers += 1;
    if (item.type === "boolean") stats.totalBooleans += 1;
    if (item.type === "null") stats.totalNulls += 1;
    if (item.type !== "object" && item.type !== "array") stats.totalKeys += 1;
  }

  if (data !== null && typeof data === "object" && !Array.isArray(data)) {
    stats.totalKeys = Object.keys(data as object).length;
  }

  return stats;
}

export function searchJson(query: string, index: SearchIndexItem[], mode: SearchMode): SearchIndexItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  if (q.startsWith("type:")) {
    const typeQuery = q.slice(5);
    return index.filter((item) => item.type.toLowerCase().includes(typeQuery));
  }

  return index.filter((item) => {
    const value = formatDisplayValue(item.value).toLowerCase();
    if (mode === "keys") return item.key.toLowerCase().includes(q);
    if (mode === "values") return value.includes(q);
    if (mode === "paths") return item.path.toLowerCase().includes(q);
    if (mode === "types") return item.type.toLowerCase().includes(q);
    return (
      item.key.toLowerCase().includes(q) ||
      item.path.toLowerCase().includes(q) ||
      value.includes(q) ||
      item.type.toLowerCase().includes(q)
    );
  });
}

export function getSuggestions(query: string, index: SearchIndexItem[], recent: string[]): string[] {
  const q = query.trim().toLowerCase();
  const pathSuggestions = [...new Set(index.map((item) => item.path))]
    .filter((path) => !q || path.toLowerCase().includes(q));
  const keySuggestions = [...new Set(index.map((item) => item.key))]
    .filter((key) => !q || key.toLowerCase().includes(q));
  const typeSuggestions = [
    "type:string",
    "type:number",
    "type:boolean",
    "type:null",
    "type:array",
    "type:object",
  ].filter((item) => !q || item.includes(q));
  const recentMatches = recent.filter((item) => !q || item.toLowerCase().includes(q));

  return [...new Set([...recentMatches, ...pathSuggestions, ...keySuggestions, ...typeSuggestions])].slice(0, 12);
}

export function formatDisplayValue(value: unknown): string {
  if (typeof value === "string") return value;
  if (value === null) return "null";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
