import type { ActivityItem } from '../api/dashboard.service';
import type { TranslationKey } from '../../../lib/i18n/en';
import { Badge } from '../../../components/ui';
import { useTranslation } from '../../../lib/i18n/i18n';

const STATUS_TONE = {
  done: 'success',
  pending: 'warning',
  info: 'info',
} as const;

const STATUS_KEY: Record<ActivityItem['status'], TranslationKey> = {
  done: 'dashboard.activity.status.done',
  pending: 'dashboard.activity.status.pending',
  info: 'dashboard.activity.status.info',
};

interface ActivityListProps {
  items: ActivityItem[];
}

export function ActivityList({ items }: ActivityListProps) {
  const { t, locale } = useTranslation();

  if (items.length === 0) {
    return <p className="dashboard-empty">{t('dashboard.activity.empty')}</p>;
  }

  return (
    <ul className="activity-list">
      {items.map((item) => (
        <li key={item.id} className="activity-item">
          <div className="activity-item__main">
            <p className="activity-item__label">{t(item.labelKey as TranslationKey)}</p>
            <time className="activity-item__time" dateTime={item.at}>
              {new Date(item.at).toLocaleString(locale === 'am' ? 'am-ET' : 'en-ET', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </time>
          </div>
          <Badge tone={STATUS_TONE[item.status]}>{t(STATUS_KEY[item.status])}</Badge>
        </li>
      ))}
    </ul>
  );
}
