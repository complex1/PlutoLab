import { useEffect, useMemo, useRef } from "react";
import Editor from "@monaco-editor/react";
import "@fortawesome/fontawesome-free/css/all.min.css";
import { formatBytes, formatDisplayValue } from "./jsonLogic";
import JsonTree from "./JsonTree";
import { useJsonLab } from "./useJsonLab";
import type { SearchMode } from "./types";
import "./JsonLab.css";

const SEARCH_MODES: { id: SearchMode; label: string }[] = [
  { id: "all", label: "All" },
  { id: "keys", label: "Keys" },
  { id: "values", label: "Values" },
  { id: "paths", label: "Paths" },
  { id: "types", label: "Types" },
];

function formatShortcut(shortcut: string) {
  const mod = /Mac|iPhone|iPad/.test(navigator.userAgent) ? "⌘" : "Ctrl";
  return shortcut.replace("Mod", mod);
}

export default function JsonLab() {
  const uploadRef = useRef<HTMLInputElement>(null);
  const {
    rawText,
    setText,
    parsedData,
    isValid,
    error,
    searchQuery,
    setSearchQuery,
    searchMode,
    setSearchMode,
    selectedPath,
    setSelectedPath,
    settings,
    status,
    mobileTab,
    setMobileTab,
    treeExpandAll,
    stats,
    results,
    suggestions,
    formatDocument,
    minifyDocument,
    clearDocument,
    resetDocument,
    copyFormatted,
    copyMinified,
    downloadJson,
    uploadJson,
    applySearch,
    copyPath,
    copyValue,
    jumpToPath,
    toggleTheme,
    expandAll,
    collapseAll,
    parseDocument,
  } = useJsonLab();

  const highlightPaths = useMemo(() => new Set(results.map((r) => r.path)), [results]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "f") {
        e.preventDefault();
        formatDocument();
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "m") {
        e.preventDefault();
        minifyDocument();
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        downloadJson();
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "l") {
        e.preventDefault();
        clearDocument();
      }
      if (e.key === "Escape") {
        setSearchQuery("");
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [clearDocument, downloadJson, formatDocument, minifyDocument, setSearchQuery]);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => uploadJson(String(reader.result));
    reader.readAsText(file);
    e.target.value = "";
  };

  return (
    <div className="json-lab">
      <header className="jl-header">
        <div>
          <h1 className="jl-title">JSON Lab</h1>
          <p className="jl-tagline">Paste. Format. Search. Understand JSON instantly.</p>
        </div>
        <div className="jl-header-actions">
          <button type="button" className="jl-btn" onClick={toggleTheme}>
            {settings.theme === "vs-dark" ? "Light" : "Dark"}
          </button>
          <button type="button" className="jl-btn" onClick={clearDocument}>Clear</button>
        </div>
      </header>

      <div className="jl-toolbar">
        <button type="button" className="jl-btn" onClick={formatDocument}>
          <i className="fa-solid fa-wand-magic-sparkles" /> Format
        </button>
        <button type="button" className="jl-btn" onClick={minifyDocument}>
          <i className="fa-solid fa-compress" /> Minify
        </button>
        <button type="button" className="jl-btn" onClick={copyFormatted}>
          <i className="fa-solid fa-copy" /> Copy
        </button>
        <button type="button" className="jl-btn" onClick={copyMinified}>
          Copy Minified
        </button>
        <button type="button" className="jl-btn" onClick={downloadJson}>
          <i className="fa-solid fa-download" /> Download
        </button>
        <button type="button" className="jl-btn" onClick={() => uploadRef.current?.click()}>
          <i className="fa-solid fa-upload" /> Upload
        </button>
        <button type="button" className="jl-btn" onClick={resetDocument}>Reset</button>
        <button type="button" className="jl-btn" onClick={expandAll}>Expand All</button>
        <button type="button" className="jl-btn" onClick={collapseAll}>Collapse All</button>
        {status && <span className="jl-status">{status}</span>}
      </div>

      <div className={`jl-validity ${isValid ? "valid" : "invalid"}`}>
        {isValid ? (
          <>
            <i className="fa-solid fa-circle-check" />
            <span>Valid JSON</span>
            {stats && (
              <span className="jl-validity-meta">
                {stats.totalKeys} keys · depth {stats.maxDepth} · {formatBytes(stats.size)}
              </span>
            )}
          </>
        ) : (
          <>
            <i className="fa-solid fa-circle-xmark" />
            <span>Invalid JSON</span>
            {error && (
              <span className="jl-validity-meta">
                Line {error.line}, column {error.column}: {error.message}
              </span>
            )}
          </>
        )}
      </div>

      {!isValid && error && (
        <div className="jl-error-box" role="alert">
          <strong>{error.message}</strong>
          <p>Line {error.line}, column {error.column}</p>
          <p className="jl-error-hint">{error.hint}</p>
        </div>
      )}

      <nav className="jl-mobile-tabs" aria-label="Panels">
        {(["editor", "tree", "results", "stats"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            className={mobileTab === tab ? "active" : ""}
            onClick={() => setMobileTab(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </nav>

      <div className="jl-main">
        <section className={`jl-pane jl-pane--editor ${mobileTab === "editor" ? "mobile-active" : ""}`}>
          <Editor
            height="100%"
            language="json"
            theme={settings.theme}
            value={rawText}
            onChange={(value) => setText(value ?? "")}
            onMount={(editor) => {
              editor.onDidPaste(() => {
                window.setTimeout(() => parseDocument(editor.getValue(), true), 0);
              });
            }}
            options={{
              fontSize: settings.fontSize,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              automaticLayout: true,
              wordWrap: "on",
              lineNumbers: "on",
              formatOnPaste: false,
            }}
          />
        </section>

        <section className={`jl-pane jl-pane--tree ${mobileTab === "tree" ? "mobile-active" : ""}`}>
          <div className="jl-pane-header">
            <h2>Tree Viewer</h2>
            {selectedPath && <code className="jl-path-chip">{selectedPath}</code>}
          </div>
          <div className="jl-pane-body">
            {isValid && parsedData !== null ? (
              <JsonTree
                data={parsedData}
                selectedPath={selectedPath}
                highlightPaths={highlightPaths}
                expandAll={treeExpandAll}
                onSelectPath={setSelectedPath}
                onCopyPath={copyPath}
                onCopyValue={copyValue}
              />
            ) : (
              <p className="jl-empty">Fix JSON errors to explore the tree.</p>
            )}
          </div>
        </section>
      </div>

      <section className={`jl-search-panel ${mobileTab === "results" ? "mobile-active" : ""}`}>
        <h2>Search JSON</h2>
        <div className="jl-search-row">
          <input
            type="search"
            className="jl-search-input"
            placeholder="Search key, value, path, or type:number"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && searchQuery.trim()) applySearch(searchQuery);
            }}
          />
          <button type="button" className="jl-btn jl-btn--primary" onClick={() => applySearch(searchQuery)}>
            Search
          </button>
        </div>

        <div className="jl-mode-chips">
          {SEARCH_MODES.map((mode) => (
            <button
              key={mode.id}
              type="button"
              className={`jl-chip ${searchMode === mode.id ? "active" : ""}`}
              onClick={() => setSearchMode(mode.id)}
            >
              {mode.label}
            </button>
          ))}
        </div>

        {suggestions.length > 0 && (
          <div className="jl-suggestions">
            <span className="jl-suggestions-label">Suggestions</span>
            <div className="jl-suggestion-list">
              {suggestions.map((suggestion) => (
                <button key={suggestion} type="button" className="jl-suggestion" onClick={() => applySearch(suggestion)}>
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="jl-results-header">
          <span>{results.length} match{results.length === 1 ? "" : "es"} found</span>
          <span className="jl-shortcut">{formatShortcut("Mod+Shift+F")} format</span>
        </div>

        <ul className="jl-results-list">
          {results.length === 0 ? (
            <li className="jl-empty">No results yet. Try `user.name`, `type:string`, or a value.</li>
          ) : (
            results.map((item) => (
              <li key={item.path} className="jl-result-item">
                <div className="jl-result-main">
                  <code>{item.path}</code>
                  <span className="jl-result-meta">
                    key: <strong>{item.key}</strong> · type: <strong>{item.type}</strong>
                  </span>
                  <span className="jl-result-value">{formatDisplayValue(item.value)}</span>
                </div>
                <div className="jl-result-actions">
                  <button type="button" onClick={() => jumpToPath(item.path)} title="Jump to tree">
                    <i className="fa-solid fa-arrow-up-right-from-square" />
                  </button>
                  <button type="button" onClick={() => copyPath(item.path)} title="Copy path">
                    <i className="fa-solid fa-route" />
                  </button>
                  <button type="button" onClick={() => copyValue(item.value)} title="Copy value">
                    <i className="fa-solid fa-copy" />
                  </button>
                </div>
              </li>
            ))
          )}
        </ul>
      </section>

      <section className={`jl-stats-panel ${mobileTab === "stats" ? "mobile-active" : ""}`}>
        <h2>JSON Stats</h2>
        {!stats ? (
          <p className="jl-empty">Stats appear when JSON is valid.</p>
        ) : (
          <dl className="jl-stats-grid">
            <div><dt>File size</dt><dd>{formatBytes(stats.size)}</dd></div>
            <div><dt>Root type</dt><dd>{stats.rootType}</dd></div>
            <div><dt>Total keys</dt><dd>{stats.totalKeys}</dd></div>
            <div><dt>Total values</dt><dd>{stats.totalValues}</dd></div>
            <div><dt>Objects</dt><dd>{stats.totalObjects}</dd></div>
            <div><dt>Arrays</dt><dd>{stats.totalArrays}</dd></div>
            <div><dt>Strings</dt><dd>{stats.totalStrings}</dd></div>
            <div><dt>Numbers</dt><dd>{stats.totalNumbers}</dd></div>
            <div><dt>Booleans</dt><dd>{stats.totalBooleans}</dd></div>
            <div><dt>Nulls</dt><dd>{stats.totalNulls}</dd></div>
            <div><dt>Max depth</dt><dd>{stats.maxDepth}</dd></div>
          </dl>
        )}
      </section>

      <input ref={uploadRef} type="file" accept="application/json,.json" hidden onChange={handleUpload} />
    </div>
  );
}
