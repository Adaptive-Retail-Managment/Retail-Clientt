import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { ModuleDescriptor } from '../api/dashboard.service';
import type { TranslationKey } from '../../../lib/i18n/en';
import { Badge } from '../../../components/ui';
import { useTranslation } from '../../../lib/i18n/i18n';

interface IconProps {
  className?: string;
}

function svg(path: ReactNode, className?: string) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {path}
    </svg>
  );
}

const MODULE_ICONS: Record<string, (p: IconProps) => ReactNode> = {
  products: () =>
    svg(
      <>
        <path d="M21 8l-9-5-9 5v8l9 5 9-5V8z" />
        <path d="M3 8l9 5 9-5" />
        <path d="M12 13v8" />
      </>,
    ),
  inventory: () =>
    svg(
      <>
        <path d="M3 9l9-6 9 6v11a1 1 0 0 1-1 1h-5v-7h-6v7H4a1 1 0 0 1-1-1V9z" />
      </>,
    ),
  pos: () =>
    svg(
      <>
        <rect x="3" y="4" width="18" height="14" rx="2" />
        <path d="M7 9h.01M11 9h.01M15 9h.01M8 13h8" />
        <path d="M7 20h10" />
      </>,
    ),
  purchasing: () =>
    svg(
      <>
        <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4H6z" />
        <path d="M3 6h18" />
        <path d="M16 10a4 4 0 0 1-8 0" />
      </>,
    ),
  suppliers: () =>
    svg(
      <>
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </>,
    ),
  reports: () =>
    svg(
      <>
        <path d="M3 3v18h18" />
        <path d="M7 14l4-4 4 3 5-6" />
      </>,
    ),
  employees: () =>
    svg(
      <>
        <rect x="2" y="7" width="20" height="14" rx="2" />
        <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
        <path d="M12 12v4M10 14h4" />
      </>,
    ),
  settings: () =>
    svg(
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </>,
    ),
};

interface ModuleGridProps {
  modules: ModuleDescriptor[];
}

/**
 * Quick access to platform modules. Only modules with a real route are
 * rendered as links — everything else shows a "coming soon" state and is
 * not clickable, so no broken navigation is possible.
 */
export function ModuleGrid({ modules }: ModuleGridProps) {
  const { t } = useTranslation();

  return (
    <ul className="module-grid">
      {modules.map((mod) => {
        const icon = MODULE_ICONS[mod.id]?.({ className: 'module-card__icon' });
        const inner = (
          <>
            <span className="module-card__icon-wrap" aria-hidden="true">
              {icon}
            </span>
            <span className="module-card__name">{t(mod.nameKey as TranslationKey)}</span>
            <span className="module-card__desc">{t(mod.descKey as TranslationKey)}</span>
            {mod.available ? null : (
              <Badge tone="neutral">{t('dashboard.module.comingSoon')}</Badge>
            )}
          </>
        );
        return (
          <li key={mod.id} className="module-grid__item">
            {mod.available && mod.to ? (
              <Link to={mod.to} className="module-card module-card--link">
                {inner}
              </Link>
            ) : (
              <div className="module-card module-card--disabled" aria-disabled="true">
                {inner}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
