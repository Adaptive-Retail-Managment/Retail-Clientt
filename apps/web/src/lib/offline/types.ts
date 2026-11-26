/**
 * Offline-first transaction foundation.
 *
 * Scope of THIS module: durable local persistence, identity, deduplication
 * and an explicit state machine for pending offline transactions (POS sales
 * first). It deliberately does NOT implement stock authority, server
 * validation, or a fake sync engine — the `SyncSubmitter` is injected and the
 * production submitter awaits the backend sync contract
 * (docs/web/OFFLINE_ARCHITECTURE.md, docs/web/BACKEND_DEPENDENCIES.md).
 */

export type OfflineTransactionKind = 'sale';

/**
 * pending   — durably stored locally, never yet sent
 * syncing   — a submit attempt is in flight
 * synced    — server confirmed acceptance (authoritative)
 * rejected  — server definitively refused (payload preserved for review)
 * conflict  — server flagged a conflict needing human resolution
 */
export type SyncState = 'pending' | 'syncing' | 'synced' | 'rejected' | 'conflict';

export interface OfflineTransaction {
  /** Client-generated unique id; the idempotency key for synchronization. */
  clientTransactionId: string;
  kind: OfflineTransactionKind;
  /** Business context captured at sale time; validated again at sync. */
  businessId: string;
  branchId: string;
  /** Original sale payload — preserved verbatim for reconciliation. */
  payload: unknown;
  state: SyncState;
  createdAt: string; // ISO-8601
  updatedAt: string;
  attempts: number;
  /** D-025: at most one audited revalidation attempt per transaction. */
  revalidationsUsed: number;
  lastError?: string;
  serverTransactionId?: string;
}

export type NewOfflineTransaction = Omit<
  OfflineTransaction,
  'state' | 'createdAt' | 'updatedAt' | 'attempts' | 'revalidationsUsed'
>;

/** Result reported by the injected sync submitter (backend contract TBD). */
export type SyncSubmission =
  | { outcome: 'accepted'; serverTransactionId?: string }
  | { outcome: 'rejected'; reason: string }
  | { outcome: 'conflict'; reason: string }
  | { outcome: 'retryable'; reason: string };

export interface SyncSubmitter {
  submit(transaction: OfflineTransaction): Promise<SyncSubmission>;
}
