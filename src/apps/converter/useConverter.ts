import { useCallback, useEffect, useMemo, useState } from "react";
import { convertToAllUnits, convertValue, formatResult, searchUnits } from "./convertLogic";
import {
  loadFavorites,
  loadRecent,
  saveRecent,
  toggleFavorite,
  type ConversionRecord,
  type FavoritePair,
} from "./storage";
import { getCategory, getUnit, unitCategories } from "./unitCategories";

const DEFAULT_CATEGORY = "length";

export function useConverter() {
  const [categoryId, setCategoryId] = useState(DEFAULT_CATEGORY);
  const [fromUnitId, setFromUnitId] = useState("meter");
  const [toUnitId, setToUnitId] = useState("foot");
  const [inputValue, setInputValue] = useState("10");
  const [searchQuery, setSearchQuery] = useState("");
  const [showAllUnits, setShowAllUnits] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState("");
  const [recent, setRecent] = useState<ConversionRecord[]>([]);
  const [favorites, setFavorites] = useState<FavoritePair[]>([]);

  useEffect(() => {
    void loadRecent().then(setRecent);
    void loadFavorites().then(setFavorites);
  }, []);

  const category = getCategory(categoryId) ?? unitCategories[0];

  useEffect(() => {
    const cat = getCategory(categoryId);
    if (!cat) return;
    if (!cat.units.some((u) => u.id === fromUnitId)) {
      setFromUnitId(cat.units[0].id);
    }
    if (!cat.units.some((u) => u.id === toUnitId)) {
      setToUnitId(cat.units[1]?.id ?? cat.units[0].id);
    }
  }, [categoryId, fromUnitId, toUnitId]);

  const numericValue = useMemo(() => {
    const parsed = parseFloat(inputValue);
    return Number.isFinite(parsed) ? parsed : NaN;
  }, [inputValue]);

  const result = useMemo(() => {
    if (!Number.isFinite(numericValue)) return "";
    return formatResult(convertValue(numericValue, categoryId, fromUnitId, toUnitId));
  }, [numericValue, categoryId, fromUnitId, toUnitId]);

  const allResults = useMemo(() => {
    if (!showAllUnits || !Number.isFinite(numericValue)) return [];
    return convertToAllUnits(numericValue, categoryId, fromUnitId);
  }, [showAllUnits, numericValue, categoryId, fromUnitId]);

  const searchResults = useMemo(() => searchUnits(searchQuery), [searchQuery]);

  const favoriteActive = favorites.some(
    (f) => f.categoryId === categoryId && f.fromUnitId === fromUnitId && f.toUnitId === toUnitId
  );

  const recordConversion = useCallback(() => {
    if (!Number.isFinite(numericValue) || !result) return;
    const from = getUnit(categoryId, fromUnitId);
    const to = getUnit(categoryId, toUnitId);
    if (!from || !to) return;

    const label = `${inputValue} ${from.symbol} → ${result} ${to.symbol}`;
    const record: ConversionRecord = {
      id: `${Date.now()}`,
      categoryId,
      fromUnitId,
      toUnitId,
      inputValue,
      result,
      label,
      timestamp: Date.now(),
    };
    void saveRecent(record).then(setRecent);
  }, [categoryId, fromUnitId, inputValue, numericValue, result, toUnitId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (Number.isFinite(numericValue) && result) recordConversion();
    }, 600);
    return () => window.clearTimeout(timer);
  }, [numericValue, result, recordConversion]);

  const selectCategory = useCallback((id: string) => {
    const cat = getCategory(id);
    if (!cat) return;
    setCategoryId(id);
    setFromUnitId(cat.units[0].id);
    setToUnitId(cat.units[1]?.id ?? cat.units[0].id);
    setSearchQuery("");
  }, []);

  const applySearchMatch = useCallback((match: { categoryId: string; unitId: string }) => {
    const cat = getCategory(match.categoryId);
    if (!cat) return;
    setCategoryId(match.categoryId);
    setFromUnitId(match.unitId);
    if (match.unitId === toUnitId) {
      setToUnitId(cat.units.find((u) => u.id !== match.unitId)?.id ?? cat.units[0].id);
    }
    setSearchQuery("");
  }, [toUnitId]);

  const swapUnits = useCallback(() => {
    setFromUnitId(toUnitId);
    setToUnitId(fromUnitId);
    if (result && Number.isFinite(numericValue)) {
      setInputValue(result);
    }
  }, [fromUnitId, numericValue, result, toUnitId]);

  const reset = useCallback(() => {
    const cat = getCategory(categoryId) ?? unitCategories[0];
    setInputValue("");
    setFromUnitId(cat.units[0].id);
    setToUnitId(cat.units[1]?.id ?? cat.units[0].id);
    setShowAllUnits(false);
  }, [categoryId]);

  const copyResult = useCallback(async () => {
    const to = getUnit(categoryId, toUnitId);
    if (!result || !to) return;
    const text = `${result} ${to.symbol}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopyFeedback("Copied!");
      window.setTimeout(() => setCopyFeedback(""), 1500);
    } catch {
      setCopyFeedback("Copy failed");
      window.setTimeout(() => setCopyFeedback(""), 1500);
    }
  }, [categoryId, result, toUnitId]);

  const toggleFavoritePair = useCallback(() => {
    const from = getUnit(categoryId, fromUnitId);
    const to = getUnit(categoryId, toUnitId);
    if (!from || !to) return;
    void toggleFavorite({
      categoryId,
      fromUnitId,
      toUnitId,
      label: `${from.label} → ${to.label}`,
    }).then(setFavorites);
  }, [categoryId, fromUnitId, toUnitId]);

  const applyFavorite = useCallback((fav: FavoritePair) => {
    setCategoryId(fav.categoryId);
    setFromUnitId(fav.fromUnitId);
    setToUnitId(fav.toUnitId);
  }, []);

  const applyRecent = useCallback((record: ConversionRecord) => {
    setCategoryId(record.categoryId);
    setFromUnitId(record.fromUnitId);
    setToUnitId(record.toUnitId);
    setInputValue(record.inputValue);
  }, []);

  return {
    category,
    categoryId,
    fromUnitId,
    toUnitId,
    inputValue,
    setInputValue,
    setFromUnitId,
    setToUnitId,
    result,
    allResults,
    searchQuery,
    setSearchQuery,
    searchResults,
    showAllUnits,
    setShowAllUnits,
    copyFeedback,
    recent,
    favorites,
    favoriteActive,
    selectCategory,
    applySearchMatch,
    swapUnits,
    reset,
    copyResult,
    toggleFavoritePair,
    applyFavorite,
    applyRecent,
  };
}
