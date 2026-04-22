const DB_NAME = 'farabi-id-system';
const STORE_NAME = 'app_state';
const DB_VERSION = 1;

type StoredRecord<T> = {
  key: string;
  value: T;
};

function isBrowser() {
  return typeof window !== 'undefined';
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!isBrowser() || !('indexedDB' in window)) {
      reject(new Error('IndexedDB unavailable'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'key' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Failed to open IndexedDB'));
  });
}

export function readLocalJSON<T>(key: string, fallback: T): T {
  if (!isBrowser()) return fallback;

  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writeLocalJSON<T>(key: string, value: T): boolean {
  if (!isBrowser()) return false;

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function readLocalString(key: string): string | null {
  if (!isBrowser()) return null;

  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeLocalString(key: string, value: string) {
  if (!isBrowser()) return;

  try {
    window.localStorage.setItem(key, value);
  } catch {
    // ignore write failures for small session markers
  }
}

export function removeLocalValue(key: string) {
  if (!isBrowser()) return;

  try {
    window.localStorage.removeItem(key);
  } catch {
    // ignore remove failures
  }
}

export async function readIndexedJSON<T>(key: string, fallback: T): Promise<T> {
  try {
    const db = await openDatabase();

    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const request = tx.objectStore(STORE_NAME).get(key);

      request.onsuccess = () => resolve((request.result as StoredRecord<T> | undefined)?.value ?? fallback);
      request.onerror = () => reject(request.error ?? new Error('Failed to read IndexedDB'));
    });
  } catch {
    return readLocalJSON(key, fallback);
  }
}

export async function writeIndexedJSON<T>(key: string, value: T): Promise<boolean> {
  try {
    const db = await openDatabase();

    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put({ key, value } as StoredRecord<T>);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error('Failed to write IndexedDB'));
      tx.onabort = () => reject(tx.error ?? new Error('IndexedDB transaction aborted'));
    });

    removeLocalValue(key);
    return true;
  } catch {
    return writeLocalJSON(key, value);
  }
}