import { idbGetJson, idbSet } from "../../storage/indexedDb";

const RECENT_KEY = "converter:recent";
const FAVORITES_KEY = "converter:favorites";
const MAX_RECENT = 10;

export interface ConversionRecord {
  id: string;
  categoryId: string;
  fromUnitId: string;
  toUnitId: string;
  inputValue: string;
  result: string;
  label: string;
  timestamp: number;
}

export interface FavoritePair {
  id: string;
  categoryId: string;
  fromUnitId: string;
  toUnitId: string;
  label: string;
}

export async function loadRecent(): Promise<ConversionRecord[]> {
  return idbGetJson<ConversionRecord[]>(RECENT_KEY, []);
}

export async function saveRecent(record: ConversionRecord): Promise<ConversionRecord[]> {
  const existing = (await loadRecent()).filter(
    (r) =>
      !(
        r.categoryId === record.categoryId &&
        r.fromUnitId === record.fromUnitId &&
        r.toUnitId === record.toUnitId &&
        r.inputValue === record.inputValue
      )
  );
  const next = [record, ...existing].slice(0, MAX_RECENT);
  await idbSet(RECENT_KEY, next);
  return next;
}

export async function clearRecent(): Promise<void> {
  await idbSet(RECENT_KEY, []);
}

export async function loadFavorites(): Promise<FavoritePair[]> {
  return idbGetJson<FavoritePair[]>(FAVORITES_KEY, []);
}

export async function toggleFavorite(pair: Omit<FavoritePair, "id">): Promise<FavoritePair[]> {
  const favorites = await loadFavorites();
  const existing = favorites.find(
    (f) =>
      f.categoryId === pair.categoryId &&
      f.fromUnitId === pair.fromUnitId &&
      f.toUnitId === pair.toUnitId
  );

  if (existing) {
    const next = favorites.filter((f) => f.id !== existing.id);
    await idbSet(FAVORITES_KEY, next);
    return next;
  }

  const next = [{ ...pair, id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}` }, ...favorites];
  await idbSet(FAVORITES_KEY, next);
  return next;
}
