import type { HTMLAttributes, ReactNode } from 'react';

export type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';

export function Badge({
  tone = 'neutral',
  children,
  className,
  ...rest
}: HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone; children: ReactNode }) {
  return (
    <span className={`badge badge--${tone}${className ? ` ${className}` : ''}`} {...rest}>
      {children}
    </span>
  );
}
