import type { OfflineTransaction, SyncState } from './types';
import type { TransactionStore } from './store';

const DB_NAME = 'arp-offline-pos';
const DB_VERSION = 1;
const STORE_NAME = 'transactions';
const STATE_INDEX = 'by-state';

/**
 * IndexedDB-backed TransactionStore.
 *
 * Each operation runs inside its own `readwrite` transaction on the
 * `transactions` object store (keyPath = clientTransactionId), so every
 * mutation is atomic and durable. IndexedDB is available in both the browser
 * and the Electron renderer (Chromium), which is why it was chosen over
 * localStorage (no per-record atomicity) and SQLite (native module / no web
 * support). See docs/web/OFFLINE_ARCHITECTURE.md.
 */
export class IdbTransactionStore implements TransactionStore {
  private readonly factory: IDBFactory;
  private readonly dbName: string;
  private dbPromise: Promise<IDBDatabase> | null = null;

  constructor(factory?: IDBFactory, dbName = DB_NAME) {
    const resolved = factory ?? globalThis.indexedDB;
    if (!resolved) {
      throw new Error('IndexedDB is not available in this environment');
    }
    this.factory = resolved;
    this.dbName = dbName;
  }

  private db(): Promise<IDBDatabase> {
    this.dbPromise ??= new Promise<IDBDatabase>((resolve, reject) => {
      const request = this.factory.open(this.dbName, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'clientTransactionId' });
          store.createIndex(STATE_INDEX, 'state', { unique: false });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error('Failed to open offline database'));
      request.onblocked = () =>
        reject(new Error('Offline database upgrade blocked by another connection'));
    });
    return this.dbPromise;
  }

  async get(clientTransactionId: string): Promise<OfflineTransaction | undefined> {
    const db = await this.db();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const request = transaction.objectStore(STORE_NAME).get(clientTransactionId);
      request.onsuccess = () => resolve(request.result as OfflineTransaction | undefined);
      request.onerror = () => reject(request.error ?? new Error('Offline store read failed'));
    });
  }

  async add(transactionRecord: OfflineTransaction): Promise<'inserted' | 'exists'> {
    const db = await this.db();
    return new Promise((resolve, reject) => {
      const idbTx = db.transaction(STORE_NAME, 'readwrite');
      const request = idbTx.objectStore(STORE_NAME).add(transactionRecord);
      request.onsuccess = () => resolve('inserted');
      request.onerror = () => {
        // ConstraintError = key already present → dedupe path.
        if (request.error?.name === 'ConstraintError') {
          resolve('exists');
        } else {
          reject(request.error ?? new Error('Offline store insert failed'));
        }
      };
    });
  }

  async put(transactionRecord: OfflineTransaction): Promise<void> {
    const db = await this.db();
    return new Promise((resolve, reject) => {
      const idbTx = db.transaction(STORE_NAME, 'readwrite');
      const request = idbTx.objectStore(STORE_NAME).put(transactionRecord);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error ?? new Error('Offline store write failed'));
    });
  }

  async mutate(
    clientTransactionId: string,
    mutateFn: (current: OfflineTransaction | undefined) => OfflineTransaction | undefined,
  ): Promise<OfflineTransaction | undefined> {
    const db = await this.db();
    return new Promise((resolve, reject) => {
      const idbTx = db.transaction(STORE_NAME, 'readwrite');
      const objectStore = idbTx.objectStore(STORE_NAME);
      let outcome: OfflineTransaction | undefined;

      const getReq = objectStore.get(clientTransactionId);
      getReq.onsuccess = () => {
        const current = getReq.result as OfflineTransaction | undefined;
        try {
          const next = mutateFn(current);
          outcome = next;
          if (next !== undefined) {
            // The put is enqueued inside the same transaction, so the read,
            // validation and write commit atomically.
            objectStore.put(next);
          }
        } catch (error) {
          idbTx.abort();
          reject(error instanceof Error ? error : new Error(String(error)));
        }
      };
      getReq.onerror = () => {
        reject(getReq.error ?? new Error('Offline store read failed'));
      };

      idbTx.oncomplete = () => resolve(outcome);
      idbTx.onerror = () => reject(idbTx.error ?? new Error('Offline store mutation failed'));
      idbTx.onabort = () => reject(idbTx.error ?? new Error('Offline store mutation aborted'));
    });
  }

  async getAll(): Promise<OfflineTransaction[]> {
    const db = await this.db();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const request = transaction.objectStore(STORE_NAME).getAll();
      request.onsuccess = () => resolve(request.result as OfflineTransaction[]);
      request.onerror = () => reject(request.error ?? new Error('Offline store read failed'));
    });
  }

  async getByState(state: SyncState): Promise<OfflineTransaction[]> {
    const db = await this.db();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const request = transaction.objectStore(STORE_NAME).index(STATE_INDEX).getAll(state);
      request.onsuccess = () => resolve(request.result as OfflineTransaction[]);
      request.onerror = () => reject(request.error ?? new Error('Offline store index read failed'));
    });
  }
}

/** Shared singleton for the renderer process. */
let sharedStore: IdbTransactionStore | null = null;

export function getOfflineStore(): IdbTransactionStore {
  sharedStore ??= new IdbTransactionStore();
  return sharedStore;
}
