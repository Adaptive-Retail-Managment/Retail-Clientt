import { Link } from 'react-router-dom';
import { useTranslation } from '../../../lib/i18n/i18n';

/**
 * Honest placeholder: the backend authentication contract does not exist yet,
 * so this page performs no login and collects no credentials. It exists so
 * protected-route redirects have a truthful destination.
 */
export function LoginPage() {
  const { t } = useTranslation();

  return (
    <main className="status-page">
      <header className="status-page__header">
        <p className="eyebrow">{t('app.name')}</p>
        <h1>{t('auth.login.title')}</h1>
      </header>
      <section className="card">
        <p className="lede">{t('auth.login.pending')}</p>
        <p>
          <Link to="/">{t('auth.login.backToStatus')}</Link>
        </p>
      </section>
    </main>
  );
}
