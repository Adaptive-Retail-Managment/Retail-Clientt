# Offline transaction architecture (web + desktop renderer)

Status: **foundation implemented** — durable local queue, identity, deduplication,
state machine and crash recovery. The server synchronization contract is **not
yet defined**; no fake sync engine exists. See `BACKEND_DEPENDENCIES.md`.

## 1. Scope

This module (`apps/web/src/lib/offline/`) covers **pending offline POS sales**
(the first transaction kind). It deliberately does not implement:

- local stock authority (local stock is never assumed current),
- server-side validation or business rules,
- reconciliation UI (Owner/Manager-only resolution is a server + UI concern),
- any claim that a sale is "synced" without explicit server confirmation.

## 2. Storage selection

| Option                              | Decision     | Reason                                                                                                                                                                                                            |
| ----------------------------------- | ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `localStorage`                      | **Rejected** | Whole-blob synchronous read-modify-write; one corrupt byte loses the queue; ~5 MB quota; no per-record atomicity.                                                                                                 |
| SQLite (`better-sqlite3`, `sql.js`) | **Rejected** | Native module requires Electron rebuilds and has no web story; `sql.js` is WASM-in-memory unless manually persisted. Unjustified complexity for an append/update queue.                                           |
| **IndexedDB**                       | **Selected** | Available identically in browsers and the Electron (Chromium) renderer; real transactions; per-record atomic writes; indexed queries; survives restarts; structured-clone storage; zero new runtime dependencies. |

`IdbTransactionStore` (`idb.ts`) wraps a single object store `transactions`
(keyPath `clientTransactionId`, index `by-state`) in database `arp-offline-pos`.
Every method runs in its own `readwrite`/`readonly` IDB transaction, so each
mutation is atomic and durable. The store is storage-agnostic behind the
`TransactionStore` port (`store.ts`), which keeps the queue testable.

## 3. Transaction identity and deduplication

- `clientTransactionId` is a client-generated UUID (crypto.randomUUID) created
  at enqueue time. It is the **idempotency key** for the future sync contract.
- `enqueue()` performs an atomic `add()`. A duplicate key raises
  `ConstraintError`, which the store reports as `'exists'`; the queue then
  returns the already-stored record unchanged. A second record with the same
  id **cannot exist**, so duplicate submission is impossible by construction —
  both locally and (once the server honors the key) remotely.
- Payloads are stored verbatim (`payload: unknown`) for reconciliation.

## 4. State machine

```
pending ──markSyncing──▶ syncing ──accepted──▶ synced   (terminal)
   ▲                      │
   │                      ├──rejected──▶ rejected ──revalidate(≤1)──▶ syncing
   │                      ├──conflict──▶ conflict ──revalidate(≤1)──▶ syncing
   │                      └──retryable──▶ pending
   └──── recoverInterrupted() / markRetryable() ◀──┘
```

- `synced` is terminal and never rewritten; synced history is retained for
  audit/reconciliation.
- `rejected`/`conflict` may re-enter `syncing` **at most once**
  (`MAX_REVALIDATIONS = 1`, D-025). The guard lives in `markSyncing` and counts
  `revalidationsUsed` on the record itself.
- Illegal transitions are no-ops that return the record unchanged.

## 5. Synchronization flow (`processPending`)

1. `recoverInterrupted()` runs at startup: any record left in `syncing` by a
   crash is returned to `pending`.
2. For each `pending` record: `markSyncing` → `submitter.submit(tx)` → map the
   `SyncSubmission` outcome:
   - `accepted` → `synced` (+ optional `serverTransactionId`)
   - `rejected` → `rejected` (payload preserved)
   - `conflict` → `conflict` (human resolution required)
   - `retryable` / thrown error → back to `pending` with `lastError`
3. A sale is **never** treated as synchronized without an `accepted` outcome.

The `SyncSubmitter` is injected. In production it must call the backend's
offline-sync endpoint; until that contract exists nothing in the app calls
`processPending` — the queue is exercised only by tests.

## 6. Crash and restart safety

- Every transition is an atomic read-modify-write: `TransactionStore.mutate`
  performs the record read, guard evaluation and write inside a single
  IndexedDB `readwrite` transaction. Overlapping readwrite transactions on
  the store are serialized by IndexedDB, so a concurrent updater always
  observes the previous writer's committed state — a stale read can never
  overwrite a newer state (e.g. a `rejected` result cannot clobber a
  `synced` confirmation and lose its `serverTransactionId`).
- A crash can at worst leave a record in `syncing`.
- On the next launch `recoverInterrupted()` resets `syncing → pending`.
- Resubmission after an interrupted attempt is safe **only if** the server
  deduplicates on `clientTransactionId` — this is a mandatory backend
  requirement (BACKEND_DEPENDENCIES.md §2). Without it, a sale that reached
  the server but whose response was lost could double-post.

## 7. Mandatory business rules (must not be weakened)

- Offline sales are stored as pending local records only.
- No sale is "synced" before server confirmation.
- Server-side sync must reject any submission that would drive available stock
  negative; **no partial fulfillment**.
- Only Owner or Manager may resolve reconciliation exceptions; Business Admin
  is view-only.
- Duplicate synchronization must not create duplicate sales.
- Records must survive application restarts (IndexedDB satisfies this).
- Local stock is never treated as authoritative.

## 8. Known limitations / future work

- IndexedDB contents are not encrypted at rest. On desktop, payloads may later
  be encrypted via Electron `safeStorage` before `put`; on web this needs a
  separate decision. Documented as future hardening, not implemented.
- No quota management or eviction policy yet; volume is expected to be small
  (pending sales only — synced history could be archived later).
- `processPending` is sequential; batching/parallelism awaits the server
  contract.
