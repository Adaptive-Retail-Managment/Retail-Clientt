import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { IdbTransactionStore } from './idb';
import { MAX_REVALIDATIONS, OfflineQueue } from './queue';
import type { NewOfflineTransaction, SyncSubmitter } from './types';

function sale(id?: string): NewOfflineTransaction {
  return {
    clientTransactionId: id ?? '',
    kind: 'sale',
    businessId: 'biz-1',
    branchId: 'br-1',
    payload: { lines: [{ sku: 'SKU-1', qty: 2 }] },
  };
}

let dbCounter = 0;
let queue: OfflineQueue;

beforeEach(() => {
  // Unique DB per test: IndexedDB state intentionally persists across
  // "restarts", so tests must not leak records into each other.
  queue = new OfflineQueue(new IdbTransactionStore(undefined, `arp-test-${++dbCounter}`));
});

describe('enqueue', () => {
  it('persists a pending transaction with a generated id', async () => {
    const tx = await queue.enqueue(sale());
    expect(tx.state).toBe('pending');
    expect(tx.clientTransactionId).toBeTruthy();
    expect(await queue.get(tx.clientTransactionId)).toMatchObject({ state: 'pending' });
  });

  it('deduplicates by clientTransactionId — second enqueue returns the same record', async () => {
    const first = await queue.enqueue(sale('tx-fixed-1'));
    const second = await queue.enqueue({ ...sale('tx-fixed-1'), payload: { tampered: true } });
    expect(second.clientTransactionId).toBe(first.clientTransactionId);
    expect(second.payload).toEqual(first.payload);
    expect(await queue.list()).toHaveLength(1);
  });
});

describe('state transitions', () => {
  it('walks pending → syncing → synced', async () => {
    const tx = await queue.enqueue(sale());
    await queue.markSyncing(tx.clientTransactionId);
    const synced = await queue.markSynced(tx.clientTransactionId, 'srv-1');
    expect(synced).toMatchObject({ state: 'synced', serverTransactionId: 'srv-1' });
  });

  it('refuses illegal transitions', async () => {
    const tx = await queue.enqueue(sale());
    expect(await queue.markSynced(tx.clientTransactionId)).toMatchObject({ state: 'pending' });
    expect(await queue.markRejected(tx.clientTransactionId, 'x')).toMatchObject({ state: 'pending' });
  });

  it('returns retryable failures to pending', async () => {
    const tx = await queue.enqueue(sale());
    await queue.markSyncing(tx.clientTransactionId);
    const back = await queue.markRetryable(tx.clientTransactionId, 'network down');
    expect(back).toMatchObject({ state: 'pending', lastError: 'network down' });
  });

  it('caps revalidations at MAX_REVALIDATIONS (D-025)', async () => {
    const tx = await queue.enqueue(sale());
    await queue.markSyncing(tx.clientTransactionId);
    await queue.markRejected(tx.clientTransactionId, 'bad payload');
    await queue.markSyncing(tx.clientTransactionId);
    await queue.markConflict(tx.clientTransactionId, 'stock mismatch');

    // First revalidation allowed.
    const first = await queue.markSyncing(tx.clientTransactionId);
    expect(first?.revalidationsUsed).toBe(1);
    await queue.markRejected(tx.clientTransactionId, 'still bad');

    // Second revalidation denied: the record is left untouched in 'conflict'.
    const second = await queue.markSyncing(tx.clientTransactionId);
    expect(second?.state).toBe('conflict');
    expect(second?.revalidationsUsed).toBe(MAX_REVALIDATIONS);
  });
});

describe('restart recovery', () => {
  it('recovers records stuck in syncing after a crash', async () => {
    const tx = await queue.enqueue(sale());
    await queue.markSyncing(tx.clientTransactionId);

    // Simulate restart: brand-new store + queue over the same IndexedDB.
    const recovered = new OfflineQueue(
      new IdbTransactionStore(undefined, `arp-test-${dbCounter}`),
    );
    expect(await recovered.recoverInterrupted()).toBe(1);
    expect(await recovered.get(tx.clientTransactionId)).toMatchObject({ state: 'pending' });
  });
});

describe('concurrent updates', () => {
  it('serializes competing transitions — a stale read cannot overwrite a newer state', async () => {
    const tx = await queue.enqueue(sale());
    await queue.markSyncing(tx.clientTransactionId);

    // Two writers race on the same record: synced vs rejected. Exactly one
    // may win; the loser must observe the committed state and be denied by
    // the guard (synced/rejected are not reachable from each other).
    await Promise.all([
      queue.markSynced(tx.clientTransactionId, 'srv-race'),
      queue.markRejected(tx.clientTransactionId, 'late rejection'),
    ]);

    const final = await queue.get(tx.clientTransactionId);
    expect(['synced', 'rejected']).toContain(final?.state);
    if (final?.state === 'synced') {
      // The server confirmation must never be lost to a stale overwrite.
      expect(final.serverTransactionId).toBe('srv-race');
    }
  });

  it('a synced record is terminal under concurrent invalid transitions', async () => {
    const tx = await queue.enqueue(sale());
    await queue.markSyncing(tx.clientTransactionId);
    await queue.markSynced(tx.clientTransactionId, 'srv-final');

    await Promise.all([
      queue.markRejected(tx.clientTransactionId, 'x'),
      queue.markConflict(tx.clientTransactionId, 'y'),
      queue.markRetryable(tx.clientTransactionId, 'z'),
      queue.markSyncing(tx.clientTransactionId),
    ]);

    expect(await queue.get(tx.clientTransactionId)).toMatchObject({
      state: 'synced',
      serverTransactionId: 'srv-final',
    });
  });

  it('concurrent revalidations cannot exceed the D-025 cap', async () => {
    const tx = await queue.enqueue(sale());
    await queue.markSyncing(tx.clientTransactionId);
    await queue.markRejected(tx.clientTransactionId, 'bad');

    // Two writers attempt the single allowed revalidation simultaneously.
    // The loser must observe the committed 'syncing' state and be denied
    // (syncing → syncing is not a legal transition), so the cap is consumed
    // exactly once.
    await Promise.all([
      queue.markSyncing(tx.clientTransactionId),
      queue.markSyncing(tx.clientTransactionId),
    ]);

    const final = await queue.get(tx.clientTransactionId);
    expect(final).toMatchObject({
      state: 'syncing',
      revalidationsUsed: MAX_REVALIDATIONS,
      attempts: 2, // initial sync + exactly one revalidation
    });
  });
});

describe('processPending', () => {
  it('marks accepted submissions synced with the server id', async () => {
    const tx = await queue.enqueue(sale());
    const submitter: SyncSubmitter = {
      submit: vi.fn().mockResolvedValue({ outcome: 'accepted', serverTransactionId: 'srv-9' }),
    };
    await queue.processPending(submitter);
    expect(await queue.get(tx.clientTransactionId)).toMatchObject({
      state: 'synced',
      serverTransactionId: 'srv-9',
    });
  });

  it('maps rejected/conflict/retryable outcomes correctly', async () => {
    const outcomes = ['rejected', 'conflict', 'retryable'] as const;
    for (const outcome of outcomes) {
      const tx = await queue.enqueue(sale());
      const submitter: SyncSubmitter = {
        submit: vi.fn().mockResolvedValue({ outcome, reason: `${outcome} reason` }),
      };
      await queue.processPending(submitter);
      const expected = outcome === 'retryable' ? 'pending' : outcome;
      expect(await queue.get(tx.clientTransactionId)).toMatchObject({ state: expected });
    }
  });

  it('returns to pending when the submitter throws', async () => {
    const tx = await queue.enqueue(sale());
    const submitter: SyncSubmitter = { submit: vi.fn().mockRejectedValue(new Error('boom')) };
    await queue.processPending(submitter);
    expect(await queue.get(tx.clientTransactionId)).toMatchObject({
      state: 'pending',
      lastError: 'boom',
    });
  });
});
