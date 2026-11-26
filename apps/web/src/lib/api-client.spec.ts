import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiRequest, setAuthTokenProvider } from './api-client';
import { resetApiConfigCache } from './api-config';
import type { DesktopApi } from '@arp/contracts';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
  setAuthTokenProvider(undefined);
  resetApiConfigCache();
  delete window.desktop;
});

describe('apiRequest', () => {
  it('returns parsed body and status for any HTTP status', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(jsonResponse({ ok: 1 }, 503))),
    );

    const result = await apiRequest<{ ok: number }>('/ready');

    expect(result.ok).toBe(false);
    expect(result.status).toBe(503);
    expect(result.body).toEqual({ ok: 1 });
  });

  it('classifies connection failures as network errors', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new TypeError('fetch failed'))),
    );

    await expect(apiRequest('/health')).rejects.toMatchObject({
      name: 'ApiRequestError',
      kind: 'network',
    });
  });

  it('classifies exceeding the timeout as a timeout error', async () => {
    vi.useFakeTimers();
    // Mimic real fetch: the promise only settles when the abort signal fires.
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_url: string, init?: RequestInit) =>
          new Promise<Response>((_resolve, reject) => {
            init?.signal?.addEventListener('abort', () =>
              reject(new DOMException('Aborted', 'AbortError')),
            );
          }),
      ),
    );

    const pending = apiRequest('/health', { timeoutMs: 50 });
    const assertion = expect(pending).rejects.toMatchObject({ kind: 'timeout' });
    await vi.advanceTimersByTimeAsync(60);
    await assertion;
  });

  it('classifies caller cancellation as aborted', async () => {
    const controller = new AbortController();
    controller.abort();
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new DOMException('Aborted', 'AbortError'))),
    );

    await expect(apiRequest('/health', { signal: controller.signal })).rejects.toMatchObject({
      kind: 'aborted',
    });
  });

  it('uses the desktop runtime API base URL when provided', async () => {
    const fetchMock = vi.fn(() => Promise.resolve(jsonResponse({ ok: true })));
    vi.stubGlobal('fetch', fetchMock);
    window.desktop = {
      getRuntimeConfig: () =>
        Promise.resolve({
          apiBaseUrl: 'https://api.example.com',
          environment: 'production',
          isPackaged: true,
        }),
    } as unknown as DesktopApi;

    await apiRequest('/health');

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example.com/health',
      expect.objectContaining({ headers: expect.any(Object) }),
    );
  });

  it('sends the auth token only when a provider is registered', async () => {
    const fetchMock = vi.fn(() => Promise.resolve(jsonResponse({ ok: true })));
    vi.stubGlobal('fetch', fetchMock);

    setAuthTokenProvider(() => 'token-123');
    await apiRequest('/health');
    const firstCall = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(firstCall[1]).toMatchObject({
      headers: expect.objectContaining({ Authorization: 'Bearer token-123' }),
    });

    setAuthTokenProvider(undefined);
    await apiRequest('/health');
    const secondCall = fetchMock.mock.calls[1] as unknown as [string, RequestInit];
    const headers = secondCall[1].headers as Record<string, string>;
    expect(headers.Authorization).toBeUndefined();
  });

  it('runs the response validator and surfaces null for invalid bodies', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(jsonResponse({ wrong: true }))),
    );

    const result = await apiRequest<unknown>('/health', {
      validate: (body) => ((body as { ok?: boolean }).ok === true ? body : null),
    });

    expect(result.body).toBeNull();
  });
});
