import { ipcMain, shell, type IpcMainInvokeEvent } from 'electron';
import { IPC_CHANNELS } from '../contracts';
import { isAllowedExternalUrl } from '../../main/security';
import { assertTrustedSender, type HandlerContext } from './app-info';

export function registerOpenExternalHandler(context: HandlerContext): void {
  ipcMain.handle(
    IPC_CHANNELS.openExternal,
    async (event: IpcMainInvokeEvent, rawUrl: unknown): Promise<{ opened: boolean }> => {
      assertTrustedSender(event, context);
      if (typeof rawUrl !== 'string' || !isAllowedExternalUrl(rawUrl)) {
        return { opened: false };
      }
      // Pass the normalized href, never the raw renderer-supplied string.
      await shell.openExternal(new URL(rawUrl).href);
      return { opened: true };
    },
  );
}
