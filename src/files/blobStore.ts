import { getClientScopeId } from '../state/clientScope';

type BlobRecord = {
  fileId: string;
  blob: Blob;
  mimeType?: string;
  name: string;
  sizeBytes?: number;
  createdAt: string;
};

const STORE_NAME = 'blobs';
const DB_VERSION = 1;

function getDbName(): string {
  const scope = getClientScopeId();
  return scope ? `gbi:files:v1:${scope}` : 'gbi:files:v1';
}

function indexedDbAvailable(): boolean {
  return typeof window !== 'undefined' && typeof indexedDB !== 'undefined';
}

let dbPromise: Promise<IDBDatabase> | null = null;
let cachedDbName: string | null = null;

async function getDb(): Promise<IDBDatabase> {
  if (!indexedDbAvailable()) throw new Error('IndexedDB unavailable');
  const name = getDbName();
  if (dbPromise && cachedDbName === name) return dbPromise;

  cachedDbName = name;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(name, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'fileId' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('IndexedDB open failed'));
  });

  return dbPromise;
}

function runTx<T>(
  db: IDBDatabase,
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, mode);
    const store = tx.objectStore(STORE_NAME);
    const req = fn(store);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('IndexedDB request failed'));
  });
}

export async function putBlob(
  fileId: string,
  blob: Blob,
  meta: { mimeType?: string; name: string; sizeBytes?: number; createdAt?: string }
): Promise<void> {
  const db = await getDb();
  const record: BlobRecord = {
    fileId,
    blob,
    mimeType: meta.mimeType,
    name: meta.name,
    sizeBytes: meta.sizeBytes,
    createdAt: meta.createdAt ?? new Date().toISOString(),
  };
  await runTx(db, 'readwrite', (store) => store.put(record));
}

export async function getBlob(fileId: string): Promise<Blob | null> {
  const db = await getDb();
  const rec = await runTx<BlobRecord | undefined>(db, 'readonly', (store) => store.get(fileId));
  return rec?.blob ?? null;
}

export async function hasBlob(fileId: string): Promise<boolean> {
  const db = await getDb();
  const rec = await runTx<BlobRecord | undefined>(db, 'readonly', (store) => store.get(fileId));
  return Boolean(rec?.blob);
}

export async function deleteBlob(fileId: string): Promise<void> {
  const db = await getDb();
  await runTx(db, 'readwrite', (store) => store.delete(fileId));
}

export async function clearAllBlobs(): Promise<void> {
  const db = await getDb();
  await runTx(db, 'readwrite', (store) => store.clear());
}
