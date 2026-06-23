export type SearchMode = "all" | "keys" | "values" | "paths" | "types";

export type JsonValueType = "string" | "number" | "boolean" | "null" | "array" | "object";

export interface SearchIndexItem {
  path: string;
  key: string;
  value: unknown;
  type: JsonValueType;
  depth: number;
}

export interface JsonStats {
  size: number;
  totalKeys: number;
  totalValues: number;
  totalObjects: number;
  totalArrays: number;
  totalStrings: number;
  totalNumbers: number;
  totalBooleans: number;
  totalNulls: number;
  maxDepth: number;
  rootType: JsonValueType;
}

export interface JsonError {
  message: string;
  line: number;
  column: number;
  hint: string;
}

export interface JsonLabSettings {
  theme: "vs-dark" | "light";
  fontSize: number;
}

export type MobileTab = "editor" | "tree" | "results" | "stats";
