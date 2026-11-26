import type { TransactionStore } from './store';
import type {
  NewOfflineTransaction,
  OfflineTransaction,
  SyncState,
  SyncSubmission,
  SyncSubmitter,
} from './types';

/** D-025: a rejected/conflicted transaction may be revalidated at most once. */
export const MAX_REVALIDATIONS = 1;

const ALLOWED_TRANSITIONS: Record<SyncState, readonly SyncState[]> = {
  pending: ['syncing'],
  // syncing → pending covers both retryable submission failures and crash
  // recovery (a record found in 'syncing' after restart may or may not have
  // reached the server; the server-side idempotency contract dedupes by
  // clientTransactionId — see docs/web/OFFLINE_ARCHITECTURE.md).
  syncing: ['synced', 'rejected', 'conflict', 'pending'],
  synced: [], // terminal — server-confirmed, never rewritten
  rejected: ['syncing'], // only via audited revalidation (revalidationsUsed < MAX)
  conflict: ['syncing'], // only via audited revalidation (revalidationsUsed < MAX)
};

export function canTransition(from: SyncState, to: SyncState): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

function newTransactionId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `tx-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

/**
 * Durable queue of pending offline transactions backed by an IndexedDB
 * TransactionStore (see idb.ts / OFFLINE_ARCHITECTURE.md).
 *
 * Integrity properties:
 * - Every record is keyed by clientTransactionId — the idempotency key.
 * - enqueue() uses an atomic insert: a duplicate id can never create a
 *   second record, so duplicate submission is impossible by construction.
 * - Every state transition is a single-record atomic write; a crash can at
 *   worst leave a record in 'syncing', which recoverInterrupted() returns to
 *   'pending' on startup.
 * - Records are never deleted by the queue — synced history is retained for
 *   reconciliation/audit.
 */
export class OfflineQueue {
  constructor(private readonly store: TransactionStore) {}

  /**
   * Enqueue a new pending transaction. If clientTransactionId already exists,
   * the existing record is returned unchanged — duplicate submission is
   * impossible by construction.
   */
  async enqueue(input: NewOfflineTransaction): Promise<OfflineTransaction> {
    const id = input.clientTransactionId || newTransactionId();
    const now = new Date().toISOString();
    const tx: OfflineTransaction = {
      ...input,
      clientTransactionId: id,
      state: 'pending',
      createdAt: now,
      updatedAt: now,
      attempts: 0,
      revalidationsUsed: 0,
    };

    const result = await this.store.add(tx);
    if (result === 'inserted') return tx;

    const existing = await this.store.get(id);
    if (existing) return existing;
    // 'exists' without a readable record should be impossible; retry once via put path guard.
    throw new Error(`Offline transaction ${id} reported as duplicate but could not be read`);
  }

  list(state?: SyncState): Promise<OfflineTransaction[]> {
    return state ? this.store.getByState(state) : this.store.getAll();
  }

  get(clientTransactionId: string): Promise<OfflineTransaction | undefined> {
    return this.store.get(clientTransactionId);
  }

  /**
   * Atomically apply a guarded transition to one record. The guard runs
   * against the record inside the same IndexedDB readwrite transaction as
   * the write, so a concurrent updater can never overwrite a newer state
   * with a decision made from a stale read.
   */
  private update(
    clientTransactionId: string,
    mutate: (tx: OfflineTransaction) => OfflineTransaction,
  ): Promise<OfflineTransaction | undefined> {
    return this.store.mutate(clientTransactionId, (current) =>
      current ? mutate(current) : undefined,
    );
  }

  private touch(tx: OfflineTransaction): OfflineTransaction {
    return { ...tx, updatedAt: new Date().toISOString() };
  }

  markSyncing(clientTransactionId: string): Promise<OfflineTransaction | undefined> {
    return this.update(clientTransactionId, (tx) => {
      if (!canTransition(tx.state, 'syncing')) return tx;
      const isRevalidation = tx.state === 'rejected' || tx.state === 'conflict';
      if (isRevalidation && tx.revalidationsUsed >= MAX_REVALIDATIONS) return tx;
      return this.touch({
        ...tx,
        state: 'syncing',
        attempts: tx.attempts + 1,
        revalidationsUsed: isRevalidation ? tx.revalidationsUsed + 1 : tx.revalidationsUsed,
      });
    });
  }

  markSynced(clientTransactionId: string, serverTransactionId?: string): Promise<OfflineTransaction | undefined> {
    return this.update(clientTransactionId, (tx) => {
      if (!canTransition(tx.state, 'synced')) return tx;
      return this.touch({ ...tx, state: 'synced', serverTransactionId });
    });
  }

  markRejected(clientTransactionId: string, reason: string): Promise<OfflineTransaction | undefined> {
    return this.update(clientTransactionId, (tx) => {
      if (!canTransition(tx.state, 'rejected')) return tx;
      return this.touch({ ...tx, state: 'rejected', lastError: reason });
    });
  }

  markConflict(clientTransactionId: string, reason: string): Promise<OfflineTransaction | undefined> {
    return this.update(clientTransactionId, (tx) => {
      if (!canTransition(tx.state, 'conflict')) return tx;
      return this.touch({ ...tx, state: 'conflict', lastError: reason });
    });
  }

  /** Retryable failure returns the transaction to pending for a later attempt. */
  markRetryable(clientTransactionId: string, reason: string): Promise<OfflineTransaction | undefined> {
    return this.update(clientTransactionId, (tx) => {
      if (!canTransition(tx.state, 'pending')) return tx;
      return this.touch({ ...tx, state: 'pending', lastError: reason });
    });
  }

  /**
   * Crash recovery: any record left in 'syncing' by an interrupted run is
   * returned to 'pending' so it is retried. Because the server contract
   * deduplicates on clientTransactionId, resubmitting a transaction that did
   * reach the server cannot create a duplicate sale.
   * Returns the number of recovered records.
   */
  async recoverInterrupted(): Promise<number> {
    const interrupted = await this.store.getByState('syncing');
    for (const tx of interrupted) {
      await this.update(tx.clientTransactionId, (current) =>
        this.touch({ ...current, state: 'pending', lastError: 'Recovered after interrupted sync' }),
      );
    }
    return interrupted.length;
  }

  /**
   * Drain pending transactions through the injected submitter.
   *
   * The submitter is the backend contract boundary: in production it must call
   * the server's offline-sync endpoint (see BACKEND_DEPENDENCIES.md). Until
   * that contract exists, no submitter is wired into the app and this method
   * is exercised only by tests.
   */
  async processPending(submitter: SyncSubmitter): Promise<void> {
    for (const tx of await this.list('pending')) {
      const syncing = await this.markSyncing(tx.clientTransactionId);
      if (!syncing || syncing.state !== 'syncing') continue;

      let submission: SyncSubmission;
      try {
        submission = await submitter.submit(syncing);
      } catch (error) {
        await this.markRetryable(
          tx.clientTransactionId,
          error instanceof Error ? error.message : 'Submission failed',
        );
        continue;
      }

      switch (submission.outcome) {
        case 'accepted':
          await this.markSynced(tx.clientTransactionId, submission.serverTransactionId);
          break;
        case 'rejected':
          await this.markRejected(tx.clientTransactionId, submission.reason);
          break;
        case 'conflict':
          await this.markConflict(tx.clientTransactionId, submission.reason);
          break;
        case 'retryable':
          await this.markRetryable(tx.clientTransactionId, submission.reason);
          break;
      }
    }
  }
}
