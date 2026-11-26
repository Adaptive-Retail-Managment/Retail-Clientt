import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { app, BrowserWindow, session } from 'electron';
import { registerAppInfoHandler, registerRuntimeConfigHandler } from '../ipc/handlers/app-info';
import { registerOpenExternalHandler } from '../ipc/handlers/open-external';
import type { RuntimeConfig } from '../ipc/contracts';
import { getRendererTarget } from './renderer-target';
import { hardenSession, hardenWindowContents } from './security';

const isDev = process.argv.includes('--dev');
const devServerUrl = isDev ? (process.env.WEB_DEV_URL ?? 'http://localhost:5173') : undefined;
const apiBaseUrl = process.env.ARP_API_BASE_URL?.trim() || null;

function rendererFileUrl(mainDir: string): string {
  return pathToFileURL(path.resolve(mainDir, '../../../web/dist/index.html')).href;
}

function resolveRuntimeConfig(): RuntimeConfig {
  return {
    apiBaseUrl,
    environment: isDev ? 'development' : 'production',
    isPackaged: !isDev,
  };
}

function createMainWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 1024,
    minHeight: 700,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#0f141a',
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      spellcheck: false,
    },
  });

  window.once('ready-to-show', () => window.show());

  const target = getRendererTarget({ isDev, devServerUrl, mainDir: __dirname });

  if (target.kind === 'url') {
    void window.loadURL(target.value);
  } else {
    void window.loadFile(target.value);
  }

  return window;
}

// Renders are only ever created by this process.
app.on('web-contents-created', (_event, contents) => {
  hardenWindowContents(contents, {
    devServerUrl,
    prodFileUrl: isDev ? undefined : rendererFileUrl(__dirname),
    apiBaseUrl,
  });
});

app.whenReady().then(() => {
const ipcContext = {
    devServerUrl,
    prodFileUrl: isDev ? undefined : rendererFileUrl(__dirname),
    apiBaseUrl,
  };

  hardenSession(session.defaultSession, ipcContext);
  registerAppInfoHandler(ipcContext);
  registerRuntimeConfigHandler(ipcContext, resolveRuntimeConfig);
  registerOpenExternalHandler(ipcContext);

  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
