import type { ReactNode } from 'react';
import type { TranslationKey } from '../../../lib/i18n/en';
import { useTranslation } from '../../../lib/i18n/i18n';
import { Badge } from '../../../components/ui';

interface SummaryCardProps {
  icon: ReactNode;
  labelKey: TranslationKey;
  value: string;
  hint?: string;
  loading?: boolean;
}

export function SummaryCard({ icon, labelKey, value, hint, loading }: SummaryCardProps) {
  const { t } = useTranslation();
  return (
    <article className="ui-card summary-card" aria-busy={loading || undefined}>
      <div className="summary-card__icon" aria-hidden="true">
        {icon}
      </div>
      <div className="summary-card__body">
        <p className="summary-card__label">{t(labelKey)}</p>
        <p className="summary-card__value">{loading ? '—' : value}</p>
        {hint ? <p className="summary-card__hint">{hint}</p> : null}
      </div>
    </article>
  );
}

interface SectionCardProps {
  titleKey: TranslationKey;
  badgeKey?: TranslationKey;
  children: ReactNode;
}

/** Shared section wrapper with optional "demo data" badge. */
export function DashboardSection({ titleKey, badgeKey, children }: SectionCardProps) {
  const { t } = useTranslation();
  return (
    <section className="ui-card dashboard-section">
      <header className="dashboard-section__header">
        <h2>{t(titleKey)}</h2>
        {badgeKey ? <Badge tone="warning">{t(badgeKey)}</Badge> : null}
      </header>
      {children}
    </section>
  );
}
