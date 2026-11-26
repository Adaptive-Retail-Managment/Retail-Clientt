import type { OfflineTransaction, SyncState } from './types';

/**
 * Storage port for the offline transaction queue.
 *
 * Implementations must guarantee that each method call is atomic with respect
 * to a single record: a state transition is one durable write, never a
 * read-modify-write across the whole collection.
 */
export interface TransactionStore {
  /** Returns the record or undefined. */
  get(clientTransactionId: string): Promise<OfflineTransaction | undefined>;
  /**
   * Atomic insert. Returns 'inserted' on success or 'exists' when a record
   * with the same clientTransactionId is already stored — the caller must
   * then read and return the existing record (deduplication).
   */
  add(transaction: OfflineTransaction): Promise<'inserted' | 'exists'>;
  /** Atomic upsert of a single record. */
  put(transaction: OfflineTransaction): Promise<void>;
  /**
   * Atomic read-modify-write of a single record inside ONE readwrite
   * transaction: the current record is read, `mutate` computes the next
   * value, and the write commits before the transaction ends. IndexedDB
   * serializes overlapping readwrite transactions on this store, so a
   * concurrent writer always observes the previous writer's committed
   * state — stale-read overwrites are impossible.
   *
   * `mutate` receives the current record (or undefined when absent) and
   * returns the record to store, or undefined to leave storage unchanged.
   * Returns the stored record, or undefined when absent/unchanged.
   */
  mutate(
    clientTransactionId: string,
    mutate: (current: OfflineTransaction | undefined) => OfflineTransaction | undefined,
  ): Promise<OfflineTransaction | undefined>;
  /** Returns all records. */
  getAll(): Promise<OfflineTransaction[]>;
  /** Returns records in the given sync state, via the state index. */
  getByState(state: SyncState): Promise<OfflineTransaction[]>;
}
