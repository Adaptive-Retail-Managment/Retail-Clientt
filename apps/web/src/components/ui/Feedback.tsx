import type { ReactNode } from 'react';
import { Badge, type BadgeTone } from './Badge';

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <p className="empty-state__title">{title}</p>
      {description ? <p className="empty-state__description">{description}</p> : null}
      {action}
    </div>
  );
}

export function Alert({
  tone = 'info',
  title,
  children,
}: {
  tone?: BadgeTone;
  title?: string;
  children: ReactNode;
}) {
  return (
    <div className={`alert alert--${tone}`} role={tone === 'danger' ? 'alert' : 'status'}>
      {title ? <strong className="alert__title">{title}</strong> : null}
      <div className="alert__body">{children}</div>
      <Badge tone={tone} className="alert__badge">
        {tone}
      </Badge>
    </div>
  );
}
