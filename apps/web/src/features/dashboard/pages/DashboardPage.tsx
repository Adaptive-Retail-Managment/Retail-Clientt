import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { LanguageSwitcher } from '../../../components/LanguageSwitcher';
import { Badge, Button, Spinner } from '../../../components/ui';
import { useTranslation } from '../../../lib/i18n/i18n';
import type { TranslationKey } from '../../../lib/i18n/en';
import type { BusinessContextService } from '../api/business-context.service';
import { defaultBusinessContextService } from '../api/mock-business-context.service';
import type { DashboardService } from '../api/dashboard.service';
import { defaultDashboardService } from '../api/mock-dashboard.service';
import { useDashboard } from '../hooks/use-dashboard';
import { formatETB } from '../lib/format';
import { DashboardSection, SummaryCard } from '../components/SummaryCard';
import { SalesChart } from '../components/SalesChart';
import { ActivityList } from '../components/ActivityList';
import { ModuleGrid } from '../components/ModuleGrid';
import { ProfileSwitcher } from '../components/ProfileSwitcher';
import { INDUSTRY_WIDGETS } from '../components/industry-widgets';
import '../dashboard.css';

interface DashboardPageProps {
  /** Injectable services — tests pass failing/empty mocks. */
  businessContext?: BusinessContextService;
  dashboard?: DashboardService;
}

const SALES_DAYS = 14;

function MetricIcon({ kind }: { kind: 'sales' | 'transactions' | 'inventory' | 'lowstock' }) {
  const common = {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  };
  switch (kind) {
    case 'sales':
      return (
        <svg {...common}>
          <path d="M12 2v20" />
          <path d="M17 6.5c0-1.9-2.2-3-5-3s-5 1.1-5 3 2 2.7 5 3.5 5 1.6 5 3.5-2.2 3-5 3-5-1.1-5-3" />
        </svg>
      );
    case 'transactions':
      return (
        <svg {...common}>
          <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
          <rect x="9" y="3" width="6" height="4" rx="1" />
          <path d="M9 12h6M9 16h4" />
        </svg>
      );
    case 'inventory':
      return (
        <svg {...common}>
          <path d="M21 8l-9-5-9 5v8l9 5 9-5V8z" />
          <path d="M3 8l9 5 9-5" />
          <path d="M12 13v8" />
        </svg>
      );
    case 'lowstock':
      return (
        <svg {...common}>
          <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
          <path d="M12 9v4" />
          <path d="M12 17h.01" />
        </svg>
      );
  }
}

export function DashboardPage({
  businessContext = defaultBusinessContextService,
  dashboard = defaultDashboardService,
}: DashboardPageProps) {
  const { t, locale } = useTranslation();
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const data = useDashboard({
    businessContext,
    dashboard,
    businessId: selectedBusinessId,
    reloadToken,
  });

  const profile = data.profile;
  const industryNameKey = profile
    ? (`onboarding.industry.${profile.industry}.name` as TranslationKey)
    : null;

  const industryWidgets = useMemo(
    () => (profile ? INDUSTRY_WIDGETS[profile.industry] : []),
    [profile],
  );

  const today = new Date().toLocaleDateString(locale === 'am' ? 'am-ET' : 'en-ET', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  if (data.status === 'loading') {
    return (
      <main className="dashboard-page" aria-busy="true">
        <Spinner label={t('dashboard.loading')} />
      </main>
    );
  }

  if (data.status === 'error' || !profile) {
    return (
      <main className="dashboard-page">
        <section className="ui-card dashboard-error">
          <h1>{t('dashboard.error.title')}</h1>
          <p>{t('dashboard.error.body')}</p>
          <Button onClick={() => setReloadToken((n) => n + 1)}>{t('dashboard.error.retry')}</Button>
        </section>
      </main>
    );
  }

  const { summary } = data;
  const lowStockCount = summary?.inventory.lowStock ?? 0;

  return (
    <main className="dashboard-page">
      <header className="dashboard-header">
        <div className="dashboard-header__main">
          <p className="dashboard-header__eyebrow">{t('dashboard.welcome')}</p>
          <h1 className="dashboard-header__business">{profile.businessName}</h1>
          <div className="dashboard-header__meta">
            {industryNameKey ? <Badge tone="info">{t(industryNameKey)}</Badge> : null}
            <span className="dashboard-header__branch">{profile.branchName}</span>
            <time
              className="dashboard-header__date"
              dateTime={new Date().toISOString().slice(0, 10)}
            >
              {today}
            </time>
          </div>
        </div>
        <div className="dashboard-header__tools">
          <ProfileSwitcher
            profiles={data.profiles}
            selectedId={profile.businessId}
            onSelect={setSelectedBusinessId}
          />
          <LanguageSwitcher />
        </div>
      </header>

      {data.hasEmptySections ? (
        <section className="ui-card dashboard-empty-state">
          <h2>{t('dashboard.empty.title')}</h2>
          <p>{t('dashboard.empty.body')}</p>
          <Link to="/onboarding" className="btn btn--secondary">
            {t('onboarding.title')}
          </Link>
        </section>
      ) : null}

      <DashboardSection titleKey="dashboard.context.title">
        <dl className="context-grid">
          <div>
            <dt>{t('dashboard.context.business')}</dt>
            <dd>{profile.businessName}</dd>
          </div>
          <div>
            <dt>{t('dashboard.context.industry')}</dt>
            <dd>{industryNameKey ? t(industryNameKey) : '—'}</dd>
          </div>
          <div>
            <dt>{t('dashboard.context.branch')}</dt>
            <dd>{profile.branchName}</dd>
          </div>
          <div>
            <dt>{t('dashboard.context.contact')}</dt>
            <dd>
              {(profile.contactPhone ?? profile.contactEmail)
                ? [profile.contactPhone, profile.contactEmail].filter(Boolean).join(' · ')
                : t('dashboard.context.none')}
            </dd>
          </div>
        </dl>
      </DashboardSection>

      <section aria-label={t('dashboard.summary.title')} className="summary-grid">
        <SummaryCard
          icon={<MetricIcon kind="sales" />}
          labelKey="dashboard.summary.todaySales"
          value={summary ? formatETB(summary.todaySales) : '—'}
        />
        <SummaryCard
          icon={<MetricIcon kind="transactions" />}
          labelKey="dashboard.summary.transactions"
          value={summary ? String(summary.transactionsToday) : '—'}
          hint={t('dashboard.summary.transactionsHint')}
        />
        <SummaryCard
          icon={<MetricIcon kind="inventory" />}
          labelKey="dashboard.summary.inventory"
          value={summary ? String(summary.inventory.totalSkus) : '—'}
          hint={
            summary
              ? t('dashboard.summary.inventoryHint', { total: summary.inventory.totalSkus })
              : undefined
          }
        />
        <SummaryCard
          icon={<MetricIcon kind="lowstock" />}
          labelKey="dashboard.summary.lowStock"
          value={summary ? String(lowStockCount) : '—'}
          hint={summary ? t('dashboard.summary.lowStockHint', { count: lowStockCount }) : undefined}
        />
      </section>

      {summary && summary.lowStockItems.length > 0 ? (
        <DashboardSection titleKey="dashboard.lowStock.title" badgeKey="dashboard.demoBadge">
          <ul className="low-stock-list">
            {summary.lowStockItems.map((item) => (
              <li key={item.name}>
                <span>{item.name}</span>
                <Badge tone={item.quantity === 0 ? 'danger' : 'warning'}>
                  {item.quantity} {item.unit}
                </Badge>
              </li>
            ))}
          </ul>
        </DashboardSection>
      ) : null}

      <DashboardSection titleKey="dashboard.sales.title" badgeKey="dashboard.demoBadge">
        <p className="dashboard-section__subtitle">
          {t('dashboard.sales.subtitle', { days: SALES_DAYS })}
        </p>
        <SalesChart points={data.salesSeries} />
      </DashboardSection>

      <div className="dashboard-columns">
        <DashboardSection titleKey="dashboard.activity.title">
          <ActivityList items={data.activity} />
        </DashboardSection>
        <DashboardSection titleKey="dashboard.modules.title">
          <ModuleGrid modules={data.modules} />
        </DashboardSection>
      </div>

      {industryWidgets.map((Widget, i) => (
        <Widget key={i} profile={profile} />
      ))}
    </main>
  );
}
