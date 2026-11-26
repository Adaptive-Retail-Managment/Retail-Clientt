import type { AppInfo, DesktopApi, RuntimeConfig } from '@arp/contracts';

// Channel names live only here (main + preload). The API surface types are
// shared with the renderer via @arp/contracts so `window.desktop`
// stays in sync without duplicating definitions.
export const IPC_CHANNELS = {
  getAppInfo: 'app:get-info',
  getRuntimeConfig: 'app:get-runtime-config',
  openExternal: 'shell:open-external',
} as const;

export type IpcChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS];

export type { AppInfo, DesktopApi, RuntimeConfig };
