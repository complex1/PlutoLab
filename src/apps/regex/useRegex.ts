import { useCallback, useEffect, useMemo, useState } from "react";
import { regexExamples } from "./examples";
import { explainPattern } from "./explain";
import {
  buildHighlightSegments,
  countLines,
  formatRegexForCopy,
  getMatches,
  normalizeFlags,
  parsePatternInput,
  replaceText,
  runTestCases,
  toggleFlag,
  validateRegex,
} from "./regexLogic";
import {
  createSavedRegex,
  exportPatternsJson,
  importPatternsJson,
  loadDraft,
  loadSavedPatterns,
  loadSettings,
  saveDraft,
  saveSavedPatterns,
  saveSettings,
} from "./storage";
import type {
  BottomPanel,
  MobileTab,
  RegexExample,
  RegexFlag,
  RegexSettings,
  RegexTestCase,
  SavedRegex,
} from "./types";

const FLAGS: RegexFlag[] = ["g", "i", "m", "s", "u", "y", "d"];

export function useRegex() {
  const [pattern, setPattern] = useState("\\d+");
  const [flags, setFlags] = useState("g");
  const [sampleText, setSampleText] = useState("Order ID: 12345\nPrice: 999");
  const [replacement, setReplacement] = useState("");
  const [replaceMode, setReplaceMode] = useState(false);
  const [selectedMatchIndex, setSelectedMatchIndex] = useState<number | null>(null);
  const [savedPatterns, setSavedPatterns] = useState<SavedRegex[]>([]);
  const [librarySearch, setLibrarySearch] = useState("");
  const [settings, setSettings] = useState<RegexSettings>({ theme: "dark" });
  const [status, setStatus] = useState("");
  const [mobileTab, setMobileTab] = useState<MobileTab>("text");
  const [bottomPanel, setBottomPanel] = useState<BottomPanel>("library");
  const [testCases, setTestCases] = useState<RegexTestCase[]>([]);

  useEffect(() => {
    void Promise.all([loadDraft(), loadSavedPatterns(), loadSettings()]).then(
      ([draft, patterns, loadedSettings]) => {
        setPattern(draft.pattern);
        setFlags(draft.flags);
        setSampleText(draft.sampleText);
        setReplacement(draft.replacement);
        setSavedPatterns(patterns);
        setSettings(loadedSettings);
      }
    );
  }, []);

  const validation = useMemo(() => validateRegex(pattern, flags), [pattern, flags]);
  const matches = useMemo(() => {
    if (!validation.isValid || !pattern.trim()) return [];
    return getMatches(pattern, flags, sampleText);
  }, [pattern, flags, sampleText, validation.isValid]);

  const highlightSegments = useMemo(
    () => buildHighlightSegments(sampleText, matches, selectedMatchIndex),
    [sampleText, matches, selectedMatchIndex]
  );

  const replacedText = useMemo(() => {
    if (!replaceMode || !pattern.trim()) return sampleText;
    return replaceText(pattern, flags, sampleText, replacement);
  }, [replaceMode, pattern, flags, sampleText, replacement]);

  const explanations = useMemo(() => explainPattern(pattern), [pattern]);
  const charCount = sampleText.length;
  const lineCount = countLines(sampleText);

  const testResults = useMemo(
    () => runTestCases(pattern, flags, testCases),
    [pattern, flags, testCases]
  );

  const filteredSaved = useMemo(() => {
    const q = librarySearch.trim().toLowerCase();
    return savedPatterns.filter((p) => {
      if (!q) return true;
      return (
        p.title.toLowerCase().includes(q) ||
        p.pattern.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [savedPatterns, librarySearch]);

  useEffect(() => {
    void saveDraft({ pattern, flags, sampleText, replacement });
  }, [pattern, flags, sampleText, replacement]);

  useEffect(() => {
    if (selectedMatchIndex !== null && selectedMatchIndex >= matches.length) {
      setSelectedMatchIndex(null);
    }
  }, [matches.length, selectedMatchIndex]);

  const setPatternRaw = useCallback((raw: string) => {
    const parsed = parsePatternInput(raw);
    if (parsed.flags) {
      setFlags(normalizeFlags(parsed.flags));
    }
    setPattern(parsed.pattern);
  }, []);

  const toggleFlagHandler = useCallback((flag: RegexFlag) => {
    setFlags((f) => toggleFlag(f, flag));
  }, []);

  const loadExample = useCallback((example: RegexExample) => {
    setPattern(example.pattern);
    setFlags(example.flags);
    setSampleText(example.sampleText);
    setStatus(`Loaded: ${example.title}`);
  }, []);

  const clearAll = useCallback(() => {
    setPattern("");
    setFlags("g");
    setSampleText("");
    setReplacement("");
    setSelectedMatchIndex(null);
    setStatus("Cleared");
  }, []);

  const clearText = useCallback(() => {
    setSampleText("");
    setStatus("Text cleared");
  }, []);

  const copyRegex = useCallback(async () => {
    const code = formatRegexForCopy(pattern, flags);
    await navigator.clipboard.writeText(code);
    setStatus("Copied regex");
  }, [pattern, flags]);

  const copyMatch = useCallback(async (value: string) => {
    await navigator.clipboard.writeText(value);
    setStatus("Copied match");
  }, []);

  const copyAllMatches = useCallback(async () => {
    await navigator.clipboard.writeText(matches.map((m) => m.value).join("\n"));
    setStatus(`Copied ${matches.length} matches`);
  }, [matches]);

  const copyReplaced = useCallback(async () => {
    await navigator.clipboard.writeText(replacedText);
    setStatus("Copied replaced text");
  }, [replacedText]);

  const applyReplaceToText = useCallback(() => {
    setSampleText(replacedText);
    setReplaceMode(false);
    setStatus("Applied replacement");
  }, [replacedText]);

  const savePattern = useCallback(
    (title?: string) => {
      const name = title?.trim() || `Pattern ${savedPatterns.length + 1}`;
      const saved = createSavedRegex(name, pattern, flags, sampleText);
      const next = [saved, ...savedPatterns];
      setSavedPatterns(next);
      void saveSavedPatterns(next);
      setStatus("Pattern saved");
    },
    [pattern, flags, sampleText, savedPatterns]
  );

  const openSaved = useCallback((saved: SavedRegex) => {
    setPattern(saved.pattern);
    setFlags(saved.flags);
    setSampleText(saved.sampleText);
    setStatus(`Opened: ${saved.title}`);
  }, []);

  const deleteSaved = useCallback(
    (id: string) => {
      const next = savedPatterns.filter((p) => p.id !== id);
      setSavedPatterns(next);
      void saveSavedPatterns(next);
      setStatus("Deleted");
    },
    [savedPatterns]
  );

  const duplicateSaved = useCallback(
    (saved: SavedRegex) => {
      const copy = createSavedRegex(
        `${saved.title} copy`,
        saved.pattern,
        saved.flags,
        saved.sampleText,
        saved.description,
        saved.tags
      );
      const next = [copy, ...savedPatterns];
      setSavedPatterns(next);
      void saveSavedPatterns(next);
      setStatus("Duplicated");
    },
    [savedPatterns]
  );

  const toggleFavorite = useCallback(
    (id: string) => {
      const next = savedPatterns.map((p) =>
        p.id === id ? { ...p, isFavorite: !p.isFavorite, updatedAt: new Date().toISOString() } : p
      );
      setSavedPatterns(next);
      void saveSavedPatterns(next);
    },
    [savedPatterns]
  );

  const exportLibrary = useCallback(() => {
    const blob = new Blob([exportPatternsJson(savedPatterns)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "pluto-regex-library.json";
    a.click();
    URL.revokeObjectURL(a.href);
    setStatus("Exported library");
  }, [savedPatterns]);

  const importLibrary = useCallback(
    (raw: string) => {
      const imported = importPatternsJson(raw);
      const next = [...imported, ...savedPatterns];
      setSavedPatterns(next);
      void saveSavedPatterns(next);
      setStatus(`Imported ${imported.length} patterns`);
    },
    [savedPatterns]
  );

  const toggleTheme = useCallback(() => {
    setSettings((s) => {
      const next = { theme: s.theme === "dark" ? "light" : "dark" } as RegexSettings;
      void saveSettings(next);
      return next;
    });
  }, []);

  const toggleBottomPanel = useCallback((panel: BottomPanel) => {
    setBottomPanel((p) => (p === panel ? null : panel));
  }, []);

  const addTestCase = useCallback((input: string, shouldMatch: boolean) => {
    setTestCases((tc) => [
      ...tc,
      { id: `tc_${Date.now()}`, input, shouldMatch },
    ]);
  }, []);

  const removeTestCase = useCallback((id: string) => {
    setTestCases((tc) => tc.filter((c) => c.id !== id));
  }, []);

  return {
    pattern,
    setPattern,
    setPatternRaw,
    flags,
    toggleFlag: toggleFlagHandler,
    flagOptions: FLAGS,
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
    savedPatterns: filteredSaved,
    librarySearch,
    setLibrarySearch,
    examples: regexExamples,
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
  };
}
