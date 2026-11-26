import { useTranslation } from '../../lib/i18n/i18n';
import { useSession } from '../../app/contexts/session';

/**
 * Protected application shell placeholder. Renders only behind RequireAuth;
 * since authentication is not yet wired to the backend this is currently
 * unreachable — it exists to fix the layout/navigation boundary early.
 */
export function AppShellPage() {
  const { t } = useTranslation();
  const { session } = useSession();

  return (
    <main className="status-page">
      <header className="status-page__header">
        <p className="eyebrow">{t('app.name')}</p>
        <h1>{t('shell.title')}</h1>
        <p className="lede">
          Signed in as {session.user?.displayName ?? 'unknown'} — module navigation is planned, not
          yet implemented.
        </p>
      </header>
    </main>
  );
}
