import { useCallback, useEffect, useRef, useState } from "react";
import { exampleSnippets } from "./examples";
import { formatJavaScript, minifyJavaScript } from "./formatCode";
import {
  createSnippet,
  exportSnippetsJson,
  importSnippetsJson,
  loadDraftCode,
  loadSettings,
  loadSnippets,
  saveDraftCode,
  saveSettings,
  saveSnippets,
} from "./storage";
import type { EditorTheme, LayoutMode, OutputLine, PlaygroundSettings, Snippet, WorkerResult } from "./types";

const RUN_TIMEOUT_MS = 5000;
const DEFAULT_CODE = exampleSnippets[0]?.code ?? 'console.log("Hello");';

function createLine(type: OutputLine["type"], text: string): OutputLine {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type,
    text,
    timestamp: Date.now(),
  };
}

export function useJsPlayground() {
  const [code, setCode] = useState(DEFAULT_CODE);
  const [output, setOutput] = useState<OutputLine[]>([]);
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [settings, setSettings] = useState<PlaygroundSettings>({
    theme: "vs-dark",
    fontSize: 14,
    layout: "vertical",
    autoRun: false,
  });
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState<number | null>(null);
  const [status, setStatus] = useState("");
  const [activeSnippetId, setActiveSnippetId] = useState<string | null>(null);

  const workerRef = useRef<Worker | null>(null);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    void Promise.all([loadSettings(), loadDraftCode(), loadSnippets()]).then(
      ([loadedSettings, draftCode, loadedSnippets]) => {
        setSettings(loadedSettings);
        setCode(draftCode || DEFAULT_CODE);
        setSnippets(loadedSnippets);
      }
    );
  }, []);

  useEffect(() => {
    void saveDraftCode(code);
  }, [code]);

  useEffect(() => {
    void saveSettings(settings);
  }, [settings]);

  const clearWorker = useCallback(() => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    workerRef.current?.terminate();
    workerRef.current = null;
  }, []);

  useEffect(() => () => clearWorker(), [clearWorker]);

  const runCode = useCallback(() => {
    clearWorker();
    setRunning(true);
    setElapsed(null);
    setStatus("");

    const worker = new Worker(new URL("./runner.worker.ts", import.meta.url), {
      type: "module",
    });
    workerRef.current = worker;

    timeoutRef.current = window.setTimeout(() => {
      clearWorker();
      setRunning(false);
      setOutput((prev) => [
        ...prev,
        createLine("error", "Execution timed out after 5 seconds."),
      ]);
    }, RUN_TIMEOUT_MS);

    worker.onmessage = (event: MessageEvent<WorkerResult>) => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      const result = event.data;
      const lines = result.lines.map((line) => createLine(line.type, line.text));
      setOutput((prev) => [...prev, ...lines]);
      setElapsed(result.elapsed);
      setRunning(false);
      worker.terminate();
      workerRef.current = null;

      if (!result.ok) {
        setStatus("Runtime error");
      } else {
        setStatus(`Done in ${result.elapsed.toFixed(1)} ms`);
      }
    };

    worker.onerror = (err) => {
      clearWorker();
      setRunning(false);
      setOutput((prev) => [...prev, createLine("error", err.message || "Worker error")]);
      setStatus("Worker error");
    };

    worker.postMessage({ code });
  }, [clearWorker, code]);

  useEffect(() => {
    if (!settings.autoRun) return;
    const timer = window.setTimeout(() => runCode(), 500);
    return () => window.clearTimeout(timer);
  }, [code, settings.autoRun, runCode]);

  const clearConsole = useCallback(() => {
    setOutput([]);
    setElapsed(null);
    setStatus("");
  }, []);

  const resetCode = useCallback(() => {
    setCode(DEFAULT_CODE);
    setActiveSnippetId(null);
  }, []);

  const formatCode = useCallback(async () => {
    try {
      const formatted = await formatJavaScript(code);
      setCode(formatted);
      setStatus("Formatted");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Format failed");
    }
  }, [code]);

  const minifyCode = useCallback(() => {
    setCode(minifyJavaScript(code));
    setStatus("Minified");
  }, [code]);

  const saveSnippet = useCallback(
    (title?: string) => {
      const name = title?.trim() || `Snippet ${snippets.length + 1}`;
      const existing = activeSnippetId
        ? snippets.find((s) => s.id === activeSnippetId)
        : undefined;

      if (existing) {
        const next = snippets.map((s) =>
          s.id === existing.id
            ? { ...s, title: name, code, updatedAt: new Date().toISOString() }
            : s
        );
        setSnippets(next);
        void saveSnippets(next);
        setStatus("Snippet updated");
        return;
      }

      const snippet = createSnippet(name, code);
      const next = [snippet, ...snippets];
      setSnippets(next);
      void saveSnippets(next);
      setActiveSnippetId(snippet.id);
      setStatus("Snippet saved");
    },
    [activeSnippetId, code, snippets]
  );

  const openSnippet = useCallback((snippet: Snippet) => {
    setCode(snippet.code);
    setActiveSnippetId(snippet.id);
    setStatus(`Opened: ${snippet.title}`);
  }, []);

  const deleteSnippet = useCallback(
    (id: string) => {
      const next = snippets.filter((s) => s.id !== id);
      setSnippets(next);
      void saveSnippets(next);
      if (activeSnippetId === id) setActiveSnippetId(null);
    },
    [activeSnippetId, snippets]
  );

  const duplicateSnippet = useCallback(
    (snippet: Snippet) => {
      const copy = createSnippet(`${snippet.title} copy`, snippet.code, snippet.category);
      const next = [copy, ...snippets];
      setSnippets(next);
      void saveSnippets(next);
      setActiveSnippetId(copy.id);
    },
    [snippets]
  );

  const toggleFavorite = useCallback(
    (id: string) => {
      const next = snippets.map((s) =>
        s.id === id ? { ...s, isFavorite: !s.isFavorite, updatedAt: new Date().toISOString() } : s
      );
      setSnippets(next);
      void saveSnippets(next);
    },
    [snippets]
  );

  const loadExample = useCallback((exampleCode: string, title: string) => {
    setCode(exampleCode);
    setActiveSnippetId(null);
    setStatus(`Loaded: ${title}`);
  }, []);

  const copyCode = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setStatus("Code copied");
    } catch {
      setStatus("Copy failed");
    }
  }, [code]);

  const exportSnippetJs = useCallback(() => {
    const blob = new Blob([code], { type: "text/javascript" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "snippet.js";
    a.click();
    URL.revokeObjectURL(url);
    setStatus("Exported snippet.js");
  }, [code]);

  const exportAllSnippets = useCallback(() => {
    const blob = new Blob([exportSnippetsJson(snippets)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "pluto-snippets.json";
    a.click();
    URL.revokeObjectURL(url);
    setStatus("Exported snippets JSON");
  }, [snippets]);

  const importSnippets = useCallback(
    (raw: string) => {
      const imported = importSnippetsJson(raw);
      const next = [...imported, ...snippets];
      setSnippets(next);
      void saveSnippets(next);
      setStatus(`Imported ${imported.length} snippets`);
    },
    [snippets]
  );

  const updateTheme = useCallback((theme: EditorTheme) => {
    setSettings((s) => ({ ...s, theme }));
  }, []);

  const updateFontSize = useCallback((fontSize: number) => {
    setSettings((s) => ({ ...s, fontSize }));
  }, []);

  const updateLayout = useCallback((layout: LayoutMode) => {
    setSettings((s) => ({ ...s, layout }));
  }, []);

  const toggleAutoRun = useCallback(() => {
    setSettings((s) => ({ ...s, autoRun: !s.autoRun }));
  }, []);

  return {
    code,
    setCode,
    output,
    snippets,
    examples: exampleSnippets,
    settings,
    running,
    elapsed,
    status,
    activeSnippetId,
    runCode,
    clearConsole,
    resetCode,
    formatCode,
    minifyCode,
    saveSnippet,
    openSnippet,
    deleteSnippet,
    duplicateSnippet,
    toggleFavorite,
    loadExample,
    copyCode,
    exportSnippetJs,
    exportAllSnippets,
    importSnippets,
    updateTheme,
    updateFontSize,
    updateLayout,
    toggleAutoRun,
  };
}
