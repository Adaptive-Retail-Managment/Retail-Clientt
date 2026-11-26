import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { AppInfo, RuntimeConfig } from '@arp/contracts';

/**
 * Desktop-bridge state. Detects whether the app runs inside Electron and
 * lazily fetches bridge-provided info/config. On the plain web these stay
 * null/false — always access via this hook, never `window.desktop` directly.
 */

interface DesktopState {
  isDesktop: boolean;
  appInfo: AppInfo | null;
  runtimeConfig: RuntimeConfig | null;
}

interface DesktopContextValue extends DesktopState {
  /** Resolves true when an external link can be opened via the OS browser. */
  openExternal: (url: string) => Promise<boolean>;
}

const DesktopContext = createContext<DesktopContextValue | null>(null);

export function DesktopProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DesktopState>({
    isDesktop: false,
    appInfo: null,
    runtimeConfig: null,
  });

  useEffect(() => {
    const desktop = window.desktop;
    if (!desktop) return;

    let cancelled = false;
    setState((s) => ({ ...s, isDesktop: true }));

    void desktop
      .getAppInfo()
      .then((appInfo) => {
        if (!cancelled) setState((s) => ({ ...s, appInfo }));
      })
      .catch(() => undefined);

    void desktop
      .getRuntimeConfig()
      .then((runtimeConfig) => {
        if (!cancelled) setState((s) => ({ ...s, runtimeConfig }));
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<DesktopContextValue>(
    () => ({
      ...state,
      openExternal: async (url: string) => {
        const desktop = window.desktop;
        if (!desktop) return false;
        try {
          const result = await desktop.openExternal(url);
          return result.opened;
        } catch {
          return false;
        }
      },
    }),
    [state],
  );

  return <DesktopContext.Provider value={value}>{children}</DesktopContext.Provider>;
}

export function useDesktop(): DesktopContextValue {
  const ctx = useContext(DesktopContext);
  if (!ctx) throw new Error('useDesktop must be used inside <DesktopProvider>');
  return ctx;
}
