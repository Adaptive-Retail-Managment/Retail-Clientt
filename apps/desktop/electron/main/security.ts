import { session, shell, type Session, type WebContents } from 'electron';

export interface SecurityOptions {
  /** Dev server URL (e.g. http://localhost:5173) when running --dev. */
  devServerUrl?: string;
  /** file:// URL of the packaged renderer entry point (production only). */
  prodFileUrl?: string;
  /** Configured API base URL (ARP_API_BASE_URL); used to scope connect-src. */
  apiBaseUrl?: string | null;
}

function devOrigin(devServerUrl?: string): string | null {
  if (!devServerUrl) return null;
  try {
    return new URL(devServerUrl).origin;
  } catch {
    return null;
  }
}

/**
 * A main-frame navigation is trusted only when it stays inside the application:
 * - development: exactly the configured dev-server origin;
 * - production: exactly the packaged renderer file URL.
 * Everything else (external sites, other file:// paths, data:, javascript:)
 * is blocked.
 */
export function isTrustedNavigationUrl(targetUrl: string, options: SecurityOptions): boolean {
  try {
    const url = new URL(targetUrl);
    const dev = devOrigin(options.devServerUrl);

    if (dev && url.origin === dev) {
      return true;
    }

    if (!options.devServerUrl && options.prodFileUrl) {
      // file: URLs have an opaque origin; compare the full URL (path + hash).
      return targetUrl === options.prodFileUrl;
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * IPC handlers additionally verify the *sender frame* URL, which for a
 * file:// renderer is the packaged entry point and for dev is the dev origin.
 */
export function isTrustedFrameUrl(frameUrl: string, options: SecurityOptions): boolean {
  try {
    const url = new URL(frameUrl);
    const dev = devOrigin(options.devServerUrl);

    if (dev) {
      return url.origin === dev;
    }

    if (options.prodFileUrl && url.protocol === 'file:') {
      // The renderer may legitimately be at the entry file or a same-directory
      // asset URL; require it to live inside the packaged web/dist directory.
      const entry = new URL(options.prodFileUrl);
      return url.href.startsWith(entry.href.replace(/[^/]+$/, ''));
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Loopback, private, link-local and otherwise non-public destinations are not
 * permitted external targets — the app must never hand the user's browser a
 * URL pointing back at internal infrastructure.
 */
function isPublicIpv4(host: string): boolean {
  const ipv4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
  if (!ipv4) return false;
  const [a, b] = [Number(ipv4[1]), Number(ipv4[2])];
  if (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127) ||
    a >= 224
  ) {
    return false;
  }
  return true;
}

function isPublicHostname(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, '');

  if (
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local') ||
    host.endsWith('.internal')
  ) {
    return false;
  }

  // IPv6 loopback / link-local / unique-local.
  if (
    host === '::' ||
    host === '::1' ||
    host.startsWith('fe80:') ||
    host.startsWith('fc') ||
    host.startsWith('fd')
  ) {
    return false;
  }

  // IPv4-mapped IPv6 (::ffff:a.b.c.d, normalized by the URL parser to hex
  // hextets) must be checked against the IPv4 rules — otherwise
  // https://[::ffff:127.0.0.1]/ would bypass the private-range checks.
  const mapped = /^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/i.exec(host);
  if (mapped) {
    const hi = parseInt(mapped[1]!, 16);
    const lo = parseInt(mapped[2]!, 16);
    return isPublicIpv4(`${hi >> 8}.${hi & 255}.${lo >> 8}.${lo & 255}`);
  }

  if (host.includes(':')) {
    // Other global-unicast IPv6 literals are treated as public; transitional
    // mechanisms (6to4/Teredo) embedding private IPv4 are a documented
    // residual risk — see security notes in DESKTOP_ARCHITECTURE.md.
    return true;
  }

  // IPv4 literals (the WHATWG URL parser already normalizes alternate
  // notations such as decimal/octal/hex into dotted quads).
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) {
    return isPublicIpv4(host);
  }

  // Single-label hostnames cannot be resolved to a public destination.
  if (!host.includes('.')) {
    return false;
  }

  return true;
}

/**
 * External links must be credential-free https URLs to public destinations.
 * Anything else (http:, javascript:, data:, file:, credentials in the URL,
 * internal hosts) is rejected — callers must deny the navigation/request.
 */
export function isAllowedExternalUrl(raw: string): boolean {
  try {
    const url = new URL(raw);
    return (
      url.protocol === 'https:' &&
      url.username === '' &&
      url.password === '' &&
      isPublicHostname(url.hostname)
    );
  } catch {
    return false;
  }
}

export function hardenWindowContents(contents: WebContents, options: SecurityOptions = {}): void {
  contents.setWindowOpenHandler(({ url }) => {
    // Never navigate the app window to an external page. Approved external
    // links are opened in the user's real browser via a controlled path.
    if (isAllowedExternalUrl(url)) {
      void shell.openExternal(url).catch(() => undefined);
    }
    return { action: 'deny' };
  });

  const guard = (event: Electron.Event, targetUrl: string) => {
    if (!isTrustedNavigationUrl(targetUrl, options)) {
      event.preventDefault();
    }
  };

  contents.on('will-navigate', guard);
  contents.on('will-redirect', guard);

  contents.on('will-attach-webview', (event) => {
    event.preventDefault();
  });
}

const DEV_CSP = [
  "default-src 'self'",
  // Vite dev server requires inline module preamble + eval-based HMR client.
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self' data:",
  "connect-src 'self' http: https: ws: wss:",
  "object-src 'none'",
  "base-uri 'none'",
  "frame-ancestors 'none'",
].join('; ');

function prodCsp(apiBaseUrl?: string | null): string {
  // connect-src is scoped to 'self' plus the single configured API origin —
  // never a blanket https: which would let injected script exfiltrate data
  // to arbitrary hosts. With no API URL configured the renderer cannot reach
  // a backend anyway (api-config.ts fails closed), so 'self' alone is correct.
  const origins = ["'self'"];
  if (apiBaseUrl) {
    try {
      origins.push(new URL(apiBaseUrl).origin);
    } catch {
      // Invalid configured URL — leave connect-src minimal; requests fail.
    }
  }
  return [
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
}

export function cspFor(options: SecurityOptions): string {
  return options.devServerUrl ? DEV_CSP : prodCsp(options.apiBaseUrl);
}

function isRendererRequest(requestUrl: string, options: SecurityOptions): boolean {
  try {
    const url = new URL(requestUrl);
    const dev = devOrigin(options.devServerUrl);
    if (dev) return url.origin === dev;
    if (options.prodFileUrl && url.protocol === 'file:') {
      const entry = new URL(options.prodFileUrl);
      return url.href.startsWith(entry.href.replace(/[^/]+$/, ''));
    }
    return false;
  } catch {
    return false;
  }
}

export function hardenSession(
  targetSession: Session = session.defaultSession,
  options: SecurityOptions = {},
): void {
  // POS hardware permissions (printers, serial, USB) are granted explicitly in
  // a later slice through narrowly scoped IPC; everything is denied until then.
  targetSession.setPermissionRequestHandler((_webContents, _permission, callback) => {
    callback(false);
  });

  const csp = cspFor(options);
  targetSession.webRequest.onHeadersReceived((details, callback) => {
    if (!isRendererRequest(details.url, options)) {
      callback({ responseHeaders: details.responseHeaders });
      return;
    }
    const headers = { ...(details.responseHeaders ?? {}) };
    // Replace any server-supplied CSP with the enforced policy.
    for (const key of Object.keys(headers)) {
      if (key.toLowerCase() === 'content-security-policy') delete headers[key];
    }
    headers['Content-Security-Policy'] = [csp];
    callback({ responseHeaders: headers });
  });
}
