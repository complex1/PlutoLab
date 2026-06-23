import { useEffect, useRef } from "react";
import "@fortawesome/fontawesome-free/css/all.min.css";
import { cheatSheetSections } from "./cheatSheet";
import { exampleCategories } from "./examples";
import { useRegex } from "./useRegex";
import type { RegexFlag } from "./types";
import "./Regex.css";

const FLAG_LABELS: Record<RegexFlag, string> = {
  g: "global",
  i: "case-insensitive",
  m: "multiline",
  s: "dotAll",
  u: "unicode",
  y: "sticky",
  d: "indices",
};

const MOBILE_TABS = [
  { id: "text" as const, label: "Text" },
  { id: "matches" as const, label: "Matches" },
  { id: "replace" as const, label: "Replace" },
  { id: "library" as const, label: "Library" },
];

export default function Regex() {
  const uploadRef = useRef<HTMLInputElement>(null);
  const {
    pattern,
    setPatternRaw,
    flags,
    toggleFlag,
    flagOptions,
    sampleText,
    setSampleText,
    replacement,
    setReplacement,
    replaceMode,
    setReplaceMode,
    validation,
    matches,
    highlightSegments,
    replacedText,
    selectedMatchIndex,
    setSelectedMatchIndex,
    charCount,
    lineCount,
    explanations,
    savedPatterns,
    librarySearch,
    setLibrarySearch,
    examples,
    settings,
    status,
    mobileTab,
    setMobileTab,
    bottomPanel,
    toggleBottomPanel,
    testCases,
    testResults,
    addTestCase,
    removeTestCase,
    loadExample,
    clearAll,
    clearText,
    copyRegex,
    copyMatch,
    copyAllMatches,
    copyReplaced,
    applyReplaceToText,
    savePattern,
    openSaved,
    deleteSaved,
    duplicateSaved,
    toggleFavorite,
    exportLibrary,
    importLibrary,
    toggleTheme,
  } = useRegex();

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        savePattern();
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "l") {
        e.preventDefault();
        clearText();
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "c") {
        e.preventDefault();
        copyRegex();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [clearText, copyRegex, savePattern]);

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => importLibrary(String(reader.result));
    reader.readAsText(file);
    e.target.value = "";
  };

  const textPaneClass = `rx-pane rx-pane--text${mobileTab === "text" ? " rx-pane--active" : ""}`;
  const matchesPaneClass = `rx-pane rx-pane--matches${mobileTab === "matches" ? " rx-pane--active" : ""}`;
  const replacePaneClass = `rx-pane rx-pane--replace${mobileTab === "replace" ? " rx-pane--active" : ""}`;
  const libraryMobileClass = `rx-pane rx-pane--library-mobile${mobileTab === "library" ? " rx-pane--active" : ""}`;

  const emptyPattern = !pattern.trim();
  const emptyText = !sampleText.trim();

  return (
    <div className={`regex-tool regex-tool--${settings.theme}`}>
      <header className="rx-header">
        <div>
          <h1 className="rx-title">REGEX</h1>
          <p className="rx-tagline">Test, match, replace, and understand JavaScript regex.</p>
        </div>
        <div className="rx-header-actions">
          <button type="button" className="rx-btn" onClick={toggleTheme}>
            {settings.theme === "dark" ? "Light" : "Dark"}
          </button>
          <button type="button" className="rx-btn" onClick={clearAll}>Clear</button>
        </div>
      </header>

      <section className="rx-pattern-section" aria-label="Regex pattern">
        <div className="rx-pattern-row">
          <span className="rx-slash">/</span>
          <input
            type="text"
            className={`rx-pattern-input ${!validation.isValid ? "rx-pattern-input--error" : ""}`}
            placeholder="\\d+"
            value={pattern}
            onChange={(e) => setPatternRaw(e.target.value)}
            spellCheck={false}
            aria-label="Regex pattern"
          />
          <span className="rx-slash">/</span>
          <div className="rx-flags" role="group" aria-label="Regex flags">
            {flagOptions.map((flag) => (
              <button
                key={flag}
                type="button"
                className={`rx-flag ${flags.includes(flag) ? "active" : ""}`}
                onClick={() => toggleFlag(flag)}
                title={FLAG_LABELS[flag]}
                aria-pressed={flags.includes(flag)}
              >
                {flag}
              </button>
            ))}
          </div>
        </div>
        {!validation.isValid && validation.error && (
          <p className="rx-error" role="alert">
            <i className="fa-solid fa-circle-exclamation" /> {validation.error}
          </p>
        )}
        {validation.isValid && emptyPattern && (
          <p className="rx-hint">Enter a regex pattern to start matching.</p>
        )}
        {validation.isValid && !emptyPattern && matches.length === 0 && !emptyText && (
          <p className="rx-hint">No matches found. Try changing the pattern or flags.</p>
        )}
        {validation.isValid && !emptyPattern && matches.length > 0 && (
          <p className="rx-match-count">{matches.length} match{matches.length !== 1 ? "es" : ""} found</p>
        )}
      </section>

      <div className="rx-toolbar">
        <button
          type="button"
          className={`rx-btn ${replaceMode ? "rx-btn--active" : ""}`}
          onClick={() => setReplaceMode((v) => !v)}
        >
          <i className="fa-solid fa-right-left" /> Replace Mode
        </button>
        <button type="button" className="rx-btn" onClick={copyRegex}>
          <i className="fa-solid fa-copy" /> Copy Regex
        </button>
        <button type="button" className="rx-btn" onClick={() => savePattern()}>
          <i className="fa-solid fa-bookmark" /> Save
        </button>
        {matches.length > 0 && (
          <button type="button" className="rx-btn" onClick={copyAllMatches}>
            <i className="fa-solid fa-list" /> Copy Matches
          </button>
        )}
        {status && <span className="rx-status">{status}</span>}
      </div>

      <nav className="rx-mobile-tabs" aria-label="Mobile sections">
        {MOBILE_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`rx-mobile-tab ${mobileTab === tab.id ? "active" : ""}`}
            onClick={() => setMobileTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <div className="rx-body">
        <section className={textPaneClass} aria-label="Sample text">
            <div className="rx-pane-header">
              <h2>Sample Text</h2>
              <div className="rx-stats">
                <span>{charCount} chars</span>
                <span>{lineCount} lines</span>
              </div>
            </div>
            <div className="rx-text-wrap">
              <div className="rx-line-numbers" aria-hidden="true">
                {Array.from({ length: Math.max(lineCount, 1) }, (_, i) => (
                  <span key={i}>{i + 1}</span>
                ))}
              </div>
              <div className="rx-highlight-layer" aria-hidden="true">
                {highlightSegments.length > 0
                  ? highlightSegments.map((seg, i) => (
                      <span
                        key={i}
                        className={
                          seg.matchIndex >= 0
                            ? `rx-hl rx-hl--match${seg.isGroup ? " rx-hl--selected" : ""}`
                            : undefined
                        }
                      >
                        {seg.value}
                      </span>
                    ))
                  : sampleText}
              </div>
              <textarea
                className="rx-textarea"
                value={sampleText}
                onChange={(e) => setSampleText(e.target.value)}
                placeholder="Paste sample text to test your regex…"
                spellCheck={false}
              />
            </div>
            {emptyText && <p className="rx-hint rx-hint--pane">Paste sample text to test your regex.</p>}
        </section>

        <section className={matchesPaneClass} aria-label="Match results">
            <div className="rx-pane-header">
              <h2>Match Results</h2>
            </div>
            {matches.length === 0 ? (
              <p className="rx-empty">
                {emptyPattern ? "Enter a pattern first." : emptyText ? "Add sample text." : "No matches."}
              </p>
            ) : (
              <ul className="rx-match-list">
                {matches.map((match, i) => (
                  <li key={`${match.index}-${i}`}>
                    <div
                      role="button"
                      tabIndex={0}
                      className={`rx-match-card ${selectedMatchIndex === i ? "active" : ""}`}
                      onClick={() => setSelectedMatchIndex(i)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setSelectedMatchIndex(i);
                        }
                      }}
                    >
                      <div className="rx-match-card-head">
                        <strong>Match {i + 1}</strong>
                        <button
                          type="button"
                          className="rx-icon-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            copyMatch(match.value);
                          }}
                          aria-label="Copy match"
                        >
                          <i className="fa-solid fa-copy" />
                        </button>
                      </div>
                      <dl className="rx-match-details">
                        <div><dt>Value</dt><dd><code>{match.value}</code></dd></div>
                        <div><dt>Index</dt><dd>{match.index}</dd></div>
                        <div><dt>Length</dt><dd>{match.length}</dd></div>
                      </dl>
                      {match.groups.length > 0 && (
                        <div className="rx-groups">
                          <span className="rx-groups-label">Groups</span>
                          {match.groups.map((g, gi) => (
                            <span key={gi} className="rx-group-tag">
                              {gi + 1}: <code>{g ?? "undefined"}</code>
                            </span>
                          ))}
                        </div>
                      )}
                      {Object.keys(match.namedGroups).length > 0 && (
                        <div className="rx-groups">
                          <span className="rx-groups-label">Named</span>
                          {Object.entries(match.namedGroups).map(([name, val]) => (
                            <span key={name} className="rx-group-tag">
                              {name}: <code>{val}</code>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
        </section>

        {replaceMode && (
          <section className={replacePaneClass} aria-label="Replace">
            <div className="rx-pane-header">
              <h2>Replace</h2>
            </div>
            <label className="rx-label">
              Replacement
              <input
                type="text"
                className="rx-input"
                value={replacement}
                onChange={(e) => setReplacement(e.target.value)}
                placeholder="$1 or $&lt;name&gt;"
                spellCheck={false}
              />
            </label>
            <div className="rx-replace-preview">
              <span className="rx-replace-label">Preview</span>
              <pre className="rx-replace-output">{replacedText}</pre>
            </div>
            <div className="rx-replace-actions">
              <button type="button" className="rx-btn" onClick={copyReplaced}>
                <i className="fa-solid fa-copy" /> Copy Output
              </button>
              <button type="button" className="rx-btn rx-btn--primary" onClick={applyReplaceToText}>
                Apply to Text
              </button>
            </div>
          </section>
        )}

        <section className={libraryMobileClass} aria-label="Library">
            <LibraryPanel
              examples={examples}
              savedPatterns={savedPatterns}
              librarySearch={librarySearch}
              setLibrarySearch={setLibrarySearch}
              loadExample={loadExample}
              openSaved={openSaved}
              deleteSaved={deleteSaved}
              duplicateSaved={duplicateSaved}
            toggleFavorite={toggleFavorite}
          />
        </section>
      </div>

      <div className="rx-bottom-bar">
        <button
          type="button"
          className={`rx-btn rx-btn--sm ${bottomPanel === "library" ? "rx-btn--active" : ""}`}
          onClick={() => toggleBottomPanel("library")}
        >
          Common Patterns
        </button>
        <button
          type="button"
          className={`rx-btn rx-btn--sm ${bottomPanel === "cheatsheet" ? "rx-btn--active" : ""}`}
          onClick={() => toggleBottomPanel("cheatsheet")}
        >
          Cheat Sheet
        </button>
        <button
          type="button"
          className={`rx-btn rx-btn--sm ${bottomPanel === "explain" ? "rx-btn--active" : ""}`}
          onClick={() => toggleBottomPanel("explain")}
        >
          Explain
        </button>
        <button type="button" className="rx-btn rx-btn--sm" onClick={exportLibrary}>
          Export
        </button>
        <button type="button" className="rx-btn rx-btn--sm" onClick={() => uploadRef.current?.click()}>
          Import
        </button>
        <input ref={uploadRef} type="file" accept=".json" hidden onChange={handleImport} />
      </div>

      {bottomPanel && (
        <section className="rx-bottom-panel">
          {bottomPanel === "library" && (
            <LibraryPanel
              examples={examples}
              savedPatterns={savedPatterns}
              librarySearch={librarySearch}
              setLibrarySearch={setLibrarySearch}
              loadExample={loadExample}
              openSaved={openSaved}
              deleteSaved={deleteSaved}
              duplicateSaved={duplicateSaved}
              toggleFavorite={toggleFavorite}
            />
          )}
          {bottomPanel === "cheatsheet" && (
            <div className="rx-cheat-grid">
              {cheatSheetSections.map((section) => (
                <div key={section.title} className="rx-cheat-section">
                  <h3>{section.title}</h3>
                  <dl>
                    {section.items.map((item) => (
                      <div key={item.token} className="rx-cheat-item">
                        <dt><code>{item.token}</code></dt>
                        <dd>{item.meaning}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ))}
            </div>
          )}
          {bottomPanel === "explain" && (
            <div className="rx-explain">
              {explanations.length === 0 ? (
                <p className="rx-empty">Type a pattern to see token explanations.</p>
              ) : (
                <ul className="rx-explain-list">
                  {explanations.map((ex) => (
                    <li key={ex.token}>
                      <code>{ex.token}</code>
                      <span>→</span>
                      <span>{ex.meaning}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </section>
      )}

      <section className="rx-test-cases" aria-label="Test cases">
        <div className="rx-pane-header">
          <h2>Test Cases</h2>
          {testCases.length > 0 && (
            <span className="rx-test-summary">
              {testResults.passed} passed · {testResults.failed} failed
            </span>
          )}
        </div>
        <form
          className="rx-test-form"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const input = String(fd.get("input") ?? "").trim();
            if (!input) return;
            addTestCase(input, fd.get("shouldMatch") === "yes");
            e.currentTarget.reset();
          }}
        >
          <input name="input" className="rx-input" placeholder='Test input e.g. "Hello"' required />
          <select name="shouldMatch" className="rx-select" defaultValue="yes">
            <option value="yes">should match</option>
            <option value="no">should not match</option>
          </select>
          <button type="submit" className="rx-btn rx-btn--sm">Add</button>
        </form>
        {testResults.results.length > 0 && (
          <ul className="rx-test-list">
            {testResults.results.map((r, i) => (
              <li key={testCases[i]?.id ?? i} className={r.ok ? "pass" : "fail"}>
                <code>{r.input}</code>
                <span>{r.shouldMatch ? "should match" : "should not match"}</span>
                <span className="rx-test-actual">{r.actual ? "matched" : "no match"}</span>
                <button
                  type="button"
                  className="rx-icon-btn"
                  onClick={() => removeTestCase(testCases[i].id)}
                  aria-label="Remove test case"
                >
                  <i className="fa-solid fa-xmark" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

interface LibraryPanelProps {
  examples: ReturnType<typeof useRegex>["examples"];
  savedPatterns: ReturnType<typeof useRegex>["savedPatterns"];
  librarySearch: string;
  setLibrarySearch: (q: string) => void;
  loadExample: ReturnType<typeof useRegex>["loadExample"];
  openSaved: ReturnType<typeof useRegex>["openSaved"];
  deleteSaved: ReturnType<typeof useRegex>["deleteSaved"];
  duplicateSaved: ReturnType<typeof useRegex>["duplicateSaved"];
  toggleFavorite: ReturnType<typeof useRegex>["toggleFavorite"];
}

function LibraryPanel({
  examples,
  savedPatterns,
  librarySearch,
  setLibrarySearch,
  loadExample,
  openSaved,
  deleteSaved,
  duplicateSaved,
  toggleFavorite,
}: LibraryPanelProps) {
  return (
    <div className="rx-library">
      <input
        type="search"
        className="rx-search"
        placeholder="Search patterns…"
        value={librarySearch}
        onChange={(e) => setLibrarySearch(e.target.value)}
      />

      <div className="rx-library-grid">
        <div className="rx-library-col">
          <h3>Examples</h3>
          {exampleCategories.map((category) => (
            <div key={category} className="rx-lib-group">
              <span className="rx-lib-category">{category}</span>
              <ul>
                {examples
                  .filter((ex) => ex.category === category)
                  .map((ex) => (
                    <li key={ex.id}>
                      <button type="button" className="rx-lib-item" onClick={() => loadExample(ex)}>
                        {ex.title}
                      </button>
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="rx-library-col">
          <h3>Saved Patterns</h3>
          {savedPatterns.length === 0 ? (
            <p className="rx-empty">No saved patterns yet.</p>
          ) : (
            <ul className="rx-saved-list">
              {savedPatterns.map((p) => (
                <li key={p.id} className="rx-saved-item">
                  <button type="button" className="rx-lib-item" onClick={() => openSaved(p)}>
                    {p.title}
                  </button>
                  <div className="rx-saved-actions">
                    <button
                      type="button"
                      className={`rx-icon-btn ${p.isFavorite ? "active" : ""}`}
                      onClick={() => toggleFavorite(p.id)}
                      aria-label="Favorite"
                    >
                      <i className={`fa-${p.isFavorite ? "solid" : "regular"} fa-star`} />
                    </button>
                    <button type="button" className="rx-icon-btn" onClick={() => duplicateSaved(p)} aria-label="Duplicate">
                      <i className="fa-solid fa-copy" />
                    </button>
                    <button type="button" className="rx-icon-btn" onClick={() => deleteSaved(p.id)} aria-label="Delete">
                      <i className="fa-solid fa-trash" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
