import type { DesktopApi } from '@arp/contracts';

declare global {
  interface Window {
    /**
     * Present only inside the Electron desktop shell (preload bridge).
     * Always access defensively — it does not exist on the web.
     */
    desktop?: DesktopApi;
  }
}

export {};
