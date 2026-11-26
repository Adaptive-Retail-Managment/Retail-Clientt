import react from '@vitejs/plugin-react';
import { loadEnv } from 'vite';
import { defineConfig, type Plugin } from 'vitest/config';

// The API runs on 4000 by default (see .env.example). Probes are unversioned,
// API routes live under /api.
const apiTarget = 'http://localhost:4000';

/**
 * Content-Security-Policy for the production bundle.
 *
 * Electron's webRequest API cannot attach headers to file:// responses, so
 * the packaged desktop renderer relies on this meta tag (the mechanism
 * Electron's own security guide prescribes for file://). The same meta tag is
 * correct for web production served over https.
 *
 * Meta-policy limitations (CSP spec): `frame-ancestors`, `sandbox` and
 * `report-uri` are ignored in <meta> policies — they are kept here for
 * documentation value and for the http(s) header path in dev, but real
 * clickjacking protection for the packaged app comes from the main-process
 * navigation allowlist (will-navigate/will-redirect denial), not CSP.
 *
 * connect-src is limited to 'self' plus the API origins known at build time:
 * VITE_API_URL (web) and ARP_API_BASE_URL (desktop packaging builds). A
 * packaged desktop build MUST therefore be produced with ARP_API_BASE_URL
 * set, or API calls will be CSP-blocked.
 */
function cspMetaPlugin(): Plugin {
  return {
    name: 'arp-csp-meta',
    apply: 'build',
    transformIndexHtml() {
      const origins = ["'self'"];
      const seen = new Set<string>();
      for (const raw of [
        loadEnv('production', '../../', '').VITE_API_URL,
        process.env.ARP_API_BASE_URL,
      ]) {
        if (!raw) continue;
        try {
          const origin = new URL(raw).origin;
          if (origin !== 'null' && !seen.has(origin)) {
            seen.add(origin);
            origins.push(origin);
          }
        } catch {
          // Invalid URL — omit rather than emit a broken directive.
        }
      }

      const csp = [
        "default-src 'self'",
        "script-src 'self'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data:",
        "font-src 'self' data:",
        `connect-src ${origins.join(' ')}`,
        "object-src 'none'",
        "base-uri 'none'",
        "frame-ancestors 'none'",
      ].join('; ');

      return [
        {
          tag: 'meta',
          attrs: { 'http-equiv': 'Content-Security-Policy', content: csp },
          injectTo: 'head',
        },
      ];
    },
  };
}

export default defineConfig({
  plugins: [react(), cspMetaPlugin()],
  // Single source of env values: the repository root .env.
  envDir: '../../',
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': { target: apiTarget, changeOrigin: true },
      '/health': { target: apiTarget, changeOrigin: true },
      '/ready': { target: apiTarget, changeOrigin: true },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    restoreMocks: true,
  },
});
