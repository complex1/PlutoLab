export type OutputType = "log" | "info" | "warn" | "error" | "table" | "result";

export interface OutputLine {
  id: string;
  type: OutputType;
  text: string;
  timestamp: number;
}

export interface Snippet {
  id: string;
  title: string;
  code: string;
  category: string;
  createdAt: string;
  updatedAt: string;
  isFavorite: boolean;
}

export interface ExampleSnippet {
  id: string;
  title: string;
  category: string;
  code: string;
}

export type EditorTheme = "vs-dark" | "light";
export type LayoutMode = "vertical" | "split";

export interface PlaygroundSettings {
  theme: EditorTheme;
  fontSize: number;
  layout: LayoutMode;
  autoRun: boolean;
}

export interface WorkerSuccess {
  ok: true;
  lines: { type: OutputType; text: string }[];
  elapsed: number;
}

export interface WorkerFailure {
  ok: false;
  lines: { type: OutputType; text: string }[];
  error: string;
  elapsed: number;
}

export type WorkerResult = WorkerSuccess | WorkerFailure;
