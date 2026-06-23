const DB_NAME = "pluto-lab";
const DB_VERSION = 1;
const KV_STORE = "kv";

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(KV_STORE)) {
          db.createObjectStore(KV_STORE);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  return dbPromise;
}

function withStore<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(KV_STORE, mode);
        const req = fn(tx.objectStore(KV_STORE));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      })
  );
}

export async function idbGet<T>(key: string): Promise<T | undefined> {
  try {
    return (await withStore("readonly", (store) => store.get(key))) as T | undefined;
  } catch {
    return undefined;
  }
}

export async function idbSet<T>(key: string, value: T): Promise<void> {
  await withStore("readwrite", (store) => store.put(value, key));
}

export async function idbDelete(key: string): Promise<void> {
  await withStore("readwrite", (store) => store.delete(key));
}

export async function idbGetJson<T>(key: string, fallback: T): Promise<T> {
  const value = await idbGet<T>(key);
  return value ?? fallback;
}

export async function idbGetString(key: string, fallback = ""): Promise<string> {
  const value = await idbGet<string>(key);
  return value ?? fallback;
}

export async function idbGetNumber(key: string, fallback = 0): Promise<number> {
  const value = await idbGet<number>(key);
  return value ?? fallback;
}
