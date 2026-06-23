import { useCallback, useEffect, useMemo, useState } from "react";
import {
  buildSearchIndex,
  computeStats,
  copyText,
  formatJson,
  getSampleJson,
  getSuggestions,
  minifyJson,
  parseJsonError,
  searchJson,
} from "./jsonLogic";
import { loadDraft, loadRecentSearches, loadSettings, pushRecentSearch, saveDraft, saveSettings } from "./storage";
import type { JsonError, JsonLabSettings, JsonStats, MobileTab, SearchIndexItem, SearchMode } from "./types";

export function useJsonLab() {
  const [rawText, setRawText] = useState(getSampleJson());
  const [parsedData, setParsedData] = useState<unknown>(() => {
    try {
      return JSON.parse(getSampleJson());
    } catch {
      return null;
    }
  });
  const [isValid, setIsValid] = useState(true);
  const [error, setError] = useState<JsonError | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchMode, setSearchMode] = useState<SearchMode>("all");
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [settings, setSettings] = useState<JsonLabSettings>({ theme: "vs-dark", fontSize: 14 });
  const [status, setStatus] = useState("");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [mobileTab, setMobileTab] = useState<MobileTab>("editor");
  const [treeExpandAll, setTreeExpandAll] = useState<boolean | null>(null);

  useEffect(() => {
    void Promise.all([loadDraft(), loadSettings(), loadRecentSearches()]).then(
      ([draft, loadedSettings, searches]) => {
        const text = draft || getSampleJson();
        setRawText(text);
        try {
          setParsedData(JSON.parse(text));
          setIsValid(true);
          setError(null);
        } catch {
          setParsedData(null);
        }
        setSettings(loadedSettings);
        setRecentSearches(searches);
      }
    );
  }, []);

  const parseDocument = useCallback((text: string, formatOnSuccess = false) => {
    try {
      const data = JSON.parse(text);
      const formatted = formatOnSuccess ? formatJson(text) : text;
      if (formatOnSuccess && formatted !== text) {
        setRawText(formatted);
        void saveDraft(formatted);
      } else {
        void saveDraft(text);
      }
      setParsedData(data);
      setIsValid(true);
      setError(null);
      return true;
    } catch (err) {
      setParsedData(null);
      setIsValid(false);
      setError(parseJsonError(text, err));
      void saveDraft(text);
      return false;
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => parseDocument(rawText), 350);
    return () => window.clearTimeout(timer);
  }, [rawText, parseDocument]);

  const searchIndex = useMemo<SearchIndexItem[]>(() => {
    if (!isValid || parsedData === null || parsedData === undefined) return [];
    return buildSearchIndex(parsedData);
  }, [isValid, parsedData]);

  const stats = useMemo<JsonStats | null>(() => {
    if (!isValid || parsedData === null || parsedData === undefined) return null;
    return computeStats(parsedData, rawText);
  }, [isValid, parsedData, rawText]);

  const results = useMemo(() => searchJson(searchQuery, searchIndex, searchMode), [searchQuery, searchIndex, searchMode]);

  const suggestions = useMemo(
    () => getSuggestions(searchQuery, searchIndex, recentSearches),
    [searchQuery, searchIndex, recentSearches]
  );

  useEffect(() => {
    void saveSettings(settings);
  }, [settings]);

  const setText = useCallback((text: string) => {
    setRawText(text);
  }, []);

  const formatDocument = useCallback(() => {
    try {
      const formatted = formatJson(rawText);
      setRawText(formatted);
      parseDocument(formatted);
      setStatus("Formatted");
    } catch (err) {
      setError(parseJsonError(rawText, err));
      setStatus("Format failed");
    }
  }, [parseDocument, rawText]);

  const minifyDocument = useCallback(() => {
    try {
      const minified = minifyJson(rawText);
      setRawText(minified);
      parseDocument(minified);
      setStatus("Minified");
    } catch (err) {
      setError(parseJsonError(rawText, err));
      setStatus("Minify failed");
    }
  }, [parseDocument, rawText]);

  const clearDocument = useCallback(() => {
    setRawText("");
    setParsedData(null);
    setIsValid(false);
    setError(null);
    setSearchQuery("");
    setSelectedPath(null);
    void saveDraft("");
    setStatus("Cleared");
  }, []);

  const resetDocument = useCallback(() => {
    const sample = getSampleJson();
    setRawText(sample);
    parseDocument(sample, true);
    setSearchQuery("");
    setSelectedPath(null);
    setStatus("Reset to sample");
  }, [parseDocument]);

  const handlePasteFormat = useCallback(() => {
    parseDocument(rawText, true);
    setStatus("Pasted & formatted");
  }, [parseDocument, rawText]);

  const copyFormatted = useCallback(async () => {
    const ok = await copyText(isValid ? formatJson(rawText) : rawText);
    setStatus(ok ? "Copied formatted JSON" : "Copy failed");
  }, [isValid, rawText]);

  const copyMinified = useCallback(async () => {
    try {
      const ok = await copyText(minifyJson(rawText));
      setStatus(ok ? "Copied minified JSON" : "Copy failed");
    } catch {
      setStatus("Copy failed — invalid JSON");
    }
  }, [rawText]);

  const downloadJson = useCallback(() => {
    const blob = new Blob([rawText], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "data.json";
    a.click();
    URL.revokeObjectURL(url);
    setStatus("Downloaded data.json");
  }, [rawText]);

  const uploadJson = useCallback((text: string) => {
    setRawText(text);
    parseDocument(text, true);
    setStatus("Uploaded JSON");
  }, [parseDocument]);

  const applySearch = useCallback((query: string) => {
    setSearchQuery(query);
    void pushRecentSearch(query).then(setRecentSearches);
    setMobileTab("results");
  }, []);

  const copyPath = useCallback(async (path: string) => {
    const ok = await copyText(path);
    setStatus(ok ? `Copied path: ${path}` : "Copy failed");
  }, []);

  const copyValue = useCallback(async (value: unknown) => {
    const text = typeof value === "string" ? JSON.stringify(value) : JSON.stringify(value);
    const ok = await copyText(text);
    setStatus(ok ? "Copied value" : "Copy failed");
  }, []);

  const jumpToPath = useCallback((path: string) => {
    setSelectedPath(path);
    setTreeExpandAll(true);
    setMobileTab("tree");
  }, []);

  const toggleTheme = useCallback(() => {
    setSettings((s) => ({ ...s, theme: s.theme === "vs-dark" ? "light" : "vs-dark" }));
  }, []);

  const expandAll = useCallback(() => setTreeExpandAll(true), []);
  const collapseAll = useCallback(() => setTreeExpandAll(false), []);

  return {
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
    recentSearches,
    mobileTab,
    setMobileTab,
    treeExpandAll,
    searchIndex,
    stats,
    results,
    suggestions,
    formatDocument,
    minifyDocument,
    clearDocument,
    resetDocument,
    handlePasteFormat,
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
  };
}
