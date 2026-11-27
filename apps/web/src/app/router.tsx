import { useMemo } from 'react';
import { createBrowserRouter, createHashRouter, RouterProvider } from 'react-router-dom';
import type { RouterProviderProps } from 'react-router-dom';
import { SystemStatusPage } from '../features/system-status/pages/SystemStatusPage';
import { LoginPage } from '../features/auth/pages/LoginPage';
import { AppShellPage } from '../features/shell/AppShellPage';
import { OnboardingPage } from '../features/onboarding/pages/OnboardingPage';
import { DashboardPage } from '../features/dashboard/pages/DashboardPage';
import { RequireAuth } from './guards';

const routes = [
  {
    path: '/',
    element: <SystemStatusPage />,
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    // Public for now: authentication is not yet wired to the backend, so the
    // onboarding demo must be reachable without a session. Move behind
    // RequireAuth once the auth contract exists.
    path: '/onboarding',
    element: <OnboardingPage />,
  },
  {
    // Public for now: authentication is not yet wired, so the dashboard demo
    // uses mock business profiles. Move behind RequireAuth when auth lands.
    path: '/dashboard',
    element: <DashboardPage />,
  },
  {
    path: '/app',
    element: (
      <RequireAuth>
        <AppShellPage />
      </RequireAuth>
    ),
  },
];

/**
 * The packaged Electron renderer runs on a file:// origin where the History
 * API cannot address real paths — hash routing keeps navigation working in
 * both web and desktop without a second router implementation.
 */
function createAppRouter(): RouterProviderProps['router'] {
  const isFileOrigin = typeof window !== 'undefined' && window.location.protocol === 'file:';
  return isFileOrigin ? createHashRouter(routes) : createBrowserRouter(routes);
}

export function AppRouter() {
  const router = useMemo(createAppRouter, []);
  return <RouterProvider router={router} />;
}
