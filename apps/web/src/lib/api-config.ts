import type { RuntimeConfig } from '@arp/contracts';

/**
 * Environment-aware API base-URL resolution.
 *
 * Resolution order:
 *  1. Packaged/dev Electron renderer → runtime config supplied by the main
 *     process over IPC (`ARP_API_BASE_URL` in the main process environment).
 *  2. Web builds → `VITE_API_URL` baked in at build time.
 *  3. Default → '' (same-origin). In development the Vite proxy forwards
 *     /api, /health and /ready to the API; in web production an empty value
 *     means "serve the API from the same origin" (reverse proxy / CDN).
 *
 * A packaged Electron renderer runs on a file:// origin where relative URLs
 * cannot work, so a missing runtime API URL is a hard configuration error.
 */

export class ApiConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ApiConfigError';
  }
}

let cachedRuntimeConfig: Promise<RuntimeConfig | null> | null = null;

function runtimeConfig(): Promise<RuntimeConfig | null> {
  if (typeof window === 'undefined') return Promise.resolve(null);
  const desktop = window.desktop;
  if (!desktop?.getRuntimeConfig) return Promise.resolve(null);
  cachedRuntimeConfig ??= desktop.getRuntimeConfig().catch(() => null);
  return cachedRuntimeConfig;
}

function isFileOrigin(): boolean {
  return typeof window !== 'undefined' && window.location.protocol === 'file:';
}

function normalizeBaseUrl(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const trimmed = raw.trim().replace(/\/+$/, '');
  return trimmed.length > 0 ? trimmed : null;
}

/** Resolve the API base URL. Throws ApiConfigError when it cannot be determined. */
export async function resolveApiBaseUrl(): Promise<string> {
  const runtime = await runtimeConfig();

  if (runtime) {
    const fromDesktop = normalizeBaseUrl(runtime.apiBaseUrl);
    if (fromDesktop) return fromDesktop;
    // Desktop dev loads the Vite server, so same-origin proxying still works.
    if (!isFileOrigin()) return '';
    throw new ApiConfigError(
      'Desktop runtime configuration did not provide an API base URL. ' +
        'Set ARP_API_BASE_URL for the packaged app or use --dev.',
    );
  }

  const fromEnv = normalizeBaseUrl(import.meta.env.VITE_API_URL as string | undefined);
  if (fromEnv) return fromEnv;

  if (isFileOrigin()) {
    throw new ApiConfigError(
      'The app is running from a file:// origin without a configured API URL. ' +
        'Build the web bundle with VITE_API_URL or launch via the desktop shell.',
    );
  }

  return '';
}

/** Test hook: clears the cached runtime config between tests. */
export function resetApiConfigCache(): void {
  cachedRuntimeConfig = null;
}
