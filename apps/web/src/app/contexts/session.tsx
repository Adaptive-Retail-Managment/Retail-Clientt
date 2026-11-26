import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

/**
 * Authentication/session state.
 *
 * The backend auth contract is a pending Retail-Server dependency, so the
 * provider currently reports 'unauthenticated' and exposes no sign-in. The
 * shape is final enough for feature code to consume; wiring to real
 * endpoints happens when the API contract lands (see docs/web/BACKEND_DEPENDENCIES.md).
 */

export type AppRole = 'owner' | 'business_admin' | 'manager' | 'cashier';

export interface SessionUser {
  id: string;
  displayName: string;
  email?: string;
}

export interface SessionMembership {
  businessId: string;
  role: AppRole;
  branchIds: string[];
}

export type SessionStatus = 'loading' | 'unauthenticated' | 'authenticated';

export interface SessionState {
  status: SessionStatus;
  user: SessionUser | null;
  memberships: SessionMembership[];
}

/**
 * Planned permission keys. Enforcement is server-side; this map documents the
 * intended client-side route/UI gating and MUST be re-validated by the API.
 * It is not an authorization source of truth.
 */
export const ROLE_PERMISSIONS: Record<AppRole, readonly string[]> = {
  owner: ['subscription.manage', 'business.settings', 'branch.manage', 'pos.access'],
  business_admin: ['business.settings.digital', 'catalog.manage', 'reports.view', 'pos.access'],
  manager: ['branch.operations', 'inventory.physical', 'pos.access', 'reports.branch'],
  cashier: ['pos.access'],
};

export function roleHasPermission(role: AppRole, permission: string): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

interface SessionContextValue {
  session: SessionState;
  /** Placeholder until the auth API contract exists; resolves unauthenticated. */
  refreshSession: () => Promise<void>;
  signOut: () => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session] = useState<SessionState>({
    status: 'unauthenticated',
    user: null,
    memberships: [],
  });

  const value = useMemo<SessionContextValue>(
    () => ({
      session,
      refreshSession: async () => {
        // Backend auth contract pending — nothing to refresh yet.
      },
      signOut: () => {
        // Backend auth contract pending.
      },
    }),
    [session],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used inside <SessionProvider>');
  return ctx;
}
