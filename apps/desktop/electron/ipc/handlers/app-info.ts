import { app, ipcMain } from 'electron';
import type { IpcMainInvokeEvent } from 'electron';
import type { AppInfo, RuntimeConfig } from '../contracts';
import { IPC_CHANNELS } from '../contracts';
import { isTrustedFrameUrl } from '../../main/security';

export interface TrustedOriginOptions {
  /** Dev server origin (e.g. http://localhost:5173) when running --dev. */
  devServerUrl?: string;
  /** file:// URL of the packaged renderer entry point. */
  prodFileUrl?: string;
}

/**
 * Privileged handlers must only answer the application's own renderer frame —
 * never an embedded iframe, popup or navigated-away page.
 */
export function assertTrustedSender(
  event: IpcMainInvokeEvent,
  options: TrustedOriginOptions,
): void {
  const frameUrl = event.senderFrame?.url ?? '';
  if (!isTrustedFrameUrl(frameUrl, options)) {
    throw new Error('IPC call rejected: untrusted sender frame');
  }
}

export type HandlerContext = TrustedOriginOptions;

export function registerAppInfoHandler(context: HandlerContext): void {
  ipcMain.handle(IPC_CHANNELS.getAppInfo, (event): AppInfo => {
    assertTrustedSender(event, context);
    return {
      name: app.getName(),
      version: app.getVersion(),
      electron: process.versions.electron,
      chrome: process.versions.chrome,
      node: process.versions.node,
      platform: process.platform,
    };
  });
}

export function registerRuntimeConfigHandler(
  context: HandlerContext,
  resolveConfig: () => RuntimeConfig,
): void {
  ipcMain.handle(IPC_CHANNELS.getRuntimeConfig, (event): RuntimeConfig => {
    assertTrustedSender(event, context);
    return resolveConfig();
  });
}
