import { Link } from 'react-router-dom';
import { LanguageSwitcher } from '../../../components/LanguageSwitcher';
import { useTranslation } from '../../../lib/i18n/i18n';
import { useSystemHealth, type SystemHealthSnapshot } from '../hooks/use-system-health';

type OverallState = 'checking' | 'healthy' | 'degraded' | 'unreachable';

function overallState(snapshot: SystemHealthSnapshot): OverallState {
  if (snapshot.api.status === 'unknown') return 'checking';
  if (snapshot.api.status === 'live' && snapshot.database.status === 'reachable') return 'healthy';
  if (snapshot.api.status === 'live') return 'degraded';
  return 'unreachable';
}

const OVERALL_LABEL_KEY = {
  checking: 'status.overall.checking',
  healthy: 'status.overall.healthy',
  degraded: 'status.overall.degraded',
  unreachable: 'status.overall.unreachable',
} as const;

function formatUptime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

export function SystemStatusPage() {
  const { t } = useTranslation();
  const { snapshot, isChecking, check } = useSystemHealth();
  const overall = overallState(snapshot);

  return (
    <main className="status-page">
      <header className="status-page__header">
        <div className="status-page__topbar">
          <p className="eyebrow">{t('status.eyebrow')}</p>
          <LanguageSwitcher />
        </div>
        <h1>{t('status.title')}</h1>
        <p className="lede">{t('status.lede')}</p>
        <p className="overall" data-status={overall} role="status">
          {t(OVERALL_LABEL_KEY[overall])}
        </p>
      </header>

      <section className="status-grid" aria-busy={isChecking} aria-live="polite">
        <article className="card" data-status={snapshot.api.status}>
          <h2>{t('status.api.title')}</h2>
          <p className="status-line">
            <span className="dot" aria-hidden="true" />
            {snapshot.api.status === 'unknown'
              ? t('status.api.checking')
              : snapshot.api.status === 'live'
                ? t('status.api.live')
                : t('status.api.unreachable')}
          </p>
          <dl>
            <div>
              <dt>{t('status.api.version')}</dt>
              <dd>{snapshot.api.version ?? '—'}</dd>
            </div>
            <div>
              <dt>{t('status.api.uptime')}</dt>
              <dd>
                {snapshot.api.uptimeSeconds === undefined
                  ? '—'
                  : formatUptime(snapshot.api.uptimeSeconds)}
              </dd>
            </div>
          </dl>
        </article>

        <article className="card" data-status={snapshot.database.status}>
          <h2>{t('status.db.title')}</h2>
          <p className="status-line">
            <span className="dot" aria-hidden="true" />
            {snapshot.database.status === 'unknown'
              ? t('status.db.checking')
              : snapshot.database.status === 'reachable'
                ? t('status.db.reachable')
                : t('status.db.down')}
          </p>
          <dl>
            <div>
              <dt>{t('status.db.readiness')}</dt>
              <dd>
                {snapshot.database.status === 'reachable'
                  ? t('status.db.passing')
                  : snapshot.database.status === 'down'
                    ? t('status.db.failing')
                    : '—'}
              </dd>
            </div>
            <div>
              <dt>{t('status.db.latency')}</dt>
              <dd>
                {snapshot.database.latencyMs === undefined
                  ? '—'
                  : `${snapshot.database.latencyMs} ms`}
              </dd>
            </div>
          </dl>
        </article>
      </section>

      {snapshot.error ? (
        <p className="error" role="alert">
          {t('status.error.unreachable')}
        </p>
      ) : null}

      <footer className="status-page__footer">
        <button type="button" onClick={() => void check()} disabled={isChecking}>
          {isChecking ? t('status.checking') : t('status.checkAgain')}
        </button>
        {snapshot.checkedAt ? (
          <span>
            {t('status.lastChecked')} {new Date(snapshot.checkedAt).toLocaleTimeString()}
          </span>
        ) : null}
        <Link to="/onboarding">{t('onboarding.nav')}</Link>
        <Link to="/dashboard">{t('nav.dashboard')}</Link>
      </footer>
    </main>
  );
}
