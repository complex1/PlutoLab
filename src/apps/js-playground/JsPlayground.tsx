import { useEffect, useRef } from "react";
import Editor from "@monaco-editor/react";
import "@fortawesome/fontawesome-free/css/all.min.css";
import { exampleCategories } from "./examples";
import { useJsPlayground } from "./useJsPlayground";
import "./JsPlayground.css";

function formatShortcut(shortcut: string) {
  const mod = /Mac|iPhone|iPad/.test(navigator.userAgent) ? "⌘" : "Ctrl";
  return shortcut.replace("Mod", mod);
}

export default function JsPlayground() {
  const importRef = useRef<HTMLInputElement>(null);
  const {
    code,
    setCode,
    output,
    snippets,
    examples,
    settings,
    running,
    elapsed,
    status,
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
  } = useJsPlayground();

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const inMonaco = target.closest(".monaco-editor");

      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        runCode();
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        saveSnippet();
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "l" && !inMonaco) {
        e.preventDefault();
        clearConsole();
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "f") {
        e.preventDefault();
        formatCode();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [clearConsole, formatCode, runCode, saveSnippet]);

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        importSnippets(String(reader.result));
      } catch {
        // ignore invalid file
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  return (
    <div className="js-playground">
      <header className="jsp-header">
        <div>
          <h1 className="jsp-title">Pluto JS Playground</h1>
          <p className="jsp-tagline">Write, run, and test JavaScript instantly in your browser.</p>
        </div>
        <div className="jsp-header-actions">
          <button type="button" className="jsp-btn" onClick={resetCode}>
            <i className="fa-solid fa-file" aria-hidden="true" /> New
          </button>
          <button type="button" className="jsp-btn" onClick={() => saveSnippet()}>
            <i className="fa-solid fa-floppy-disk" aria-hidden="true" /> Save
          </button>
          <button type="button" className="jsp-btn" onClick={formatCode}>
            <i className="fa-solid fa-wand-magic-sparkles" aria-hidden="true" /> Format
          </button>
          <button type="button" className="jsp-btn jsp-btn--primary" onClick={runCode} disabled={running}>
            <i className={`fa-solid ${running ? "fa-spinner fa-spin" : "fa-play"}`} aria-hidden="true" />
            {running ? "Running" : "Run"}
          </button>
        </div>
      </header>

      <div className="jsp-toolbar">
        <button type="button" className="jsp-btn jsp-btn--sm" onClick={clearConsole}>
          Clear Console
        </button>
        <button type="button" className="jsp-btn jsp-btn--sm" onClick={minifyCode}>
          Minify
        </button>
        <button type="button" className="jsp-btn jsp-btn--sm" onClick={copyCode}>
          Copy Code
        </button>
        <button type="button" className="jsp-btn jsp-btn--sm" onClick={exportSnippetJs}>
          Export .js
        </button>
        <button type="button" className="jsp-btn jsp-btn--sm" onClick={exportAllSnippets}>
          Export JSON
        </button>
        <button type="button" className="jsp-btn jsp-btn--sm" onClick={() => importRef.current?.click()}>
          Import JSON
        </button>
        <label className="jsp-toggle">
          <input type="checkbox" checked={settings.autoRun} onChange={toggleAutoRun} />
          Auto-run
        </label>
        <label className="jsp-control">
          Font
          <input
            type="range"
            min={12}
            max={20}
            value={settings.fontSize}
            onChange={(e) => updateFontSize(+e.target.value)}
          />
        </label>
        <button
          type="button"
          className="jsp-btn jsp-btn--sm"
          onClick={() => updateTheme(settings.theme === "vs-dark" ? "light" : "vs-dark")}
        >
          {settings.theme === "vs-dark" ? "Light Theme" : "Dark Theme"}
        </button>
        <button
          type="button"
          className="jsp-btn jsp-btn--sm"
          onClick={() => updateLayout(settings.layout === "vertical" ? "split" : "vertical")}
        >
          {settings.layout === "vertical" ? "Split View" : "Stacked View"}
        </button>
        {status && <span className="jsp-status">{status}</span>}
        {elapsed !== null && <span className="jsp-status">{elapsed.toFixed(1)} ms</span>}
      </div>

      <div className="jsp-body">
        <aside className="jsp-sidebar" aria-label="Snippets">
          <section className="jsp-side-section">
            <h2>Examples</h2>
            <ul className="jsp-snippet-list">
              {exampleCategories.map((category) => (
                <li key={category} className="jsp-snippet-group">
                  <span className="jsp-snippet-category">{category}</span>
                  <ul>
                    {examples
                      .filter((ex) => ex.category === category)
                      .map((ex) => (
                        <li key={ex.id}>
                          <button type="button" className="jsp-snippet-item" onClick={() => loadExample(ex.code, ex.title)}>
                            {ex.title}
                          </button>
                        </li>
                      ))}
                  </ul>
                </li>
              ))}
            </ul>
          </section>

          <section className="jsp-side-section">
            <h2>Saved Snippets</h2>
            {snippets.length === 0 ? (
              <p className="jsp-empty">No saved snippets yet.</p>
            ) : (
              <ul className="jsp-snippet-list jsp-snippet-list--flat">
                {snippets.map((snippet) => (
                  <li key={snippet.id} className="jsp-saved-item">
                    <button type="button" className="jsp-snippet-item" onClick={() => openSnippet(snippet)}>
                      {snippet.title}
                    </button>
                    <div className="jsp-saved-actions">
                      <button
                        type="button"
                        className={`jsp-icon-btn ${snippet.isFavorite ? "active" : ""}`}
                        onClick={() => toggleFavorite(snippet.id)}
                        aria-label="Toggle favorite"
                      >
                        <i className={`fa-${snippet.isFavorite ? "solid" : "regular"} fa-star`} />
                      </button>
                      <button type="button" className="jsp-icon-btn" onClick={() => duplicateSnippet(snippet)} aria-label="Duplicate">
                        <i className="fa-solid fa-copy" />
                      </button>
                      <button type="button" className="jsp-icon-btn" onClick={() => deleteSnippet(snippet.id)} aria-label="Delete">
                        <i className="fa-solid fa-trash" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>

        <div className={`jsp-workspace jsp-workspace--${settings.layout}`}>
          <section className="jsp-editor-pane" aria-label="Code editor">
            <Editor
              height="100%"
              defaultLanguage="javascript"
              theme={settings.theme}
              value={code}
              onChange={(value) => setCode(value ?? "")}
              options={{
                fontSize: settings.fontSize,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: 2,
                wordWrap: "on",
                bracketPairColorization: { enabled: true },
                folding: true,
                lineNumbers: "on",
              }}
            />
          </section>

          <section className="jsp-console-pane" aria-label="Console output">
            <div className="jsp-console-header">
              <h2>Console</h2>
              <span className="jsp-shortcut-hint">{formatShortcut("Mod+Enter")} run</span>
            </div>
            <div className="jsp-console-output">
              {output.length === 0 ? (
                <p className="jsp-console-empty">Run your code to see output here.</p>
              ) : (
                output.map((line) => (
                  <div key={line.id} className={`jsp-console-line jsp-console-line--${line.type}`}>
                    <span className="jsp-console-prefix">
                      {line.type === "error" ? "✖" : line.type === "warn" ? "!" : ">"}
                    </span>
                    <pre>{line.text}</pre>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </div>

      <input ref={importRef} type="file" accept="application/json,.json" hidden onChange={handleImport} />
    </div>
  );
}
