import { resolveApiBaseUrl } from './api-config';

export interface ApiResult<T> {
  ok: boolean;
  status: number;
  body: T | null;
}

export type ApiErrorKind = 'timeout' | 'network' | 'aborted' | 'config';

/** Typed failure for requests that never produced an HTTP response. */
export class ApiRequestError extends Error {
  readonly kind: ApiErrorKind;

  constructor(kind: ApiErrorKind, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'ApiRequestError';
    this.kind = kind;
  }
}

/** @deprecated Use ApiRequestError; kept for compatibility with existing imports. */
export class ApiUnreachableError extends ApiRequestError {
  constructor(message: string, options?: { cause?: unknown }) {
    super('network', message, options);
    this.name = 'ApiUnreachableError';
  }
}

export { ApiConfigError } from './api-config';

/**
 * Optional auth hook. The authentication mechanism is a pending backend
 * contract; when the server defines it, register a provider that returns the
 * current access token (or null). Requests then carry `Authorization: Bearer`.
 */
let authTokenProvider: (() => string | null) | undefined;

export function setAuthTokenProvider(provider: (() => string | null) | undefined): void {
  authTokenProvider = provider;
}

function requestId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `req-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Returns the parsed body for any HTTP status (probes use 503 meaningfully).
 * Throws ApiRequestError when the request could not complete:
 *  - 'timeout'  — exceeded timeoutMs
 *  - 'network'  — connection/DNS/CORS failure
 *  - 'aborted'  — caller cancelled via the supplied signal
 *  - 'config'   — API base URL could not be resolved (see api-config.ts)
 */
export async function apiRequest<T>(
  path: string,
  options: { timeoutMs?: number; signal?: AbortSignal; validate?: (body: unknown) => T | null } = {},
): Promise<ApiResult<T>> {
  const { timeoutMs = 5000, signal: externalSignal, validate } = options;

  let baseUrl: string;
  try {
    baseUrl = await resolveApiBaseUrl();
  } catch (error) {
    throw new ApiRequestError(
      'config',
      error instanceof Error ? error.message : 'API configuration is invalid',
      { cause: error },
    );
  }

  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  const onExternalAbort = () => controller.abort();
  if (externalSignal) {
    if (externalSignal.aborted) controller.abort();
    else externalSignal.addEventListener('abort', onExternalAbort, { once: true });
  }

  const headers: Record<string, string> = {
    Accept: 'application/json',
    'X-Request-Id': requestId(),
  };
  const token = authTokenProvider?.();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  try {
    const response = await fetch(`${baseUrl}${path}`, {
      headers,
      signal: controller.signal,
    });
    const raw: unknown = await response.json().catch(() => null);
    const body = validate ? validate(raw) : (raw as T | null);

    return { ok: response.ok, status: response.status, body };
  } catch (error) {
    // DOMException is not `instanceof Error` in every DOM implementation, so
    // detect aborts by name rather than by class.
    const errorName = (error as { name?: unknown } | null)?.name;
    if (errorName === 'AbortError') {
      throw new ApiRequestError(
        timedOut ? 'timeout' : 'aborted',
        timedOut ? `Request timed out after ${timeoutMs}ms` : 'Request was cancelled',
        { cause: error },
      );
    }
    const reason = error instanceof Error ? error.message : 'Unknown network error';
    throw new ApiRequestError('network', reason, { cause: error });
  } finally {
    clearTimeout(timer);
    externalSignal?.removeEventListener('abort', onExternalAbort);
  }
}
