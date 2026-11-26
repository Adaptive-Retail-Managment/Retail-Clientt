import { describe, expect, it, vi } from 'vitest';

// The Electron binary is not installed in CI/test environments; the pure
// policy functions under test never touch it, so stub the module surface.
vi.mock('electron', () => ({
  session: { defaultSession: {} },
  shell: { openExternal: vi.fn() },
}));

import {
  cspFor,
  isAllowedExternalUrl,
  isTrustedFrameUrl,
  isTrustedNavigationUrl,
} from './security';

const PROD = {
  prodFileUrl: 'file:///C:/app/apps/web/dist/index.html',
  apiBaseUrl: 'https://api.example.com',
};
const DEV = { devServerUrl: 'http://localhost:5173' };

describe('isTrustedNavigationUrl', () => {
  it('allows only the exact packaged file URL in production', () => {
    expect(isTrustedNavigationUrl(PROD.prodFileUrl, PROD)).toBe(true);
    expect(
      isTrustedNavigationUrl('file:///C:/app/apps/web/dist/other.html', PROD),
    ).toBe(false);
    expect(isTrustedNavigationUrl('https://evil.example.com', PROD)).toBe(false);
    expect(isTrustedNavigationUrl('file:///C:/Windows/system.ini', PROD)).toBe(false);
  });

  it('allows only the dev origin in development', () => {
    expect(isTrustedNavigationUrl('http://localhost:5173/src/main.tsx', DEV)).toBe(true);
    expect(isTrustedNavigationUrl('http://localhost:9999/', DEV)).toBe(false);
    expect(isTrustedNavigationUrl('https://evil.example.com', DEV)).toBe(false);
    expect(isTrustedNavigationUrl('file:///etc/passwd', DEV)).toBe(false);
  });
});

describe('isTrustedFrameUrl', () => {
  it('accepts renderer frames inside the packaged web/dist directory', () => {
    expect(
      isTrustedFrameUrl('file:///C:/app/apps/web/dist/index.html', PROD),
    ).toBe(true);
    expect(
      isTrustedFrameUrl('file:///C:/app/apps/web/dist/assets/app.js', PROD),
    ).toBe(true);
    expect(isTrustedFrameUrl('file:///C:/Windows/system.ini', PROD)).toBe(false);
  });

  it('accepts only the dev origin frames in development', () => {
    expect(isTrustedFrameUrl('http://localhost:5173/', DEV)).toBe(true);
    expect(isTrustedFrameUrl('https://localhost:5173/', DEV)).toBe(false);
    expect(isTrustedFrameUrl('file:///C:/app/index.html', DEV)).toBe(false);
  });
});

describe('isAllowedExternalUrl', () => {
  it('allows credential-free https URLs to public hosts', () => {
    expect(isAllowedExternalUrl('https://docs.example.com/guide')).toBe(true);
    expect(isAllowedExternalUrl('https://pay.example.co.et:8443/x?y=1')).toBe(true);
  });

  it('rejects non-https protocols and credential-bearing URLs', () => {
    for (const url of [
      'http://example.com',
      'javascript:alert(1)',
      'data:text/html,<script>alert(1)</script>',
      'file:///C:/Windows/system.ini',
      'ftp://example.com/x',
      'https://user:pass@example.com/',
      'https://user@example.com/',
      'not a url',
      '',
    ]) {
      expect(isAllowedExternalUrl(url)).toBe(false);
    }
  });

  it('rejects loopback, private and internal destinations', () => {
    for (const url of [
      'https://localhost/',
      'https://app.localhost/',
      'https://printer.local/',
      'https://nas.internal/',
      'https://127.0.0.1/',
      'https://10.0.0.5/',
      'https://192.168.1.10/',
      'https://172.16.0.1/',
      'https://169.254.169.254/latest/meta-data',
      'https://100.64.0.1/',
      'https://[::1]/',
      'https://[::ffff:127.0.0.1]/', // IPv4-mapped loopback
      'https://[::ffff:10.0.0.1]/', // IPv4-mapped private
      'https://[::ffff:169.254.169.254]/', // IPv4-mapped link-local (cloud metadata)
      'https://router/', // single-label hostname
    ]) {
      expect(isAllowedExternalUrl(url)).toBe(false);
    }
  });
});

describe('cspFor', () => {
  it('emits a strict production policy without unsafe directives', () => {
    const csp = cspFor(PROD);
    expect(csp).toContain("script-src 'self'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).not.toContain('unsafe-eval');
    expect(csp).not.toContain('unsafe-inline' + "'" + ' ' + "script");
  });

  it('permits Vite HMR requirements only in development', () => {
    const dev = cspFor(DEV);
    expect(dev).toContain("'unsafe-eval'");
    expect(dev).toContain('ws:');
  });

  it('scopes production connect-src to the configured API origin only', () => {
    const csp = cspFor(PROD);
    expect(csp).toContain("connect-src 'self' https://api.example.com");
    // The blanket scheme source must not appear as a standalone directive.
    expect(csp).not.toMatch(/connect-src[^;]*\bhttps:(?!\/\/)/);
  });

  it('falls back to self-only connect-src when no API URL is configured', () => {
    const csp = cspFor({ prodFileUrl: PROD.prodFileUrl, apiBaseUrl: null });
    expect(csp).toContain("connect-src 'self'");
    expect(csp).not.toContain('https://');
  });
});
