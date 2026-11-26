# Backend dependencies — contracts the Retail-Server must provide

The frontend/desktop foundation is implemented only up to the boundaries below.
Everything past them is **blocked on backend work**; no frontend workaround has
been invented. Do not enable offline sync or authenticated features until these
contracts exist.

## 1. Authentication (blocks login, session, all protected routes)

Needed:

- Sign-in endpoint (credentials → session/token), token refresh, sign-out.
- Current-user endpoint returning memberships: `businessId`, `role`
  (`owner | business_admin | manager | cashier`), and authorized branches.
- Token transport decision (Bearer header vs cookie) and expiry semantics.

Frontend already supports: `setAuthTokenProvider()` in `api-client.ts` attaches
`Authorization: Bearer <token>` once a provider is registered; `SessionProvider`
models `unauthenticated | loading | authenticated` honestly.

## 2. Offline sale synchronization (blocks `OfflineQueue.processPending`)

The queue is fully implemented locally (`apps/web/src/lib/offline/`). To enable
sync, the server must provide an endpoint accepting:

```
POST /api/offline/sales/sync   (path TBD by backend)
{
  "clientTransactionId": "uuid",   // REQUIRED idempotency key
  "businessId": "...",
  "branchId": "...",
  "payload": { ...original sale... }
}
```

Required server semantics:

- **Idempotency**: a repeated `clientTransactionId` returns the original
  result, never a duplicate sale. This is mandatory for crash recovery —
  `recoverInterrupted()` resubmits `syncing` records that may already have
  been accepted.
- **Stock authority**: the server validates stock and rejects the whole sale
  if available stock would go negative. **No partial fulfillment.**
- **Response outcomes** mapping to the client `SyncSubmission` union:
  - `accepted` (+ `serverTransactionId`) → client marks `synced`
  - `rejected` (definitive, with reason) → client marks `rejected`
  - `conflict` (e.g. stock/business-state mismatch needing human review) → `conflict`
  - `retryable` (transient) → back to `pending`
- Reconciliation endpoint(s) listing `conflict`/`rejected` records with
  resolution actions restricted server-side to Owner/Manager (Business Admin
  read-only).

## 3. Health probes (already consumed)

`/health` and `/ready` are used by the system-status feature today; keep their
response shapes stable (`status`, `version`, `uptime`, db readiness/latency).

## 4. API base URL configuration

- Web dev: Vite proxy (`vite.config.ts`) → `http://localhost:4000`.
- Web production: `VITE_API_URL` build-time variable, or same-origin reverse proxy.
- Desktop packaged: `ARP_API_BASE_URL` in the Electron main-process environment,
  surfaced to the renderer via `app:get-runtime-config` IPC. **Never** a
  `VITE_` variable for secrets; the API base URL is not secret but must be
  configurable per environment.
