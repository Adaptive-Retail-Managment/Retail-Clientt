import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { roleHasPermission, useSession } from './contexts/session';
import { useWorkspace } from './contexts/workspace';

/**
 * Route boundary: requires an authenticated session. Until the backend auth
 * contract exists the session is always 'unauthenticated', so protected
 * routes redirect to /login — which honestly explains sign-in is pending.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { session } = useSession();
  const location = useLocation();

  if (session.status === 'loading') {
    return <main className="status-page">Loading…</main>;
  }
  if (session.status !== 'authenticated') {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <>{children}</>;
}

/**
 * Role-aware boundary. Checks the caller's membership role for the active
 * business against the planned permission map. Server-side authorization
 * remains the real enforcement — this only shapes what the UI offers.
 */
export function RequirePermission({
  permission,
  children,
}: {
  permission: string;
  children: ReactNode;
}) {
  const { session } = useSession();
  const { workspace } = useWorkspace();

  if (session.status !== 'authenticated') return null;

  const membership = session.memberships.find((m) => m.businessId === workspace.activeBusinessId);
  const allowed = membership ? roleHasPermission(membership.role, permission) : false;

  if (!allowed) {
    return (
      <main className="status-page">
        <h1>Not authorized</h1>
        <p className="lede">Your role does not include the permission required for this area.</p>
      </main>
    );
  }
  return <>{children}</>;
}
