/**
 * Shared desktop-bridge contract types.
 *
 * Single source of truth for the API surface exposed by the Electron preload
 * (`apps/desktop/electron/preload/preload.ts`) and consumed by the renderer
 * (`window.desktop`). IPC channel names themselves live only in
 * `apps/desktop/electron/ipc/contracts.ts` — this package intentionally
 * contains types only so it is safe to import from both Node (main/preload)
 * and DOM (renderer) code.
 */

export interface AppInfo {
  name: string;
  version: string;
  electron: string;
  chrome: string;
  node: string;
  platform: string;
}

/** Runtime configuration resolved by the Electron main process. */
export interface RuntimeConfig {
  /** Absolute API base URL for packaged builds, or null when not configured. */
  apiBaseUrl: string | null;
  /** 'development' | 'production' as resolved by the main process. */
  environment: 'development' | 'production';
  /** True when the renderer is loaded from the packaged file bundle. */
  isPackaged: boolean;
}

/** The complete, frozen surface exposed on `window.desktop`. */
export interface DesktopApi {
  getAppInfo: () => Promise<AppInfo>;
  getRuntimeConfig: () => Promise<RuntimeConfig>;
  /** Opens an allowlisted external https URL in the system browser. */
  openExternal: (url: string) => Promise<{ opened: boolean }>;
}
